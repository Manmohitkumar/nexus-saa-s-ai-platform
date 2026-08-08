import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { TaskService } from './task.service';
import { ExportFormat } from './task-export.service';
import type { TaskExplorerFilters } from './task.types';

@Controller('tasks')
export class TaskController {
    constructor(private readonly tasks: TaskService) {}

    // Explorer (search + combined filters).
    @Get()
    list(@Query() filters: TaskExplorerFilters) {
        return this.tasks.list(filters);
    }

    @Get('overview')
    overview() {
        return this.tasks.overview();
    }

    @Get('events')
    events() {
        return this.tasks.events();
    }

    @Get(':id')
    detail(@Param('id') id: string) {
        return this.tasks.detail(id);
    }

    @Post()
    create(@Body() body: Parameters<TaskService['create']>[0]) {
        return this.tasks.create(body);
    }

    // Generation (pre-validation + agent execution + evidence mapping).
    @Post(':id/generate')
    generate(@Param('id') id: string, @Body() body: { actor?: string } = {}) {
        return this.tasks.generate(id, body.actor ?? 'a13');
    }

    // Validation + readiness recompute.
    @Post(':id/validate')
    validate(@Param('id') id: string, @Body() body: { trigger?: string; actor?: string } = {}) {
        return this.tasks.validate(id, body.trigger ?? 'manual', body.actor ?? 'system');
    }

    // Checklist item completion.
    @Post(':id/checklist/:itemId')
    toggleChecklist(@Param('id') id: string, @Param('itemId') itemId: string, @Body() body: { completed: boolean; actor?: string }) {
        return this.tasks.toggleChecklistItem(id, itemId, body.completed ?? false, body.actor ?? 'human');
    }

    // Dependencies.
    @Post(':id/dependencies')
    addDependency(@Param('id') id: string, @Body() body: Parameters<TaskService['addDependency']>[1]) {
        return this.tasks.addDependency(id, body);
    }

    @Delete(':id/dependencies/:dependencyId')
    removeDependency(@Param('id') id: string, @Param('dependencyId') dependencyId: string) {
        return this.tasks.removeDependency(id, dependencyId);
    }

    // Status + ownership.
    @Post(':id/status')
    updateStatus(@Param('id') id: string, @Body() body: { status: string; actor?: string }) {
        return this.tasks.updateStatus(id, body.status, body.actor ?? 'system');
    }

    @Post(':id/assign')
    assign(@Param('id') id: string, @Body() body: { owner: string; responsibleAgent?: string; actor?: string }) {
        return this.tasks.assign(id, body.owner, body.responsibleAgent, body.actor ?? 'system');
    }

    // Export.
    @Get(':id/exports')
    exports(@Param('id') id: string) {
        return this.tasks.listExports(id);
    }

    @Post(':id/exports')
    export(@Param('id') id: string, @Body() body: { format?: ExportFormat; exportedBy?: string } = {}) {
        return this.tasks.export(id, body.format ?? 'markdown', body.exportedBy ?? 'system');
    }

    @Get('exports/:exportId')
    exportDetail(@Param('exportId') exportId: string) {
        return this.tasks.exportDetail(exportId);
    }
}
