import { Test, TestingModule } from '@nestjs/testing';
import { AgentsService } from './agents.service';
import { AgentMemoryService } from './agent-memory.service';
import { EventBus } from '../events/event-bus';

describe('AgentsService', () => {
  let service: AgentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        { provide: AgentMemoryService, useValue: { remember: jest.fn(), recall: jest.fn(), recent: jest.fn() } },
        { provide: EventBus, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<AgentsService>(AgentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
