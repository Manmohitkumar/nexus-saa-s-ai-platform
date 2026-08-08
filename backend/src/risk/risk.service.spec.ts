import { Test, TestingModule } from '@nestjs/testing';
import { RiskService } from './risk.service';
import { RiskIntelligenceService } from './risk-intelligence.service';
import { RiskPredictiveService } from './risk-predictive.service';
import { RiskHealthService } from './risk-health.service';
import { RiskRecommendationService } from './risk-recommendation.service';

describe('RiskService', () => {
  let service: RiskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskService,
        {
          provide: RiskIntelligenceService,
          useValue: {
            getHeatmapGrid: jest.fn().mockResolvedValue([]),
            getIntelligence: jest.fn().mockResolvedValue({ mode: 'organization', nodes: [], filters: { teams: [], kinds: [] } }),
            getNodeDetail: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: RiskPredictiveService,
          useValue: {
            getPredictions: jest.fn().mockResolvedValue([]),
            getTimeline: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: RiskHealthService,
          useValue: { getHealth: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: RiskRecommendationService,
          useValue: { getRecommendations: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    service = module.get<RiskService>(RiskService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
