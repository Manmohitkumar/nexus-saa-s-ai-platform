import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkforceDataService } from '../workforce/workforce.data.service';
import { ResilienceService } from '../workforce/resilience.service';
import { RiskIntelligenceService } from './risk-intelligence.service';
import { RiskHealthSnapshot } from './risk.types';

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

/**
 * Risk Health Service — consolidates the current organizational risk snapshot
 * from Feature 3 outputs (resilience, workforce distribution, documentation
 * coverage) plus the risk intelligence graph.
 */
@Injectable()
export class RiskHealthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly data: WorkforceDataService,
        private readonly resilience: ResilienceService,
        private readonly intelligence: RiskIntelligenceService,
    ) {}

    async getHealth(): Promise<RiskHealthSnapshot> {
        const [res, nodes, employees, snapshots, latest] = await Promise.all([
            this.resilience.getResilience(),
            this.intelligence.getIntelligence('organization'),
            this.data.snapshot(),
            this.prisma.riskSnapshot.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
            this.prisma.riskSnapshot.findFirst({ orderBy: { createdAt: 'desc' } }),
        ]);

        const systemNodes = nodes.nodes.filter((n) => ['service', 'database', 'repo', 'external'].includes(n.kind));
        const criticalNodes = systemNodes.filter((n) => n.band === 'critical' || n.band === 'high').length;
        const spofCount = employees.systems.filter((s) => s.ownerIds.length === 1).length;

        const documentationCoverage = res.busFactorCoverage > 0 || res.averageRisk > 0
            ? clamp((100 - res.averageRisk) * 0.5 + (res.busFactorCoverage || 50) * 0.5)
            : latest?.documentationCoverage ?? 50;
        const knowledgeConcentration = clamp(
            nodes.nodes.length ? nodes.nodes.reduce((s, n) => s + n.knowledgeConcentration, 0) / nodes.nodes.length : 50,
        );
        const technicalDebt = clamp(
            nodes.nodes.length ? nodes.nodes.reduce((s, n) => s + n.technicalDebt, 0) / nodes.nodes.length : 50,
        );

        return {
            orgResilience: res.orgResilience,
            averageRisk: res.averageRisk,
            documentationCoverage,
            knowledgeConcentration,
            technicalDebt,
            busFactorCoverage: res.busFactorCoverage,
            singleOwnerSystems: res.singleOwnerSystems,
            undocumentedFlags: res.undocumentedFlags,
            criticalNodes,
            spofCount,
            totalEmployees: res.totalEmployees,
            workforceDistribution: res.workforceDistribution,
            createdAt: snapshots[0]?.createdAt.toISOString() ?? new Date().toISOString(),
        };
    }
}
