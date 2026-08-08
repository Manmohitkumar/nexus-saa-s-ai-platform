import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventBus } from '../events/event-bus';
import { AgentsService } from '../agents/agents.service';
import { TaskChecklistService } from './task-checklist.service';
import { TaskDependencyService, DependencyInput } from './task-dependency.service';
import { TaskReadinessService } from './task-readiness.service';
import { TaskEvidenceService } from './task-evidence.service';
import { TaskExportService, ExportFormat } from './task-export.service';
import { TaskExplorerService } from './task-explorer.service';
import { TaskCollaborationService } from './task-collaboration.service';
import {
    AgentTaskView,
    TaskDetailView,
    TaskExplorerFilters,
    TaskExplorerResponse,
    TaskFeature,
    TaskGeneratedSection,
    TaskGenerateResult,
    TaskOverview,
    TaskSourceReference,
} from './task.types';

export interface CreateTaskInput {
    title: string;
    description?: string;
    feature: TaskFeature | string;
    project?: string;
    owner?: string;
    team?: string;
    responsibleAgent?: string;
    priority?: string;
    notes?: string;
    dependencies?: DependencyInput[];
    createdBy?: string;
}

/**
 * Agent Task Intelligence Service — public facade for Feature 9. It coordinates
 * checklist generation + source validation, explicit dependencies, backend
 * readiness, evidence mapping, export, search/filter, and event-driven
 * collaboration with the eight ACE features. It owns no intelligence itself.
 */
