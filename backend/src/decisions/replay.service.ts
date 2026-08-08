import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { DecisionReplay, ReplayStep } from './decision.types';

@Injectable()
export class ReplayService {
    constructor(private readonly prisma: PrismaService) {}

    async getReplay(decisionId: string): Promise<DecisionReplay> {
        const record = await this.prisma.decisionRecord.findUnique({
            where: { id: decisionId },
            include: {
                milestones: { orderBy: { order: 'asc' } },
                relations: { where: { type: 'depends_on' } },
                _count: { select: { alternatives: true, outcomes: true } },
            },
        });
        if (!record) {
            throw new NotFoundException(`Unknown decision: ${decisionId}`);
        }

        const phaseOrder = ['problem', 'discussion', 'evaluation', 'approval', 'implementation', 'deployment', 'outcome'];
        const progress = (idx: number, total: number) => Math.round(record.confidence * (0.6 + (0.4 * (idx + 1)) / total));

        const steps: ReplayStep[] = record.milestones.map((m, i) => ({
            phase: m.phase,
            label: m.label,
            date: m.date,
            summary: m.summary,
            evidenceSources: m.evidenceSources,
            confidence: Math.min(99, progress(i, Math.max(1, record.milestones.length))),
            order: i,
        }));

        // Ensure the canonical phase journey is present even if a decision has gaps.
        const present = new Set(steps.map((s) => s.phase));
        phaseOrder.forEach((phase, i) => {
            if (!present.has(phase)) {
                steps.push({
                    phase,
                    label: phase.charAt(0).toUpperCase() + phase.slice(1),
                    date: record.startedAt,
                    summary: `No recorded milestone for the ${phase} phase.`,
                    evidenceSources: 0,
                    confidence: 55,
                    order: steps.length + i,
                });
            }
        });
        steps.sort((a, b) => a.order - b.order);

        return {
            decision: {
                id: record.id,
                title: record.title,
                topic: record.topic,
                domain: record.domain,
                status: record.status as DecisionReplay['decision']['status'],
                summary: record.summary,
                confidence: record.confidence,
                createdBy: record.createdBy,
                team: record.team,
                startedAt: record.startedAt,
                decidedAt: record.decidedAt,
                implementedAt: record.implementedAt,
                alternativeCount: record._count.alternatives,
                outcomeCount: record._count.outcomes,
                dependencies: record.relations.length,
                businessContext: record.businessContext,
                technicalContext: record.technicalContext,
            },
            steps,
            totalSteps: steps.length,
        };
    }
}
