import { Injectable } from '@nestjs/common';
import {
    ExecutiveKpi,
    ExecutiveKpiCategory,
    ExecutiveRawSignals,
    ExecutiveStatus,
    ExecutiveTrendDirection,
} from './executive.types';

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

/**
 * Executive KPI Service — aggregates existing Feature 1-7 scores into a
 * reusable Strategic KPI grid. Values are always 0-100 (higher = better) so
 * charts and trends stay comparable. Every KPI carries source attribution,
 * confidence, delta vs the previous snapshot, and a drill-down route into the
 * originating feature workspace.
 */
@Injectable()
export class ExecutiveKpiService {
    private readonly drillRoutes: Record<string, string> = {
        'org-health': '/dashboard/intelligence',
        'workforce-resilience': '/dashboard/workforce',
        'bus-factor-coverage': '/dashboard/risk',
        'risk-exposure': '/dashboard/risk',
        'knowledge-concentration': '/dashboard/risk',
        'documentation-health': '/dashboard/documentation',
        'knowledge-coverage': '/dashboard/documentation',
        'decision-effectiveness': '/dashboard/decisions',
        'decision-confidence': '/dashboard/decisions',
        'technical-debt': '/dashboard/risk',
        'innovation-velocity': '/dashboard/intelligence',
        'engineering-productivity': '/dashboard/documentation',
    };

