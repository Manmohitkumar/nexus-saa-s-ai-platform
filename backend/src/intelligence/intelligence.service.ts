import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getIntelligenceOverview, getIntelligenceInsights } from '../phoenix/phoenix.mock';
import { getReasoningSnapshot } from '../phoenix/phoenix.reasoning';
import { WorkflowPlanningService } from './planning.service';
import { IntelligenceOrchestratorService } from './orchestrator.service';
import { CrossDomainAnalysisService } from './cross-domain.service';
import { OrganizationalHealthService } from './organizational-health.service';
import { PredictiveIntelligenceService } from './predictive.service';
import { RecommendationIntelligenceService } from './recommendation.service';
import { ExplainabilityService } from './explainability.service';
import { EventIntelligenceService } from './event-intelligence.service';
import {
    EventAssessment,
    IntelligenceInsight,
    IntelligenceTimelinePoint,
    OrganizationHealth,
    OrchestratedResponse,
    PredictiveInsight,
    ReasoningTrace,
} from './intelligence.types';

/**
 * Organizational Intelligence Service — public facade for Feature 7. It keeps
 * the legacy intelligence surface (overview / insights / reason) while exposing
 * the reusable Organizational Intelligence APIs: ask, plan, catalog, health,
 * architecture, predictions, recommendations, events, explain, and timeline.
 */
@Injectable()
export class IntelligenceService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly planning: WorkflowPlanningService,
        private readonly orchestrator: IntelligenceOrchestratorService,
        private readonly crossDomain: CrossDomainAnalysisService,
        private readonly healthService: OrganizationalHealthService,
        private readonly predictive: PredictiveIntelligenceService,
        private readonly recommendationService: RecommendationIntelligenceService,
        private readonly explainability: ExplainabilityService,
        private readonly eventIntelligence: EventIntelligenceService,
    ) {}

    // Legacy surface.
    getIntelligenceOverview() {
        return getIntelligenceOverview();
    }

    getIntelligenceInsights() {
        return getIntelligenceInsights();
    }

    getReasoningSnapshot(query: string) {
        return getReasoningSnapshot(query);
    }

    // Feature 7 — reusable Organizational Intelligence APIs.
    ask(query: string): Promise<OrchestratedResponse> {
        return this.orchestrator.orchestrate(query);
    }

    plan(query: string) {
        return this.planning.plan(query);
    }

    async insights(kind?: string): Promise<IntelligenceInsight[]> {
        const rows = await this.prisma.intelligenceInsight.findMany({
            where: kind ? { kind } : undefined,
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        return rows.map((r) => this.rowToInsight(r));
    }

    async insight(id: string): Promise<{ insight: IntelligenceInsight; trace: ReasoningTrace }> {
        const row = await this.prisma.intelligenceInsight.findUnique({ where: { id } });
        if (!row) throw new NotFoundException(`Insight not found: ${id}`);
        const insight = this.rowToInsight(row);
        return { insight, trace: this.explainability.explainInsight(insight) };
    }

    sweep() {
        return this.crossDomain.sweep();
    }

    health(): Promise<OrganizationHealth> {
        return this.healthService.health();
    }

    predictions(): Promise<PredictiveInsight[]> {
        return this.predictive.predictions();
    }

    recommendations() {
        return this.recommendationService.recommendations();
    }

    async architecture(): Promise<IntelligenceInsight[]> {
        const drafts = await this.crossDomain.architectureInsights();
        await this.crossDomain.persistDrafts(drafts);
        return this.insights('architecture');
    }

    events(): EventAssessment[] {
        return this.eventIntelligence.recent();
    }

    async timeline(): Promise<IntelligenceTimelinePoint[]> {
        const rows = await this.prisma.intelligenceInsight.findMany({
            orderBy: { createdAt: 'desc' },
            take: 40,
            select: { id: true, kind: true, title: true, confidence: true, priority: true, createdAt: true },
        });
        return rows.map((r) => ({
            id: r.id,
            kind: r.kind,
            title: r.title,
            confidence: r.confidence,
            priority: r.priority,
            createdAt: r.createdAt.toISOString(),
        }));
    }

    explain(id: string): Promise<ReasoningTrace> {
        return this.insight(id).then((r) => r.trace);
    }

    private rowToInsight(r: {
        id: string;
        kind: string;
        title: string;
        summary: string;
        detail: string;
        confidence: number;
        priority: string;
        evidence: string;
        affectedSystems: string;
        relatedDecisions: string;
        relatedDocs: string;
        recommendation: string;
        action: string;
        source: string;
        trigger: string;
        status: string;
        createdAt: Date;
    }): IntelligenceInsight {
        const parseJson = <T>(value: string, fallback: T): T => {
            try {
                return JSON.parse(value) as T;
            } catch {
                return fallback;
            }
        };
        return {
            id: r.id,
            kind: r.kind as IntelligenceInsight['kind'],
            title: r.title,
            summary: r.summary,
            detail: r.detail,
            confidence: r.confidence,
            priority: r.priority as IntelligenceInsight['priority'],
            evidence: parseJson<IntelligenceInsight['evidence']>(r.evidence, []),
            affectedSystems: parseJson<string[]>(r.affectedSystems, []),
            relatedDecisions: parseJson<string[]>(r.relatedDecisions, []),
            relatedDocs: parseJson<string[]>(r.relatedDocs, []),
            recommendation: r.recommendation,
            action: r.action,
            source: r.source,
            trigger: r.trigger,
            status: r.status as IntelligenceInsight['status'],
            createdAt: r.createdAt.toISOString(),
        };
    }
}
