import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ExecutiveService } from './executive.service';
import { ExecutiveReportFormat } from './executive.types';

@Controller('executive')
export class ExecutiveController {
    constructor(private readonly executiveService: ExecutiveService) {}

    // Live reusable executive APIs.
    @Get('overview')
    overview() {
        return this.executiveService.overview();
    }

    @Get('kpis')
    kpis() {
        return this.executiveService.kpis();
    }

    @Get('summary')
    summary() {
        return this.executiveService.summary();
    }

    @Get('forecast')
    forecast() {
        return this.executiveService.forecast();
    }

    @Get('trends')
    trends() {
        return this.executiveService.trends();
    }

    @Get('recommendations')
    recommendations() {
        return this.executiveService.recommendations();
    }

    @Get('briefing')
    briefing(@Query('period') period = 'weekly') {
        return this.executiveService.briefing(period);
    }

    // Continuous awareness + history.
    @Post('refresh')
    refresh(@Body() body: { trigger?: string } = {}) {
        return this.executiveService.refresh(body.trigger ?? 'manual');
    }

    @Get('snapshots')
    snapshots(@Query('limit') limit?: string) {
        return this.executiveService.snapshots(limit ? Math.min(100, Number(limit)) : 30);
    }

    @Get('events')
    events() {
        return this.executiveService.events();
    }

    @Get('refresh-history')
    refreshHistory() {
        return this.executiveService.refreshHistory();
    }

    // Reporting & export.
    @Get('reports')
    reports() {
        return this.executiveService.listReports();
    }

    @Post('reports/generate')
    generateReport(@Body() body: { period?: string; format?: ExecutiveReportFormat } = {}) {
        return this.executiveService.generateReport(body.period ?? 'weekly', body.format ?? 'markdown');
    }

    @Get('reports/:id')
    report(@Param('id') id: string) {
        return this.executiveService.reportDetail(id);
    }
}
