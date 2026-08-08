import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { GraphService } from './graph.service';
import { DecisionsModule } from '../decisions/decisions.module';

@Module({
  imports: [DecisionsModule],
  controllers: [DashboardController],
  providers: [DashboardService, GraphService]
})
export class DashboardModule {}
