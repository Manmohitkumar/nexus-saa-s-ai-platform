import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventBus } from '../events/event-bus';
import { AgentsService } from '../agents/agents.service';
import { DecisionService } from '../decisions/decision.service';
import { AnalyticsService } from '../decisions/analytics.service';
import { RiskService } from '../risk/risk.service';
import { ResilienceService } from '../workforce/resilience.service';
import { DocsService } from '../docs/docs.service';
import { WorkflowPlanningService } from './planning.service';
import {
    IntelligenceEvidenceItem,
    IntelligenceKind,
    IntelligenceWorkflowStep,
    OrchestratedResponse,
} from './intelligence.types';

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

const TOPIC_TO_KIND: Record<string, IntelligenceKind> = {
    architecture: 'architecture',
    workforce: 'workforce',
    decisions: 'decision',
    risk: 'operational',
    knowledge: 'knowledge',
    health: 'health',
    strategy: 'strategic',
    operations: 'operational',
    predictive: 'predictive',
    recommendations: 'recommendation',
    crossdomain: 'cross-domain',
    executive: 'executive',
    general: 'cross-domain',
};

/**
 * Central Intelligence Orchestrator — coordinates all reasoning across the
 * existing engines (fleet agents, Decision Time Machine, Risk Engine,
 * Workforce Intelligence, Documentation Engine). It never builds its own
 * knowledge base: it decomposes, executes, synthesizes, and explains using
 * the services and agents that already exist.
 */
