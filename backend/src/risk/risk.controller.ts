import { Controller, Get, Param, Query } from '@nestjs/common';
import { RiskService } from './risk.service';

@Controller('risk')
export class RiskController {
    constructor(private readonly riskService: RiskService) { }

    @Get('heatmap')
    getHeatmap() {
        return this.riskService.getHeatmap();
    }

    @Get('nodes')
    getNodes(@Query('mode') mode = 'organization', @Query('team') team?: string) {
        return this.riskService.getIntelligence(mode, team);
    }

    @Get('nodes/:id')
    getNode(@Param('id') id: string) {
        return this.riskService.getNodeDetail(id);
    }

    @Get('predictions')
    getPredictions() {
        return this.riskService.getPredictions();
    }

    @Get('timeline')
    getTimeline() {
        return this.riskService.getTimeline();
    }

    @Get('health')
    getHealth() {
        return this.riskService.getHealth();
    }

    @Get('recommendations')
    getRecommendations() {
        return this.riskService.getRecommendations();
    }
}
