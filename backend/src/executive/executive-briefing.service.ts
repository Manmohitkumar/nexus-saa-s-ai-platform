import { Injectable } from '@nestjs/common';
import {
    ExecutiveBriefing,
    ExecutiveBriefingItem,
    ExecutiveBriefingSection,
    ExecutiveForecast,
    ExecutiveKpi,
    ExecutiveRawSignals,
    ExecutiveRecommendation,
    ExecutiveSummary,
} from './executive.types';

/**
 * Executive Briefing Service — the Board Briefing Center. Composes a period
 * briefing (daily/weekly/monthly/quarterly/annual) that reuses the existing
 * intelligence, forecast, workforce, documentation, decision, and risk signals.
 * No new reasoning: it organizes and narrates what the features already produce.
 */
@Injectable()
export class ExecutiveBriefingService {
    briefing(
        raw: ExecutiveRawSignals,
        kpis: ExecutiveKpi[],
        execSummary: ExecutiveSummary,
        forecast: ExecutiveForecast,
        recommendations: ExecutiveRecommendation[],
        period: string,
        previous: Record<string, number> = {},
    ): ExecutiveBriefing {
        const byKey = (key: string) => kpis.find((k) => k.key === key);

        const achievements: ExecutiveBriefingItem[] = execSummary.topFindings
            .filter((f) => f.priority !== 'critical')
            .slice(0, 5)
            .map((f) => ({ title: f.title, detail: f.summary }));
        const risks: ExecutiveBriefingItem[] = recommendations
            .filter((r) => r.tier === 'executive-critical' || r.tier === 'urgent')
            .slice(0, 6)
            .map((r) => ({ title: r.title, detail: r.justification, priority: r.tier }));

        const architecture = byKey('technical-debt');
        const workforce = byKey('workforce-resilience');
        const docs = byKey('documentation-health');
        const decisions = byKey('decision-effectiveness');

        const architectureChanges = raw.insights
            .filter((i) => i.kind === 'architecture')
            .slice(0, 5)
            .map((i) => ({ title: i.title, detail: i.summary, priority: i.priority }));

        const workforceItems: ExecutiveBriefingItem[] = [
            {
                title: `Resilience ${workforce?.value ?? 50}/100`,
                detail: `Bus factor coverage ${raw.riskHealth?.busFactorCoverage ?? 0}%; ${raw.riskHealth?.singleOwnerSystems ?? 0} single-owner systems; ${raw.resilience?.criticalEmployees.length ?? 0} critical employees.`,
            },
            ...raw.insights
                .filter((i) => i.kind === 'workforce')
                .slice(0, 3)
                .map((i) => ({ title: i.title, detail: i.summary })),
        ];

        const docItems: ExecutiveBriefingItem[] = [
            {
                title: `Documentation health ${docs?.value ?? 50}/100`,
                detail: `Coverage ${raw.docHealth?.coverage ?? 0}%; freshness ${raw.docHealth?.freshness ?? 0}%; ${raw.docHealth?.undocumentedFlags ?? 0} undocumented flags.`,
            },
            ...raw.docRecommendations.slice(0, 3).map((r) => ({ title: r.title, detail: r.detail, priority: r.priority })),
        ];

        const decisionItems: ExecutiveBriefingItem[] = [
            {
                title: `Decision effectiveness ${decisions?.value ?? 50}/100`,
                detail: `Confidence ${raw.analytics?.averageConfidence ?? 0}%; implemented rate ${raw.analytics?.implementedRate ?? 0}%; improved outcomes ${raw.analytics?.improvedOutcomes ?? 0}/${raw.analytics?.totalOutcomes ?? 0}.`,
            },
            ...execSummary.topFindings
                .filter((f) => f.kind === 'decision')
                .slice(0, 3)
                .map((f) => ({ title: f.title, detail: f.summary })),
        ];

        const comparisons: ExecutiveBriefingItem[] = kpis.map((k) => {
            const delta = previous[k.key] === undefined ? 0 : k.value - previous[k.key];
            return {
                title: `${k.label}: ${k.value} (${delta > 0 ? '+' : ''}${delta})`,
                detail: `${k.trend} vs previous snapshot${previous[k.key] === undefined ? ' — no prior snapshot yet' : ''}`,
                priority: k.status,
            };
        });

        const sections: ExecutiveBriefingSection[] = [
            {
                id: 'achievements',
                title: 'Achievements',
                content: achievements.length
                    ? [`${achievements.length} positive signals in the top findings.`]
                    : ['No notable achievements detected in this window.'],
                items: achievements,
            },
            {
                id: 'risks',
                title: 'Risks Requiring Attention',
                content: risks.length
                    ? [`${risks.length} executive-critical or urgent recommendations are open.`]
                    : ['No executive-critical risks are currently open.'],
                items: risks,
            },
            {
                id: 'architecture',
                title: 'Architecture Evolution',
                content: [
                    `Technical debt health ${architecture?.value ?? 50}/100 (${architecture?.status ?? 'watch'}).`,
                    ...architectureChanges.map((a) => a.detail),
                ],
                items: architectureChanges,
            },
            {
                id: 'workforce',
                title: 'Workforce Resilience',
                content: [`Workforce resilience is ${workforce?.value ?? 50}/100 (${workforce?.status ?? 'watch'}).`],
                items: workforceItems,
            },
            {
                id: 'documentation',
                title: 'Documentation Health',
                content: [`Documentation health is ${docs?.value ?? 50}/100 (${docs?.status ?? 'watch'}).`],
                items: docItems,
            },
            {
                id: 'decisions',
                title: 'Decision Outcomes',
                content: [`Decision effectiveness is ${decisions?.value ?? 50}/100 (${decisions?.status ?? 'watch'}).`],
                items: decisionItems,
            },
            {
                id: 'ai-recommendations',
                title: 'AI Recommendations',
                content: [`${recommendations.length} prioritized recommendations across ${new Set(recommendations.map((r) => r.source)).size} engines.`],
                items: recommendations.slice(0, 8).map((r) => ({
                    title: r.title,
                    detail: r.expectedBenefit,
                    priority: r.tier,
                })),
            },
            {
                id: 'comparisons',
                title: 'Period-over-Period Comparison',
                content: [`${kpis.filter((k) => k.change !== 0).length} KPIs changed since the last snapshot.`],
                items: comparisons,
            },
        ];

        const businessImpact = [
            `Organizational health ${execSummary.topFindings.length ? 'is informed by ' + execSummary.topFindings.length + ' prioritized findings.' : 'shows no prioritized findings yet.'}`,
            `Forecast stability is ${forecast.overallStability}/100 across ${forecast.points.length} projections.`,
            ...recommendations.slice(0, 3).map((r) => `${r.title} — ${r.expectedBenefit}`),
        ];

        const prioritizedPlan = recommendations.slice(0, 6).map((r, index) => ({
            rank: index + 1,
            title: r.title,
            tier: r.tier,
            owner: r.owner,
            eta: r.eta,
        }));

        const periodLabel = period.charAt(0).toUpperCase() + period.slice(1);
        const confidence = kpis.length
            ? Math.round(kpis.reduce((s, k) => s + k.confidence, 0) / kpis.length)
            : 0;

        return {
            period,
            title: `${periodLabel} Executive Briefing`,
            generatedAt: new Date().toISOString(),
            summary: `This ${period} briefing aggregates the Organizational Digital Brain across workforce, knowledge, decisions, risk, and documentation. Overall health is ${kpis.find((k) => k.key === 'org-health')?.value ?? 50}/100 with ${risks.length} open executive-level risks and ${recommendations.length} prioritized recommendations.`,
            sections,
            confidence,
            businessImpact,
            prioritizedPlan,
        };
    }
}
