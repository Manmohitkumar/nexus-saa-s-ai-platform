import { Controller, Get } from '@nestjs/common';
import { ExitSimService } from './exit-sim.service';

@Controller('exit-sim')
export class ExitSimController {
    constructor(private readonly exitSimService: ExitSimService) { }

    @Get('profiles')
    getProfiles() {
        return this.exitSimService.getProfiles();
    }

    @Get('scenario')
    getScenario() {
        return this.exitSimService.getExitScenario();
    }

    @Get('recommendations')
    getRecommendations() {
        return this.exitSimService.getRecommendations();
    }
}
