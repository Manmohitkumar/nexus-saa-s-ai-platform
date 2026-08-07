import { Controller, Get, Query } from '@nestjs/common';
import { FeaturesService } from './features.service';

@Controller('features')
export class FeaturesController {
    constructor(private readonly featuresService: FeaturesService) { }

    @Get('summary')
    getSummary() {
        return this.featuresService.getSummary();
    }

    @Get('flags')
    getFlags(@Query('limit') limit?: string) {
        const n = limit ? parseInt(limit, 10) : undefined;
        return this.featuresService.getFlags(Number.isFinite(n) ? n : undefined);
    }

    @Get('search')
    search(@Query('q') q = '') {
        return this.featuresService.search(q);
    }

    @Get('risk')
    getRisk() {
        return this.featuresService.getRisk();
    }

    @Get('docs')
    getDocs() {
        return this.featuresService.getDocs();
    }
}
