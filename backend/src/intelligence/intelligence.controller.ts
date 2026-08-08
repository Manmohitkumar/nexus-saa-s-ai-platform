import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';

@Controller('intelligence')
export class IntelligenceController {
    constructor(private readonly intelligenceService: IntelligenceService) { }

    // Legacy surface.
    @Get('overview')
    getOverview() {
        return this.intelligenceService.getIntelligenceOverview();
    }

    @Get('insights')
    getInsights() {
        return this.intelligenceService.getIntelligenceInsights();
    }

    @Get('reason')
    getReasoning(@Query('query') query = '') {
        return this.intelligenceService.getReasoningSnapshot(query);
    }

    // Feature 7 — reusable Organizational Intelligence APIs.
    @Post('ask')
    ask(@Body() body: { query: string }) {
        return this.intelligenceService.ask(body.query);
    }

    @Post('plan')
    plan(@Body() body: { query: string }) {
        return this.intelligenceService.plan(body.query);
    }

    @Get('insight')
    getInsightsCatalog(@Query('kind') kind?: string) {
        return this.intelligenceService.insights(kind);
    }

    @Get('insight/:id')
    getInsight(@Param('id') id: string) {
        return this.intelligenceService.insight(id);
    }

    @Post('sweep')
    sweep() {
        return this.intelligenceService.sweep();
    }

    @Get('health')
    getHealth() {
        return this.intelligenceService.health();
    }

    @Get('architecture')
    getArchitecture() {
        return this.intelligenceService.architecture();
    }

    @Get('predictions')
    getPredictions() {
        return this.intelligenceService.predictions();
    }

    @Get('recommendations')
    getRecommendations() {
        return this.intelligenceService.recommendations();
    }

    @Get('events')
    getEvents() {
        return this.intelligenceService.events();
    }

    @Get('timeline')
    getTimeline() {
        return this.intelligenceService.timeline();
    }

    @Get('explain/:id')
    explain(@Param('id') id: string) {
        return this.intelligenceService.explain(id);
    }
}
