import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskChecklistItem, TaskCompletionIndicators, TaskReadiness } from './task.types';

/**
 * Completion indicator + readiness service for the Agent Task Intelligence
 * Layer. Readiness and completion percentages are calculated here by backend
 * business logic and exposed through reusable APIs — frontend components never
 * compute business-critical completion state independently.
 */
@Injectable()
export class TaskReadinessService {
    constructor(private readonly prisma: PrismaService) {}

    async computeIndicators(taskId: string): Promise<TaskCompletionIndicators> {
        const [items, deps] = await Promise.all([
            this.prisma.agentTaskChecklistItem.findMany({ where: { taskId } }),
            this.prisma.agentTaskDependency.findMany({ where: { taskId } }),
        ]);

        const required = items.filter((i) => i.required);
        const optional = items.filter((i) => !i.required);
        const requiredComplete = required.filter((i) => i.completed).length;
        const optionalComplete = optional.filter((i) => i.completed).length;

        return {
            requiredTotal: required.length,
            requiredComplete,
            optionalTotal: optional.length,
            optionalComplete,
            requiredPercentage: required.length ? Math.round((requiredComplete / required.length) * 100) : 100,
            optionalPercentage: optional.length ? Math.round((optionalComplete / optional.length) * 100) : 100,
            missingSourceCount: items.filter((i) => i.missingData).length,
            staleSourceCount: items.filter((i) => i.validationState === 'stale').length,
            blockedDependencyCount: deps.filter((d) => d.status === 'blocked').length,
            validationFailures: items.filter((i) => ['invalid', 'conflicting', 'inaccessible'].includes(i.validationState)).length,
        };
    }

    async computeReadiness(taskId: string): Promise<{ readiness: TaskReadiness; reason: string }> {
        const [indicators, deps, task] = await Promise.all([
            this.computeIndicators(taskId),
            this.prisma.agentTaskDependency.findMany({ where: { taskId } }),
            this.prisma.agentTask.findUnique({ where: { id: taskId } }),
        ]);
        if (!task) return { readiness: 'failed', reason: 'Task not found' };

        if (task.status === 'complete') return { readiness: 'complete', reason: 'Task is complete' };

        if (indicators.blockedDependencyCount > 0) {
            const blocked = deps.filter((d) => d.status === 'blocked');
            return { readiness: 'blocked', reason: `${blocked.length} dependency blocked: ${blocked.map((b) => b.sourceLabel).join(', ')}` };
        }
        if (deps.some((d) => d.status === 'failed')) {
            return { readiness: 'failed', reason: 'A dependency failed' };
        }
        if (indicators.validationFailures > 0) {
            return { readiness: 'failed', reason: `${indicators.validationFailures} source validation failure(s)` };
        }
        if (deps.some((d) => d.status === 'stale')) {
            return { readiness: 'stale', reason: 'A dependency source is stale' };
        }
        if (indicators.missingSourceCount > 0) {
            return { readiness: 'missing-data', reason: `${indicators.missingSourceCount} required source(s) missing` };
        }
        if (deps.some((d) => d.status === 'waiting')) {
            const waiting = deps.filter((d) => d.status === 'waiting');
            return { readiness: 'waiting', reason: `Waiting on ${waiting.length} upstream: ${waiting.map((w) => w.sourceLabel).join(', ')}` };
        }
        if (indicators.requiredComplete < indicators.requiredTotal) {
            return { readiness: 'waiting', reason: `Checklist ${indicators.requiredComplete}/${indicators.requiredTotal} required items complete` };
        }
        if (deps.some((d) => d.status === 'missing-data')) {
            return { readiness: 'missing-data', reason: 'A dependency reports missing data' };
        }
        return { readiness: 'ready', reason: 'All required sources validated and dependencies satisfied' };
    }

    async apply(taskId: string): Promise<TaskCompletionIndicators> {
        const indicators = await this.computeIndicators(taskId);
        const { readiness } = await this.computeReadiness(taskId);
        await this.prisma.agentTask.update({
            where: { id: taskId },
            data: {
                requiredTotal: indicators.requiredTotal,
                requiredComplete: indicators.requiredComplete,
                optionalTotal: indicators.optionalTotal,
                optionalComplete: indicators.optionalComplete,
                requiredPercentage: indicators.requiredPercentage,
                optionalPercentage: indicators.optionalPercentage,
                missingSourceCount: indicators.missingSourceCount,
                staleSourceCount: indicators.staleSourceCount,
                blockedDependencyCount: indicators.blockedDependencyCount,
                validationFailures: indicators.validationFailures,
                readiness,
            },
        });
        return indicators;
    }

    async applyToView(items: TaskChecklistItem[], base: TaskCompletionIndicators): Promise<TaskCompletionIndicators> {
        const required = items.filter((i) => i.required);
        const optional = items.filter((i) => !i.required);
        const requiredComplete = required.filter((i) => i.completed).length;
        const optionalComplete = optional.filter((i) => i.completed).length;
        return {
            requiredTotal: required.length,
            requiredComplete,
            optionalTotal: optional.length,
            optionalComplete,
            requiredPercentage: required.length ? Math.round((requiredComplete / required.length) * 100) : 100,
            optionalPercentage: optional.length ? Math.round((optionalComplete / optional.length) * 100) : 100,
            missingSourceCount: items.filter((i) => i.missingData).length,
            staleSourceCount: items.filter((i) => i.validationState === 'stale').length,
            blockedDependencyCount: base.blockedDependencyCount,
            validationFailures: items.filter((i) => ['invalid', 'conflicting', 'inaccessible'].includes(i.validationState)).length,
        };
    }
}
