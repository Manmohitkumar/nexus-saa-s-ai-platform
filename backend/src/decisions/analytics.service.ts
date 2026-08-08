import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { DecisionAnalytics } from './decision.types';

@Injectable()
export class AnalyticsService {
    constructor(private readonly prisma: PrismaService) {}

    async getAnalytics(): Promise<DecisionAnalytics> {
        const records = await this.prisma.decisionRecord.findMany({
            include: {
                outcomes: true,
                relations: { where: { type: 'proposed_by' } },
            },
            orderBy: { startedAt: 'asc' },
        });

        const byStatus: Record<string, number> = {};
        const byDomain: Record<string, number> = {};
        const participantCounts = new Map<string, number>();
        let confidenceSum = 0;
        let implemented = 0;
        let validated = 0;
        let improvedOutcomes = 0;
        let totalOutcomes = 0;

        for (const d of records) {
            byStatus[d.status] = (byStatus[d.status] ?? 0) + 1;
            byDomain[d.domain] = (byDomain[d.domain] ?? 0) + 1;
            confidenceSum += d.confidence;
            if (d.status === 'implemented' || d.status === 'validated') implemented++;
            if (d.status === 'validated') validated++;
            for (const o of d.outcomes) {
                totalOutcomes++;
                if (o.direction === 'improved') improvedOutcomes++;
            }
            for (const rel of d.relations) {
                participantCounts.set(rel.targetLabel, (participantCounts.get(rel.targetLabel) ?? 0) + 1);
            }
        }

        const confidenceTrend = records.map((d, i) => ({
            label: d.startedAt || `#${i + 1}`,
            value: d.confidence,
        }));

        return {
            total: records.length,
            byStatus,
            byDomain,
            averageConfidence: records.length ? Math.round(confidenceSum / records.length) : 0,
            implementedRate: records.length ? Math.round((implemented / records.length) * 100) : 0,
            validatedCount: validated,
            improvedOutcomes,
            totalOutcomes,
            topParticipants: [...participantCounts.entries()]
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 8),
            confidenceTrend,
        };
    }
}
