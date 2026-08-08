import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { GraphService } from './graph.service';
import { TimelineService } from '../decisions/timeline.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: GraphService, useValue: { getGraphView: jest.fn(), getNodeDetail: jest.fn() } },
        { provide: TimelineService, useValue: { getTimeline: jest.fn(), getParticipantsMap: jest.fn() } },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should delegate node detail to graph service', () => {
    const graph = module.get<GraphService>(GraphService);
    (graph.getNodeDetail as jest.Mock).mockReturnValue({ id: 'n1' });
    expect(service.getBrainGraphNode('n1')).toEqual({ id: 'n1' });
    expect(graph.getNodeDetail).toHaveBeenCalledWith('n1');
  });

  it('should map timeline milestones to legacy decision event shape', async () => {
    const timeline = module.get<TimelineService>(TimelineService);
    (timeline.getTimeline as jest.Mock).mockResolvedValue({
      mode: 'chronological',
      filters: {},
      items: [
        {
          id: 'm1',
          decisionId: 'd1',
          decisionTitle: 'Migrate to PostgreSQL',
          date: 'Apr 2022',
          label: 'Capacity review',
          type: 'milestone',
          phase: 'problem',
          confidence: 90,
          summary: 'The team measured ceilings.',
          evidenceSources: 7,
        },
      ],
      decisions: [],
    });
    (timeline.getParticipantsMap as jest.Mock).mockResolvedValue({ d1: ['Sarah Chen'] });

    const result = await service.getDecisionTimeline('postgres');
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      type: 'meeting',
      label: 'Capacity review',
      participants: ['Sarah Chen'],
    });
  });
});
