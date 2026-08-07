import { Controller, Get, Query } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';

@Controller('intelligence')
export class IntelligenceController {
    constructor(private readonly intelligenceService: IntelligenceService) { }

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
}
