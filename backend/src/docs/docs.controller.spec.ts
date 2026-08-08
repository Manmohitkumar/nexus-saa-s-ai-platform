import { Test, TestingModule } from '@nestjs/testing';
import { DocsController } from './docs.controller';
import { DocsService } from './docs.service';

describe('DocsController', () => {
  let controller: DocsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocsController],
      providers: [
        {
          provide: DocsService,
          useValue: {
            getDocumentationState: jest.fn(),
            getDocumentContent: jest.fn(),
            getArchitectureWorkflows: jest.fn(),
            list: jest.fn(),
            getDetail: jest.fn(),
            getContent: jest.fn(),
            getVersions: jest.fn(),
            getVersion: jest.fn(),
            diff: jest.fn(),
            rollback: jest.fn(),
            regenerate: jest.fn(),
            getHealth: jest.fn(),
            getHealthTimeline: jest.fn(),
            getRecommendations: jest.fn(),
            getEvolution: jest.fn(),
            runEvolution: jest.fn(),
            getImpact: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DocsController>(DocsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should expose the legacy state route', () => {
    expect(controller.getDocumentationState).toBeDefined();
  });

  it('should expose the autonomous engine routes', () => {
    expect(controller.list).toBeDefined();
    expect(controller.getHealth).toBeDefined();
    expect(controller.getRecommendations).toBeDefined();
    expect(controller.getEvolution).toBeDefined();
    expect(controller.getVersions).toBeDefined();
    expect(controller.getDetail).toBeDefined();
    expect(controller.runEvolution).toBeDefined();
    expect(controller.rollback).toBeDefined();
  });
});
