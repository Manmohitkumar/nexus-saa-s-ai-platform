import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskChecklistService } from './task-checklist.service';
import {
    TaskChecklistItem,
    TaskEvidenceMapping,
    TaskGeneratedSection,
    TaskSourceReference,
} from './task.types';

export interface PreGenerationResult {
    passed: boolean;
    blocked: boolean;
    missing: TaskChecklistItem[];
    failures: string[];
    degraded: boolean;
}

export interface PostGenerationInput {
    sections: Array<{ heading: string; body: string; sources: TaskSourceReference[] }>;
}

/**
 * Evidence service for the Agent Task Intelligence Layer.
 * Pre-generation validation stops agents from silently hallucinating when
 * critical required sources are missing; post-generation evidence mapping
 * associates each generated section with the exact sources used. No separate
 * citation system is created — the existing source validation + agent outputs
 * are reused.
 */
@Injectable()
export class TaskEvidenceService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly checklist: TaskChecklistService,
    ) {}

    // ------------------------------------------------------------------
    // Pre-generation validation
    // ------------------------------------------------------------------

    async preGeneration(taskId: string, allowDegraded = false): Promise<PreGenerationResult> {
        const [task, items, deps] = await Promise.all([
            this.prisma.agentTask.findUnique({ where: { id: taskId } }),
            this.prisma.agentTaskChecklistItem.findMany({ where: { taskId }, orderBy: { order: 'asc' } }),
            this.prisma.agentTaskDependency.findMany({ where: { taskId } }),
        ]);
        if (!task) throw new Error(`Task ${taskId} not found`);

        const failures: string[] = [];
        if (deps.some((d) => d.status === 'blocked' || d.status === 'failed')) {
            const bad = deps.filter((d) => d.status === 'blocked' || d.status === 'failed');
            failures.push(`Blocked dependency: ${bad.map((b) => b.sourceLabel).join(', ')}`);
        }

        const missing: TaskChecklistItem[] = [];
        const refreshed = await this.checklist.materializeViews(items as never);
        for (const item of refreshed) {
            if (!item.required) continue;
            const check = await this.checklist.checkSource({
                feature: item.upstreamDependency,
                sourceType: item.sourceType,
                sourceRef: item.sourceRef,
            });
            if (!check.exists) {
                missing.push(item);
                failures.push(`Missing required source "${item.requirementName}" (${check.label})`);
            } else if (!check.accessible) {
                failures.push(`Inaccessible source "${item.requirementName}"`);
            }
        }

        const blocked = failures.length > 0 && !allowDegraded;
        return {
            passed: failures.length === 0,
            blocked,
            missing,
            failures,
            degraded: failures.length > 0 && allowDegraded,
        };
    }

    // ------------------------------------------------------------------
    // Post-generation evidence mapping
    // ------------------------------------------------------------------

    async buildMappings(sections: Array<{ heading: string; body: string; sources: TaskSourceReference[] }>): Promise<TaskEvidenceMapping[]> {
        return sections.map((s) => ({
            sectionId: this.slugify(s.heading),
            heading: s.heading,
            sources: s.sources,
        }));
    }

    async persist(taskId: string, sections: TaskGeneratedSection[], mappings: TaskEvidenceMapping[], used: TaskSourceReference[]): Promise<void> {
        await this.prisma.agentTask.update({
            where: { id: taskId },
            data: {
                generatedSections: JSON.stringify(sections),
                evidenceMappings: JSON.stringify(mappings),
                sourcesUsed: JSON.stringify(used),
            },
        });
    }

    async loadSections(taskId: string): Promise<TaskGeneratedSection[]> {
        const task = await this.prisma.agentTask.findUnique({ where: { id: taskId } });
        if (!task) return [];
        return this.parseJson<TaskGeneratedSection[]>(task.generatedSections, []);
    }

    async loadMappings(taskId: string): Promise<TaskEvidenceMapping[]> {
        const task = await this.prisma.agentTask.findUnique({ where: { id: taskId } });
        if (!task) return [];
        return this.parseJson<TaskEvidenceMapping[]>(task.evidenceMappings, []);
    }

    async loadUsed(taskId: string): Promise<TaskSourceReference[]> {
        const task = await this.prisma.agentTask.findUnique({ where: { id: taskId } });
        if (!task) return [];
        return this.parseJson<TaskSourceReference[]>(task.sourcesUsed, []);
    }

    private slugify(value: string): string {
        return value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60) || 'section';
    }

    private parseJson<T>(value: string, fallback: T): T {
        try {
            return JSON.parse(value) as T;
        } catch {
            return fallback;
        }
    }
}
