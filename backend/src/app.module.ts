import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocsModule } from './docs/docs.module';
import { RiskModule } from './risk/risk.module';
import { MentorModule } from './mentor/mentor.module';
import { ExitSimModule } from './exit-sim/exit-sim.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { AuthModule } from './auth/auth.module';
import { WebsocketGateway } from './websocket/websocket.gateway';
import { AgentsModule } from './agents/agents.module';
import { FeatureNameModule } from './feature-name/feature-name.module';
import { FeaturesModule } from './features/features.module';

@Module({
  imports: [
    DashboardModule,
    DocsModule,
    RiskModule,
    MentorModule,
    ExitSimModule,
    IntelligenceModule,
    AuthModule,
    AgentsModule,
    FeatureNameModule,
    FeaturesModule,
  ],
  controllers: [AppController],
  providers: [AppService, WebsocketGateway],
})
export class AppModule { }
