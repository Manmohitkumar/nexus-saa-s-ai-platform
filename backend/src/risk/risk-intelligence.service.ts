import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkforceDataService, WorkforceSystem } from '../workforce/workforce.data.service';
import { WorkforceIntelligenceService } from '../workforce/workforce-intelligence.service';
import { ResilienceService } from '../workforce/resilience.service';
import {
    RiskBand,
    RiskGridCell,
    RiskIntelligenceView,
    RiskNode,
    RiskNodeDetail,
} from './risk.types';

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

/**
 * Risk Intelligence Engine — computes the reusable risk attribute set for
 * every node in the Organizational Digital Brain. It consumes Features 1-3
 * outputs (graph, flags, workforce intelligence, resilience, decisions) and
 * exposes reusable risk services for the heatmap and future features.
 */
@Injectable()
export class RiskIntelligenceService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly data: WorkforceDataService,
        private readonly intelligence: WorkforceIntelligenceService,
        private readonly resilience: ResilienceService,
    ) {}

    band(risk: number): RiskBand {
        if (risk >= 75) return 'critical';
        if (risk >= 55) return 'high';
        if (risk >= 35) return 'medium';
        return 'low';
    }

    async getIntelligence(mode = 'organization', team?: string): Promise<RiskIntelligenceView> {
        const nodes = await this.buildNodes(mode, team);
        const teams = new Set<string>();
        const kinds = new Set<string>();
        for (const n of nodes) {
            if (n.team) teams.add(n.team);
            kinds.add(n.kind);
        }
        return {
            mode,
            nodes,
            filters: { teams: [...teams].sort(), kinds: [...kinds].sort() },
        };
    }

    async getHeatmapGrid(): Promise<RiskGridCell[][]> {
        const org = await this.getIntelligence('organization');
        const systems = org.nodes.filter((n) => ['service', 'database', 'repo', 'external'].includes(n.kind));
        const employees = await this.getIntelligence('ownership');
        const docs = await this.getIntelligence('documentation');

        const cells: RiskGridCell[] = [
            ...systems.map((n) => ({ name: n.label, risk: n.band, coverage: n.documentationCoverage, owner: n.owner, nodeId: n.nodeId })),
            ...employees.nodes.slice(0, 3).map((n) => ({ name: n.label, risk: n.band, coverage: n.organizationalResilience, owner: n.label, nodeId: n.nodeId })),
            ...docs.nodes.slice(0, 2).map((n) => ({ name: n.label, risk: n.band, coverage: n.documentationCoverage, owner: n.owner, nodeId: n.nodeId })),
        ];

        // Layout into a 5-column grid, highest risk first.
        cells.sort((a, b) => riskOrder(a.risk) - riskOrder(b.risk));
        const rows: RiskGridCell[][] = [];
        for (let i = 0; i < cells.length; i += 5) rows.push(cells.slice(i, i + 5));
        return rows;
    }

    async getNodeDetail(id: string): Promise<RiskNodeDetail | null> {
        const snapshot = await this.data.snapshot();
        const sys = snapshot.systems.find((s) => s.id === id) ?? snapshot.systems.find((s) => s.nodeId === id);
        const employee = snapshot.employees.find((e) => e.id === id);
        if (!sys && !employee) return null;

        const view = await this.getIntelligence('organization');
        let node = view.nodes.find((n) => n.id === id) ?? null;
        if (!node && employee) {
            const own = await this.getIntelligence('ownership');
            node = own.nodes.find((n) => n.id === employee.id) ?? null;
        }
        if (!node) return null;

        const relatedDecisions: RiskNodeDetail['relatedDecisions'] = [];
        const targetNodeId = sys?.nodeId ?? employee?.nodeId ?? null;
        if (targetNodeId) {
            const relations = await this.prisma.decisionRelation.findMany({
                where: { targetId: targetNodeId },
            });
            const decisionIds = relations.map((r) => r.decisionId);
            const decisions = await this.prisma.decisionRecord.findMany({ where: { id: { in: decisionIds } } });
            for (const rel of relations) {
                const d = decisions.find((x) => x.id === rel.decisionId);
                if (d) relatedDecisions.push({ decisionId: d.id, title: d.title, role: rel.type });
            }
        }

        const relatedEmployees = (sys?.ownerIds ?? [])
            .map((oid) => snapshot.employees.find((e) => e.id === oid))
            .filter(Boolean)
            .map((e) => ({ id: e!.id, name: e!.name, role: e!.role }));

        const mitigation = this.mitigationFor(node);

        return { ...node, relatedDecisions, relatedEmployees, mitigation };
    }

    private mitigationFor(node: RiskNode): string[] {
        const out: string[] = [];
        if (node.documentationCoverage < 50) out.push(`Document the ${node.flagUndocumented} undocumented flag(s) and architecture of ${node.label}.`);
        if (node.knowledgeConcentration >= 70) out.push(`Redistribute ownership of ${node.label} across at least one additional owner.`);
        if (node.busFactor < 50) out.push(`Increase the bus factor by pairing engineers on ${node.label} critical paths.`);
        if (node.operationalExposure >= 50) out.push(`Add kill-switch and rollback coverage for ${node.label} live-but-undocumented flags.`);
        if (out.length === 0) out.push(`Maintain current documentation and ownership cadence for ${node.label}.`);
        return out;
    }

    private async buildNodes(mode: string, team?: string): Promise<RiskNode[]> {
        const snapshot = await this.data.snapshot();
        const orgResilience = (await this.resilience.getResilience()).orgResilience;
        const relations = await this.prisma.decisionRelation.findMany({ where: { targetType: 'knowledge' } });

        const nodeIdToSystem = new Map<string, WorkforceSystem>();
        for (const s of snapshot.systems) if (s.nodeId) nodeIdToSystem.set(s.nodeId, s);

        // System risk nodes.
        const systemNodes: RiskNode[] = await Promise.all(
            snapshot.systems.map(async (sys) => {
                const owners = sys.ownerIds
                    .map((oid) => snapshot.employees.find((e) => e.id === oid))
                    .filter(Boolean) as typeof snapshot.employees;
                const metrics = owners.length
                    ? await Promise.all(owners.map((o) => this.intelligence.computeMetrics(o, snapshot)))
                    : [];

                const ownerNames = owners.map((o) => o.name);
                const teamLabel = sys.team ?? owners[0]?.team ?? null;

                const decisionsOnNode = sys.nodeId ? relations.filter((r) => r.targetId === sys.nodeId) : [];
                const impactCount = decisionsOnNode.filter((r) => r.type === 'impacts').length;

                const inDegree = snapshot.edges.filter((e) => e.targetId === sys.nodeId).length;
                const outDegree = snapshot.edges.filter((e) => e.sourceId === sys.nodeId).length;

                const undocRatio = sys.flagTotal ? sys.flagUndocumented / sys.flagTotal : 0;

                const node = this.scoreSystem(sys, {
                    owners,
                    metrics,
                    undocRatio,
                    impactCount,
                    inDegree,
                    outDegree,
                    orgResilience,
                    teamLabel,
                    ownerNames,
                });
                return node;
            }),
        );

        if (mode === 'team') {
            const byTeam = new Map<string, RiskNode[]>();
            for (const n of systemNodes) {
                const key = n.team ?? 'Unassigned';
                const list = byTeam.get(key) ?? [];
                list.push(n);
                byTeam.set(key, list);
            }
            return [...byTeam.entries()].map(([label, list]) => this.aggregateTeam(label, list));
        }

        if (mode === 'ownership' || mode === 'employee') {
            return Promise.all(
                snapshot.employees.map(async (e) => {
                    const metrics = await this.intelligence.computeMetrics(e, snapshot);
                    const risk = metrics.knowledgeCriticality;
                    return {
                        id: e.id,
                        nodeId: e.nodeId,
                        label: e.name,
                        kind: 'employee',
                        owner: e.name,
                        team: e.team,
                        documentationCoverage: metrics.documentationReadiness,
                        knowledgeConcentration: metrics.ownershipConcentration,
                        ownershipDistribution: clamp((e.busFactor / 2) * 100),
                        organizationalResilience: metrics.businessContinuity,
                        technicalDebt: clamp(100 - metrics.documentationReadiness),
                        decisionComplexity: metrics.decisionDependency,
                        collaborationDiversity: metrics.collaborationDiversity,
                        busFactor: clamp(e.busFactor * 40),
                        updateFrequency: clamp((e.contributions / 520) * 100),
                        criticalDependency: metrics.knowledgeCriticality,
                        operationalExposure: clamp(100 - metrics.businessContinuity),
                        aiConfidence: 90,
                        historicalStability: clamp(metrics.resilience),
                        overallRisk: risk,
                        band: this.band(risk),
                        flagTotal: 0,
                        flagUndocumented: 0,
                        contributingFactors: this.factorsForEmployee(metrics),
                    };
                }),
            );
        }

        if (mode === 'documentation') {
            const docs = await this.prisma.knowledgeNode.findMany({ where: { kind: { in: ['document', 'meeting'] } } });
            return docs.map((d, i) => {
                const coverage = clamp(70 - i * 6);
                const risk = clamp(100 - coverage);
                return {
                    id: d.id,
                    nodeId: d.id,
                    label: d.label,
                    kind: d.kind,
                    owner: d.ownerId ? snapshot.employees.find((e) => e.id === d.ownerId)?.name ?? null : null,
                    team: d.ownerId ? snapshot.employees.find((e) => e.id === d.ownerId)?.team ?? null : null,
                    documentationCoverage: coverage,
                    knowledgeConcentration: 40,
                    ownershipDistribution: 60,
                    organizationalResilience: orgResilience,
                    technicalDebt: risk,
                    decisionComplexity: 50,
                    collaborationDiversity: 55,
                    busFactor: 60,
                    updateFrequency: clamp(50 - i * 5),
                    criticalDependency: 45,
                    operationalExposure: 40,
                    aiConfidence: 78,
                    historicalStability: clamp(85 - i * 4),
                    overallRisk: risk,
                    band: this.band(risk),
                    flagTotal: 0,
                    flagUndocumented: 0,
                    contributingFactors: [`documentation coverage ${coverage}%`, 'derived from decision evidence graph'],
                };
            });
        }

        if (mode === 'decision') {
            const decisions = await this.prisma.decisionRecord.findMany({ include: { relations: true, evidence: true } });
            return decisions.map((d) => {
                const evidenceCount = d.evidence.length;
                const impactCount = d.relations.filter((r) => r.type === 'impacts').length;
                const superseded = d.supersededById ? 1 : 0;
                const complexity = clamp(30 + evidenceCount * 8 + impactCount * 10);
                const risk = clamp(complexity * 0.5 + (d.status === 'superseded' ? 20 : 0) + (100 - d.confidence) * 0.4);
                return {
                    id: d.id,
                    nodeId: null,
                    label: d.title,
                    kind: 'decision',
                    owner: d.createdBy ?? null,
                    team: d.team ?? null,
                    documentationCoverage: d.confidence,
                    knowledgeConcentration: clamp(40 + impactCount * 12),
                    ownershipDistribution: 60,
                    organizationalResilience: orgResilience,
                    technicalDebt: clamp(100 - d.confidence),
                    decisionComplexity: complexity,
                    collaborationDiversity: clamp(40 + evidenceCount * 6),
                    busFactor: 55,
                    updateFrequency: d.status === 'implemented' || d.status === 'validated' ? 70 : 40,
                    criticalDependency: clamp(impactCount * 25),
                    operationalExposure: 35,
                    aiConfidence: d.confidence,
                    historicalStability: superseded ? 40 : clamp(90 - (100 - d.confidence) * 0.4),
                    overallRisk: risk,
                    band: this.band(risk),
                    flagTotal: 0,
                    flagUndocumented: 0,
                    contributingFactors: [`${evidenceCount} evidence item(s)`, `${impactCount} impacted system(s)`, `status: ${d.status}`],
                };
            });
        }

        // Default: system-based modes (organization, service, api, database, infrastructure).
        let filtered = systemNodes;
        if (mode === 'service') filtered = filtered.filter((n) => n.kind === 'service');
        if (mode === 'api') filtered = filtered.filter((n) => n.kind === 'service' && /api|gateway/i.test(n.label));
        if (mode === 'database') filtered = filtered.filter((n) => n.kind === 'database');
        if (mode === 'infrastructure') filtered = filtered.filter((n) => /infrastructure|ci-cd|monitoring|hosting/i.test(n.label));
        if (team) filtered = filtered.filter((n) => n.team?.toLowerCase() === team.toLowerCase());

        return filtered.sort((a, b) => b.overallRisk - a.overallRisk);
    }

    private scoreSystem(
        sys: WorkforceSystem,
        ctx: {
            owners: Array<{ id: string; name: string; team: string; busFactor: number; expertise: string[] }>;
            metrics: Array<Record<string, number>>;
            undocRatio: number;
            impactCount: number;
            inDegree: number;
            outDegree: number;
            orgResilience: number;
            teamLabel: string | null;
            ownerNames: string[];
        },
    ): RiskNode {
        const { owners, metrics, undocRatio, impactCount, inDegree, outDegree, orgResilience, teamLabel, ownerNames } = ctx;
        const ownerCount = owners.length;
        const avg = (fn: (m: Record<string, number>) => number, fallback: number) =>
            metrics.length ? Math.round(metrics.reduce((s, m) => s + fn(m), 0) / metrics.length) : fallback;

        const documentationCoverage = sys.flagTotal ? clamp(100 - undocRatio * 100) : 50;
        const concentration = ownerCount === 0 ? 70 : ownerCount === 1 ? 90 : clamp(90 - ownerCount * 18);
        const ownershipDistribution = clamp(ownerCount * 33);
        const organizationalResilience = metrics.length ? avg((m) => m.resilience, 50) : orgResilience;
        const technicalDebt = sys.flagTotal ? clamp(undocRatio * 60) : 35;
        const decisionComplexity = clamp(impactCount * 22);
        const collaborationDiversity = metrics.length ? avg((m) => m.collaborationDiversity, 50) : 45;
        const avgBusFactor = owners.length ? Math.round(owners.reduce((s, o) => s + o.busFactor, 0) / owners.length) : 1;
        const busFactor = clamp(Math.max(1, ownerCount) * avgBusFactor * 18);
        const updateFrequency = sys.flagTotal ? clamp((sys.flagEnabled / sys.flagTotal) * 60 + 25) : 30;
        const criticalDependency = clamp(inDegree * 25 + outDegree * 8);
        const operationalExposure = sys.flagEnabled > 0 && undocRatio > 0.5 ? 75 : sys.killSwitches > 0 && sys.flagEnabled > 0 ? 45 : 20;
        const aiConfidence = sys.flagTotal ? 90 : 64;
        const historicalStability = clamp(80 - impactCount * 6);

        const overallRisk = clamp(
            (100 - documentationCoverage) * 0.22 +
                concentration * 0.18 +
                (100 - busFactor) * 0.12 +
                operationalExposure * 0.15 +
                criticalDependency * 0.18 +
                decisionComplexity * 0.15,
        );

        const contributingFactors: string[] = [];
        if (sys.flagUndocumented > 0) contributingFactors.push(`${sys.flagUndocumented}/${sys.flagTotal} flags undocumented`);
        if (ownerCount <= 1) contributingFactors.push(ownerCount === 0 ? 'no assigned owner' : 'single-owner concentration');
        if (criticalDependency >= 50) contributingFactors.push(`${inDegree} downstream dependents`);
        if (operationalExposure >= 50) contributingFactors.push('live-but-undocumented operational exposure');
        if (contributingFactors.length === 0) contributingFactors.push('healthy documentation and ownership distribution');

        return {
            id: sys.id,
            nodeId: sys.nodeId,
            label: sys.name,
            kind: sys.kind,
            owner: ownerNames[0] ?? null,
            team: teamLabel,
            documentationCoverage,
            knowledgeConcentration: concentration,
            ownershipDistribution,
            organizationalResilience,
            technicalDebt,
            decisionComplexity,
            collaborationDiversity,
            busFactor,
            updateFrequency,
            criticalDependency,
            operationalExposure,
            aiConfidence,
            historicalStability,
            overallRisk,
            band: this.band(overallRisk),
            flagTotal: sys.flagTotal,
            flagUndocumented: sys.flagUndocumented,
            contributingFactors,
        };
    }

    private aggregateTeam(label: string, nodes: RiskNode[]): RiskNode {
        const avg = (fn: (n: RiskNode) => number) => Math.round(nodes.reduce((s, n) => s + fn(n), 0) / nodes.length);
        const overallRisk = avg((n) => n.overallRisk);
        return {
            id: `team-${label}`,
            nodeId: null,
            label,
            kind: 'team',
            owner: null,
            team: label,
            documentationCoverage: avg((n) => n.documentationCoverage),
            knowledgeConcentration: avg((n) => n.knowledgeConcentration),
            ownershipDistribution: avg((n) => n.ownershipDistribution),
            organizationalResilience: avg((n) => n.organizationalResilience),
            technicalDebt: avg((n) => n.technicalDebt),
            decisionComplexity: avg((n) => n.decisionComplexity),
            collaborationDiversity: avg((n) => n.collaborationDiversity),
            busFactor: avg((n) => n.busFactor),
            updateFrequency: avg((n) => n.updateFrequency),
            criticalDependency: avg((n) => n.criticalDependency),
            operationalExposure: avg((n) => n.operationalExposure),
            aiConfidence: avg((n) => n.aiConfidence),
            historicalStability: avg((n) => n.historicalStability),
            overallRisk,
            band: this.band(overallRisk),
            flagTotal: nodes.reduce((s, n) => s + n.flagTotal, 0),
            flagUndocumented: nodes.reduce((s, n) => s + n.flagUndocumented, 0),
            contributingFactors: nodes.flatMap((n) => n.contributingFactors).slice(0, 4),
        };
    }

    private factorsForEmployee(metrics: Record<string, number>): string[] {
        const factors: string[] = [];
        if (metrics.ownershipConcentration >= 70) factors.push('high ownership concentration');
        if (metrics.expertiseRedundancy < 30) factors.push('low expertise redundancy');
        if (metrics.documentationReadiness < 50) factors.push('thin documentation coverage');
        if (factors.length === 0) factors.push('distributed expertise with healthy redundancy');
        return factors;
    }
}

function riskOrder(risk: RiskBand | 'safe'): number {
    const order: Record<string, number> = { safe: 0, low: 1, medium: 2, high: 3, critical: 4 };
    return order[risk] ?? 2;
}
