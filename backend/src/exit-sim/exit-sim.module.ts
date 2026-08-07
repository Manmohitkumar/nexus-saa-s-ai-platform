import { Module } from '@nestjs/common';
import { ExitSimController } from './exit-sim.controller';
import { ExitSimService } from './exit-sim.service';

@Module({
    controllers: [ExitSimController],
    providers: [ExitSimService],
})
export class ExitSimModule { }
