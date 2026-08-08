import { Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { AgentMemoryService } from './agent-memory.service';

@Module({
  controllers: [AgentsController],
  providers: [AgentsService, AgentMemoryService],
  exports: [AgentsService, AgentMemoryService],
})
export class AgentsModule {}
