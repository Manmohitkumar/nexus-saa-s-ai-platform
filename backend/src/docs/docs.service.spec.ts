import { Test, TestingModule } from '@nestjs/testing';
import { DocsService } from './docs.service';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentationIntelligenceService } from './documentation-intelligence.service';
import { DocumentationVersionService } from './documentation-version.service';
import { DocumentationQualityService } from './documentation-quality.service';
import { DocumentationRecommendationService } from './documentation-recommendation.service';
import { DocumentationEvolutionService } from './documentation-evolution.service';

const qualityContext = {
    systems: [],
    employees: [],
    edges: [],
    nodeById: new Map(),
    decisions: [],
    nodeKinds: [],
    teams: [],
    updateLog: [],
    riskByNodeId: new Map(),
};

const qualityReport = {
    overall: 80,
    confidence: 85,
    dimensions: [{ key: 'freshness', label: 'Freshness', score: 90, detail: 'current' }],
};

const prisma = {
    documentation: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
    },
    documentationVersion: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
    },
    documentationHealthSnapshot: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
    },
    decisionRecord: {
        findMany: jest.fn().mockResolvedValue([]),
    },
};

const intelligence = {
    context: jest.fn().mockResolvedValue(qualityContext),
    materializeIfEmpty: jest.fn().mockResolvedValue(0),
};

const versions = {
    list: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue({ createdAt: new Date(), content: [] }),
    diff: jest.fn().mockResolvedValue({ from: 1, to: 2, sections: [] }),
    rollback: jest.fn().mockResolvedValue({ version: 1 }),
};

const quality = {
    context: jest.fn().mockResolvedValue(qualityContext),
    freshnessFor: jest.fn().mockReturnValue(90),
    assess: jest.fn().mockReturnValue(qualityReport),
    health: jest.fn().mockResolvedValue({
        health: 80,
        coverage: 70,
        freshness: 75,
        consistency: 40,
        completeness: 75,
        currentDocs: 6,
        staleDocs: 2,
        draftDocs: 0,
        missingDocs: 0,
        totalDocs: 8,
        undocumentedFlags: 3,
        byKind: [],
        dimensions: [],
        generatedAt: new Date().toISOString(),
    }),
    snapshot: jest.fn().mockResolvedValue({ health: 80 }),
    timeline: jest.fn().mockResolvedValue([]),
};

const recommendations = {
    getRecommendations: jest.fn().mockResolvedValue([]),
};

const evolution = {
    runEvolution: jest.fn().mockResolvedValue({ runId: 'r1' }),
    history: jest.fn().mockResolvedValue([]),
};

describe('DocsService', () => {
    let service: DocsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DocsService,
                { provide: PrismaService, useValue: prisma },
                { provide: DocumentationIntelligenceService, useValue: intelligence },
                { provide: DocumentationVersionService, useValue: versions },
                { provide: DocumentationQualityService, useValue: quality },
                { provide: DocumentationRecommendationService, useValue: recommendations },
                { provide: DocumentationEvolutionService, useValue: evolution },
            ],
        }).compile();

        service = module.get<DocsService>(DocsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should return empty documentation state from prisma', async () => {
        await expect(service.getDocumentationState()).resolves.toEqual([]);
    });

    it('should throw when legacy content is unknown', async () => {
        await expect(service.getDocumentContent('nope')).rejects.toThrow('Unknown document');
    });

    it('should return architecture workflows from the mock catalog', () => {
        const flows = service.getArchitectureWorkflows();
        expect(Array.isArray(flows)).toBe(true);
    });

    it('should delegate list filtering to the quality engine', async () => {
        const rows = await service.list({ kind: 'service' });
        expect(rows).toEqual([]);
    });

    it('should throw on unknown detail id', async () => {
        await expect(service.getDetail('missing')).rejects.toThrow('Documentation not found');
    });

    it('should delegate health to the quality engine', async () => {
        const health = await service.getHealth();
        expect(health.health).toBe(80);
    });

    it('should delegate recommendations and evolution history', async () => {
        await expect(service.getRecommendations()).resolves.toEqual([]);
        await expect(service.getEvolution()).resolves.toEqual([]);
    });

    it('should run evolution on manual trigger', async () => {
        const run = await service.runEvolution('manual', 'doc:x', 'triggered');
        expect(run.runId).toBe('r1');
    });
});
