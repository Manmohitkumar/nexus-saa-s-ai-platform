import { Injectable } from '@nestjs/common';
import { IntelligenceService } from '../intelligence/intelligence.service';
import { RiskService } from '../risk/risk.service';
import { ResilienceService } from '../workforce/resilience.service';
import { AnalyticsService } from '../decisions/analytics.service';
import { DocsService } from '../docs/docs.service';
import { AgentsService } from '../agents/agents.service';
import { ExecutiveRawSignals } from './executive.types';

/**
 * Executive Intelligence Aggregator — gathers raw signals from every feature
 * (1-7) in parallel and normalizes them into a single bundle. It creates no new
 * intelligence: it only collects, normalizes, and attributes existing outputs.
 */
@Injectable()
export class ExecutiveAggregatorService {
    constructor(
        private readonly intelligence: IntelligenceService,
        private readonly risk: RiskService,
        private readonly resilience: ResilienceService,
        private readonly analytics: AnalyticsService,
        private readonly docs: DocsService,
        private readonly agents: AgentsService,
    ) {}

    async gather(): Promise<ExecutiveRawSignals> {
        const [orgHealth, insights, predictions, intelligenceRecommendations, riskHealth, riskPredictions, riskRecommendations, riskTimeline, resilience, analytics, docHealth, docRecommendations, agentCount] =
            await Promise.allSettled([
                this.intelligence.health(),
                this.intelligence.insights(),
                this.intelligence.predictions(),
                this.intelligence.recommendations(),
                this.risk.getHealth(),
                this.risk.getPredictions(),
                this.risk.getRecommendations(),
                this.risk.getTimeline(),
                this.resilience.getResilience(),
                this.analytics.getAnalytics(),
                this.docs.getHealth(),
                this.docs.getRecommendations(),
                this.agents.getAgents().length,
            ]);

        return {
            orgHealth: orgHealth.status === 'fulfilled' ? orgHealth.value : null,
            insights: insights.status === 'fulfilled' ? insights.value : [],
            predictions: predictions.status === 'fulfilled' ? predictions.value : [],
            intelligenceRecommendations: intelligenceRecommendations.status === 'fulfilled' ? intelligenceRecommendations.value : [],
            riskHealth: riskHealth.status === 'fulfilled' ? riskHealth.value : null,
            riskPredictions: riskPredictions.status === 'fulfilled' ? riskPredictions.value : [],
            riskRecommendations: riskRecommendations.status === 'fulfilled' ? riskRecommendations.value : [],
            riskTimeline: riskTimeline.status === 'fulfilled' ? riskTimeline.value : [],
            resilience: resilience.status === 'fulfilled' ? resilience.value : null,
            analytics: analytics.status === 'fulfilled' ? analytics.value : null,
            docHealth: docHealth.status === 'fulfilled' ? docHealth.value : null,
            docRecommendations: docRecommendations.status === 'fulfilled' ? docRecommendations.value : [],
            agentCount: agentCount.status === 'fulfilled' ? agentCount.value : 0,
            gatheredAt: new Date().toISOString(),
        };
    }
}
