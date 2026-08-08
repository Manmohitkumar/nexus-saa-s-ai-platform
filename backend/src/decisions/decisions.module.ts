import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { DecisionsController } from './decisions.controller';
import { DecisionService } from './decision.service';
import { TimelineService } from './timeline.service';
import { ReplayService } from './replay.service';
import { CorrelationService } from './correlation.service';
import { AnalyticsService } from './analytics.service';

@Module({
    imports: [AgentsModule],
    controllers: [DecisionsController],
    providers: [DecisionService, TimelineService, ReplayService, CorrelationService, AnalyticsService],
    exports: [DecisionService, TimelineService, AnalyticsService],
})
export class DecisionsModule {}
