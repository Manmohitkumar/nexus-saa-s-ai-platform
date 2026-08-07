import { Controller, Get } from '@nestjs/common';
import { RiskService } from './risk.service';

@Controller('risk')
export class RiskController {
    constructor(private readonly riskService: RiskService) { }

    @Get('heatmap')
    getHeatmap() {
        return this.riskService.getHeatmap();
    }
}
