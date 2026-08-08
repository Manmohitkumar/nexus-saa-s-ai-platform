import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DependencyStatus, DependencyType, TaskDependency } from './task.types';

export interface DependencyInput {
    dependencyType: DependencyType;
    sourceType: string;
    sourceId: string;
    sourceLabel: string;
}

/**
 * Reusable task dependency model for the Agent Task Intelligence Layer.
 * A task declares dependencies on other tasks, feature outputs, evidence
 * records, graph entities, agent results, or workflow states. The service
 * detects circular dependency graphs, validates dependency state against the
 * existing ACE features, and keeps each dependency's readiness state current.
 */
@Injectable()
export class TaskDependencyService {
    constructor(private readonly prisma: PrismaService) {}

    async resolveDependencyStatus(dep: {
        dependencyType: DependencyType;
        sourceType: string;
        sourceId: string;
    }): Promise<{ status: DependencyStatus; reason: string }> {
        const { dependencyType, sourceType, sourceId } = dep;

        switch (dependencyType) {
            case 'task': {
                const target = await this.prisma.agentTask.findUnique({ where: { id: sourceId } }).catch(() => null);
                if (!target) return { status: 'failed', reason: `Dependent task ${sourceId} does not exist` };
                if (target.status === 'complete') return { status: 'complete', reason: 'Dependent task completed' };
                if (target.status === 'blocked') return { status: 'blocked', reason: `Dependent task blocked (${target.readiness})` };
                return { status: 'waiting', reason: `Dependent task is ${target.status}` };
            }
            case 'feature': {
                const feature = sourceType || 'feature';
                return this.checkFeatureOutput(feature, sourceId);
            }
            case 'agent-result': {
                const memory = await this.prisma.agentMemory.findFirst({ where: { agentId: sourceId }, orderBy: { createdAt: 'desc' } });
                if (memory) return { status: 'ready', reason: `Agent ${sourceId} produced a result` };
                return { status: 'missing-data', reason: `Agent ${sourceId} has no recorded result` };
            }
            case 'graph-entity': {
                const node = await this.prisma.knowledgeNode.findUnique({ where: { id: sourceId } }).catch(() => null);
                if (node) return { status: 'ready', reason: `Graph entity ${node.label} exists` };
                return { status: 'missing-data', reason: `Graph entity ${sourceId} not found` };
            }
            case 'evidence': {
                const evidence = await this.prisma.decisionEvidence.findFirst({ where: { sourceRef: sourceId } }).catch(() => null);
                if (evidence) return { status: 'ready', reason: `Evidence ${sourceId} exists` };
                return { status: 'missing-data', reason: `Evidence ${sourceId} not found` };
            }
            case 'workflow-state': {
                const insight = await this.prisma.intelligenceInsight.findFirst({ where: { title: sourceId } }).catch(() => null);
                if (insight) return { status: 'ready', reason: `Workflow state ${sourceId} available` };
                return { status: 'waiting', reason: `Workflow state ${sourceId} not yet produced` };
            }
            default:
                return { status: 'waiting', reason: 'Unknown dependency type' };
        }
    }

