import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskService } from '../risk/risk.service';
import { ResilienceService } from '../workforce/resilience.service';
import { PredictiveInsight } from './intelligence.types';

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

/**
 * Predictive Intelligence Service — projects near-term trajectories by reading
 * the existing forecast and snapshot engines (risk forecasts, health snapshots,
 * resilience). Each prediction is evidence-backed and carries a likelihood.
 */
@Injectable()
export class PredictiveIntelligenceService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly risk: RiskService,
        private readonly resilience: ResilienceService,
    ) {}

    async predictions(): Promise<PredictiveInsight[]> {
        const [predictions, docHistory, resilience] = await Promise.allSettled([
            this.risk.getPredictions(),
            this.docHistory(),
            this.resilience.getResilience(),
        ]);

        const predictionsList = predictions.status === 'fulfilled' ? predictions.value : [];
        const history = docHistory.status === 'fulfilled' ? docHistory.value : [];
        const resilienceSnap = resilience.status === 'fulfilled' ? resilience.value : null;

        const cards: PredictiveInsight[] = [];

        const critical = predictionsList.filter((p) => p.severity === 'critical');
        const warnings = predictionsList.filter((p) => p.severity === 'warning');
        const rising = predictionsList.filter((p) => p.trend === 'increasing');

        if (predictionsList.length) {
            const likelihood = Math.min(
                95,
                Math.round(critical.length * 20 + warnings.length * 8 + rising.length * 4 + 20),
            );
            cards.push({
                id: `pred-risk-${Date.now()}`,
                kind: 'risk',
                title: 'Risk posture trajectory',
                summary: `${critical.length} critical and ${warnings.length} warning projections over the next 4 weeks; ${rising.length} trends are rising.`,
                horizon: '4 weeks',
                likelihood,
                impact: critical.length ? 'high' : rising.length ? 'medium' : 'low',
                indicators: [
                    `${critical.length} critical projections`,
                    `${rising.length} increasing trends`,
                    `Mean confidence ${Math.round(predictionsList.reduce((s, p) => s + p.confidence, 0) / predictionsList.length)}%`,
                ],
                evidence: predictionsList.slice(0, 3).map((p) => ({
                    source: 'Risk Forecasts',
                    excerpt: p.detail,
                    type: 'risk',
                    confidence: p.confidence,
                })),
                createdAt: new Date().toISOString(),
            });
        }

        if (history.length >= 2) {
            const first = history[0];
            const last = history[history.length - 1];
            const delta = last.coverage - first.coverage;
            const perWindow = delta / (history.length - 1);
            const projected = clamp(last.coverage + perWindow * 4);
            cards.push({
                id: `pred-doc-${Date.now()}`,
                kind: 'knowledge',
                title: 'Documentation coverage trajectory',
                summary: `Coverage is ${delta >= 0 ? 'rising' : 'falling'} ${Math.abs(delta)} points across ${history.length} snapshots; projected ${projected}% within four weeks.`,
                horizon: '4 weeks',
                likelihood: clamp(60 + Math.abs(perWindow) * 5),
                impact: projected < 60 ? 'high' : perWindow < 0 ? 'medium' : 'low',
                indicators: [
                    `Latest coverage ${last.coverage}%`,
                    `${history.length} health snapshots observed`,
                    `Direction ${delta >= 0 ? 'improving' : 'deteriorating'}`,
                ],
                evidence: [
                    {
                        source: 'Documentation Health Snapshots',
                        excerpt: `Coverage moved from ${first.coverage}% to ${last.coverage}% across ${history.length} snapshots.`,
                        type: 'documentation',
                        confidence: clamp(100 - Math.abs(delta) * 3),
                    },
                ],
                createdAt: new Date().toISOString(),
            });
        }

        if (predictionsList.length) {
            const hotspots = predictionsList
                .filter((p) => p.severity === 'critical' || p.severity === 'warning')
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 4);
            cards.push({
                id: `pred-hotspot-${Date.now()}`,
                kind: 'operations',
                title: 'Bottleneck candidates',
                summary: `Most probable near-term bottlenecks: ${hotspots.map((h) => h.title).join('; ')}.`,
                horizon: 'Next quarter',
                likelihood: Math.round(hotspots.reduce((s, h) => s + h.confidence, 0) / Math.max(1, hotspots.length)),
                impact: hotspots.length >= 2 ? 'high' : 'medium',
                indicators: hotspots.map((h) => `${h.title} (${h.trend})`),
                evidence: hotspots.slice(0, 3).map((h) => ({
                    source: 'Risk Forecasts',
                    excerpt: h.detail,
                    type: 'risk',
                    confidence: h.confidence,
                })),
                createdAt: new Date().toISOString(),
            });
        }

        if (resilienceSnap) {
            const concentrationRisk = clamp(
                resilienceSnap.singleOwnerSystems * 6 +
                    resilienceSnap.criticalEmployees.length * 4 +
                    (100 - resilienceSnap.busFactorCoverage) * 0.3,
            );
            cards.push({
                id: `pred-conc-${Date.now()}`,
                kind: 'workforce',
                title: 'Knowledge concentration trend',
                summary: `Knowledge stays concentrated: ${resilienceSnap.singleOwnerSystems} single-owner systems and ${resilienceSnap.criticalEmployees.length} critical employees.`,
                horizon: 'Next quarter',
                likelihood: concentrationRisk,
                impact: concentrationRisk >= 60 ? 'high' : 'medium',
                indicators: [
                    `Bus-factor coverage ${resilienceSnap.busFactorCoverage}%`,
                    `${resilienceSnap.singleOwnerSystems} single-owner systems`,
                    `${resilienceSnap.criticalEmployees.length} critical employees`,
                ],
                evidence: [
                    {
                        source: 'Workforce Resilience Snapshot',
                        excerpt: `Resilience ${resilienceSnap.orgResilience}; bus-factor coverage ${resilienceSnap.busFactorCoverage}%.`,
                        type: 'workforce',
                        confidence: resilienceSnap.orgResilience,
                    },
                ],
                createdAt: new Date().toISOString(),
            });
        }

        return cards;
    }

    private async docHistory() {
        try {
            const snaps = await this.prisma.documentationHealthSnapshot.findMany({
                orderBy: { createdAt: 'asc' },
                take: 14,
            });
            return snaps.map((s) => ({ coverage: s.coverage }));
        } catch {
            return [];
        }
    }
}
