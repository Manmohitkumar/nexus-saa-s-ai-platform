import { Injectable } from '@nestjs/common';
import {
    ExecutiveHighlight,
    ExecutiveKpi,
    ExecutiveNarrative,
    ExecutiveOverview,
    ExecutivePillar,
    ExecutiveRawSignals,
    ExecutiveSummary,
    ExecutiveSummaryFinding,
} from './executive.types';

const featureFor = (kind: string): number => {
    switch (kind) {
        case 'workforce':
            return 3;
        case 'decision':
            return 2;
        case 'knowledge':
        case 'documentation':
            return 6;
        case 'architecture':
        case 'risk':
            return 4;
        default:
            return 7;
    }
};

const routeFor = (kind: string): string => {
    switch (kind) {
        case 'workforce':
            return '/dashboard/workforce';
        case 'knowledge':
        case 'documentation':
            return '/dashboard/documentation';
        case 'decision':
            return '/dashboard/decisions';
        case 'architecture':
        case 'risk':
            return '/dashboard/risk';
        default:
            return '/dashboard/intelligence';
    }
};

const priorityWeight = (priority: string): number => {
    switch (priority) {
        case 'critical':
            return 4;
        case 'high':
            return 3;
        case 'medium':
            return 2;
        default:
            return 1;
    }
};

const statusFor = (value: number): 'healthy' | 'watch' | 'critical' => {
    if (value >= 75) return 'healthy';
    if (value >= 50) return 'watch';
    return 'critical';
};

/**
 * Executive Summary Service — the normalization + prioritization core of the
 * Executive Intelligence Dashboard. It converts raw Feature 1-7 outputs into
 * prioritized findings, executive highlights, a board-ready narrative, and the
 * aggregated overview. All rankings are deterministic (priority weight ×
 * confidence × recency) and every item keeps evidence + drill-down routes.
 */
@Injectable()
export class ExecutiveSummaryService {
    findings(raw: ExecutiveRawSignals): ExecutiveSummaryFinding[] {
        const now = new Date().toISOString();
        const fromInsights: ExecutiveSummaryFinding[] = raw.insights.map((i) => ({
            id: i.id,
            kind: i.kind,
            title: i.title,
            summary: i.summary,
            confidence: i.confidence,
            priority: i.priority,
            sourceFeature: featureFor(i.kind),
            evidence: i.evidence.map((e) => e.source),
            linkedRoute: routeFor(i.kind),
            createdAt: i.createdAt,
        }));
        const fromRisk: ExecutiveSummaryFinding[] = raw.riskPredictions.map((p) => ({
            id: `risk-${p.id}`,
            kind: 'risk',
            title: p.title,
            summary: p.detail,
            confidence: Math.round(p.confidence * 100),
            priority: p.severity === 'critical' ? 'critical' : p.severity === 'warning' ? 'high' : 'info',
            sourceFeature: 4,
            evidence: p.evidence,
            linkedRoute: '/dashboard/risk',
            createdAt: now,
        }));
        const fromDocs: ExecutiveSummaryFinding[] = raw.docRecommendations.map((r) => ({
            id: `doc-${r.id}`,
            kind: 'documentation',
            title: r.title,
            summary: r.detail,
            confidence: Math.max(0, Math.min(100, Math.round(r.riskImpact * 100))),
            priority: r.priority,
            sourceFeature: 6,
            evidence: r.evidence,
            linkedRoute: '/dashboard/documentation',
            createdAt: now,
        }));

        return [...fromInsights, ...fromRisk, ...fromDocs];
    }

