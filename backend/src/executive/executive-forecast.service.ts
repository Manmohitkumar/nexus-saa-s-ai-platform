import { Injectable } from '@nestjs/common';
import {
    ExecutiveForecast,
    ExecutiveForecastPoint,
    ExecutiveKpi,
    ExecutiveKpiCategory,
    ExecutiveRawSignals,
} from './executive.types';

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

const horizonFor = (raw: string): ExecutiveForecastPoint['horizon'] => {
    const h = raw.toLowerCase();
    if (h.includes('month') || h.includes('week') || h.includes('30') || h.includes('day')) return 'immediate';
    if (h.includes('quarter') || h.includes('90')) return 'quarter';
    return 'annual';
};

const categoryFor = (kind: string): ExecutiveKpiCategory => {
    switch (kind) {
        case 'workforce':
            return 'workforce';
        case 'knowledge':
        case 'documentation':
            return 'knowledge';
        case 'decision':
            return 'decisions';
        case 'architecture':
            return 'architecture';
        case 'risk':
            return 'risk';
        case 'operations':
        case 'productivity':
            return 'productivity';
        case 'innovation':
            return 'innovation';
        default:
            return 'health';
    }
};

/**
 * Executive Forecast Service — predictive executive analytics. It consumes the
 * Feature 7 predictive outputs and the risk engine forecasts, normalizes them
 * into executive forecast cards with horizon, likelihood, impact, confidence,
 * indicators, and evidence, and derives a single organizational stability score.
 */
@Injectable()
export class ExecutiveForecastService {
    forecast(raw: ExecutiveRawSignals, kpis: ExecutiveKpi[]): ExecutiveForecast {
        const points: ExecutiveForecastPoint[] = [];

        raw.predictions.forEach((p) => {
            points.push({
                id: `exec-${p.id}`,
                category: categoryFor(p.kind),
                horizon: horizonFor(p.horizon),
                title: p.title,
                summary: p.summary,
                likelihood: clamp(p.likelihood * 100),
                impact: p.impact,
                trend: this.trendFor(p.kind, p.likelihood),
                confidence: clamp(
                    p.evidence.length
                        ? p.evidence.reduce((s, e) => s + e.confidence, 0) / p.evidence.length
                        : p.likelihood * 100,
                ),
                indicators: p.indicators,
                evidence: p.evidence.map((e) => `${e.source}: ${e.excerpt}`),
                source: 'Organizational Intelligence',
            });
        });

        raw.riskPredictions.forEach((p) => {
            points.push({
                id: `exec-risk-${p.id}`,
                category: 'risk',
                horizon: 'immediate',
                title: p.title,
                summary: p.detail,
                likelihood: clamp(p.confidence * 100),
                impact: p.severity === 'critical' ? 'high' : p.severity === 'warning' ? 'medium' : 'low',
                trend: p.trend === 'increasing' ? 'declining' : p.trend === 'decreasing' ? 'improving' : 'stable',
                confidence: clamp(p.confidence * 100),
                indicators: p.contributingFactors,
                evidence: p.evidence,
                source: 'Risk Forecasts',
            });
        });

        this.deriveTrendForecasts(raw, kpis, points);

        const horizonStats = (['immediate', 'quarter', 'annual'] as const).map((horizon) => {
            const group = points.filter((p) => p.horizon === horizon);
            return {
                horizon,
                averageLikelihood: group.length
                    ? Math.round(group.reduce((s, p) => s + p.likelihood, 0) / group.length)
                    : 0,
                averageConfidence: group.length
                    ? Math.round(group.reduce((s, p) => s + p.confidence, 0) / group.length)
                    : 0,
                averageImpact: group.length
                    ? Math.round(
                          group.reduce((s, p) => s + (p.impact === 'high' ? 3 : p.impact === 'medium' ? 2 : 1), 0) / group.length,
                      )
                    : 0,
            };
        });

        const overallStability = points.length
            ? clamp(
                  100 -
                      points.reduce((s, p) => s + (p.impact === 'high' ? 10 : 5) * (p.likelihood / 100), 0) /
                          Math.max(1, points.length),
              )
            : 100;

        return {
            generatedAt: new Date().toISOString(),
            overallStability,
            points,
            byHorizon: horizonStats,
        };
    }

    private trendFor(kind: string, likelihood: number): 'improving' | 'stable' | 'declining' {
        if (kind === 'risk' && likelihood >= 0.6) return 'declining';
        if (kind === 'knowledge' && likelihood >= 0.7) return 'improving';
        if (kind === 'workforce' && likelihood >= 0.7) return 'declining';
        return 'stable';
    }

