import { Module } from '@nestjs/common';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceService } from './intelligence.service';
import { WorkflowPlanningService } from './planning.service';
import { IntelligenceOrchestratorService } from './orchestrator.service';
import { CrossDomainAnalysisService } from './cross-domain.service';
import { OrganizationalHealthService } from './organizational-health.service';
import { PredictiveIntelligenceService } from './predictive.service';
import { RecommendationIntelligenceService } from './recommendation.service';
import { ExplainabilityService } from './explainability.service';
import { EventIntelligenceService } from './event-intelligence.service';
import { AgentsModule } from '../agents/agents.module';
import { DecisionsModule } from '../decisions/decisions.module';
import { WorkforceModule } from '../workforce/workforce.module';
import { RiskModule } from '../risk/risk.module';
import { DocsModule } from '../docs/docs.module';

@Module({
    imports: [AgentsModule, DecisionsModule, WorkforceModule, RiskModule, DocsModule],
    controllers: [IntelligenceController],
    providers: [
        IntelligenceService,
        WorkflowPlanningService,
        IntelligenceOrchestratorService,
        CrossDomainAnalysisService,
        OrganizationalHealthService,
        PredictiveIntelligenceService,
        RecommendationIntelligenceService,
        ExplainabilityService,
        EventIntelligenceService,
    ],
    exports: [IntelligenceService],
})
export class IntelligenceModule { }
