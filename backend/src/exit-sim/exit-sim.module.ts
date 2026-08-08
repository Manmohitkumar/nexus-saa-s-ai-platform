import { Module } from '@nestjs/common';
import { ExitSimController } from './exit-sim.controller';
import { ExitSimService } from './exit-sim.service';
import { WorkforceModule } from '../workforce/workforce.module';

@Module({
    imports: [WorkforceModule],
    controllers: [ExitSimController],
    providers: [ExitSimService],
})
export class ExitSimModule { }
