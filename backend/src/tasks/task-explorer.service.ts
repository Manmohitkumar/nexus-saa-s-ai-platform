import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgentTaskView, TaskExplorerFilters, TaskExplorerResponse } from './task.types';

const DEFAULT_VIEW: TaskExplorerFilters = {};

/**
 * Agent Task Explorer for the Agent Task Intelligence Layer. Search reuses the
 * existing persistence layer (no second search engine): tasks are filtered by
 * section, status, owner, responsible agent, project, feature, dependency
 * state, completion state, missing-data flag, evidence state, and free-text.
 * Combined filters AND together; the reset action returns the default task set
 * without deleting saved task data.
 */
@Injectable()
export class TaskExplorerService {
    constructor(private readonly prisma: PrismaService) {}

    async search(filters: TaskExplorerFilters = {}): Promise<TaskExplorerResponse> {
        const where = this.buildWhere(filters);
        const [rows, total, tasks] = await Promise.all([
            this.prisma.agentTask.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 200 }),
            this.prisma.agentTask.count({ where }),
            this.prisma.agentTask.count(),
        ]);
        const counts = await this.counts();

        return {
            total,
            tasks: rows.map((r) => this.toView(r)),
            counts: { ...counts, matched: total, all: tasks },
            defaultView: { ...DEFAULT_VIEW },
        };
    }

    buildWhere(filters: TaskExplorerFilters): Record<string, unknown> {
        const where: Record<string, unknown> = {};
        if (filters.feature) where.feature = filters.feature;
        if (filters.status) where.status = filters.status;
        if (filters.readiness) where.readiness = filters.readiness;
        if (filters.owner) where.owner = { contains: filters.owner };
        if (filters.responsibleAgent) where.responsibleAgent = filters.responsibleAgent;
        if (filters.project) where.project = { contains: filters.project };
        if (filters.section) where.section = { contains: filters.section };

        if (filters.missingData === 'true') where.missingSourceCount = { gt: 0 };
        if (filters.missingData === 'false') where.missingSourceCount = 0;

        if (filters.dependencyState) {
            where.blockedDependencyCount = filters.dependencyState === 'blocked' ? { gt: 0 } : 0;
        }

        if (filters.search) {
            const q = filters.search;
            where.OR = [
                { title: { contains: q } },
                { description: { contains: q } },
                { notes: { contains: q } },
                { generatedSections: { contains: q } },
            ];
        }
        return where;
    }

    private async counts(): Promise<Record<string, number>> {
        const [byFeature, byStatus, byReadiness, byAgent] = await Promise.all([
            this.prisma.agentTask.groupBy({ by: ['feature'], _count: true }),
            this.prisma.agentTask.groupBy({ by: ['status'], _count: true }),
            this.prisma.agentTask.groupBy({ by: ['readiness'], _count: true }),
            this.prisma.agentTask.groupBy({ by: ['responsibleAgent'], _count: true }),
        ]);
        const map = (rows: Array<Record<string, string | number | { _all?: number }>>, prefix: string) => {
            const out: Record<string, number> = {};
            for (const r of rows) {
                const key = Object.keys(r).find((k) => k !== '_count');
                if (!key) continue;
                out[`${prefix}.${r[key]}`] = (r._count as { _all?: number } | undefined)?._all ?? 1;
            }
            return out;
        };
        return {
            ...map(byFeature as never, 'feature'),
            ...map(byStatus as never, 'status'),
            ...map(byReadiness as never, 'readiness'),
            ...map(byAgent as never, 'agent'),
        };
    }

    toView(r: {
        id: string;
        title: string;
        description: string;
        feature: string;
        project: string;
        section: string;
        status: string;
        readiness: string;
        owner: string;
        team: string;
        responsibleAgent: string;
        priority: string;
        createdBy: string;
        version: number;
        requiredTotal: number;
        requiredComplete: number;
        optionalTotal: number;
        optionalComplete: number;
        requiredPercentage: number;
        optionalPercentage: number;
        missingSourceCount: number;
        staleSourceCount: number;
        blockedDependencyCount: number;
        validationFailures: number;
        generatedSections: string;
        evidenceMappings: string;
        sourcesUsed: string;
        notes: string;
        createdAt: Date;
        updatedAt: Date;
    }): AgentTaskView {
        return {
            id: r.id,
            title: r.title,
            description: r.description,
            feature: r.feature as AgentTaskView['feature'],
            project: r.project,
            section: r.section,
            status: r.status as AgentTaskView['status'],
            readiness: r.readiness as AgentTaskView['readiness'],
            owner: r.owner,
            team: r.team,
            responsibleAgent: r.responsibleAgent,
            priority: r.priority,
            createdBy: r.createdBy,
            version: r.version,
            indicators: {
                requiredTotal: r.requiredTotal,
                requiredComplete: r.requiredComplete,
                optionalTotal: r.optionalTotal,
                optionalComplete: r.optionalComplete,
                requiredPercentage: r.requiredPercentage,
                optionalPercentage: r.optionalPercentage,
                missingSourceCount: r.missingSourceCount,
                staleSourceCount: r.staleSourceCount,
                blockedDependencyCount: r.blockedDependencyCount,
                validationFailures: r.validationFailures,
            },
            generatedSections: this.parseJson(r.generatedSections, []),
            evidenceMappings: this.parseJson(r.evidenceMappings, []),
            sourcesUsed: this.parseJson(r.sourcesUsed, []),
            notes: r.notes,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
        };
    }

    private parseJson<T>(value: string, fallback: T): T {
        try {
            return JSON.parse(value) as T;
        } catch {
            return fallback;
        }
    }
}