    build(raw: ExecutiveRawSignals, previous: Record<string, number> = {}): ExecutiveKpi[] {
        const riskHealth = raw.riskHealth;
        const analytics = raw.analytics;
        const docHealth = raw.docHealth;
        const resilience = raw.resilience;

        const implementedCount = analytics ? Math.round(analytics.total * analytics.implementedRate * 0.01) : 0;
        const strategicInsights = raw.insights.filter((i) =>
            ['strategic', 'architecture', 'innovation', 'predictive'].includes(i.kind),
        ).length;
        const innovationVelocity = clamp(Math.min(100, implementedCount * 15 + strategicInsights * 8));
        const engineeringProductivity = clamp(
            0.4 * (docHealth?.freshness ?? 0) +
                0.3 * (analytics?.implementedRate ?? 0) +
                0.3 * (analytics?.averageConfidence ?? 0),
        );

        const defs: Array<{
            key: string;
            label: string;
            category: ExecutiveKpiCategory;
            value: number;
            unit: 'score' | 'percent';
            summary: string;
            sources: Array<{ source: string; label: string; value: number; confidence: number }>;
        }> = [
            {
                key: 'org-health',
                label: 'Organizational Health',
                category: 'health',
                value: raw.orgHealth?.overall ?? 50,
                unit: 'score',
                summary: 'Composite health across workforce resilience, knowledge, decisions, and risk exposure.',
                sources: raw.orgHealth
                    ? raw.orgHealth.pillars.map((p) => ({
                          source: 'Organizational Health',
                          label: p.label,
                          value: p.score,
                          confidence: p.score,
                      }))
                    : [],
            },
            {
                key: 'workforce-resilience',
                label: 'Workforce Resilience',
                category: 'workforce',
                value: resilience?.orgResilience ?? 50,
                unit: 'score',
                summary: 'Organizational resilience to knowledge loss from workforce changes.',
                sources: resilience
                    ? [
                          {
                              source: 'Resilience Snapshot',
                              label: 'Bus factor coverage',
                              value: resilience.busFactorCoverage,
                              confidence: resilience.orgResilience,
                          },
                          {
                              source: 'Resilience Snapshot',
                              label: 'Single-owner systems',
                              value: resilience.singleOwnerSystems,
                              confidence: resilience.orgResilience,
                          },
                      ]
                    : [],
            },
            {
                key: 'bus-factor-coverage',
                label: 'Bus Factor Coverage',
                category: 'workforce',
                value: riskHealth?.busFactorCoverage ?? 50,
                unit: 'percent',
                summary: 'Share of systems with distributed ownership beyond a single owner.',
                sources: riskHealth
                    ? [
                          {
                              source: 'Risk Health Snapshot',
                              label: 'Bus factor coverage',
                              value: riskHealth.busFactorCoverage,
                              confidence: riskHealth.busFactorCoverage,
                          },
                      ]
                    : [],
            },
            {
                key: 'risk-exposure',
                label: 'Risk Exposure',
                category: 'risk',
                value: riskHealth ? clamp(100 - riskHealth.averageRisk) : 50,
                unit: 'score',
                summary: 'Inverse of average organizational risk; higher is healthier.',
                sources: riskHealth
                    ? [
                          {
                              source: 'Risk Health Snapshot',
                              label: 'Average risk',
                              value: riskHealth.averageRisk,
                              confidence: clamp(100 - riskHealth.averageRisk),
                          },
                      ]
                    : [],
            },
            {
                key: 'knowledge-concentration',
                label: 'Knowledge Concentration',
                category: 'risk',
                value: riskHealth ? clamp(100 - riskHealth.knowledgeConcentration) : 50,
                unit: 'score',
                summary: 'Health score reflecting how evenly knowledge is distributed (higher = less concentrated).',
                sources: riskHealth
                    ? [
                          {
                              source: 'Risk Health Snapshot',
                              label: 'Knowledge concentration',
                              value: riskHealth.knowledgeConcentration,
                              confidence: clamp(100 - riskHealth.knowledgeConcentration),
                          },
                      ]
                    : [],
            },
            {
                key: 'documentation-health',
                label: 'Documentation Health',
                category: 'knowledge',
                value: docHealth?.health ?? 50,
                unit: 'score',
                summary: 'Overall documentation quality from the Documentation Engine.',
                sources: docHealth
                    ? [
                          {
                              source: 'Documentation Health',
                              label: 'Coverage',
                              value: docHealth.coverage,
                              confidence: docHealth.health,
                          },
                          {
                              source: 'Documentation Health',
                              label: 'Freshness',
                              value: docHealth.freshness,
                              confidence: docHealth.health,
                          },
                      ]
                    : [],
            },
            {
                key: 'knowledge-coverage',
                label: 'Documentation Coverage',
                category: 'knowledge',
                value: docHealth?.coverage ?? 50,
                unit: 'percent',
                summary: 'Share of organizational knowledge covered by current documentation.',
                sources: docHealth
                    ? [
                          {
                              source: 'Documentation Health',
                              label: 'Coverage',
                              value: docHealth.coverage,
                              confidence: docHealth.coverage,
                          },
                      ]
                    : [],
            },
            {
                key: 'decision-effectiveness',
                label: 'Decision Effectiveness',
                category: 'decisions',
                value: analytics
                    ? clamp(
                          analytics.implementedRate * 0.6 +
                              (analytics.totalOutcomes ? (analytics.improvedOutcomes / analytics.totalOutcomes) * 100 * 0.4 : 0),
                      )
                    : 50,
                unit: 'score',
                summary: 'How effectively decisions are implemented and produce improved outcomes.',
                sources: analytics
                    ? [
                          {
                              source: 'Decision Analytics',
                              label: 'Implemented rate',
                              value: analytics.implementedRate,
                              confidence: analytics.averageConfidence,
                          },
                          {
                              source: 'Decision Analytics',
                              label: 'Improved outcomes',
                              value: analytics.totalOutcomes ? (analytics.improvedOutcomes / analytics.totalOutcomes) * 100 : 0,
                              confidence: analytics.averageConfidence,
                          },
                      ]
                    : [],
            },
            {
                key: 'decision-confidence',
                label: 'Decision Confidence',
                category: 'decisions',
                value: analytics?.averageConfidence ?? 50,
                unit: 'percent',
                summary: 'Average confidence of reconstructed decisions.',
                sources: analytics
                    ? [
                          {
                              source: 'Decision Analytics',
                              label: 'Average confidence',
                              value: analytics.averageConfidence,
                              confidence: analytics.averageConfidence,
                          },
                      ]
                    : [],
            },
            {
                key: 'technical-debt',
                label: 'Technical Debt Health',
                category: 'architecture',
                value: riskHealth ? clamp(100 - riskHealth.technicalDebt) : 50,
                unit: 'score',
                summary: 'Inverse of the architecture technical debt score.',
                sources: riskHealth
                    ? [
                          {
                              source: 'Risk Health Snapshot',
                              label: 'Technical debt',
                              value: riskHealth.technicalDebt,
                              confidence: clamp(100 - riskHealth.technicalDebt),
                          },
                      ]
                    : [],
            },
            {
                key: 'innovation-velocity',
                label: 'Innovation Velocity',
                category: 'innovation',
                value: innovationVelocity,
                unit: 'score',
                summary: 'Momentum of implemented decisions and strategic intelligence insights.',
                sources: [
                    {
                        source: 'Decision Analytics',
                        label: 'Implemented decisions',
                        value: implementedCount,
                        confidence: analytics?.averageConfidence ?? 0,
                    },
                    {
                        source: 'Organizational Intelligence',
                        label: 'Strategic insights',
                        value: strategicInsights,
                        confidence: Math.round(
                            raw.insights
                                .filter((i) => ['strategic', 'architecture', 'innovation', 'predictive'].includes(i.kind))
                                .reduce((s, i) => s + i.confidence, 0) / Math.max(1, strategicInsights),
                        ),
                    },
                ],
            },
            {
                key: 'engineering-productivity',
                label: 'Engineering Productivity',
                category: 'productivity',
                value: engineeringProductivity,
                unit: 'score',
                summary: 'Blend of documentation freshness, decision implementation, and decision confidence.',
                sources: [
                    {
                        source: 'Documentation Health',
                        label: 'Freshness',
                        value: docHealth?.freshness ?? 0,
                        confidence: docHealth?.health ?? 0,
                    },
                    {
                        source: 'Decision Analytics',
                        label: 'Implemented rate',
                        value: analytics?.implementedRate ?? 0,
                        confidence: analytics?.averageConfidence ?? 0,
                    },
                ],
            },
        ];

        return defs.map((def) => {
            const previousValue = previous[def.key];
            const change = previousValue === undefined ? 0 : Math.round(def.value - previousValue);
            const trend = this.trendFor(def.value, change);
            return {
                key: def.key,
                label: def.label,
                value: def.value,
                unit: def.unit,
                category: def.category,
                status: this.statusFor(def.value),
                trend,
                confidence: this.confidenceFor(def.sources),
                change,
                drillDown: this.drillRoutes[def.key] ?? '/dashboard',
                sources: def.sources,
                summary: def.summary,
            };
        });
    }

    private statusFor(value: number): ExecutiveStatus {
        if (value >= 75) return 'healthy';
        if (value >= 50) return 'watch';
        return 'critical';
    }

    private trendFor(value: number, change: number): ExecutiveTrendDirection {
        if (Math.abs(change) < 2) return 'stable';
        const improving = change > 0;
        // For high scores a drop is more meaningful; use absolute direction.
        return improving ? 'improving' : 'declining';
    }

    private confidenceFor(sources: Array<{ confidence: number }>): number {
        if (!sources.length) return 0;
        return Math.round(sources.reduce((s, src) => s + src.confidence, 0) / sources.length);
    }
}
