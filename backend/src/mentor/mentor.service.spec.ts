import { Test, TestingModule } from '@nestjs/testing';
import { MentorService } from './mentor.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventBus } from '../events/event-bus';
import { AgentMemoryService } from '../agents/agent-memory.service';
import { MentorContextService } from './mentor-context.service';
import { MentorConversationService } from './mentor-conversation.service';
import { MentorGuidanceService } from './mentor-guidance.service';
import { MentorLearningService } from './mentor-learning.service';
import { DecisionService } from '../decisions/decision.service';
import { RiskService } from '../risk/risk.service';
import { ResilienceService } from '../workforce/resilience.service';

describe('MentorService', () => {
  let service: MentorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MentorService,
        { provide: PrismaService, useValue: {} },
        { provide: EventBus, useValue: { emit: jest.fn() } },
        { provide: AgentMemoryService, useValue: {} },
        { provide: MentorContextService, useValue: { getUserContext: jest.fn() } },
        { provide: MentorConversationService, useValue: {} },
        { provide: MentorGuidanceService, useValue: { capabilities: () => [{ id: 'general', name: 'General', description: 'General mentoring', prompts: [] }] } },
        { provide: MentorLearningService, useValue: {} },
        { provide: DecisionService, useValue: {} },
        { provide: RiskService, useValue: {} },
        { provide: ResilienceService, useValue: {} },
      ],
    }).compile();

    service = module.get<MentorService>(MentorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('keeps the legacy prompts contract', () => {
    expect(service.getMentorPrompts()).toBeDefined();
  });

  it('keeps the legacy learning-paths contract', () => {
    expect(service.getMentorLearningPaths()).toBeDefined();
  });

  it('exposes mentor capabilities', () => {
    expect(service.getCapabilities()).toBeDefined();
  });
});