    private async checkFeatureOutput(sourceType: string, sourceId: string): Promise<{ status: DependencyStatus; reason: string }> {
        const feature = sourceId || sourceType;
        switch (feature) {
            case 'org-brain': {
                const nodes = await this.prisma.knowledgeNode.count();
                return nodes > 0
                    ? { status: 'ready', reason: `${nodes} brain entities available` }
                    : { status: 'missing-data', reason: 'Brain has no entities' };
            }
            case 'decisions': {
                const decisions = await this.prisma.decisionRecord.count();
                return decisions > 0
                    ? { status: 'ready', reason: `${decisions} decisions available` }
                    : { status: 'missing-data', reason: 'Decision Time Machine has no records' };
            }
            case 'exit-sim': {
                const sims = await this.prisma.exitSimulationRun.count();
                const employees = await this.prisma.employee.count();
                return employees > 0 || sims > 0
                    ? { status: 'ready', reason: `${employees} employees / ${sims} simulations available` }
                    : { status: 'missing-data', reason: 'Workforce intelligence has no data' };
            }
            case 'risk': {
                const snap = await this.prisma.riskSnapshot.findFirst({ orderBy: { createdAt: 'desc' } });
                return snap
                    ? { status: 'ready', reason: `Risk snapshot (avg ${snap.averageRisk}) available` }
                    : { status: 'missing-data', reason: 'Risk Intelligence has not produced a snapshot' };
            }
            case 'mentor': {
                const convs = await this.prisma.mentorConversation.count();
                return convs > 0
                    ? { status: 'ready', reason: `${convs} mentor sessions available` }
                    : { status: 'ready', reason: 'Mentor capability catalog available' };
            }
            case 'docs': {
                const docs = await this.prisma.documentation.count();
                return docs > 0
                    ? { status: 'ready', reason: `${docs} documents available` }
                    : { status: 'missing-data', reason: 'Documentation Engine has no documents' };
            }
            case 'intelligence': {
                const insights = await this.prisma.intelligenceInsight.count();
                return insights > 0
                    ? { status: 'ready', reason: `${insights} insights available` }
                    : { status: 'waiting', reason: 'Intelligence Engine has not swept yet' };
            }
            case 'executive': {
                const snapshots = await this.prisma.executiveSnapshot.count();
                return snapshots > 0
                    ? { status: 'ready', reason: `${snapshots} executive snapshots available` }
                    : { status: 'waiting', reason: 'Executive Dashboard has no snapshots yet' };
            }
            default:
                return { status: 'waiting', reason: `Feature ${feature} not recognized` };
        }
    }

    /**
     * Detect circular dependency graphs among a task's declared dependencies.
     * Returns any cycle path found (empty = acyclic).
     */
    async detectCycles(taskId: string): Promise<string[][]> {
        const [tasks, deps] = await Promise.all([
            this.prisma.agentTask.findMany({ select: { id: true, title: true } }),
            this.prisma.agentTaskDependency.findMany({ where: { dependencyType: 'task' }, select: { taskId: true, sourceId: true } }),
        ]);
        const taskIds = new Set(tasks.map((t) => t.id));
        const adjacency = new Map<string, string[]>();
        for (const d of deps) {
            if (!taskIds.has(d.sourceId)) continue;
            const list = adjacency.get(d.taskId) ?? [];
            list.push(d.sourceId);
            adjacency.set(d.taskId, list);
        }

        const cycles: string[][] = [];
        const state = new Map<string, 0 | 1 | 2>();
        const path: string[] = [];

        const visit = (node: string): void => {
            if (state.get(node) === 1) {
                const start = path.indexOf(node);
                if (start >= 0) cycles.push([...path.slice(start), node]);
                return;
            }
            if (state.get(node) === 2) return;
            state.set(node, 1);
            path.push(node);
            for (const next of adjacency.get(node) ?? []) visit(next);
            path.pop();
            state.set(node, 2);
        };

        // Start DFS from the queried task but cover all tasks for full detection.
        const seeds = taskId && taskIds.has(taskId) ? [taskId] : [...taskIds];
        for (const seed of seeds) visit(seed);
        return cycles;
    }

    async materializeViews(rows: Array<{
        id: string;
        taskId: string;
        dependencyType: string;
        sourceType: string;
        sourceId: string;
        sourceLabel: string;
        status: string;
        reason: string;
        createdAt: Date;
        lastValidatedAt: Date;
    }>): Promise<TaskDependency[]> {
        return rows.map((r) => ({
            id: r.id,
            taskId: r.taskId,
            dependencyType: r.dependencyType as DependencyType,
            sourceType: r.sourceType,
            sourceId: r.sourceId,
            sourceLabel: r.sourceLabel,
            status: r.status as DependencyStatus,
            reason: r.reason,
            createdAt: r.createdAt.toISOString(),
            lastValidatedAt: r.lastValidatedAt.toISOString(),
        }));
    }
}
