import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { WorkforceIntelligenceService } from './workforce-intelligence.service';
import { KnowledgeDependencyService } from './knowledge-dependency.service';
import { SimulationService } from './simulation.service';
import type { SimulationInput } from './simulation.service';
import { ResilienceService } from './resilience.service';

@Controller('workforce')
export class WorkforceController {
    constructor(
        private readonly intelligence: WorkforceIntelligenceService,
        private readonly dependencies: KnowledgeDependencyService,
        private readonly simulation: SimulationService,
        private readonly resilience: ResilienceService,
    ) {}

    @Get('employees')
    listEmployees() {
        return this.intelligence.listEmployees();
    }

    @Get('employees/:id')
    async getEmployee(@Param('id') id: string) {
        const employee = await this.intelligence.getEmployee(id);
        if (!employee) throw new NotFoundException(`Unknown employee: ${id}`);
        return employee;
    }

    @Get('employees/:id/dependencies')
    async getDependencies(@Param('id') id: string) {
        const impact = await this.dependencies.getEmployeeImpact(id);
        if (!impact) throw new NotFoundException(`Unknown employee: ${id}`);
        return impact;
    }

    @Get('metrics')
    metricDefinitions() {
        return this.intelligence.metricDefinitions();
    }

    @Get('resilience')
    getResilience() {
        return this.resilience.getResilience();
    }

    @Post('simulate')
    simulate(@Body() input: SimulationInput = {}) {
        return this.simulation.simulate(input);
    }

    @Get('simulations')
    history() {
        return this.simulation.history();
    }

    @Get('simulations/:id')
    async getRun(@Param('id') id: string) {
        const run = await this.simulation.getRun(id);
        if (!run) throw new NotFoundException(`Unknown simulation run: ${id}`);
        return run;
    }
}
