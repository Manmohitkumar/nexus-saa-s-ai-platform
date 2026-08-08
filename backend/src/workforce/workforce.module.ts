import { Module } from '@nestjs/common';
import { WorkforceController } from './workforce.controller';
import { WorkforceDataService } from './workforce.data.service';
import { WorkforceIntelligenceService } from './workforce-intelligence.service';
import { KnowledgeDependencyService } from './knowledge-dependency.service';
import { SimulationService } from './simulation.service';
import { SuccessionService } from './succession.service';
import { TransferService } from './transfer.service';
import { ResilienceService } from './resilience.service';

@Module({
    controllers: [WorkforceController],
    providers: [
        WorkforceDataService,
        WorkforceIntelligenceService,
        KnowledgeDependencyService,
        SimulationService,
        SuccessionService,
        TransferService,
        ResilienceService,
    ],
    exports: [
        WorkforceDataService,
        WorkforceIntelligenceService,
        KnowledgeDependencyService,
        SimulationService,
        SuccessionService,
        TransferService,
        ResilienceService,
    ],
})
export class WorkforceModule { }
