import { Injectable } from '@nestjs/common';
import { WorkforceDataService } from './workforce.data.service';
import { WorkforceIntelligenceService } from './workforce-intelligence.service';

export interface ResilienceSnapshot {
    orgResilience: number;
    totalEmployees: number;
    averageRisk: number;
    averageReplacementWeeks: number;
    busFactorCoverage: number;
    singleOwnerSystems: number;
    undocumentedFlags: number;
    criticalEmployees: Array<{ id: string; name: string; role: string; risk: number; metrics: Record<string, number> }>;
    workforceDistribution: Record<string, number>;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

/**
 * Organizational Resilience Service — aggregates workforce intelligence into a
 * single org-level resilience score and distributable snapshot. Consumed by the
 * Simulation Engine and future features (Knowledge Risk Heatmap, Executive
 * Intelligence Dashboard).
 */
@Injectable()
export class ResilienceService {
    constructor(
        private readonly data: WorkforceDataService,
        private readonly intelligence: WorkforceIntelligenceService,
    ) {}

    async getResilience(): Promise<ResilienceSnapshot> {
        const snapshot = await this.data.snapshot();
        const employees = await this.intelligence.listEmployees();

        const averageRisk = employees.length
            ? Math.round(employees.reduce((s, e) => s + e.metrics.knowledgeCriticality, 0) / employees.length)
            : 0;
        const averageResilience = employees.length
            ? employees.reduce((s, e) => s + e.metrics.resilience, 0) / employees.length
            : 0;
        const averageOnboarding = employees.length
            ? employees.reduce((s, e) => s + e.metrics.onboardingComplexity, 0) / employees.length
            : 0;

        const busFactorCoverage = employees.length
            ? (employees.filter((e) => e.busFactor >= 2).length / employees.length) * 100
            : 0;
        const singleOwnerSystems = snapshot.systems.filter((s) => s.ownerIds.length === 1).length;
        const undocumentedFlags = snapshot.systems.reduce((s, sys) => s + sys.flagUndocumented, 0);

        const docsAverage = employees.length
            ? employees.reduce((s, e) => s + e.metrics.documentationReadiness, 0) / employees.length
            : 0;

        const orgResilience = clamp(
            averageResilience * 0.55 +
                docsAverage * 0.2 +
                busFactorCoverage * 0.2 -
                Math.min(15, singleOwnerSystems * 1.5),
        );

        const workforceDistribution: Record<string, number> = {};
        for (const e of employees) workforceDistribution[e.team] = (workforceDistribution[e.team] ?? 0) + 1;

        return {
            orgResilience,
            totalEmployees: employees.length,
            averageRisk,
            averageReplacementWeeks: Math.max(2, Math.round(3 + averageOnboarding / 15)),
            busFactorCoverage: Math.round(busFactorCoverage),
            singleOwnerSystems,
            undocumentedFlags,
            criticalEmployees: [...employees]
                .sort((a, b) => b.metrics.knowledgeCriticality - a.metrics.knowledgeCriticality)
                .slice(0, 5)
                .map((e) => ({ id: e.id, name: e.name, role: e.role, risk: e.metrics.knowledgeCriticality, metrics: e.metrics })),
            workforceDistribution,
        };
    }
}
