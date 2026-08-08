import { Module } from '@nestjs/common';
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';
import { RiskIntelligenceService } from './risk-intelligence.service';
import { RiskPredictiveService } from './risk-predictive.service';
import { RiskHealthService } from './risk-health.service';
import { RiskRecommendationService } from './risk-recommendation.service';
import { WorkforceModule } from '../workforce/workforce.module';

@Module({
  imports: [WorkforceModule],
  controllers: [RiskController],
  providers: [RiskService, RiskIntelligenceService, RiskPredictiveService, RiskHealthService, RiskRecommendationService],
  exports: [RiskService, RiskIntelligenceService, RiskPredictiveService, RiskHealthService, RiskRecommendationService],
})
export class RiskModule {}
