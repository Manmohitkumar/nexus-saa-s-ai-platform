import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventBus } from '../events/event-bus';
import { RiskService } from '../risk/risk.service';
import { ResilienceService } from '../workforce/resilience.service';
import { AnalyticsService } from '../decisions/analytics.service';
import { DocsService } from '../docs/docs.service';
import { OrganizationalHealthService } from './organizational-health.service';
import { IntelligenceEvidenceItem, IntelligenceInsight } from './intelligence.types';

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

export interface InsightDraft {
    kind: IntelligenceInsight['kind'];
    title: string;
    summary: string;
    detail: string;
    confidence: number;
    priority: IntelligenceInsight['priority'];
    evidence: IntelligenceEvidenceItem[];
    affectedSystems: string[];
    relatedDecisions: string[];
    relatedDocs: string[];
    recommendation: string;
    action: string;
    source: string;
    trigger: string;
}

const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

/**
 * Cross-Domain Analysis Service — produces reusable organizational insights by
 * intersecting the existing engines (risk, workforce, decisions, docs) across
 * domains. Insights are persisted as IntelligenceInsight records so the
 * Intelligence Explorer, Recommendation Center, and timelines stay consistent.
 */
@Injectable()
export class CrossDomainAnalysisService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly eventBus: EventBus,
        private readonly risk: RiskService,
        private readonly resilience: ResilienceService,
        private readonly analytics: AnalyticsService,
        private readonly docs: DocsService,
        private readonly health: OrganizationalHealthService,
    ) {}

    async sweep(): Promise<{ generated: number; total: number; skipped: number }> {
        const drafts = await this.drafts();
        const result = await this.persistDrafts(drafts);
        const total = await this.prisma.intelligenceInsight.count();
        this.eventBus.emit('intelligence.sweep', `generated:${result.generated}`, `Cross-domain sweep generated ${result.generated} insights (${total} total)`);
        return { generated: result.generated, total, skipped: drafts.length - result.generated };
    }

    async persistDrafts(drafts: InsightDraft[]): Promise<{ generated: number }> {
        let generated = 0;
        for (const draft of drafts) {
            const existing = await this.prisma.intelligenceInsight.findFirst({
                where: { title: draft.title },
            });
            if (existing) continue;
            await this.prisma.intelligenceInsight.create({
                data: {
                    kind: draft.kind,
                    title: draft.title,
                    summary: draft.summary,
                    detail: draft.detail,
                    confidence: draft.confidence,
                    priority: draft.priority,
                    evidence: JSON.stringify(draft.evidence),
                    affectedSystems: JSON.stringify(draft.affectedSystems),
                    relatedDecisions: JSON.stringify(draft.relatedDecisions),
                    relatedDocs: JSON.stringify(draft.relatedDocs),
                    recommendation: draft.recommendation,
                    action: draft.action,
                    source: draft.source,
                    trigger: draft.trigger,
                },
            });
            generated += 1;
        }
        return { generated };
    }

    async latestInsights(count: number): Promise<Array<{ id: string }>> {
        return this.prisma.intelligenceInsight.findMany({
            orderBy: { createdAt: 'desc' },
            take: count,
            select: { id: true },
        });
    }

    async architectureInsights(): Promise<InsightDraft[]> {
        return this.buildArchitecture();
    }

    async decisionInsights(): Promise<InsightDraft[]> {
        return this.buildDecisions();
    }

    async knowledgeInsights(): Promise<InsightDraft[]> {
        return this.buildKnowledge();
    }

    private async drafts(): Promise<InsightDraft[]> {
        const [architecture, workforce, knowledge, decision, health, predictive, strategic, executive, operational, recommendation, cross] =
            await Promise.all([
                this.buildArchitecture(),
                this.buildWorkforce(),
                this.buildKnowledge(),
                this.buildDecisions(),
                this.buildHealth(),
                this.buildPredictive(),
                this.buildStrategic(),
                this.buildExecutive(),
                this.buildOperational(),
                this.buildRecommendation(),
                this.buildCrossDomain(),
            ]);
        return [
            ...cross,
            ...health,
            ...architecture,
            ...workforce,
            ...knowledge,
            ...decision,
            ...operational,
            ...strategic,
            ...executive,
            ...predictive,
            ...recommendation,
        ];
    }

    private async buildArchitecture(): Promise<InsightDraft[]> {
        const nodes = await this.riskNodes();
        const undocumented = nodes
            .filter((n) => n.flagUndocumented > 0)
            .sort((a, b) => b.overallRisk - a.overallRisk)
            .slice(0, 5);
        if (!undocumented.length) return [];
        const affected = undocumented.map((n) => n.label);
        const evidence = undocumented.slice(0, 3).map((n) => ({
            source: `Risk Intelligence: ${n.label}`,
            excerpt: `${n.label} (${n.kind}) carries overall risk ${n.overallRisk} with ${n.flagUndocumented} undocumented flags and documentation coverage ${n.documentationCoverage}%.`,
            type: 'risk',
            confidence: clamp(100 - n.overallRisk + 10),
        }));
        return [
            {
                kind: 'architecture',
                title: 'Undocumented high-risk services',
                summary: `${affected.length} high-risk services remain undocumented, concentrating knowledge in individuals and raising single-owner risk.`,
                detail: `The following services scored high overall risk while carrying undocumented knowledge: ${affected.join(', ')}. Each combines ${Math.max(...undocumented.map((n) => n.flagUndocumented))}+ undocumented flags with elevated operational exposure, meaning ownership knowledge is not yet captured in the documentation engine.`,
                confidence: clamp(100 - Math.min(...undocumented.map((n) => n.overallRisk))),
                priority: undocumented.some((n) => n.band === 'critical') ? 'critical' : 'high',
                evidence,
                affectedSystems: affected,
                relatedDecisions: [],
                relatedDocs: [],
                recommendation: 'Prioritize documentation generation for these services before any ownership transfer or staffing change.',
                action: 'Regenerate documentation for the highest-risk undocumented services via the Documentation Engine.',
                source: 'sweep',
                trigger: 'risk × documentation cross-domain scan',
            },
        ];
    }

    private async buildWorkforce(): Promise<InsightDraft[]> {
        const resilience = await this.resilience.getResilience();
        if (!resilience.totalEmployees) return [];
        const critical = resilience.criticalEmployees.length;
        const pctOwned = pct(resilience.busFactorCoverage, 100);
        return [
            {
                kind: 'workforce',
                title: 'Single-owner knowledge concentration',
                summary: `${resilience.singleOwnerSystems} systems have a single owner and ${critical} employees are critical; bus-factor coverage is ${pctOwned}%.`,
                detail: `Of ${resilience.totalEmployees} employees, ${critical} hold critical knowledge with replacement risk above the comfort threshold. ${resilience.singleOwnerSystems} systems are owned by exactly one person, so a departure could silently degrade several subsystems before transfer plans complete.`,
                confidence: resilience.orgResilience,
                priority: critical >= 3 || resilience.singleOwnerSystems >= 5 ? 'high' : 'medium',
                evidence: [
                    {
                        source: 'Workforce Resilience Snapshot',
                        excerpt: `Resilience ${resilience.orgResilience}; ${resilience.singleOwnerSystems} single-owner systems; ${resilience.undocumentedFlags} undocumented flags; bus-factor coverage ${resilience.busFactorCoverage}%.`,
                        type: 'workforce',
                        confidence: resilience.orgResilience,
                    },
                ],
                affectedSystems: [],
                relatedDecisions: [],
                relatedDocs: [],
                recommendation: 'Pair single-owner systems with documented knowledge-transfer and succession plans.',
                action: 'Trigger knowledge-transfer planning for single-owner and critical-employee systems.',
                source: 'sweep',
                trigger: 'workforce × dependency cross-domain scan',
            },
        ];
    }

    private async buildKnowledge(): Promise<InsightDraft[]> {
        const docHealth = await this.latestDocHealth();
        const nodes = await this.riskNodes();
        const undocumentedRisk = nodes.filter((n) => n.flagUndocumented > 0 && n.band !== 'low').length;
        if (!docHealth) return [];
        return [
            {
                kind: 'knowledge',
                title: 'Documentation coverage vs knowledge risk',
                summary: `Documentation coverage is ${docHealth.coverage}% with ${docHealth.undocumentedFlags} undocumented flags, while ${undocumentedRisk} medium-or-higher risk nodes lack documentation.`,
                detail: `The documentation engine reports health ${docHealth.health}/100 (coverage ${docHealth.coverage}%, freshness ${docHealth.freshness}%, consistency ${docHealth.consistency}%). Knowledge still missing maps onto ${undocumentedRisk} non-low risk nodes, so the biggest documentation gaps align with the highest-risk knowledge.`,
                confidence: docHealth.health,
                priority: docHealth.coverage < 60 ? 'high' : 'medium',
                evidence: [
                    {
                        source: 'Documentation Health Snapshot',
                        excerpt: `Health ${docHealth.health}; coverage ${docHealth.coverage}%; freshness ${docHealth.freshness}%; ${docHealth.undocumentedFlags} undocumented flags.`,
                        type: 'documentation',
                        confidence: docHealth.health,
                    },
                ],
                affectedSystems: nodes.filter((n) => n.flagUndocumented > 0 && n.band !== 'low').slice(0, 5).map((n) => n.label),
                relatedDecisions: [],
                relatedDocs: [],
                recommendation: 'Close documentation gaps on the non-low risk nodes first to reduce knowledge-loss exposure.',
                action: 'Queue documentation regeneration for the risk-aligned missing documentation.',
                source: 'sweep',
                trigger: 'documentation × risk cross-domain scan',
            },
        ];
    }

    private async buildDecisions(): Promise<InsightDraft[]> {
        const analytics = await this.analytics.getAnalytics();
        if (!analytics.total) return [];
        const improvementRate = pct(analytics.improvedOutcomes, analytics.totalOutcomes);
        return [
            {
                kind: 'decision',
                title: 'Decision momentum and outcome value',
                summary: `${analytics.total} decisions reconstructed; ${analytics.implementedRate}% implemented and ${improvementRate}% of measured outcomes improved after implementation.`,
                detail: `The Decision Time Machine holds ${analytics.total} reconstructed decisions across ${Object.keys(analytics.byDomain).length} domains. Confidence averages ${analytics.averageConfidence}%, and the implemented rate of ${analytics.implementedRate}% indicates the organization converts validated reasoning into change. Outcome measurements improved in ${improvementRate}% of tracked outcomes.`,
                confidence: analytics.averageConfidence,
                priority: analytics.implementedRate >= 70 ? 'high' : 'medium',
                evidence: [
                    {
                        source: 'Decision Analytics',
                        excerpt: `${analytics.total} decisions; implemented rate ${analytics.implementedRate}%; improved outcomes ${analytics.improvedOutcomes}/${analytics.totalOutcomes}; average confidence ${analytics.averageConfidence}%.`,
                        type: 'decision',
                        confidence: analytics.averageConfidence,
                    },
                ],
                affectedSystems: [],
                relatedDecisions: [],
                relatedDocs: [],
                recommendation: 'Continue the decision-reconstruction cadence to keep the historical record complete for future reasoning.',
                action: 'Sweep the decision registry for new evidence and re-reconstruct the most valuable decisions.',
                source: 'sweep',
                trigger: 'decision analytics cross-domain scan',
            },
        ];
    }

    private async buildHealth(): Promise<InsightDraft[]> {
        const orgHealth = await this.health.health();
        return [
            {
                kind: 'health',
                title: 'Organizational health assessment',
                summary: `Overall organizational health is ${orgHealth.overall}/100 (${orgHealth.status}), led by ${orgHealth.pillars[0]?.label} and trailing on ${orgHealth.pillars[orgHealth.pillars.length - 1]?.label}.`,
                detail: `Composite health across ${orgHealth.pillars.length} pillars: ${orgHealth.pillars.map((p) => `${p.label} ${p.score}`).join(', ')}. The lowest pillar drives the current posture and should lead prioritization.`,
                confidence: orgHealth.overall,
                priority: orgHealth.overall < 50 ? 'critical' : orgHealth.overall < 75 ? 'high' : 'medium',
                evidence: orgHealth.pillars.flatMap((p) => p.evidence).slice(0, 3),
                affectedSystems: [],
                relatedDecisions: [],
                relatedDocs: [],
                recommendation: `Invest in the weakest pillar (${orgHealth.pillars[orgHealth.pillars.length - 1]?.label}) to move overall health out of the ${orgHealth.status} band.`,
                action: 'Open the pillar drivers and create an improvement plan for the weakest area.',
                source: 'sweep',
                trigger: 'organizational health composite',
            },
        ];
    }

    private async buildPredictive(): Promise<InsightDraft[]> {
        const predictions = await this.riskPredictions();
        const critical = predictions.filter((p) => p.severity === 'critical');
        if (!critical.length) return [];
        return [
            {
                kind: 'predictive',
                title: 'Critical risk trajectories ahead',
                summary: `${critical.length} critical risk trajectories are projected over the next four weeks with a combined confidence of ${Math.round(critical.reduce((s, p) => s + p.confidence, 0) / critical.length)}%.`,
                detail: `Projections flagged as critical: ${critical.map((p) => p.title).join('; ')}. Each is backed by contributing factors and carries an increasing/stable trend that should be actioned before the projection window closes.`,
                confidence: Math.round(critical.reduce((s, p) => s + p.confidence, 0) / critical.length),
                priority: 'high',
                evidence: critical.slice(0, 3).map((p) => ({
                    source: 'Risk Forecasts',
                    excerpt: p.detail,
                    type: 'risk',
                    confidence: p.confidence,
                })),
                affectedSystems: [],
                relatedDecisions: [],
                relatedDocs: [],
                recommendation: critical[0]?.mitigation[0] ?? 'Assign an owner to each critical trajectory and track it weekly.',
                action: critical[0]?.mitigation[0] ?? 'Create a weekly watchlist for the critical trajectories.',
                source: 'sweep',
                trigger: 'risk forecast cross-domain scan',
            },
        ];
    }

    private async buildStrategic(): Promise<InsightDraft[]> {
        const resilience = await this.resilience.getResilience();
        const analytics = await this.analytics.getAnalytics();
        if (!resilience.totalEmployees || !analytics.total) return [];
        const spread = resilience.orgResilience - analytics.implementedRate;
        return [
            {
                kind: 'strategic',
                title: 'Resilience vs decision momentum',
                summary: `Organizational resilience (${resilience.orgResilience}) runs ${spread >= 0 ? 'ahead of' : 'behind'} decision momentum (${analytics.implementedRate}% implemented).`,
                detail: `Cross-domain tension: the organization converts decisions at ${analytics.implementedRate}% while maintaining resilience of ${resilience.orgResilience}. ${spread >= 15 ? 'Resilience is comfortable but decision momentum may lag; unblock approvals and implementation.' : spread <= -15 ? 'Momentum is high but resilience is thin; slow down and harden ownership knowledge.' : 'The two are roughly balanced, so capacity exists for targeted improvement.'}`,
                confidence: clamp(Math.min(resilience.orgResilience, analytics.implementedRate)),
                priority: spread <= -15 ? 'high' : 'medium',
                evidence: [
                    {
                        source: 'Resilience × Decision Analytics',
                        excerpt: `Resilience ${resilience.orgResilience} vs implemented rate ${analytics.implementedRate}% across ${analytics.total} decisions.`,
                        type: 'strategic',
                        confidence: clamp(Math.min(resilience.orgResilience, analytics.implementedRate)),
                    },
                ],
                affectedSystems: [],
                relatedDecisions: [],
                relatedDocs: [],
                recommendation: spread <= -15
                    ? 'Invest in ownership documentation and bus-factor coverage before adding decision load.'
                    : 'Maintain the current balance while closing the lowest-scoring health pillar.',
                action: 'Re-run the organizational health assessment to prioritize the next strategic investment.',
                source: 'sweep',
                trigger: 'resilience × decision cross-domain scan',
            },
        ];
    }

    private async buildExecutive(): Promise<InsightDraft[]> {
        const resilience = await this.resilience.getResilience();
        const riskHealth = await this.riskHealth();
        const docHealth = await this.latestDocHealth();
        const analytics = await this.analytics.getAnalytics();
        return [
            {
                kind: 'executive',
                title: 'Executive intelligence brief',
                summary: `${resilience.totalEmployees} employees, resilience ${resilience.orgResilience}, average risk ${riskHealth?.averageRisk ?? 0}, documentation coverage ${docHealth?.coverage ?? 0}%, implemented decisions ${analytics.implementedRate}%.`,
                detail: `Portfolio snapshot: workforce ${resilience.totalEmployees} (bus-factor coverage ${resilience.busFactorCoverage}%, ${resilience.singleOwnerSystems} single-owner systems); risk exposure average ${riskHealth?.averageRisk ?? 'n/a'} with ${riskHealth?.criticalNodes ?? 0} critical nodes and ${riskHealth?.spofCount ?? 0} SPOFs; knowledge documented at ${docHealth?.coverage ?? 0}% coverage (health ${docHealth?.health ?? 0}); decision momentum at ${analytics.implementedRate}% implemented with ${analytics.improvedOutcomes} improved outcomes.`,
                confidence: clamp(Math.min(resilience.orgResilience, docHealth?.health ?? 60, analytics.averageConfidence)),
                priority: 'high',
                evidence: [
                    {
                        source: 'Executive Composite',
                        excerpt: `Resilience ${resilience.orgResilience}; risk ${riskHealth?.averageRisk ?? 0}; doc health ${docHealth?.health ?? 0}; decisions ${analytics.total}.`,
                        type: 'executive',
                        confidence: clamp(Math.min(resilience.orgResilience, docHealth?.health ?? 60, analytics.averageConfidence)),
                    },
                ],
                affectedSystems: [],
                relatedDecisions: [],
                relatedDocs: [],
                recommendation: 'Brief stakeholders on the portfolio snapshot and fund the weakest health pillar.',
                action: 'Generate the executive brief from the current organizational health assessment.',
                source: 'sweep',
                trigger: 'executive composite scan',
            },
        ];
    }

    private async buildOperational(): Promise<InsightDraft[]> {
        const nodes = await this.riskNodes();
        const criticalDeps = nodes
            .filter((n) => n.criticalDependency >= 70 || n.operationalExposure >= 70)
            .sort((a, b) => b.operationalExposure - a.operationalExposure)
            .slice(0, 5);
        if (!criticalDeps.length) return [];
        return [
            {
                kind: 'operational',
                title: 'Critical dependencies and operational exposure',
                summary: `${criticalDeps.length} systems carry critical dependency or operational exposure scores above 70, indicating single points of failure.`,
                detail: `Operational intelligence flagged: ${criticalDeps.map((n) => n.label).join(', ')}. These nodes combine high critical-dependency scores with elevated operational exposure, meaning a failure would propagate widely and quickly.`,
                confidence: clamp(100 - Math.min(...criticalDeps.map((n) => n.operationalExposure))),
                priority: criticalDeps.some((n) => n.band === 'critical') ? 'critical' : 'high',
                evidence: criticalDeps.slice(0, 3).map((n) => ({
                    source: `Risk Intelligence: ${n.label}`,
                    excerpt: `${n.label} — critical dependency ${n.criticalDependency}, operational exposure ${n.operationalExposure}, band ${n.band}.`,
                    type: 'operational',
                    confidence: clamp(100 - n.operationalExposure),
                })),
                affectedSystems: criticalDeps.map((n) => n.label),
                relatedDecisions: [],
                relatedDocs: [],
                recommendation: 'Add redundancy or failover plans for the highest-exposure dependencies.',
                action: 'Open the risk node details for the flagged systems and review mitigation options.',
                source: 'sweep',
                trigger: 'operational exposure scan',
            },
        ];
    }

    private async buildRecommendation(): Promise<InsightDraft[]> {
        const recs = await this.risk.getRecommendations();
        if (!recs.length) return [];
        const top = [...recs].sort(
            (a, b) =>
                ({ critical: 0, high: 1, medium: 2 })[a.priority] -
                ({ critical: 0, high: 1, medium: 2 })[b.priority],
        )[0];
        return [
            {
                kind: 'recommendation',
                title: 'Priority action queue',
                summary: `${recs.length} ownership-assigned recommendations are active; the highest priority targets ${top.linkedTarget}.`,
                detail: `Recommendation center holds ${recs.length} actions. Top item: ${top.action} (${top.detail}) owned by ${top.owner}, due ${top.eta}, with impact ${top.impact}.`,
                confidence: 80,
                priority: top.priority,
                evidence: top.evidence.slice(0, 3).map((e, i) => ({
                    source: `Risk Recommendation: ${top.linkedTarget}`,
                    excerpt: e,
                    type: 'recommendation',
                    confidence: 80 - i * 5,
                })),
                affectedSystems: top.linkedTarget ? [top.linkedTarget] : [],
                relatedDecisions: [],
                relatedDocs: [],
                recommendation: top.action,
                action: top.action,
                source: 'sweep',
                trigger: 'recommendation engine scan',
            },
        ];
    }

    private async buildCrossDomain(): Promise<InsightDraft[]> {
        const riskHealth = await this.riskHealth();
        const resilience = await this.resilience.getResilience();
        const analytics = await this.analytics.getAnalytics();
        const docHealth = await this.latestDocHealth();
        if (!riskHealth && !resilience.totalEmployees) return [];
        const riskScore = riskHealth ? clamp(100 - riskHealth.averageRisk) : 0;
        const docScore = docHealth?.health ?? 0;
        const decisionScore = analytics.total ? analytics.averageConfidence : 0;
        const resilienceScore = resilience.orgResilience;
        const weakest = Math.min(riskScore, docScore, decisionScore, resilienceScore);
        const weakestName =
            weakest === riskScore ? 'risk exposure' : weakest === docScore ? 'documentation health' : weakest === decisionScore ? 'decision confidence' : 'workforce resilience';
        return [
            {
                kind: 'cross-domain',
                title: 'Organizational intelligence snapshot',
                summary: `Resilience ${resilienceScore}, risk posture ${riskScore}, documentation health ${docScore}, decision confidence ${decisionScore}; the weakest signal is ${weakestName}.`,
                detail: `Cross-domain composite across workforce, risk, documentation, and decision engines. All four signals are above the critical threshold, but ${weakestName} (${weakest}/100) is the binding constraint for further progress.`,
                confidence: clamp(Math.min(resilienceScore, riskScore, docScore, decisionScore)),
                priority: weakest < 50 ? 'high' : 'medium',
                evidence: [
                    {
                        source: 'Cross-Domain Composite',
                        excerpt: `Workforce ${resilienceScore}, risk ${riskScore}, docs ${docScore}, decisions ${decisionScore}.`,
                        type: 'cross-domain',
                        confidence: clamp(Math.min(resilienceScore, riskScore, docScore, decisionScore)),
                    },
                ],
                affectedSystems: [],
                relatedDecisions: [],
                relatedDocs: [],
                recommendation: `Prioritize the weakest signal (${weakestName}) when sequencing the next cycle of improvements.`,
                action: `Open the ${weakestName} analysis to surface the drivers behind the weakest signal.`,
                source: 'sweep',
                trigger: 'cross-domain composite scan',
            },
        ];
    }

    private async riskNodes() {
        const view = await this.risk.getIntelligence('overall');
        return view.nodes ?? [];
    }

    private async riskHealth() {
        try {
            return await this.risk.getHealth();
        } catch {
            return null;
        }
    }

    private async riskPredictions() {
        try {
            return await this.risk.getPredictions();
        } catch {
            return [];
        }
    }

    private async latestDocHealth() {
        try {
            const snap = await this.prisma.documentationHealthSnapshot.findFirst({ orderBy: { createdAt: 'desc' } });
            if (!snap) return null;
            return snap;
        } catch {
            return null;
        }
    }
}