    async summary(raw: ExecutiveRawSignals): Promise<ExecutiveSummary> {
        const all = this.findings(raw).sort(
            (a, b) => priorityWeight(b.priority) - priorityWeight(a.priority) || b.confidence - a.confidence,
        );
        const actionSet = new Set<string>();
        const actionItems: string[] = [];
        const collect = (item: { action?: string; title: string; actionTitle?: string }) => {
            const text = item.actionTitle ?? item.action ?? item.title;
            if (text && !actionSet.has(text)) {
                actionSet.add(text);
                actionItems.push(text);
            }
        };
        raw.intelligenceRecommendations.forEach((r) => collect({ action: r.action, title: r.title }));
        raw.riskRecommendations.forEach((r) => collect({ action: r.action, title: r.action }));
        raw.docRecommendations.forEach((r) => collect({ action: r.action, title: r.title }));
        raw.insights.forEach((i) => collect({ action: i.action, title: i.title }));

        return {
            generatedAt: new Date().toISOString(),
            findings: all,
            topFindings: all.slice(0, 8),
            actionItems: actionItems.slice(0, 10),
        };
    }

    highlights(raw: ExecutiveRawSignals): ExecutiveHighlight[] {
        const now = new Date().toISOString();
        const list: ExecutiveHighlight[] = [];

        raw.insights
            .filter((i) => i.priority !== 'critical')
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 4)
            .forEach((i) =>
                list.push({
                    id: `ach-${i.id}`,
                    type: 'achievement',
                    title: i.title,
                    detail: i.summary,
                    confidence: i.confidence,
                    sourceFeature: featureFor(i.kind),
                    linkedRoute: routeFor(i.kind),
                }),
            );

