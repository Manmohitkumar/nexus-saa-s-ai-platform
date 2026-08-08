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
import { AgentsModule } from './agents/agents.module';
import { DecisionsModule } from './decisions/decisions.module';
import { FeatureNameModule } from './feature-name/feature-name.module';
import { FeaturesModule } from './features/features.module';
import { WorkforceModule } from './workforce/workforce.module';
import { ExecutiveModule } from './executive/executive.module';
import { TasksModule } from './tasks/task.module';
import { PrismaModule } from './prisma/prisma.module';
import { EventsModule } from './events/events.module';
import { AuditModule } from './audit/audit.module';
import { PhoenixGateway } from './websocket/websocket.gateway';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    AuditModule,
    DashboardModule,
    DocsModule,
    RiskModule,
    MentorModule,
    ExitSimModule,
    IntelligenceModule,
    AuthModule,
    AgentsModule,
    DecisionsModule,
    FeatureNameModule,
    FeaturesModule,
    WorkforceModule,
    ExecutiveModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService, PhoenixGateway],
})
export class AppModule { }
