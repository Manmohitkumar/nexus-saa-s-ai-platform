import { Test, TestingModule } from '@nestjs/testing';
import { MentorController } from './mentor.controller';
import { MentorService } from './mentor.service';
import { AuthService } from '../auth/auth.service';

describe('MentorController', () => {
  let controller: MentorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MentorController],
      providers: [
        {
          provide: MentorService,
          useValue: {
            getMentorPrompts: jest.fn().mockReturnValue([{ title: 'Explain our auth architecture', detail: 'Trace the auth path' }]),
            getMentorLearningPaths: jest.fn().mockReturnValue([{ topic: 'System Design', progress: 72, modules: 18, completed: 13 }]),
            getCapabilities: jest.fn().mockReturnValue([{ id: 'general', name: 'General', description: 'General mentoring', prompts: [] }]),
            ask: jest.fn(),
            getConversations: jest.fn().mockResolvedValue([]),
            getConversation: jest.fn().mockResolvedValue(null),
          },
        },
        { provide: AuthService, useValue: { verify: jest.fn() } },
      ],
    }).compile();

    controller = module.get<MentorController>(MentorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('exposes the legacy prompts endpoint contract', async () => {
    const prompts = controller.getPrompts();
    expect(prompts).toBeDefined();
  });

  it('exposes the legacy learning-paths endpoint contract', async () => {
    const paths = controller.getLearningPaths();
    expect(paths).toBeDefined();
  });
});