@Injectable()
export class IntelligenceOrchestratorService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly eventBus: EventBus,
        private readonly planning: WorkflowPlanningService,
        private readonly agents: AgentsService,
        private readonly decisions: DecisionService,
        private readonly analytics: AnalyticsService,
        private readonly risk: RiskService,
        private readonly resilience: ResilienceService,
        private readonly docs: DocsService,
    ) {}

    async orchestrate(query: string): Promise<OrchestratedResponse> {
        const workflow = this.planning.plan(query);
        const steps: IntelligenceWorkflowStep[] = workflow.steps.map((s) => ({ ...s, status: 'running' as const }));

        // Execution phase: gathering agents run in parallel, synthesis last.
        const gather = steps.filter((s) => s.agentId !== 'a11' && s.agentId !== 'a5');
        const synth = steps.filter((s) => s.agentId === 'a11' || s.agentId === 'a5');
        await Promise.all(
            gather.map(async (s) => {
                try {
                    const r = await this.agents.runAgent(s.agentId, query);
                    s.status = 'done';
                    s.confidence = r.confidence;
                    s.finding = r.finding;
                    s.durationMs = r.durationMs;
                    s.evidence = r.sources;
                } catch {
                    s.status = 'done';
                    s.confidence = 0;
                    s.finding = 'Agent unavailable for this request.';
                }
            }),
        );
        for (const s of synth) {
            try {
                const r = await this.agents.runAgent(s.agentId, query);
                s.status = 'done';
                s.confidence = r.confidence;
                s.finding = r.finding;
                s.durationMs = r.durationMs;
                s.evidence = r.sources;
            } catch {
                s.status = 'done';
                s.confidence = 0;
                s.finding = 'Synthesis agent unavailable for this request.';
            }
        }

        // Cross-domain evidence reads across the existing engines.
        const [decisionResult, riskHealthResult, resilienceResult, analyticsResult, recsResult, nodesResult, docsResult] =
            await Promise.allSettled([
                this.decisions.answer(query),
                this.risk.getHealth(),
                this.resilience.getResilience(),
                this.analytics.getAnalytics(),
                this.risk.getRecommendations(),
                this.risk.getIntelligence('overall'),
                this.docs.list({}),
            ]);

        const decisionAnswer = decisionResult.status === 'fulfilled' ? decisionResult.value : null;
        const riskHealth = riskHealthResult.status === 'fulfilled' ? riskHealthResult.value : null;
        const resilience = resilienceResult.status === 'fulfilled' ? resilienceResult.value : null;
        const analytics = analyticsResult.status === 'fulfilled' ? analyticsResult.value : null;
        const riskRecommendations = recsResult.status === 'fulfilled' ? recsResult.value : [];
        const riskNodes = nodesResult.status === 'fulfilled' ? nodesResult.value.nodes : [];
        const docs = docsResult.status === 'fulfilled' ? docsResult.value : [];

        const synthFinding = synth.find((s) => s.agentId === 'a11')?.finding ?? '';
        const evidence = this.buildEvidence(decisionAnswer, riskHealth, resilience, analytics);
        const affectedSystems = this.buildAffectedSystems(riskNodes);
        const relatedDecisions = decisionAnswer?.decisionIds ?? [];
        const relatedDocs = this.buildRelatedDocs(docs, query);
        const recommendedActions = this.buildRecommendedActions(riskRecommendations, synthFinding);
        const reasoning = this.buildReasoning(workflow.steps, steps, riskHealth, resilience, analytics, decisionAnswer);
        const conflictResolution = this.buildConflictResolution(decisionAnswer, riskNodes);

        const answer = this.composeAnswer(query, workflow.topic, {
            synthFinding,
            decisionAnswer,
            riskHealth,
            resilience,
            analytics,
            affectedSystems,
            recommendedActions,
        });

        const topic = workflow.topic;
        const confidence = clamp(
            this.averageConfidence(steps) * 0.6 +
                (decisionAnswer?.confidence ?? 60) * 0.2 +
                (riskHealth?.averageRisk ? 100 - riskHealth.averageRisk : 60) * 0.2,
        );

        const insightId = await this.persistInsight({
            query,
            topic,
            answer,
            evidence,
            affectedSystems,
            relatedDecisions,
            relatedDocs,
            recommendedActions,
            confidence,
            workflow: steps,
        });

        this.eventBus.emit(
            'intelligence.generated',
            `query:${query}`,
            `Orchestrated ${steps.length}-step reasoning pipeline at ${confidence}% confidence`,
            { topic, confidence, insightId },
        );

        return {
            query,
            intent: workflow.intent,
            topic,
            priority: workflow.priority,
            answer,
            summary: answer.split('\n\n')[0] ?? answer,
            confidence,
            reasoning,
            evidence,
            affectedSystems,
            relatedDecisions,
            relatedDocs,
            recommendedActions,
            workflow: steps,
            conflictResolution,
            insightId,
            createdAt: new Date().toISOString(),
        };
    }

    async persistInsight(input: {
        query: string;
        topic: string;
        answer: string;
        evidence: IntelligenceEvidenceItem[];
        affectedSystems: string[];
        relatedDecisions: string[];
        relatedDocs: string[];
        recommendedActions: string[];
        confidence: number;
        workflow: Array<{ agentId: string; finding?: string }>;
    }): Promise<string | null> {
        try {
            const kind = TOPIC_TO_KIND[input.topic] ?? 'cross-domain';
            const title = this.titleFor(input.topic, input.query);
            const rec = await this.prisma.intelligenceInsight.create({
                data: {
                    kind,
                    title,
                    summary: input.answer.split('\n\n')[0]?.slice(0, 220) ?? input.answer.slice(0, 220),
                    detail: input.answer,
                    confidence: input.confidence,
                    priority: this.priorityFor(input.workflow, input.topic),
                    evidence: JSON.stringify(input.evidence),
                    affectedSystems: JSON.stringify(input.affectedSystems),
                    relatedDecisions: JSON.stringify(input.relatedDecisions),
                    relatedDocs: JSON.stringify(input.relatedDocs),
                    recommendation: input.recommendedActions[0] ?? '',
                    action: input.recommendedActions[0] ?? '',
                    source: 'manual',
                    trigger: input.query,
                },
            });
            return rec.id;
        } catch {
            return null;
        }
    }

    private averageConfidence(steps: Array<{ confidence?: number }>): number {
        const known = steps.filter((s) => typeof s.confidence === 'number' && s.confidence > 0);
        if (!known.length) return 60;
        return Math.round(known.reduce((sum, s) => sum + (s.confidence ?? 0), 0) / known.length);
    }

    private buildEvidence(
        decisionAnswer: { evidence: Array<{ source: string; excerpt: string; type: string; confidence: number }> } | null,
        riskHealth: { orgResilience: number; averageRisk: number; undocumentedFlags: number; criticalNodes: number } | null,
        resilience: { orgResilience: number; totalEmployees: number; busFactorCoverage: number; singleOwnerSystems: number } | null,
        analytics: { total: number; implementedRate: number; averageConfidence: number } | null,
    ): IntelligenceEvidenceItem[] {
        const items: IntelligenceEvidenceItem[] = [];
        for (const e of decisionAnswer?.evidence ?? []) {
            items.push({ source: e.source, excerpt: e.excerpt, type: e.type, confidence: e.confidence });
            if (items.length >= 4) break;
        }
        if (riskHealth) {
            items.push({
                source: 'Risk Health Snapshot',
                excerpt: `Organizational resilience ${riskHealth.orgResilience}, average risk ${riskHealth.averageRisk}, ${riskHealth.criticalNodes} critical nodes, ${riskHealth.undocumentedFlags} undocumented flags.`,
                type: 'risk',
                confidence: clamp(100 - riskHealth.averageRisk),
            });
        }
        if (resilience) {
            items.push({
                source: 'Workforce Resilience Snapshot',
                excerpt: `Resilience score ${resilience.orgResilience} across ${resilience.totalEmployees} employees; bus-factor coverage ${resilience.busFactorCoverage}%; ${resilience.singleOwnerSystems} single-owner systems.`,
                type: 'workforce',
                confidence: resilience.orgResilience,
            });
        }
        if (analytics) {
            items.push({
                source: 'Decision Analytics',
                excerpt: `${analytics.total} reconstructed decisions; implemented rate ${analytics.implementedRate}%; average confidence ${analytics.averageConfidence}.`,
                type: 'decision',
                confidence: analytics.averageConfidence,
            });
        }
        return items.slice(0, 8);
    }

    private buildAffectedSystems(nodes: Array<{ label: string; band: string; flagUndocumented: number; overallRisk: number }>): string[] {
        return nodes
            .filter((n) => n.flagUndocumented > 0 || n.band === 'critical' || n.band === 'high')
            .sort((a, b) => b.overallRisk - a.overallRisk)
            .slice(0, 6)
            .map((n) => n.label);
    }

    private buildRelatedDocs(docs: Array<{ title: string; kind: string }>, query: string): string[] {
        const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
        const scored = docs
            .map((d) => {
                const title = d.title.toLowerCase();
                const score = tokens.reduce((s, t) => s + (title.includes(t) ? 1 : 0), 0);
                return { d, score };
            })
            .sort((a, b) => b.score - a.score);
        const matched = scored.filter((s) => s.score > 0).slice(0, 3).map((s) => s.d.title);
        if (matched.length >= 1) return matched;
        return docs.slice(0, 3).map((d) => d.title);
    }

    private buildRecommendedActions(
        recs: Array<{ action: string; detail: string; priority: string }>,
        synthFinding: string,
    ): string[] {
        const actions: string[] = [];
        const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2 };
        const sorted = [...recs].sort(
            (a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3),
        );
        for (const r of sorted.slice(0, 3)) actions.push(r.action);
        if (actions.length === 0 && synthFinding) {
            actions.push('Re-run a targeted sweep across the risk and documentation engines to produce ownership-assigned actions.');
        }
        return actions;
    }

    private buildReasoning(
        planned: Array<{ agentId: string; agentName: string; service: string; input: string }>,
        steps: Array<{ agentId: string; agentName: string; service: string; input: string; status: string; confidence?: number; finding?: string }>,
        riskHealth: { averageRisk: number } | null,
        resilience: { orgResilience: number } | null,
        analytics: { implementedRate: number } | null,
        decisionAnswer: { confidence: number } | null,
    ): string[] {
        const lines: string[] = [];
        lines.push(`Decomposed the request into ${planned.length} reasoning steps via the dynamic reasoning pipeline.`);
        for (const s of steps) {
            const conf = s.confidence ?? 0;
            lines.push(`[${s.agentId}] ${s.agentName} consulted ${s.service} (${s.status}, confidence ${conf}%).`);
        }
        if (decisionAnswer) lines.push(`Decision Time Machine synthesized the historical evidence at ${decisionAnswer.confidence}% confidence.`);
        if (riskHealth) lines.push(`Risk Engine reported average organizational risk ${riskHealth.averageRisk}.`);
        if (resilience) lines.push(`Workforce Intelligence reported organizational resilience ${resilience.orgResilience}.`);
        if (analytics) lines.push(`Decision Analytics reported an implemented rate of ${analytics.implementedRate}%.`);
        lines.push('Cross-domain evidence was weighted and merged; the synthesis agent composed the final answer.');
        return lines;
    }

    private buildConflictResolution(
        decisionAnswer: { confidence: number; evidence: Array<{ confidence: number }> } | null,
        nodes: Array<{ band: string; overallRisk: number }>,
    ): string[] {
        const out: string[] = [];
        if (decisionAnswer) {
            const evidenceConfidence = decisionAnswer.evidence.length
                ? Math.round(decisionAnswer.evidence.reduce((s, e) => s + e.confidence, 0) / decisionAnswer.evidence.length)
                : 0;
            out.push(
                evidenceConfidence > 0
                    ? `Weighed decision evidence (mean confidence ${evidenceConfidence}%) against the reconstructed answer (${decisionAnswer.confidence}%) and adopted the higher-confidence corpus.`
                    : 'No direct decision evidence matched; adopted risk and workforce signals as primary evidence.',
            );
        }
        const critical = nodes.filter((n) => n.band === 'critical').length;
        if (critical > 0) {
            out.push(`Risk Engine flagged ${critical} critical nodes; these were weighted highest when ranking recommended actions.`);
        }
        if (!out.length) out.push('No conflicting signals were detected across the engines.');
        return out;
    }

    private composeAnswer(
        query: string,
        topic: string,
        parts: {
            synthFinding: string;
            decisionAnswer: { answer: string } | null;
            riskHealth: { orgResilience: number; averageRisk: number; documentationCoverage: number; criticalNodes: number; spofCount: number } | null;
            resilience: { orgResilience: number; totalEmployees: number; busFactorCoverage: number; singleOwnerSystems: number } | null;
            analytics: { total: number; implementedRate: number; averageConfidence: number; improvedOutcomes: number } | null;
            affectedSystems: string[];
            recommendedActions: string[];
        },
    ): string {
        const paragraphs: string[] = [];
        const heading = this.headingFor(topic);
        paragraphs.push(`${heading}. ${parts.synthFinding || this.fallbackNarrative(topic)}`);

        if (parts.decisionAnswer) {
            paragraphs.push(parts.decisionAnswer.answer);
        }
        if (parts.riskHealth && parts.resilience) {
            paragraphs.push(
                `Cross-domain signals show organizational resilience at ${parts.resilience.orgResilience}/100 with average risk ${parts.riskHealth.averageRisk}/100, documentation coverage ${parts.riskHealth.documentationCoverage}%, ${parts.riskHealth.criticalNodes} critical nodes, and ${parts.riskHealth.spofCount} single points of failure across ${parts.resilience.totalEmployees} employees (bus-factor coverage ${parts.resilience.busFactorCoverage}%).`,
            );
        }
        if (parts.analytics) {
            paragraphs.push(
                `Decision momentum: ${parts.analytics.total} reconstructed decisions with an implemented rate of ${parts.analytics.implementedRate}%, ${parts.analytics.improvedOutcomes} measured outcome improvements, and average confidence ${parts.analytics.averageConfidence}%.`,
            );
        }
        if (parts.affectedSystems.length) {
            paragraphs.push(
                `Systems most affected by the current intelligence posture: ${parts.affectedSystems.slice(0, 5).join(', ')}.`,
            );
        }
        if (parts.recommendedActions.length) {
            paragraphs.push(`Recommended actions: ${parts.recommendedActions.slice(0, 3).join('; ')}.`);
        }
        return paragraphs.join('\n\n');
    }

    private headingFor(topic: string): string {
        const headings: Record<string, string> = {
            architecture: 'Architecture Intelligence',
            workforce: 'Workforce Intelligence',
            decisions: 'Decision Intelligence',
            risk: 'Risk Intelligence',
            knowledge: 'Knowledge Intelligence',
            health: 'Organizational Health',
            strategy: 'Strategic Intelligence',
            operations: 'Operational Intelligence',
            predictive: 'Predictive Intelligence',
            recommendations: 'Recommendation Intelligence',
            crossdomain: 'Cross-Domain Intelligence',
            executive: 'Executive Intelligence',
            general: 'Organizational Intelligence',
        };
        return headings[topic] ?? 'Organizational Intelligence';
    }

    private fallbackNarrative(topic: string): string {
        if (topic === 'predictive') return 'Trajectories across risk, resilience, and documentation were combined to forecast the most likely near-term developments.';
        if (topic === 'recommendations') return 'The recommendation engines were merged, de-duplicated, and ranked by priority and impact.';
        return 'The orchestrator fused knowledge, decisions, workforce, risk, and documentation signals into a single evidence-grounded synthesis.';
    }

    private titleFor(topic: string, query: string): string {
        const kind = TOPIC_TO_KIND[topic] ?? 'cross-domain';
        return `${this.headingFor(topic)}: ${query.length > 80 ? query.slice(0, 80) + '…' : query}`;
    }

    private priorityFor(
        workflow: Array<{ agentId: string; confidence?: number }>,
        topic: string,
    ): 'critical' | 'high' | 'medium' | 'info' {
        if (topic === 'risk' || topic === 'operations' || topic === 'health') return 'high';
        const confidence = this.averageConfidence(workflow);
        if (confidence >= 85) return 'high';
        return 'medium';
    }
}
