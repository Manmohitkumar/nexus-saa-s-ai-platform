import { Module } from '@nestjs/common';
import { ExecutiveController } from './executive.controller';
import { ExecutiveService } from './executive.service';
import { ExecutiveAggregatorService } from './executive-aggregator.service';
import { ExecutiveKpiService } from './executive-kpi.service';
import { ExecutiveSummaryService } from './executive-summary.service';
import { ExecutiveForecastService } from './executive-forecast.service';
import { ExecutiveTrendService } from './executive-trend.service';
import { ExecutivePrioritizationService } from './executive-prioritization.service';
import { ExecutiveReportingService } from './executive-reporting.service';
import { ExecutiveBriefingService } from './executive-briefing.service';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { RiskModule } from '../risk/risk.module';
import { WorkforceModule } from '../workforce/workforce.module';
import { DecisionsModule } from '../decisions/decisions.module';
import { DocsModule } from '../docs/docs.module';
import { AgentsModule } from '../agents/agents.module';

/**
 * Feature 8 — Executive Intelligence Dashboard module. It only consumes the
 * reusable APIs of Features 1-7 (intelligence facade, risk engine, workforce
 * resilience, decision analytics, documentation engine, agent fleet) and adds
 * presentation + prioritization. No new intelligence engines live here.
 */
@Module({
    imports: [IntelligenceModule, RiskModule, WorkforceModule, DecisionsModule, DocsModule, AgentsModule],
    controllers: [ExecutiveController],
    providers: [
        ExecutiveService,
        ExecutiveAggregatorService,
        ExecutiveKpiService,
        ExecutiveSummaryService,
        ExecutiveForecastService,
        ExecutiveTrendService,
        ExecutivePrioritizationService,
        ExecutiveReportingService,
        ExecutiveBriefingService,
    ],
    exports: [ExecutiveService],
})
export class ExecutiveModule {}
