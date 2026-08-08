import { Injectable } from '@nestjs/common';
import { RiskIntelligenceService } from './risk-intelligence.service';
import { RiskPredictiveService } from './risk-predictive.service';
import { RiskHealthService } from './risk-health.service';
import { RiskRecommendationService } from './risk-recommendation.service';
import { RiskGridCell, RiskNodeDetail, RiskHealthSnapshot, RiskPrediction, RiskRecommendation, RiskTimelinePoint } from './risk.types';

/**
 * Risk Service — feature facade for the Knowledge Risk Heatmap. It composes the
 * four Feature 4 engines (intelligence, predictive, health, recommendation)
 * and keeps the existing `/risk/heatmap` contract alive.
 */
@Injectable()
export class RiskService {
    constructor(
        private readonly intelligence: RiskIntelligenceService,
        private readonly predictive: RiskPredictiveService,
        private readonly health: RiskHealthService,
        private readonly recommendation: RiskRecommendationService,
    ) {}

    getHeatmap(): Promise<RiskGridCell[][]> {
        return this.intelligence.getHeatmapGrid();
    }

    getIntelligence(mode: string, team?: string) {
        return this.intelligence.getIntelligence(mode, team);
    }

    getNodeDetail(id: string): Promise<RiskNodeDetail | null> {
        return this.intelligence.getNodeDetail(id);
    }

    getPredictions(): Promise<RiskPrediction[]> {
        return this.predictive.getPredictions();
    }

    getTimeline(): Promise<RiskTimelinePoint[]> {
        return this.predictive.getTimeline();
    }

    getHealth(): Promise<RiskHealthSnapshot> {
        return this.health.getHealth();
    }

    getRecommendations(): Promise<RiskRecommendation[]> {
        return this.recommendation.getRecommendations();
    }
}