    private deriveTrendForecasts(raw: ExecutiveRawSignals, kpis: ExecutiveKpi[], points: ExecutiveForecastPoint[]): void {
        const timeline = raw.riskTimeline;
        if (timeline.length >= 2) {
            const first = timeline[0];
            const last = timeline[timeline.length - 1];
            const riskDelta = last.averageRisk - first.averageRisk;
            points.push({
                id: `exec-trend-risk`,
                category: 'risk',
                horizon: 'quarter',
                title: 'Delivery risk trajectory',
                summary: `Average organizational risk has ${riskDelta > 0 ? 'risen' : riskDelta < 0 ? 'fallen' : 'held steady'} ${Math.abs(riskDelta)} points across ${timeline.length} observations.`,
                likelihood: clamp(50 + Math.abs(riskDelta) * 6),
                impact: riskDelta > 3 ? 'high' : 'medium',
                trend: riskDelta > 0 ? 'declining' : riskDelta < 0 ? 'improving' : 'stable',
                confidence: clamp(100 - Math.abs(riskDelta) * 3),
                indicators: [`Average risk ${last.averageRisk}`, `${timeline.length} observations`, `Delta ${riskDelta > 0 ? '+' : ''}${riskDelta}`],
                evidence: [`Risk Timeline: average risk moved from ${first.averageRisk} to ${last.averageRisk}.`],
                source: 'Risk Engine Timeline',
            });

            const debtDelta = last.technicalDebt - first.technicalDebt;
            points.push({
                id: `exec-trend-debt`,
                category: 'architecture',
                horizon: 'quarter',
                title: 'Technical debt growth',
                summary: `Technical debt has ${debtDelta > 0 ? 'grown' : debtDelta < 0 ? 'shrunk' : 'held steady'} ${Math.abs(debtDelta)} points across the observed window.`,
                likelihood: clamp(50 + Math.abs(debtDelta) * 6),
                impact: debtDelta > 3 ? 'high' : 'medium',
                trend: debtDelta > 0 ? 'declining' : debtDelta < 0 ? 'improving' : 'stable',
                confidence: clamp(100 - Math.abs(debtDelta) * 3),
                indicators: [`Technical debt ${last.technicalDebt}`, `Delta ${debtDelta > 0 ? '+' : ''}${debtDelta}`],
                evidence: [`Risk Timeline: technical debt moved from ${first.technicalDebt} to ${last.technicalDebt}.`],
                source: 'Risk Engine Timeline',
            });

            const coverDelta = last.documentationCoverage - first.documentationCoverage;
            points.push({
                id: `exec-trend-doc`,
                category: 'knowledge',
                horizon: 'quarter',
                title: 'Documentation coverage trajectory',
                summary: `Documentation coverage has ${coverDelta > 0 ? 'risen' : coverDelta < 0 ? 'fallen' : 'held steady'} ${Math.abs(coverDelta)} points across the observed window.`,
                likelihood: clamp(50 + Math.abs(coverDelta) * 6),
                impact: coverDelta < 0 ? 'high' : 'medium',
                trend: coverDelta > 0 ? 'improving' : coverDelta < 0 ? 'declining' : 'stable',
                confidence: clamp(100 - Math.abs(coverDelta) * 3),
                indicators: [`Coverage ${last.documentationCoverage}%`, `Delta ${coverDelta > 0 ? '+' : ''}${coverDelta}`],
                evidence: [`Risk Timeline: coverage moved from ${first.documentationCoverage}% to ${last.documentationCoverage}%.`],
                source: 'Risk Engine Timeline',
            });
        }

        const resilience = kpis.find((k) => k.key === 'workforce-resilience')?.value ?? 50;
        points.push({
            id: `exec-outlook-resilience`,
            category: 'workforce',
            horizon: 'quarter',
            title: 'Workforce resilience outlook',
            summary: `Workforce resilience is ${resilience >= 75 ? 'strong' : resilience >= 50 ? 'adequate but fragile in places' : 'concerning'} with bus-factor exposure flagged by the resilience snapshot.`,
            likelihood: clamp(100 - resilience),
            impact: resilience < 60 ? 'high' : 'medium',
            trend: resilience >= 75 ? 'stable' : 'declining',
            confidence: resilience,
            indicators: [`Resilience ${resilience}`, `Bus factor coverage ${raw.riskHealth?.busFactorCoverage ?? 0}%`],
            evidence: ['Workforce Resilience Snapshot aggregate.'].concat(
                raw.resilience ? [`${raw.resilience.singleOwnerSystems} single-owner systems.`] : [],
            ),
            source: 'Workforce Intelligence',
        });
    }
}
