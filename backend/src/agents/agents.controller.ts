import { Controller, Get, Param, Query } from '@nestjs/common';
import { AgentsService } from './agents.service';

@Controller('agents')
export class AgentsController {
    constructor(private readonly agentsService: AgentsService) { }

    @Get()
    getAgents() {
        return this.agentsService.getAgents();
    }

    @Get('memory')
    getMemory() {
        return this.agentsService.getMemory();
    }

    @Get('run')
    runAll(@Query('query') query = '') {
        return this.agentsService.runAllAgents(query);
    }

    @Get(':id/run')
    runOne(@Param('id') id: string, @Query('query') query = '') {
        return this.agentsService.runAgent(id, query);
    }
}
