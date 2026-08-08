import { Injectable } from '@nestjs/common';
import {
    WorkforceDataService,
    WorkforceEmployee,
    WorkforceSnapshot,
    WorkforceSystem,
} from './workforce.data.service';

const METRIC_DEFS: Array<{ code: string; label: string }> = [
    { code: 'knowledgeCriticality', label: 'Knowledge Criticality Score' },
    { code: 'documentationReadiness', label: 'Documentation Readiness Score' },
    { code: 'ownershipConcentration', label: 'Ownership Concentration Score' },
    { code: 'expertiseRedundancy', label: 'Expertise Redundancy Score' },
    { code: 'replacementDifficulty', label: 'Replacement Difficulty Score' },
    { code: 'onboardingComplexity', label: 'Onboarding Complexity Score' },
    { code: 'businessContinuity', label: 'Business Continuity Score' },
    { code: 'collaborationDiversity', label: 'Collaboration Diversity Score' },
    { code: 'decisionDependency', label: 'Decision Dependency Score' },
    { code: 'resilience', label: 'Organizational Resilience Score' },
];

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

/**
 * Workforce Intelligence layer — evaluates knowledge concentration, succession
 * readiness, documentation maturity, collaboration diversity, expertise
 * redundancy, onboarding readiness, and organizational resilience for every
 * employee. Consumes the Organizational Digital Brain only.
 */
@Injectable()
export class WorkforceIntelligenceService {
    constructor(private readonly data: WorkforceDataService) {}

    metricDefinitions() {
        return METRIC_DEFS;
    }

    async computeMetrics(employee: WorkforceEmployee, snapshot: WorkforceSnapshot): Promise<Record<string, number>> {
        const owned = this.ownedSystems(employee, snapshot);
        const peers = snapshot.employees.filter((e) => e.id !== employee.id);
        const decisionLinks = snapshot.decisionsByEmployee.get(employee.id) ?? [];

        // Documentation readiness — flag description coverage across owned systems.
        const flagTotal = owned.reduce((s, sys) => s + sys.flagTotal, 0);
        const flagUndocumented = owned.reduce((s, sys) => s + sys.flagUndocumented, 0);
        const documentationReadiness = flagTotal ? clamp(100 - (flagUndocumented / flagTotal) * 100) : 55;

        // Ownership concentration — sole vs shared ownership of each system.
        const ownedWithOwners = owned.filter((s) => s.ownerIds.length > 0);
        const concentrationSum = ownedWithOwners.map((s) => (s.ownerIds.length === 1 ? 100 : Math.round(100 / s.ownerIds.length)));
        const ownershipConcentration = concentrationSum.length ? clamp(concentrationSum.reduce((a, b) => a + b, 0) / concentrationSum.length) : 0;

        // Expertise redundancy — how many peers share this person's domains.
        const sharedDomainPeers = peers.filter((p) => p.expertise.some((x) => employee.expertise.includes(x)));
        const expertiseRedundancy = employee.expertise.length
            ? clamp((sharedDomainPeers.length / Math.max(1, peers.length)) * 100)
            : 30;

        // Replacement difficulty — inverse of redundancy, moderated by bus factor & seniority.
        const seniority = employee.tenureYears >= 5 ? 15 : employee.tenureYears >= 3 ? 8 : 0;
        const replacementDifficulty = clamp((100 - expertiseRedundancy) * 0.7 + seniority + (employee.busFactor === 1 ? 12 : 0));

        // Onboarding complexity — driven by replacement difficulty + system count + tenure.
        const onboardingComplexity = clamp(replacementDifficulty * 0.7 + owned.length * 6 + Math.min(20, employee.tenureYears * 3));

        // Collaboration diversity — distinct partners normalized against the org max.
        const maxPartners = Math.max(1, ...snapshot.employees.map((e) => e.collaborationPartners));
        const collaborationDiversity = clamp((employee.collaborationPartners / maxPartners) * 100);

        // Decision dependency — how many org decisions this employee owns.
        const decisionDependency = decisionLinks.length ? clamp(40 + decisionLinks.length * 10) : 10;

        // Knowledge criticality — how much org knowledge concentrates here.
        const systemCriticality = ownedWithOwners.length
            ? ownedWithOwners.reduce((s, sys) => s + this.systemBaseRisk(sys), 0) / ownedWithOwners.length
            : 0;
        const knowledgeCriticality = clamp(systemCriticality * 0.55 + ownershipConcentration * 0.3 + decisionDependency * 0.15);

        // Business continuity — inverse of the projected knowledge loss for this exit.
        const projectedLoss = clamp(
            (knowledgeCriticality * 0.5) + ((100 - expertiseRedundancy) * 0.25) + ((100 - documentationReadiness) * 0.25),
        );
        const businessContinuity = clamp(100 - projectedLoss);

        // Organizational resilience of this individual's coverage.
        const resilience = clamp(
            businessContinuity * 0.5 +
                documentationReadiness * 0.2 +
                collaborationDiversity * 0.15 +
                (employee.successionReadiness * 0.15),
        );

        return {
            knowledgeCriticality,
            documentationReadiness,
            ownershipConcentration,
            expertiseRedundancy,
            replacementDifficulty,
            onboardingComplexity,
            businessContinuity,
            collaborationDiversity,
            decisionDependency,
            resilience,
        };
    }

    async listEmployees() {
        const snapshot = await this.data.snapshot();
        const rows = await Promise.all(
            snapshot.employees.map(async (e) => ({
                ...e,
                metrics: await this.computeMetrics(e, snapshot),
            })),
        );
        return rows.map((e) => ({ ...e, risk: e.metrics.knowledgeCriticality }));
    }

    async getEmployee(id: string) {
        const snapshot = await this.data.snapshot();
        const employee = snapshot.employees.find((e) => e.id === id);
        if (!employee) return null;
        const metrics = await this.computeMetrics(employee, snapshot);
        return { ...employee, risk: metrics.knowledgeCriticality, metrics };
    }

    ownedSystems(employee: WorkforceEmployee, snapshot: WorkforceSnapshot): WorkforceSystem[] {
        const byName = employee.systems.map((name) => snapshot.systemByName.get(name)).filter(Boolean) as WorkforceSystem[];
        const byOwner = snapshot.systems.filter((s) => s.ownerIds.includes(employee.id));
        const seen = new Set<string>();
        return [...byOwner, ...byName].filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
    }

    /** Base risk of a system from real flag data: undocumented coverage, live flags, kill switches. */
    systemBaseRisk(sys: WorkforceSystem): number {
        if (sys.flagTotal === 0) return sys.risk === 'high' ? 70 : sys.risk === 'medium' ? 45 : 25;
        const undocRatio = sys.flagUndocumented / sys.flagTotal;
        let risk = undocRatio * 70 + (sys.flagEnabled > 0 ? 15 : 0) + (sys.killSwitches > 0 && sys.flagEnabled > 0 ? 15 : 0);
        return clamp(risk);
    }
}
