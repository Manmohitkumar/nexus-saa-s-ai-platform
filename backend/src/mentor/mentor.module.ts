import { Module } from '@nestjs/common';
import { MentorController } from './mentor.controller';
import { MentorService } from './mentor.service';
import { MentorContextService } from './mentor-context.service';
import { MentorConversationService } from './mentor-conversation.service';
import { MentorGuidanceService } from './mentor-guidance.service';
import { MentorLearningService } from './mentor-learning.service';
import { WorkforceModule } from '../workforce/workforce.module';
import { RiskModule } from '../risk/risk.module';
import { DecisionsModule } from '../decisions/decisions.module';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [WorkforceModule, RiskModule, DecisionsModule, AgentsModule],
  controllers: [MentorController],
  providers: [
    MentorService,
    MentorContextService,
    MentorConversationService,
    MentorGuidanceService,
    MentorLearningService,
  ],
  exports: [MentorService],
})
export class MentorModule {}