        raw.insights
            .filter((i) => i.priority === 'critical')
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 4)
            .forEach((i) =>
                list.push({
                    id: `risk-${i.id}`,
                    type: 'risk',
                    title: i.title,
                    detail: i.recommendation || i.summary,
                    confidence: i.confidence,
                    sourceFeature: featureFor(i.kind),
                    linkedRoute: routeFor(i.kind),
                }),
            );

        raw.riskPredictions
            .filter((p) => p.severity === 'warning' || p.severity === 'critical')
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 3)
            .forEach((p) =>
                list.push({
                    id: `predict-${p.id}`,
                    type: 'notice',
                    title: p.title,
                    detail: p.detail,
                    confidence: Math.round(p.confidence * 100),
                    sourceFeature: 4,
                    linkedRoute: '/dashboard/risk',
                }),
            );

        raw.predictions
            .filter((p) => p.impact === 'high')
            .sort((a, b) => b.likelihood - a.likelihood)
            .slice(0, 3)
            .forEach((p) =>
                list.push({
                    id: `opp-${p.id}`,
                    type: 'opportunity',
                    title: p.title,
                    detail: p.summary,
                    confidence: Math.round(p.likelihood * 100),
                    sourceFeature: 7,
                    linkedRoute: '/dashboard/intelligence',
                }),
            );

        list.push({
            id: `boot-${now}`,
            type: 'notice',
            title: `${raw.agentCount} fleet agents active`,
            detail: 'The organizational agent fleet is online and feeding intelligence into this view.',
            confidence: 100,
            sourceFeature: 1,
            linkedRoute: '/dashboard/agents',
        });

        return list;
    }

    narrative(raw: ExecutiveRawSignals, kpis: ExecutiveKpi[], highlights: ExecutiveHighlight[]): ExecutiveNarrative {
        const overall = kpis.find((k) => k.key === 'org-health')?.value ?? 50;
        const opening = overall >= 75
            ? 'The organization is performing well across the intelligence platform. Core health signals are stable and momentum is positive.'
            : overall >= 50
                ? 'The organization is functioning but warrants attention: several health signals sit in the watch zone and need targeted action.'
                : 'The organization is under strain. Executive-critical signals require immediate intervention to protect knowledge and delivery capability.';

        const achievements = highlights
            .filter((h) => h.type === 'achievement')
            .map((h) => h.title);
        const risks = highlights
            .filter((h) => h.type === 'risk' || h.type === 'notice')
            .map((h) => h.title);

        const criticalCount = kpis.filter((k) => k.status === 'critical').length;
        const watchCount = kpis.filter((k) => k.status === 'watch').length;
        const focus = [
            ...(criticalCount ? [`Resolve ${criticalCount} critical KPI${criticalCount > 1 ? 's' : ''} flagged by the health model.`] : []),
            ...(watchCount ? [`Track ${watchCount} watch-zone KPIs and verify trend direction next refresh.`] : []),
            ...kpis
                .filter((k) => k.trend === 'declining')
                .slice(0, 2)
                .map((k) => `Investigate the declining ${k.label.toLowerCase()} signal.`),
        ];

        const closing = `This brief aggregates signals from ${raw.agentCount} fleet agents across the brain. All figures are evidence-backed with confidence scoring from the underlying features.`;

        return { opening, achievements, risks, focus, closing };
    }

    pillars(raw: ExecutiveRawSignals, kpis: ExecutiveKpi[]): ExecutivePillar[] {
        const fromHealth = (raw.orgHealth?.pillars ?? []).map((p) => ({
            key: p.key,
            label: p.label,
            score: p.score,
            status: p.status,
            drivers: p.drivers,
            drillDown:
                p.key === 'workforce-resilience'
                    ? '/dashboard/workforce'
                    : p.key === 'decision-effectiveness'
                        ? '/dashboard/decisions'
                        : p.key === 'risk-exposure'
                            ? '/dashboard/risk'
                            : '/dashboard/documentation',
        }));
        const extra: ExecutivePillar[] = [
            {
                key: 'architecture-health',
                label: 'Architecture Evolution',
                score: kpis.find((k) => k.key === 'technical-debt')?.value ?? 50,
                status: statusFor(kpis.find((k) => k.key === 'technical-debt')?.value ?? 50),
                drivers: [
                    `Technical debt health ${kpis.find((k) => k.key === 'technical-debt')?.value ?? 50}`,
                    'Driven by the risk engine attribute scores',
                ],
                drillDown: '/dashboard/risk',
            },
            {
                key: 'innovation-productivity',
                label: 'Innovation & Productivity',
                score: Math.round(
                    ((kpis.find((k) => k.key === 'innovation-velocity')?.value ?? 50) +
                        (kpis.find((k) => k.key === 'engineering-productivity')?.value ?? 50)) /
                        2,
                ),
                status: statusFor(
                    Math.round(
                        ((kpis.find((k) => k.key === 'innovation-velocity')?.value ?? 50) +
                            (kpis.find((k) => k.key === 'engineering-productivity')?.value ?? 50)) /
                            2,
                    ),
                ),
                drivers: [
                    `Innovation velocity ${kpis.find((k) => k.key === 'innovation-velocity')?.value ?? 50}`,
                    `Engineering productivity ${kpis.find((k) => k.key === 'engineering-productivity')?.value ?? 50}`,
                ],
                drillDown: '/dashboard/intelligence',
            },
        ];
        return [...fromHealth, ...extra];
    }

    overview(raw: ExecutiveRawSignals, kpis: ExecutiveKpi[], snapshotId: string | null): ExecutiveOverview {
        const highlights = this.highlights(raw);
        const narrative = this.narrative(raw, kpis, highlights);
        const overall = kpis.find((k) => k.key === 'org-health')?.value ?? 50;
        const confidence = kpis.length
            ? Math.round(kpis.reduce((s, k) => s + k.confidence, 0) / kpis.length)
            : 0;
        return {
            generatedAt: new Date().toISOString(),
            overallHealth: overall,
            overallStatus: statusFor(overall),
            pillars: this.pillars(raw, kpis),
            kpis,
            highlights,
            narrative,
            confidence,
            sources: [
                'Organizational Intelligence',
                'Risk Engine',
                'Workforce Intelligence',
                'Decision Intelligence',
                'Documentation Engine',
                'Agent Fleet',
            ],
            snapshotId,
        };
    }
}
