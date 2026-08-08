import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { DecisionService } from './decision.service';
import { TimelineService } from './timeline.service';
import { ReplayService } from './replay.service';
import { CorrelationService } from './correlation.service';
import { AnalyticsService } from './analytics.service';
import type { TimelineMode } from './decision.types';

@Controller('decisions')
export class DecisionsController {
    constructor(
        private readonly decisionService: DecisionService,
        private readonly timelineService: TimelineService,
        private readonly replayService: ReplayService,
        private readonly correlationService: CorrelationService,
        private readonly analyticsService: AnalyticsService,
    ) {}

    @Get()
    list(
        @Query('domain') domain?: string,
        @Query('status') status?: string,
        @Query('team') team?: string,
        @Query('query') query?: string,
    ) {
        return this.decisionService.list({ domain, status, team, query });
    }

    @Get('timeline')
    timeline(
        @Query('mode') mode: TimelineMode = 'chronological',
        @Query('domain') domain?: string,
        @Query('status') status?: string,
        @Query('team') team?: string,
        @Query('query') query?: string,
    ) {
        return this.timelineService.getTimeline(mode, { domain, status, team, query });
    }

    @Get('analytics')
    analytics() {
        return this.analyticsService.getAnalytics();
    }

    @Get('answer')
    answer(@Query('question') question = '') {
        return this.decisionService.answer(question);
    }

    @Post('reconstruct')
    reconstruct(@Query('query') query = '') {
        return this.decisionService.reconstruct(query);
    }

    @Get(':id/replay')
    replay(@Param('id') id: string) {
        return this.replayService.getReplay(id);
    }

    @Get(':id/correlations')
    correlations(@Param('id') id: string) {
        return this.correlationService.getCorrelations(id);
    }

    @Get(':id')
    detail(@Param('id') id: string) {
        return this.decisionService.detail(id);
    }
}
