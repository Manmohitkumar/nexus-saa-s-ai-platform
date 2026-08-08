import { Test, TestingModule } from '@nestjs/testing';
import { PhoenixGateway } from './websocket.gateway';
import { EventBus } from '../events/event-bus';

describe('PhoenixGateway', () => {
  let gateway: PhoenixGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PhoenixGateway, EventBus],
    }).compile();

    gateway = module.get<PhoenixGateway>(PhoenixGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
