import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { DecisionCorrelation, DecisionCorrelationLink } from './decision.types';

@Injectable()
export class CorrelationService {
    constructor(private readonly prisma: PrismaService) {}

    async getCorrelations(decisionId: string): Promise<DecisionCorrelation> {
        const record = await this.prisma.decisionRecord.findUnique({
            where: { id: decisionId },
            include: { relations: true, milestones: { orderBy: { order: 'asc' } } },
        });
        if (!record) {
            throw new NotFoundException(`Unknown decision: ${decisionId}`);
        }

        const dependencies = record.relations
            .filter((r) => r.type === 'depends_on')
            .map((r) => ({
                id: r.targetId,
                title: r.targetLabel,
                domain: 'unknown',
                relation: 'depends_on',
                direction: 'depends_on' as const,
            }));

        // Reverse lookups: other decisions depending on this one, and decisions
        // sharing impact targets (cause-effect surfaces).
        const reverse = await this.prisma.decisionRelation.findMany({
            where: { targetType: 'decision', targetId: decisionId },
            include: { decision: { select: { id: true, title: true, domain: true, confidence: true } } },
        });
        const dependents: DecisionCorrelationLink[] = reverse.map((r) => ({
            id: r.decision.id,
            title: r.decision.title,
            domain: r.decision.domain,
            relation: 'depends_on',
            direction: 'depends_on_me' as const,
        }));

        const impactTargets = record.relations
            .filter((r) => r.targetType === 'knowledge')
            .map((r) => r.targetId);

        const shared = impactTargets.length
            ? await this.prisma.decisionRelation.findMany({
                  where: { targetId: { in: impactTargets }, decisionId: { not: decisionId } },
                  include: { decision: { select: { id: true, title: true, domain: true, confidence: true } } },
              })
            : [];

        const seen = new Set<string>();
        const related = shared
            .filter((r) => !seen.has(r.decisionId) && seen.add(r.decisionId))
            .map((r) => {
                const sharedTargets = record.relations
                    .filter((rel) => rel.targetId === r.targetId)
                    .map((rel) => rel.targetLabel);
                return {
                    id: r.decision.id,
                    title: r.decision.title,
                    domain: r.decision.domain,
                    confidence: r.decision.confidence,
                    sharedTargets: [...new Set(sharedTargets)],
                };
            });

        const causeEffect = this.buildCauseEffect(record.milestones);

        return {
            decisionId,
            dependencies: [...dependencies, ...dependents],
            related,
            causeEffect,
        };
    }

    private buildCauseEffect(milestones: Array<{ phase: string; label: string; date: string }>): Array<{ from: string; to: string; type: string }> {
        const byPhase = new Map<string, string>();
        for (const m of milestones) byPhase.set(m.phase, m.label);

        const pairs: Array<[string, string, string]> = [
            ['problem', 'discussion', 'triggered'],
            ['evaluation', 'approval', 'informed'],
            ['approval', 'implementation', 'enabled'],
            ['implementation', 'deployment', 'released'],
            ['deployment', 'outcome', 'produced'],
        ];
        const result: Array<{ from: string; to: string; type: string }> = [];
        for (const [from, to, type] of pairs) {
            if (byPhase.has(from) && byPhase.has(to)) {
                result.push({ from: byPhase.get(from)!, to: byPhase.get(to)!, type });
            }
        }
        return result;
    }
}
