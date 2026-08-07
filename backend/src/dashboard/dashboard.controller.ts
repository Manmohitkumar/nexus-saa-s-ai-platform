import { Controller, Get } from '@nestjs/common';
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

    @Get('timeline')
    getTimeline() {
        return this.dashboardService.getDecisionTimeline();
    }
}
