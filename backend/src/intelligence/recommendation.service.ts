import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskService } from '../risk/risk.service';
import { IntelligenceRecommendation } from './intelligence.types';

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2 };

/**
 * Recommendation Intelligence Service — unifies ownership-assigned actions from
 * the existing recommendation engines (risk, insights) into a single
 * de-duplicated, ranked recommendation center.
 */
@Injectable()
export class RecommendationIntelligenceService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly risk: RiskService,
    ) {}

    async recommendations(): Promise<IntelligenceRecommendation[]> {
        const [riskRecs, insightRecs] = await Promise.allSettled([
            this.risk.getRecommendations(),
            this.prisma.intelligenceInsight.findMany({
                where: { action: { not: '' } },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
        ]);

        const out: IntelligenceRecommendation[] = [];

        if (riskRecs.status === 'fulfilled') {
            for (const r of riskRecs.value) {
                out.push({
                    id: `risk-${r.id}`,
                    title: r.action,
                    detail: r.detail,
                    action: r.action,
                    priority: r.priority,
                    owner: r.owner,
                    eta: r.eta,
                    impact: r.impact,
                    sourceKind: 'risk',
                    evidence: r.evidence,
                    createdAt: new Date().toISOString(),
                });
            }
        }

        if (insightRecs.status === 'fulfilled') {
            for (const i of insightRecs.value) {
                let evidence: string[] = [];
                try {
                    const parsed = JSON.parse(i.evidence);
                    if (Array.isArray(parsed)) evidence = parsed.map((e) => e.excerpt ?? e).slice(0, 3);
                } catch {
                    evidence = [];
                }
                out.push({
                    id: `insight-${i.id}`,
                    title: i.action,
                    detail: i.recommendation || i.summary,
                    action: i.action,
                    priority: (i.priority as 'critical' | 'high' | 'medium') ?? 'medium',
                    owner: 'Intelligence Engine',
                    eta: 'next cycle',
                    impact: i.priority === 'critical' ? 'critical' : i.priority === 'high' ? 'high' : 'medium',
                    sourceKind: i.kind,
                    evidence,
                    createdAt: i.createdAt.toISOString(),
                });
            }
        }

        const seen = new Set<string>();
        return out
            .filter((r) => {
                const key = r.action.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort(
                (a, b) =>
                    (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3),
            )
            .slice(0, 25);
    }
}
