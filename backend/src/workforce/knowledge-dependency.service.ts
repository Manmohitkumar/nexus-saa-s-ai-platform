import { Injectable } from '@nestjs/common';
import { WorkforceDataService, WorkforceSnapshot, WorkforceSystem } from './workforce.data.service';
import { WorkforceIntelligenceService } from './workforce-intelligence.service';

export interface DependencyNode {
    systemId: string;
    label: string;
    kind: string;
    risk: string;
    knowledgeLoss: number;
    flagTotal: number;
    flagUndocumented: number;
}

export interface DependencyEdge {
    sourceId: string;
    targetId: string;
    type: string;
}

export interface EmployeeImpact {
    employeeId: string;
    systems: DependencyNode[];
    edges: DependencyEdge[];
    affectedDecisions: Array<{ decisionId: string; title: string; role: string }>;
    impactedEmployeeIds: string[];
    projectedKnowledgeLoss: number;
}

const PROPAGATE_TYPES = new Set(['depends_on', 'feeds', 'uses', 'monitors', 'deploys', 'runs']);
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

/**
 * Knowledge Dependency Engine — identifies explicit (owned systems) and
 * implicit (decision authorship, downstream dependencies, co-owners) knowledge
 * dependencies and projects how much organizational knowledge is lost when a
 * person becomes unavailable.
 */
@Injectable()
export class KnowledgeDependencyService {
    constructor(
        private readonly data: WorkforceDataService,
        private readonly intelligence: WorkforceIntelligenceService,
    ) {}

    async getEmployeeImpact(employeeId: string): Promise<EmployeeImpact | null> {
        const snapshot = await this.data.snapshot();
        const employee = snapshot.employees.find((e) => e.id === employeeId);
        if (!employee) return null;

        const metrics = await this.intelligence.computeMetrics(employee, snapshot);
        const owned = this.intelligence.ownedSystems(employee, snapshot);

        const systemNodeById = new Map<string, string>();
        for (const s of snapshot.systems) if (s.nodeId) systemNodeById.set(s.nodeId, s.id);

        const lossBySystem = new Map<string, number>();
        const riskBySystem = new Map<string, number>();
        const affectedSystemIds = new Set<string>();

        for (const sys of owned) {
            const baseRisk = this.intelligence.systemBaseRisk(sys);
            const sole = sys.ownerIds.length <= 1;
            const loss = clamp(baseRisk * (0.6 + metrics.replacementDifficulty / 100) + (sole ? 18 : sys.ownerIds.length === 2 ? 6 : 0));
            lossBySystem.set(sys.id, loss);
            riskBySystem.set(sys.id, baseRisk);
            affectedSystemIds.add(sys.id);
        }

        // Propagate loss downstream along the graph (up to 3 hops).
        const edgeMap = new Map<string, Array<{ target: string; type: string; weight: number }>>();
        for (const e of snapshot.edges) {
            if (!PROPAGATE_TYPES.has(e.type)) continue;
            const from = systemNodeById.get(e.sourceId);
            const to = systemNodeById.get(e.targetId);
            if (!from || !to) continue;
            const list = edgeMap.get(from) ?? [];
            list.push({ target: to, type: e.type, weight: e.weight });
            edgeMap.set(from, list);
        }

        const queue: Array<{ sysId: string; hop: number; scale: number }> = [...affectedSystemIds].map((id) => ({ sysId: id, hop: 0, scale: 1 }));
        const visited = new Map<string, number>();
        for (const q of queue) visited.set(q.sysId, 0);

        while (queue.length) {
            const { sysId, hop, scale } = queue.shift()!;
            if (hop >= 3) continue;
            const outgoing = edgeMap.get(sysId) ?? [];
            for (const edge of outgoing) {
                const nextScale = scale * 0.4 * edge.weight;
                const added = (lossBySystem.get(sysId) ?? 0) * nextScale;
                const prev = lossBySystem.get(edge.target) ?? 0;
                lossBySystem.set(edge.target, clamp(prev + added));
                riskBySystem.set(edge.target, riskBySystem.get(edge.target) ?? this.intelligence.systemBaseRisk(this.byId(snapshot, edge.target)));
                const existing = visited.get(edge.target);
                if (existing === undefined || existing > hop + 1) {
                    visited.set(edge.target, hop + 1);
                    queue.push({ sysId: edge.target, hop: hop + 1, scale: nextScale });
                }
            }
        }

        const systems: DependencyNode[] = [...lossBySystem.entries()]
            .filter(([id, loss]) => loss >= 5)
            .map(([id, knowledgeLoss]) => {
                const sys = this.byId(snapshot, id);
                return {
                    systemId: id,
                    label: sys.name,
                    kind: sys.kind,
                    risk: this.riskLabel(knowledgeLoss),
                    knowledgeLoss,
                    flagTotal: sys.flagTotal,
                    flagUndocumented: sys.flagUndocumented,
                };
            })
            .sort((a, b) => b.knowledgeLoss - a.knowledgeLoss);

        const edges: DependencyEdge[] = [];
        const affectedIds = new Set(systems.map((s) => s.systemId));
        for (const e of snapshot.edges) {
            const from = systemNodeById.get(e.sourceId);
            const to = systemNodeById.get(e.targetId);
            if (from && to && affectedIds.has(from) && affectedIds.has(to)) {
                edges.push({ sourceId: from, targetId: to, type: e.type });
            }
        }

        const impactedEmployeeIds = new Set<string>();
        for (const sys of systems) {
            const full = this.byId(snapshot, sys.systemId);
            for (const ownerId of full.ownerIds) {
                if (ownerId !== employeeId) impactedEmployeeIds.add(ownerId);
            }
        }

        const affectedDecisions = (snapshot.decisionsByEmployee.get(employeeId) ?? []).map((d) => ({
            decisionId: d.decisionId,
            title: d.title,
            role: d.role,
        }));

        const weighted = systems.length
            ? systems.reduce((s, n) => s + n.knowledgeLoss * (riskBySystem.get(n.systemId) ?? 50), 0) /
              systems.reduce((s, n) => s + (riskBySystem.get(n.systemId) ?? 50), 0)
            : metrics.knowledgeCriticality;
        const projectedKnowledgeLoss = clamp(weighted);

        return {
            employeeId,
            systems,
            edges,
            affectedDecisions,
            impactedEmployeeIds: [...impactedEmployeeIds],
            projectedKnowledgeLoss,
        };
    }

    private byId(snapshot: WorkforceSnapshot, id: string): WorkforceSystem {
        return snapshot.systems.find((s) => s.id === id) ?? {
            id,
            name: id,
            kind: 'service',
            risk: 'medium',
            team: null,
            nodeId: null,
            flagTotal: 0,
            flagUndocumented: 0,
            flagEnabled: 0,
            killSwitches: 0,
            ownerIds: [],
        };
    }

    private riskLabel(loss: number): string {
        if (loss >= 75) return 'critical';
        if (loss >= 50) return 'high';
        if (loss >= 25) return 'medium';
        return 'low';
    }
}