@Injectable()
export class TaskService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly eventBus: EventBus,
        private readonly agents: AgentsService,
        private readonly checklist: TaskChecklistService,
        private readonly dependencies: TaskDependencyService,
        private readonly readiness: TaskReadinessService,
        private readonly evidence: TaskEvidenceService,
        private readonly exporter: TaskExportService,
        private readonly explorer: TaskExplorerService,
        private readonly collaboration: TaskCollaborationService,
    ) {}

    // ------------------------------------------------------------------
    // Create
    // ------------------------------------------------------------------

    async create(input: CreateTaskInput): Promise<TaskDetailView> {
        const feature = (input.feature || 'executive') as TaskFeature;
        const responsibleAgent = input.responsibleAgent ?? this.defaultAgentFor(feature);

        const task = await this.prisma.agentTask.create({
            data: {
                title: input.title,
                description: input.description ?? '',
                feature,
                project: input.project ?? 'Project Phoenix',
                owner: input.owner ?? '',
                team: input.team ?? '',
                responsibleAgent,
                priority: input.priority ?? 'medium',
                notes: input.notes ?? '',
                createdBy: input.createdBy ?? 'system',
            },
        });

        // Build the source checklist from the feature's real dependencies.
        const definitions = this.checklist.definitionsFor(feature);
        const rows = this.checklist.buildRows(task.id, definitions);
        await this.prisma.agentTaskChecklistItem.createMany({ data: rows as never });

        // Declare explicit dependencies (default: the upstream ACE features).
        const dependencyInputs: DependencyInput[] =
            input.dependencies && input.dependencies.length > 0
                ? input.dependencies
                : this.defaultDependenciesFor(feature);
        for (const dep of dependencyInputs) {
            await this.prisma.agentTaskDependency.create({
                data: {
                    taskId: task.id,
                    dependencyType: dep.dependencyType,
                    sourceType: dep.sourceType,
                    sourceId: dep.sourceId,
                    sourceLabel: dep.sourceLabel,
                    status: 'waiting',
                    reason: 'Awaiting first validation',
                },
            });
        }

        await this.collaboration.revalidateTask(task.id, 'org-brain');
        await this.recordActivity(task.id, responsibleAgent, 'created', `Task created for feature ${feature}`);
        this.eventBus.emit('task.created', `task:${task.id}`, `Agent task "${input.title}" created for ${feature}`, {
            taskId: task.id,
            feature,
        });

        return this.detail(task.id);
    }

    // ------------------------------------------------------------------
    // Read
    // ------------------------------------------------------------------

    async list(filters: TaskExplorerFilters = {}): Promise<TaskExplorerResponse> {
        return this.explorer.search(filters);
    }

    async detail(id: string): Promise<TaskDetailView> {
        const task = await this.prisma.agentTask.findUnique({ where: { id } });
        if (!task) throw new NotFoundException(`Task not found: ${id}`);

        const [checklistRows, dependencyRows, activities, exportCount] = await Promise.all([
            this.prisma.agentTaskChecklistItem.findMany({ where: { taskId: id }, orderBy: { order: 'asc' } }),
            this.prisma.agentTaskDependency.findMany({ where: { taskId: id } }),
            this.prisma.agentTaskActivity.findMany({ where: { taskId: id }, orderBy: { createdAt: 'desc' }, take: 60 }),
            this.prisma.agentTaskExport.count({ where: { taskId: id } }),
        ]);

        const base = this.explorer.toView(task as never);
        const indicators = await this.readiness.applyToView(
            await this.checklist.materializeViews(checklistRows as never),
            base.indicators,
        );

        return {
            ...base,
            indicators,
            checklist: await this.checklist.materializeViews(checklistRows as never),
            dependencies: await this.dependencies.materializeViews(dependencyRows as never),
            activities: activities.map((a) => ({
                id: a.id,
                taskId: a.taskId,
                actor: a.actor,
                action: a.action,
                detail: a.detail,
                evidenceDelta: this.parseJson<Record<string, unknown>>(a.evidenceDelta, {}),
                createdAt: a.createdAt.toISOString(),
            })),
            exportCount,
        };
    }

    // ------------------------------------------------------------------
    // Checklist + dependency mutation (optimistic concurrency via version)
    // ------------------------------------------------------------------

    async toggleChecklistItem(taskId: string, itemId: string, completed: boolean, actor = 'human'): Promise<TaskDetailView> {
        const task = await this.prisma.agentTask.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException(`Task not found: ${taskId}`);
        const item = await this.prisma.agentTaskChecklistItem.findUnique({ where: { id: itemId } });
        if (!item || item.taskId !== taskId) throw new NotFoundException(`Checklist item not found: ${itemId}`);

        await this.prisma.$transaction([
            this.prisma.agentTaskChecklistItem.update({
                where: { id: itemId },
                data: { completed },
            }),
            this.prisma.agentTask.update({
                where: { id: taskId },
                data: { version: { increment: 1 } },
            }),
        ]);

        await this.readiness.apply(taskId);
        await this.recordActivity(taskId, actor, 'checklist_item_updated', `Checklist item "${item.requirementName}" ${completed ? 'completed' : 'reopened'}`);
        this.eventBus.emit('task.updated', `task:${taskId}`, `Checklist item ${itemId} marked ${completed ? 'complete' : 'incomplete'}`, {
            taskId,
            itemId,
        });
        return this.detail(taskId);
    }

    async addDependency(taskId: string, dep: DependencyInput, actor = 'system'): Promise<TaskDetailView> {
        await this.prisma.agentTask.findUniqueOrThrow({ where: { id: taskId } });
        const cycles = await this.dependencies.detectCycles(taskId);
        if (cycles.length > 0) {
            throw new Error(`Circular task dependencies detected: ${cycles.map((c) => c.join(' → ')).join('; ')}`);
        }
        const resolved = await this.dependencies.resolveDependencyStatus(dep);
        await this.prisma.agentTaskDependency.create({
            data: {
                taskId,
                dependencyType: dep.dependencyType,
                sourceType: dep.sourceType,
                sourceId: dep.sourceId,
                sourceLabel: dep.sourceLabel,
                status: resolved.status,
                reason: resolved.reason,
            },
        });
        await this.readiness.apply(taskId);
        await this.recordActivity(taskId, actor, 'dependency_updated', `Added ${dep.dependencyType} dependency on ${dep.sourceLabel}`);
        this.eventBus.emit('task.dependency.updated', `task:${taskId}`, `Dependency added: ${dep.sourceLabel}`, { taskId });
        return this.detail(taskId);
    }

    async removeDependency(taskId: string, dependencyId: string, actor = 'system'): Promise<TaskDetailView> {
        await this.prisma.agentTask.findUniqueOrThrow({ where: { id: taskId } });
        await this.prisma.agentTaskDependency.deleteMany({ where: { id: dependencyId, taskId } });
        await this.readiness.apply(taskId);
        await this.recordActivity(taskId, actor, 'dependency_updated', `Removed dependency ${dependencyId}`);
        return this.detail(taskId);
    }

    async validate(taskId: string, trigger = 'manual', actor = 'system'): Promise<TaskDetailView> {
        await this.prisma.agentTask.findUniqueOrThrow({ where: { id: taskId } });
        await this.collaboration.revalidateTask(taskId, 'org-brain');
        const task = await this.prisma.agentTask.findUnique({ where: { id: taskId } });
        if (task) {
            await this.recordActivity(taskId, actor, 'validated', `Manual validation triggered (${trigger})`);
            this.eventBus.emit('task.validated', `task:${taskId}`, `Task validated via ${trigger}`, { taskId });
        }
        return this.detail(taskId);
    }

    // ------------------------------------------------------------------
    // Generation (pre-validation → agent execution → post-generation mapping)
    // ------------------------------------------------------------------

    async generate(taskId: string, actor = 'a13'): Promise<TaskGenerateResult> {
        const task = await this.prisma.agentTask.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException(`Task not found: ${taskId}`);

        const pre = await this.evidence.preGeneration(taskId, false);

        // Do NOT hallucinate: if critical sources are missing and the workflow
        // does not allow degraded output, block generation and explain why.
        if (!pre.passed) {
            this.eventBus.emit('task.generation_blocked', `task:${taskId}`, `Generation blocked: missing required sources`, {
                taskId,
                failures: pre.failures,
            });
            return {
                task: this.explorer.toView(task as never),
                preValidation: pre,
                executed: false,
                sections: [],
            };
        }

        // Execute the responsible agent through the existing agent registry.
        const agentId = task.responsibleAgent || 'a13';
        const result = await this.agents.runAgent(agentId, task.title);

        const sections: TaskGeneratedSection[] = [
            {
                id: `${task.id}-summary`,
                heading: 'Task Summary',
                body: result.finding,
                sectionId: 'task-summary',
                sources: result.sources,
            },
            ...(result.details.map((detail, i) => ({
                id: `${task.id}-detail-${i}`,
                heading: `Detail ${i + 1}`,
                body: detail,
                sectionId: `detail-${i + 1}`,
                sources: result.sources,
            }))),
        ];

        // Post-generation evidence mapping — each section references the sources
        // the responsible agent actually used.
        const sourceRefs: TaskSourceReference[] = result.sources.map((s, i) => ({
            sourceType: 'brain-entity' as const,
            sourceRef: s,
            sourceLabel: s,
            confidence: result.confidence,
            feature: task.feature as TaskFeature,
        }));
        const mappings = await this.evidence.buildMappings(
            sections.map((s) => ({ heading: s.heading, body: s.body, sources: sourceRefs })),
        );
        await this.evidence.persist(taskId, sections, mappings, sourceRefs);

        await this.prisma.agentTask.update({
            where: { id: taskId },
            data: {
                status: 'awaiting_review',
                version: { increment: 1 },
            },
        });
        await this.readiness.apply(taskId);
        await this.recordActivity(taskId, actor, 'generated', `Generated ${sections.length} sections via ${agentId} (conf ${result.confidence}%)`);
        this.eventBus.emit('task.generated', `task:${taskId}`, `Task generated by ${agentId} with ${sections.length} sections`, {
            taskId,
            agentId,
            sections: sections.length,
        });

        return {
            task: this.explorer.toView(await this.prisma.agentTask.findUniqueOrThrow({ where: { id: taskId } }) as never),
            preValidation: pre,
            executed: true,
            executedAgent: agentId,
            sections,
        };
    }

    // ------------------------------------------------------------------
    // Status + ownership
    // ------------------------------------------------------------------

    async updateStatus(taskId: string, status: string, actor = 'system'): Promise<TaskDetailView> {
        const task = await this.prisma.agentTask.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException(`Task not found: ${taskId}`);
        const allowed = ['pending', 'in_progress', 'awaiting_review', 'complete', 'blocked'];
        if (!allowed.includes(status)) throw new Error(`Invalid status: ${status}`);

        await this.prisma.agentTask.update({ where: { id: taskId }, data: { status, version: { increment: 1 } } });
        await this.readiness.apply(taskId);
        await this.recordActivity(taskId, actor, 'status_changed', `Status → ${status}`);
        this.eventBus.emit('task.status_changed', `task:${taskId}`, `Task status changed to ${status}`, { taskId, status });
        return this.detail(taskId);
    }

    async assign(taskId: string, owner: string, responsibleAgent?: string, actor = 'system'): Promise<TaskDetailView> {
        const data: Record<string, unknown> = { owner, version: { increment: 1 } };
        if (responsibleAgent) data.responsibleAgent = responsibleAgent;
        await this.prisma.agentTask.update({ where: { id: taskId }, data });
        await this.recordActivity(taskId, actor, 'status_changed', `Owner → ${owner || '—'}${responsibleAgent ? `, Agent → ${responsibleAgent}` : ''}`);
        return this.detail(taskId);
    }

    // ------------------------------------------------------------------
    // Export
    // ------------------------------------------------------------------

    async export(taskId: string, format: ExportFormat, exportedBy = 'system') {
        const task = await this.detail(taskId);
        const result = await this.exporter.exportTask(task, format, exportedBy);
        this.eventBus.emit('task.exported', `task:${taskId}`, `Task exported as ${format.toUpperCase()}`, {
            taskId,
            format,
            exportId: result.id,
        });
        return result;
    }

    listExports(taskId: string) {
        return this.exporter.list(taskId);
    }

    exportDetail(id: string) {
        return this.exporter.detail(id);
    }

    // ------------------------------------------------------------------
    // Overview + events
    // ------------------------------------------------------------------

    async overview(): Promise<TaskOverview> {
        const [tasks, exportsGenerated] = await Promise.all([
            this.prisma.agentTask.findMany(),
            this.prisma.agentTaskExport.count(),
        ]);
        const byFeature: Record<string, number> = {};
        const byStatus: Record<string, number> = {};
        const byReadiness: Record<string, number> = {};
        const byAgent: Record<string, number> = {};
        for (const t of tasks) {
            byFeature[t.feature] = (byFeature[t.feature] ?? 0) + 1;
            byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
            byReadiness[t.readiness] = (byReadiness[t.readiness] ?? 0) + 1;
            byAgent[t.responsibleAgent] = (byAgent[t.responsibleAgent] ?? 0) + 1;
        }

        const chainOrder: Array<{ feature: TaskFeature; label: string }> = [
            { feature: 'org-brain', label: 'Organizational Digital Brain' },
            { feature: 'decisions', label: 'Decision Time Machine' },
            { feature: 'exit-sim', label: 'Employee Exit Simulation' },
            { feature: 'risk', label: 'Knowledge Risk Heatmap' },
            { feature: 'mentor', label: 'AI Mentor' },
            { feature: 'docs', label: 'Autonomous Documentation' },
            { feature: 'intelligence', label: 'Organizational Intelligence' },
            { feature: 'executive', label: 'Executive Dashboard' },
            { feature: 'cross-feature', label: 'Cross-Feature' },
        ];

        return {
            total: tasks.length,
            byFeature,
            byStatus,
            byReadiness,
            byAgent,
            missingDataTasks: tasks.filter((t) => t.missingSourceCount > 0).length,
            blockedTasks: tasks.filter((t) => t.status === 'blocked' || t.readiness === 'blocked').length,
            awaitingReview: tasks.filter((t) => t.status === 'awaiting_review').length,
            complete: tasks.filter((t) => t.status === 'complete').length,
            exportsGenerated,
            featureChain: chainOrder.map((c) => ({
                feature: c.feature,
                label: c.label,
                tasks: byFeature[c.feature] ?? 0,
                ready: tasks.filter((t) => t.feature === c.feature && t.readiness === 'ready').length,
                blocked: tasks.filter((t) => t.feature === c.feature && t.readiness === 'blocked').length,
                missingData: tasks.filter((t) => t.feature === c.feature && t.missingSourceCount > 0).length,
                complete: tasks.filter((t) => t.feature === c.feature && t.status === 'complete').length,
            })),
        };
    }

    events() {
        return this.eventBus.recent(60).filter((e) => e.type.startsWith('task.'));
    }

    async destroy(id: string): Promise<void> {
        await this.prisma.agentTask.delete({ where: { id } }).catch(() => undefined);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private async recordActivity(taskId: string, actor: string, action: string, detail: string): Promise<void> {
        await this.prisma.agentTaskActivity.create({
            data: { taskId, actor, action, detail, evidenceDelta: JSON.stringify({ at: new Date().toISOString() }) },
        });
    }

    private defaultAgentFor(feature: string): string {
        const map: Record<string, string> = {
            'org-brain': 'a1',
            decisions: 'a6',
            'exit-sim': 'a7',
            risk: 'a8',
            mentor: 'a9',
            docs: 'a10',
            intelligence: 'a11',
            executive: 'a12',
            'cross-feature': 'a13',
        };
        return map[feature] ?? 'a13';
    }

    private defaultDependenciesFor(feature: string): DependencyInput[] {
        const map: Record<string, string[]> = {
            'org-brain': ['org-brain'],
            decisions: ['decisions', 'org-brain'],
            'exit-sim': ['exit-sim', 'org-brain', 'docs'],
            risk: ['risk', 'org-brain'],
            mentor: ['mentor', 'org-brain', 'decisions', 'risk'],
            docs: ['docs', 'org-brain', 'decisions'],
            intelligence: ['intelligence', 'decisions', 'risk', 'docs'],
            executive: ['executive', 'risk', 'intelligence', 'decisions', 'docs'],
            'cross-feature': ['org-brain', 'decisions', 'exit-sim', 'risk', 'mentor', 'docs', 'intelligence', 'executive'],
        };
        return (map[feature] ?? ['org-brain']).map((f) => ({
            dependencyType: 'feature' as const,
            sourceType: 'feature',
            sourceId: f,
            sourceLabel: this.checklist.featureLabel(f),
        }));
    }

    private parseJson<T>(value: string, fallback: T): T {
        try {
            return JSON.parse(value) as T;
        } catch {
            return fallback;
        }
    }
}
