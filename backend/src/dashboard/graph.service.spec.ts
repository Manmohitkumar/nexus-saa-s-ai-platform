import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GraphService } from './graph.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GraphService', () => {
  let service: GraphService;
  let prisma: { knowledgeNode: { findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = { knowledgeNode: { findUnique: jest.fn() } };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<GraphService>(GraphService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw NotFoundException for unknown node', async () => {
    prisma.knowledgeNode.findUnique.mockResolvedValue(null);
    await expect(service.getNodeDetail('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should return node detail with computed flag stats and insight', async () => {
    prisma.knowledgeNode.findUnique.mockResolvedValue({
      id: 'n1',
      label: 'payments-service',
      kind: 'service',
      risk: 'medium',
      summary: 'Processes payments',
      systemId: 'sys-1',
      owner: { name: 'Sarah Chen', role: 'Lead Engineer', team: 'Platform' },
      system: {
        flags: [
          { description: '', enabled: true, type: 'kill-switch' },
          { description: 'docs', enabled: false, type: 'release' },
        ],
      },
      sourceEdges: [
        { type: 'depends_on', sourceId: 'n1', targetId: 'n2', target: { label: 'payments-db' } },
      ],
      targetEdges: [],
    });

    const detail = await service.getNodeDetail('n1');
    expect(detail.owner).toBe('Sarah Chen');
    expect(detail.flagStats).toEqual({
      total: 2,
      undocumented: 1,
      enabled: 1,
      enabledUndocumented: 1,
      killSwitches: 1,
      experiments: 0,
    });
    expect(detail.connections).toHaveLength(1);
    expect(detail.connections[0]).toMatchObject({ type: 'depends_on', direction: 'out', targetLabel: 'payments-db' });
    expect(detail.insight).toContain('kill-switch');
    expect(detail.recommendations.length).toBeGreaterThan(0);
  });
});
