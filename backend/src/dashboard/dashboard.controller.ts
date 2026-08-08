import { Controller, Get, Param, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('brief')
    getBrief() {
        return this.dashboardService.getExecutiveBrief();
    }

    @Get('graph')
    getGraphView() {
        return this.dashboardService.getBrainGraphView();
    }

    @Get('graph/node/:id')
    getGraphNode(@Param('id') id: string) {
        return this.dashboardService.getBrainGraphNode(id);
    }

    @Get('timeline')
    getTimeline(@Query('query') query = '') {
        return this.dashboardService.getDecisionTimeline(query);
    }
}
