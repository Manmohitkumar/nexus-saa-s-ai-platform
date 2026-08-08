import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  let controller: DashboardController;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: { getExecutiveBrief: jest.fn(), getBrainGraphView: jest.fn(), getBrainGraphNode: jest.fn(), getDecisionTimeline: jest.fn() } }],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return graph node detail via service', () => {
    const svc = module.get<DashboardService>(DashboardService);
    (svc.getBrainGraphNode as jest.Mock).mockReturnValue({ id: 'n1', label: 'Payments' });
    expect(controller.getGraphNode('n1')).toEqual({ id: 'n1', label: 'Payments' });
    expect(svc.getBrainGraphNode).toHaveBeenCalledWith('n1');
  });
});
