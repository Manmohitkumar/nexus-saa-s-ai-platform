import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkforceDataService } from './workforce.data.service';
import { WorkforceIntelligenceService } from './workforce-intelligence.service';
import { KnowledgeDependencyService, EmployeeImpact } from './knowledge-dependency.service';
import { SuccessionService, SuccessionCandidate } from './succession.service';
import { TransferService, TransferAction } from './transfer.service';
import { ResilienceService } from './resilience.service';

export interface SimulationInput {
    employeeIds?: string[];
    team?: string;
    system?: string;
    domain?: string;
    label?: string;
}

export interface SimulationFinding {
    id: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    detail: string;
    evidence: string[];
    confidence: number;
}

export interface SimulationRunResult {
    id: string;
    label: string;
    scenarioType: string;
    employees: Array<{ id: string; name: string; role: string; team: string }>;
    projectedKnowledgeLoss: number;
    resilienceBefore: number;
    resilienceAfter: number;
    affectedSystems: Array<{ systemId: string; label: string; kind: string; risk: string; knowledgeLoss: number }>;
    findings: SimulationFinding[];
    succession: SuccessionCandidate[];
    transferActions: TransferAction[];
    summary: string;
    createdAt: string;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

/**
 * Simulation Engine — generates evidence-based organizational impact scenarios
 * for individual, team, domain, or system departures. Every prediction is
 * derived from the Organizational Digital Brain and persisted as a versioned
 * simulation run.
 */
@Injectable()
export class SimulationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly data: WorkforceDataService,
        private readonly intelligence: WorkforceIntelligenceService,
        private readonly dependencies: KnowledgeDependencyService,
        private readonly succession: SuccessionService,
        private readonly transfer: TransferService,
        private readonly resilience: ResilienceService,
    ) {}

    async simulate(input: SimulationInput = {}): Promise<SimulationRunResult> {
        const snapshot = await this.data.snapshot();
        const employees = await this.resolveEmployees(input, snapshot);
        if (employees.length === 0) {
            throw new BadRequestException('No employees matched the simulation input.');
        }

        const resilienceBefore = (await this.resilience.getResilience()).orgResilience;

        const impacts: EmployeeImpact[] = [];
        for (const e of employees) {
            const impact = await this.dependencies.getEmployeeImpact(e.id);
            if (impact) impacts.push(impact);
        }

        const mergedSystems = new Map<string, { systemId: string; label: string; kind: string; risk: string; knowledgeLoss: number }>();
        for (const impact of impacts) {
            for (const sys of impact.systems) {
                const existing = mergedSystems.get(sys.systemId);
                if (!existing || sys.knowledgeLoss > existing.knowledgeLoss) {
                    mergedSystems.set(sys.systemId, {
                        systemId: sys.systemId,
                        label: sys.label,
                        kind: sys.kind,
                        risk: sys.risk,
                        knowledgeLoss: sys.knowledgeLoss,
                    });
                }
            }
        }
        const affectedSystems = [...mergedSystems.values()].sort((a, b) => b.knowledgeLoss - a.knowledgeLoss);

        const projectedKnowledgeLoss = affectedSystems.length
            ? clamp(affectedSystems.reduce((s, x) => s + x.knowledgeLoss, 0) / affectedSystems.length)
            : clamp(100 - resilienceBefore);

        const findings = this.buildFindings(employees, impacts, affectedSystems);
        const succession = await this.succession.getCandidates(employees.map((e) => e.id));
        const transferActions = await this.transfer.buildTransferPlan(employees.map((e) => e.id), impacts);

        // After mitigation, resilience recovers toward the covered share.
        const mitigationCoverage = transferActions.length ? Math.min(30, transferActions.filter((a) => a.priority !== 'medium').length * 6) : 0;
        const resilienceAfter = clamp(resilienceBefore - projectedKnowledgeLoss * 0.6 + mitigationCoverage);

        const employeeNames = employees.map((e) => e.name).join(', ');
        const scenarioType = input.team ? 'team' : input.system ? 'system' : input.domain ? 'domain' : employees.length > 1 ? 'group' : 'single';
        const label = input.label ?? `${scenarioType} departure: ${employeeNames}`;
        const summary = this.buildSummary(employees, affectedSystems, projectedKnowledgeLoss, succession);

        const record = await this.prisma.exitSimulationRun.create({
            data: {
                label,
                scenarioType,
                trigger: 'manual',
                employeeIds: JSON.stringify(employees.map((e) => e.id)),
                systemIds: JSON.stringify(affectedSystems.map((s) => s.systemId)),
                projectedKnowledgeLoss,
                resilienceBefore,
                resilienceAfter,
                metrics: JSON.stringify(affectedSystems),
                findings: JSON.stringify(findings),
                summary,
                createdBy: 'Phoenix Agent Fleet',
            },
        });

        await this.prisma.knowledgeTransferAction.createMany({
            data: transferActions.map((a) => ({
                simulationId: record.id,
                title: a.title,
                detail: a.detail,
                type: a.type,
                priority: a.priority,
                etaWeeks: a.etaWeeks,
                confidence: a.confidence,
                evidence: JSON.stringify(a.evidence),
                status: 'recommended',
            })),
        });

        this.data.invalidate();

        return {
            id: record.id,
            label,
            scenarioType,
            employees: employees.map((e) => ({ id: e.id, name: e.name, role: e.role, team: e.team })),
            projectedKnowledgeLoss,
            resilienceBefore,
            resilienceAfter,
            affectedSystems,
            findings,
            succession,
            transferActions,
            summary,
            createdAt: record.createdAt.toISOString(),
        };
    }

    async history() {
        const runs = await this.prisma.exitSimulationRun.findMany({
            orderBy: { createdAt: 'desc' },
            include: { transferActions: true },
        });
        return runs.map((r) => ({
            id: r.id,
            label: r.label,
            scenarioType: r.scenarioType,
            trigger: r.trigger,
            projectedKnowledgeLoss: r.projectedKnowledgeLoss,
            resilienceBefore: r.resilienceBefore,
            resilienceAfter: r.resilienceAfter,
            summary: r.summary,
            createdAt: r.createdAt.toISOString(),
            transferCount: r.transferActions.length,
        }));
    }

    async getRun(id: string) {
        const run = await this.prisma.exitSimulationRun.findUnique({
            where: { id },
            include: { transferActions: true },
        });
        if (!run) return null;
        const employeeIds = safeJson(run.employeeIds) as string[];
        const snapshot = await this.data.snapshot();
        const employees = employeeIds
            .map((id) => snapshot.employees.find((e) => e.id === id))
            .filter(Boolean)
            .map((e) => ({ id: e!.id, name: e!.name, role: e!.role, team: e!.team }));
        return {
            id: run.id,
            label: run.label,
            scenarioType: run.scenarioType,
            trigger: run.trigger,
            employees,
            projectedKnowledgeLoss: run.projectedKnowledgeLoss,
            resilienceBefore: run.resilienceBefore,
            resilienceAfter: run.resilienceAfter,
            affectedSystems: safeJson(run.metrics),
            findings: safeJson(run.findings),
            transferActions: run.transferActions.map((a) => ({
                ...a,
                evidence: safeJson(a.evidence),
            })),
            summary: run.summary,
            createdAt: run.createdAt.toISOString(),
        };
    }

    private async resolveEmployees(input: SimulationInput, snapshot: Awaited<ReturnType<WorkforceDataService['snapshot']>>) {
        if (input.employeeIds?.length) {
            return snapshot.employees.filter((e) => input.employeeIds!.includes(e.id));
        }
        if (input.team) {
            return snapshot.employees.filter((e) => e.team.toLowerCase() === input.team!.toLowerCase());
        }
        if (input.system) {
            const sys = [...snapshot.systemByName.values()].find((s) => s.name.toLowerCase() === input.system!.toLowerCase());
            if (sys) return snapshot.employees.filter((e) => sys.ownerIds.includes(e.id));
        }
        if (input.domain) {
            const owners = new Set<string>();
            for (const sys of snapshot.systems) {
                if (sys.name.toLowerCase().includes(input.domain!.toLowerCase())) {
                    for (const o of sys.ownerIds) owners.add(o);
                }
            }
            return snapshot.employees.filter((e) => owners.has(e.id));
        }
        // Default: the employee with the highest knowledge criticality.
        const listed = await this.intelligence.listEmployees();
        const top = [...listed].sort((a, b) => b.metrics.knowledgeCriticality - a.metrics.knowledgeCriticality)[0];
        return top ? snapshot.employees.filter((e) => e.id === top.id) : [];
    }

    private buildFindings(
        employees: Array<{ id: string; name: string }>,
        impacts: EmployeeImpact[],
        affectedSystems: SimulationRunResult['affectedSystems'],
    ): SimulationFinding[] {
        const findings: SimulationFinding[] = [];
        const names = employees.map((e) => e.name).join(', ');

        const critical = affectedSystems.filter((s) => s.knowledgeLoss >= 70);
        if (critical.length) {
            findings.push({
                id: 'f-critical-systems',
                severity: 'critical',
                title: `${critical.length} critical system(s) lose most of their knowledge`,
                detail: `${names} departing strips concentrated knowledge from ${critical.map((s) => s.label).join(', ')}.`,
                evidence: critical.map((s) => `${s.label}: ${s.knowledgeLoss}% projected loss`),
                confidence: 92,
            });
        }

        const undocumented = affectedSystems.reduce((sum, s) => {
            const impact = impacts.find((i) => i.systems.some((x) => x.systemId === s.systemId));
            const node = impact?.systems.find((x) => x.systemId === s.systemId);
            return sum + (node ? node.flagUndocumented : 0);
        }, 0);
        if (undocumented > 0) {
            findings.push({
                id: 'f-docs-gap',
                severity: 'warning',
                title: 'Undocumented flags increase knowledge loss',
                detail: `${undocumented} undocumented flag(s) across affected systems have no written owner explanation, so the knowledge only lives with the departing employee(s).`,
                evidence: [`${undocumented} undocumented flags in the impact set`],
                confidence: 88,
            });
        }

        const decisions = new Set<string>();
        for (const impact of impacts) for (const d of impact.affectedDecisions) decisions.add(d.title);
        if (decisions.size) {
            findings.push({
                id: 'f-decisions',
                severity: 'warning',
                title: `${decisions.size} architectural decision(s) depend on the departing employee(s)`,
                detail: `Decision rationale for ${[...decisions].slice(0, 3).join(', ')} must be captured before departure.`,
                evidence: [...decisions].map((d) => `decision: ${d}`),
                confidence: 90,
            });
        }

        findings.push({
            id: 'f-succession',
            severity: 'info',
            title: 'Succession candidates identified',
            detail: 'The succession planner ranked replacement candidates by expertise overlap, collaboration diversity, and readiness.',
            evidence: ['expertise overlap analysis', 'collaboration diversity', 'documented succession readiness'],
            confidence: 84,
        });

        return findings;
    }

    private buildSummary(
        employees: Array<{ name: string; role: string }>,
        affectedSystems: SimulationRunResult['affectedSystems'],
        projectedLoss: number,
        succession: SuccessionCandidate[],
    ): string {
        const names = employees.map((e) => `${e.name} (${e.role})`).join(', ');
        const top = affectedSystems.slice(0, 3).map((s) => s.label).join(', ');
        const topCandidate = succession[0]?.name ?? 'a qualified candidate';
        return `Simulating the departure of ${names} projects ${projectedLoss}% knowledge loss concentrated in ${top || 'no critical systems'}. ${topCandidate} is the best-fit succession candidate. Immediate transfer actions can recover resilience toward ${succession[0] ? succession[0].readiness : 0}% readiness.`;
    }
}

function safeJson(raw: string): unknown {
    try {
        return JSON.parse(raw || '[]');
    } catch {
        return [];
    }
}
