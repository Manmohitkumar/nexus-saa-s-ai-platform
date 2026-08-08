import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { DocsService } from './docs.service';

@Controller('docs')
export class DocsController {
    constructor(private readonly docsService: DocsService) {}

    // --- legacy contracts (kept alive) ---

    @Get('state')
    getDocumentationState() {
        return this.docsService.getDocumentationState();
    }

    @Get('content')
    getDocumentContent(@Query('name') name: string) {
        return this.docsService.getDocumentContent(name);
    }

    @Get('workflows')
    getArchitectureWorkflows() {
        return this.docsService.getArchitectureWorkflows();
    }

    // --- Autonomous Documentation Engine ---

    @Get()
    list(@Query('kind') kind?: string, @Query('status') status?: string, @Query('search') search?: string) {
        return this.docsService.list({ kind, status, search });
    }

    @Get('health')
    getHealth() {
        return this.docsService.getHealth();
    }

    @Get('health/timeline')
    getHealthTimeline() {
        return this.docsService.getHealthTimeline();
    }

    @Get('recommendations')
    getRecommendations() {
        return this.docsService.getRecommendations();
    }

    @Get('evolution')
    getEvolution(@Query('limit') limit?: string) {
        return this.docsService.getEvolution(limit ? Number(limit) : undefined);
    }

    @Get('graph/:id')
    getGraph(@Param('id') id: string) {
        return this.docsService.getDetail(id);
    }

    @Get('impact/:id')
    getImpact(@Param('id') id: string) {
        return this.docsService.getImpact(id);
    }

    @Get(':id/versions')
    getVersions(@Param('id') id: string) {
        return this.docsService.getVersions(id);
    }

    @Get(':id/versions/:version')
    getVersion(@Param('id') id: string, @Param('version') version: string) {
        return this.docsService.getVersion(id, Number(version));
    }

    @Get(':id/diff')
    getDiff(@Param('id') id: string, @Query('from') from: string, @Query('to') to: string) {
        return this.docsService.diff(id, Number(from), Number(to));
    }

    @Get(':id/content')
    getContent(@Param('id') id: string) {
        return this.docsService.getContent(id);
    }

    @Get(':id')
    getDetail(@Param('id') id: string) {
        return this.docsService.getDetail(id);
    }

    @Post('evolve')
    runEvolution(@Body() body: { trigger?: string; resource?: string; detail?: string }) {
        return this.docsService.runEvolution(body?.trigger ?? 'manual', body?.resource ?? '', body?.detail ?? '');
    }

    @Post(':id/regenerate')
    regenerate(@Param('id') id: string) {
        return this.docsService.regenerate(id);
    }

    @Post(':id/rollback')
    rollback(@Param('id') id: string, @Query('to') to: string) {
        return this.docsService.rollback(id, Number(to));
    }
}
