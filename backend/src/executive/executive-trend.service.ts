import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExecutiveRawSignals, ExecutiveTrend, ExecutiveTrendPoint } from './executive.types';

const KPI_LABELS: Record<string, string> = {
    'org-health': 'Organizational Health',
    'workforce-resilience': 'Workforce Resilience',
    'bus-factor-coverage': 'Bus Factor Coverage',
    'risk-exposure': 'Risk Exposure',
    'knowledge-concentration': 'Knowledge Concentration',
    'documentation-health': 'Documentation Health',
    'knowledge-coverage': 'Documentation Coverage',
    'decision-effectiveness': 'Decision Effectiveness',
    'decision-confidence': 'Decision Confidence',
    'technical-debt': 'Technical Debt Health',
    'innovation-velocity': 'Innovation Velocity',
    'engineering-productivity': 'Engineering Productivity',
};

/**
 * Executive Trend Service — long-term trend analysis over the persisted
 * ExecutiveSnapshot history, complemented by the risk engine timeline when
 * snapshot history is still warming up. Deltas describe the direction of change
 * across the observed window so executives can verify the momentum behind each KPI.
 */
@Injectable()
export class ExecutiveTrendService {
    constructor(private readonly prisma: PrismaService) {}

    async trend(raw: ExecutiveRawSignals): Promise<ExecutiveTrend> {
        const [snapshots, riskSeries] = await Promise.allSettled([
            this.prisma.executiveSnapshot.findMany({ orderBy: { createdAt: 'asc' }, take: 60 }),
            Promise.resolve(this.riskTimelineSeries(raw)),
        ]);

        const snapSeries: ExecutiveTrendPoint[] =
            snapshots.status === 'fulfilled'
                ? snapshots.value.map((s) => ({
                      date: s.createdAt.toISOString(),
                      kpis: this.safeJson<Record<string, number>>(s.kpis, {}),
                  }))
                : [];
        const fallbackSeries = riskSeries.status === 'fulfilled' ? riskSeries.value : [];

        const series = snapSeries.length ? snapSeries : fallbackSeries;
        const deltas = this.computeDeltas(series);

        return {
            generatedAt: new Date().toISOString(),
            series,
            deltas,
        };
    }

    private riskTimelineSeries(raw: ExecutiveRawSignals): ExecutiveTrendPoint[] {
        return raw.riskTimeline.map((t) => ({
            date: t.date,
            kpis: {
                'workforce-resilience': t.orgResilience,
                'risk-exposure': Math.max(0, 100 - t.averageRisk),
                'knowledge-coverage': t.documentationCoverage,
                'knowledge-concentration': Math.max(0, 100 - t.knowledgeConcentration),
                'technical-debt': Math.max(0, 100 - t.technicalDebt),
            },
        }));
    }

    private computeDeltas(series: ExecutiveTrendPoint[]) {
        if (series.length < 2) {
            return Object.entries(KPI_LABELS).map(([key, label]) => ({
                key,
                label,
                change: 0,
                direction: 'stable' as const,
            }));
        }
        const first = series[0].kpis;
        const last = series[series.length - 1].kpis;
        const keys = new Set([...Object.keys(first), ...Object.keys(last)]);
        return [...keys]
            .filter((key) => KPI_LABELS[key])
            .map((key) => {
                const change = Math.round((last[key] ?? 0) - (first[key] ?? 0));
                return {
                    key,
                    label: KPI_LABELS[key],
                    change,
                    direction: (Math.abs(change) < 2 ? 'stable' : change > 0 ? 'improving' : 'declining') as
                        | 'improving'
                        | 'stable'
                        | 'declining',
                };
            });
    }

    private safeJson<T>(value: string, fallback: T): T {
        try {
            return JSON.parse(value) as T;
        } catch {
            return fallback;
        }
    }
}
