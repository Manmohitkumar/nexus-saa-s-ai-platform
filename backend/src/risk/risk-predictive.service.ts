import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskIntelligenceService } from './risk-intelligence.service';
import { RiskPrediction, RiskTimelinePoint } from './risk.types';

/**
 * Predictive Analytics Service — extrapolates organizational risk from the
 * historical RiskSnapshot series plus the current risk intelligence graph, and
 * produces evidence-backed forecasts with confidence, trend direction and
 * mitigation guidance.
 */
@Injectable()
export class RiskPredictiveService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly intelligence: RiskIntelligenceService,
    ) {}

    async getTimeline(): Promise<RiskTimelinePoint[]> {
        const snapshots = await this.prisma.riskSnapshot.findMany({ orderBy: { createdAt: 'asc' } });
        return snapshots.map((s) => ({
            date: s.createdAt.toISOString(),
            orgResilience: s.orgResilience,
            averageRisk: s.averageRisk,
            documentationCoverage: s.documentationCoverage,
            knowledgeConcentration: s.knowledgeConcentration,
            technicalDebt: s.technicalDebt,
        }));
    }

    async getPredictions(): Promise<RiskPrediction[]> {
        const [timeline, view] = await Promise.all([
            this.getTimeline(),
            this.intelligence.getIntelligence('organization'),
        ]);

        const predictions: RiskPrediction[] = [];

        const predict = (values: number[], offset = 4): number => {
            if (values.length < 2) return values[0] ?? 0;
            const xs = values.map((_, i) => i);
            const n = values.length;
            const xMean = xs.reduce((s, x) => s + x, 0) / n;
            const yMean = values.reduce((s, y) => s + y, 0) / n;
            const slope =
                xs.reduce((s, x) => s + (x - xMean) * (values[x] - yMean), 0) /
                xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
            const intercept = yMean - slope * xMean;
            const last = n - 1 + offset;
            return Math.max(0, Math.min(100, Math.round(intercept + slope * last)));
        };

        const orgResilience = predict(timeline.map((t) => t.orgResilience));
        const averageRisk = predict(timeline.map((t) => t.averageRisk));
        const documentationCoverage = predict(timeline.map((t) => t.documentationCoverage));
        const technicalDebt = predict(timeline.map((t) => t.technicalDebt));

        const last = timeline[timeline.length - 1];
        const currentResilience = last?.orgResilience ?? 0;
        const currentRisk = last?.averageRisk ?? 0;

        const resilienceDelta = orgResilience - currentResilience;
        const riskDelta = averageRisk - currentRisk;

        const slope = (values: number[]) => {
            if (values.length < 2) return 0;
            const n = values.length;
            const xs = values.map((_, i) => i);
            const xMean = xs.reduce((s, x) => s + x, 0) / n;
            const yMean = values.reduce((s, y) => s + y, 0) / n;
            return (
                xs.reduce((s, x) => s + (x - xMean) * (values[x] - yMean), 0) /
                xs.reduce((s, x) => s + (x - xMean) ** 2, 0)
            );
        };

        const steady = (s: number) => Math.abs(s) < 0.6;

        predictions.push(
            {
                id: 'org-resilience',
                title: 'Organizational resilience trajectory',
                severity: orgResilience < 40 ? 'critical' : resilienceDelta < 0 ? 'warning' : 'info',
                detail: `Forecast organizational resilience of ${orgResilience} in 4 weeks (currently ${currentResilience}).`,
                evidence: [`${timeline.length} weekly snapshots`, `delta ${resilienceDelta >= 0 ? '+' : ''}${resilienceDelta}`],
                contributingFactors: [],
                confidence: Math.min(95, 50 + timeline.length * 5),
                trend: resilienceDelta < -2 ? 'increasing' : resilienceDelta > 2 ? 'decreasing' : 'stable',
                mitigation: resilienceDelta < 0
                    ? ['Prioritize documentation of undocumented flags', 'Expand ownership on single-owner systems', 'Execute knowledge-transfer on top critical employees']
                    : ['Maintain current documentation and ownership cadence'],
            },
            {
                id: 'average-risk',
                title: 'Average knowledge-criticality',
                severity: riskDelta > 3 || averageRisk >= 60 ? 'warning' : 'info',
                detail: `Forecast average employee knowledge-criticality of ${averageRisk} in 4 weeks (currently ${currentRisk}).`,
                evidence: [`slope ${slope(timeline.map((t) => t.averageRisk)).toFixed(2)}/week`, `delta ${riskDelta >= 0 ? '+' : ''}${riskDelta}`],
                contributingFactors: [],
                confidence: Math.min(95, 50 + timeline.length * 5),
                trend: riskDelta > 2 ? 'increasing' : riskDelta < -2 ? 'decreasing' : 'stable',
                mitigation: riskDelta > 0 ? ['Reduce single-owner concentration', 'Incentivize cross-team pairing'] : [],
            },
            {
                id: 'documentation-coverage',
                title: 'Documentation coverage outlook',
                severity: documentationCoverage < 50 ? 'warning' : 'info',
                detail: `Forecast documentation coverage of ${documentationCoverage} in 4 weeks (currently ${last?.documentationCoverage ?? 0}).`,
                evidence: [`coverage delta ${documentationCoverage - (last?.documentationCoverage ?? 0) >= 0 ? '+' : ''}${documentationCoverage - (last?.documentationCoverage ?? 0)}`],
                contributingFactors: [],
                confidence: Math.min(95, 50 + timeline.length * 5),
                trend: slope(timeline.map((t) => t.documentationCoverage)) < -1 ? 'increasing' : 'decreasing',
                mitigation: [],
            },
            {
                id: 'technical-debt',
                title: 'Technical debt exposure',
                severity: technicalDebt >= 55 ? 'warning' : 'info',
                detail: `Forecast technical debt health of ${technicalDebt} in 4 weeks (currently ${last?.technicalDebt ?? 0}).`,
                evidence: [`debt delta ${technicalDebt - (last?.technicalDebt ?? 0) >= 0 ? '+' : ''}${technicalDebt - (last?.technicalDebt ?? 0)}`],
                contributingFactors: [],
                confidence: Math.min(95, 50 + timeline.length * 5),
                trend: slope(timeline.map((t) => t.technicalDebt)) > 1 ? 'increasing' : 'decreasing',
                mitigation: ['Schedule documentation sprints', 'Add flag metadata for undocumented systems'],
            },
        );

        // Per-node predictions — highest risk trajectory contributors.
        const risky = view.nodes
            .filter((n) => n.kind !== 'team')
            .sort((a, b) => b.overallRisk - a.overallRisk)
            .slice(0, 3);
        for (const n of risky) {
            const pressure = Math.round(
                (100 - n.documentationCoverage) * 0.3 + n.knowledgeConcentration * 0.3 + n.operationalExposure * 0.2 + n.criticalDependency * 0.2,
            );
            if (pressure < 45) continue;
            const predicted = Math.min(100, n.overallRisk + Math.round((pressure - 40) / 10));
            const delta = predicted - n.overallRisk;
            const increasing = delta > 0 && n.overallRisk >= 50;
            const stable = steady(delta);
            const riskTrend: RiskPrediction['trend'] = increasing ? 'increasing' : stable ? 'stable' : 'decreasing';
            const severity: RiskPrediction['severity'] = n.band === 'critical' ? 'critical' : n.band === 'high' ? 'warning' : 'info';
            const mitigation = increasing
                ? [`Expand ownership on ${n.label}`, `Document ${n.flagUndocumented} undocumented flag(s)`, 'Add monitoring on critical dependency paths']
                : [`Maintain current coverage for ${n.label}`];
            predictions.push({
                id: `node-${n.id}`,
                title: `${n.label} risk trajectory`,
                severity,
                detail: `Forecast ${n.label} overall risk rising to ${predicted} (currently ${n.overallRisk}).`,
                evidence: [
                    `${n.documentationCoverage}% documentation coverage`,
                    n.knowledgeConcentration >= 60 ? `${n.knowledgeConcentration}% ownership concentration` : `${n.owner ?? 'no'} owner`,
                    `${n.criticalDependency}% critical-dependency pressure`,
                ],
                contributingFactors: n.contributingFactors,
                confidence: Math.round(50 + Math.abs(delta) * 6 + n.aiConfidence * 0.2),
                trend: riskTrend,
                mitigation,
            });
        }

        return predictions;
    }
}
