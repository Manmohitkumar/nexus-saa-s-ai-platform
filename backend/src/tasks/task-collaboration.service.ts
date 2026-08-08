import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventBus, PhoenixEvent } from '../events/event-bus';
import { TaskChecklistService } from './task-checklist.service';
import { TaskReadinessService } from './task-readiness.service';
import { TaskDependencyService } from './task-dependency.service';

// Mapping of upstream ACE events to the checklist upstreamDependency + feature
// dependency source they satisfy. Cross-feature collaboration flows through the
// existing event bus + shared services — no point-to-point integrations.
const EVENT_FEATURE_MAP: Record<string, string> = {
    'decision.reconstructed': 'decisions',
    'documentation.evolved': 'docs',
    'fleet.completed': 'intelligence',
    'agent.completed': 'intelligence',
    'mentor.answered': 'mentor',
    'intelligence.sweep': 'intelligence',
    'executive.refreshed': 'executive',
    'risk.updated': 'risk',
    'risk.snapshot': 'risk',
    'phoenix.boot': 'org-brain',
};

const RELEVANT_EVENTS = Object.keys(EVENT_FEATURE_MAP);

/**
 * Cross-feature task collaboration for the Agent Task Intelligence Layer.
 * Subscribes to the shared event bus. When an upstream ACE feature produces or
 * updates intelligence required by a downstream task, this service automatically
 * revalidates the task's checklist + dependency readiness and records the
 * resulting change in its audit history.
 */
@Injectable()
export class TaskCollaborationService implements OnModuleInit {
    constructor(
        private readonly prisma: PrismaService,
        private readonly eventBus: EventBus,
        private readonly checklist: TaskChecklistService,
        private readonly readiness: TaskReadinessService,
        private readonly dependencies: TaskDependencyService,
    ) {}

    onModuleInit(): void {
        this.eventBus.subscribe((event) => {
            void this.onBrainEvent(event).catch(() => undefined);
        });
    }

    async onBrainEvent(event: PhoenixEvent): Promise<void> {
        const feature = EVENT_FEATURE_MAP[event.type];
        if (!feature) return;

        // Re-validate every task that depends on this upstream feature output.
        const affected = await this.prisma.agentTask.findMany({
            where: { readiness: { not: 'complete' } },
            select: { id: true, title: true, responsibleAgent: true },
        });

        for (const task of affected) {
            const changed = await this.revalidateTask(task.id, feature, event);
            if (changed) {
                await this.prisma.agentTaskActivity.create({
                    data: {
                        taskId: task.id,
                        actor: task.responsibleAgent || 'a13',
                        action: 'validated',
                        detail: `Auto-revalidated after upstream ${event.type} → ${feature}`,
                        evidenceDelta: JSON.stringify({ event: event.type, feature, at: event.at }),
                    },
                });
            }
        }
    }

    /**
     * Revalidates checklist items + dependencies for a task affected by an
     * upstream feature event. Returns true when the readiness actually changed.
     */
    async revalidateTask(taskId: string, feature: string, event?: PhoenixEvent): Promise<boolean> {
        const items = await this.prisma.agentTaskChecklistItem.findMany({ where: { taskId }, orderBy: { order: 'asc' } });
        let changed = false;

        for (const item of items) {
            if (item.upstreamDependency !== feature && feature !== 'org-brain') continue;
            const check = await this.checklist.checkSource({
                feature: item.upstreamDependency,
                sourceType: item.sourceType as never,
                sourceRef: item.sourceRef,
            });
            const prevState = item.validationState;
            const wasMissing = item.missingData;
            const nextState = check.state;
            const nextMissing = !check.exists;

            if (prevState !== nextState || wasMissing !== nextMissing || item.freshness !== check.freshness) {
                await this.prisma.agentTaskChecklistItem.update({
                    where: { id: item.id },
                    data: {
                        validationState: nextState,
                        missingData: nextMissing,
                        freshness: check.freshness,
                        confidence: check.confidence,
                        notes: check.notes ?? item.notes,
                    },
                });
                changed = true;
            }
        }

        // Revalidate task-type dependencies against their targets.
        const deps = await this.prisma.agentTaskDependency.findMany({ where: { taskId } });
        for (const dep of deps) {
            const resolved = await this.dependencies.resolveDependencyStatus({
                dependencyType: dep.dependencyType as never,
                sourceType: dep.sourceType,
                sourceId: dep.sourceId,
            });
            if (dep.status !== resolved.status) {
                await this.prisma.agentTaskDependency.update({
                    where: { id: dep.id },
                    data: { status: resolved.status, reason: resolved.reason, lastValidatedAt: new Date() },
                });
                changed = true;
            }
        }

        if (changed) {
            const { readiness, reason } = await this.readiness.computeReadiness(taskId);
            const task = await this.prisma.agentTask.findUnique({ where: { id: taskId } });
            if (task && task.readiness !== readiness) {
                await this.prisma.agentTask.update({ where: { id: taskId }, data: { readiness } });
                await this.prisma.agentTaskActivity.create({
                    data: {
                        taskId,
                        actor: task.responsibleAgent || 'a13',
                        action: 'validated',
                        detail: `Readiness changed to ${readiness}: ${reason}`,
                        evidenceDelta: JSON.stringify({ event: event?.type ?? feature }),
                    },
                });
            }
            await this.readiness.apply(taskId);
            this.eventBus.emit('task.updated', `task:${taskId}`, `Task readiness refreshed after upstream ${event?.type ?? feature}`, {
                feature,
                taskId,
            });
        }
        return changed;
    }
}
