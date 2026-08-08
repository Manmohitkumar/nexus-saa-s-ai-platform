import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface WorkforceSystem {
    id: string;
    name: string;
    kind: string;
    risk: string;
    team: string | null;
    nodeId: string | null;
    flagTotal: number;
    flagUndocumented: number;
    flagEnabled: number;
    killSwitches: number;
    ownerIds: string[];
}

export interface WorkforceEmployee {
    id: string;
    name: string;
    role: string;
    team: string;
    risk: number;
    systems: string[];
    tenureYears: number;
    expertise: string[];
    mentorship: number;
    contributions: number;
    incidentsResolved: number;
    codeReviews: number;
    collaborationPartners: number;
    successionReadiness: number;
    busFactor: number;
    nodeId: string | null;
}

export interface WorkforceDecisionLink {
    decisionId: string;
    title: string;
    role: 'proposed' | 'approved' | 'implemented';
}

export interface WorkforceEdge {
    sourceId: string;
    targetId: string;
    type: string;
    weight: number;
}

export interface WorkforceSnapshot {
    employees: WorkforceEmployee[];
    systems: WorkforceSystem[];
    edges: WorkforceEdge[];
    decisionsByEmployee: Map<string, WorkforceDecisionLink[]>;
    systemByName: Map<string, WorkforceSystem>;
}

const CACHE_TTL_MS = 30_000;

/**
 * Loads a single consistent snapshot of the Organizational Digital Brain
 * (employees, systems + flags, graph nodes/edges, decision relations) so all
 * Feature 3 services reason over the same real data. The snapshot is cached
 * briefly so ownership/documentation changes resync automatically.
 */
@Injectable()
export class WorkforceDataService {
    private cached: { at: number; snapshot: WorkforceSnapshot } | null = null;

    constructor(private readonly prisma: PrismaService) {}

    async snapshot(): Promise<WorkforceSnapshot> {
        if (this.cached && Date.now() - this.cached.at < CACHE_TTL_MS) {
            return this.cached.snapshot;
        }
        const snapshot = await this.load();
        this.cached = { at: Date.now(), snapshot };
        return snapshot;
    }

    invalidate() {
        this.cached = null;
    }

    private async load(): Promise<WorkforceSnapshot> {
        const [employees, systems, nodes, edges, decisionRecords, relations] = await Promise.all([
            this.prisma.employee.findMany(),
            this.prisma.system.findMany({ include: { flags: true } }),
            this.prisma.knowledgeNode.findMany(),
            this.prisma.knowledgeEdge.findMany(),
            this.prisma.decisionRecord.findMany({ select: { id: true, title: true } }),
            this.prisma.decisionRelation.findMany(),
        ]);

        const nodeBySystem = new Map<string, string>();
        const employeeNodeIds = new Map<string, string>();
        for (const node of nodes) {
            if (node.systemId) nodeBySystem.set(node.systemId, node.id);
            if (node.kind === 'employee' && node.ownerId) employeeNodeIds.set(node.ownerId, node.id);
        }

        const systemById = new Map<string, WorkforceSystem>();
        for (const s of systems) {
            const flags = s.flags;
            const sys: WorkforceSystem = {
                id: s.id,
                name: s.name,
                kind: s.kind,
                risk: s.risk,
                team: s.team,
                nodeId: nodeBySystem.get(s.id) ?? null,
                flagTotal: flags.length,
                flagUndocumented: flags.filter((f) => !f.description).length,
                flagEnabled: flags.filter((f) => f.enabled).length,
                killSwitches: flags.filter((f) => f.type === 'kill-switch').length,
                ownerIds: [],
            };
            systemById.set(s.id, sys);
        }

        const employeesOut: WorkforceEmployee[] = employees.map((e) => ({
            id: e.id,
            name: e.name,
            role: e.role,
            team: e.team,
            risk: e.risk,
            systems: safeJson(e.systems) as string[],
            tenureYears: e.tenureYears,
            expertise: safeJson(e.expertise) as string[],
            mentorship: e.mentorship,
            contributions: e.contributions,
            incidentsResolved: e.incidentsResolved,
            codeReviews: e.codeReviews,
            collaborationPartners: e.collaborationPartners,
            successionReadiness: e.successionReadiness,
            busFactor: e.busFactor,
            nodeId: employeeNodeIds.get(e.id) ?? null,
        }));

        // Owners: knowledge nodes owning a system, plus the seeded systems JSON.
        for (const node of nodes) {
            if (node.systemId && node.ownerId) {
                const sys = systemById.get(node.systemId);
                if (sys && !sys.ownerIds.includes(node.ownerId)) sys.ownerIds.push(node.ownerId);
            }
        }
        for (const e of employeesOut) {
            for (const name of e.systems) {
                const sys = [...systemById.values()].find((s) => s.name === name);
                if (sys && !sys.ownerIds.includes(e.id)) sys.ownerIds.push(e.id);
            }
        }

        const systemByName = new Map<string, WorkforceSystem>();
        for (const s of systemById.values()) systemByName.set(s.name, s);

        const decisionsByEmployee = new Map<string, WorkforceDecisionLink[]>();
        for (const rel of relations) {
            if (rel.targetType !== 'knowledge') continue;
            const employeeId = [...employeeNodeIds.entries()].find(([, nid]) => nid === rel.targetId)?.[0];
            if (!employeeId) continue;
            const role = rel.type === 'proposed_by' ? 'proposed' : rel.type === 'approved_by' ? 'approved' : rel.type === 'implemented_by' ? 'implemented' : null;
            if (!role) continue;
            const decision = decisionRecords.find((d) => d.id === rel.targetId) ?? decisionRecords.find((d) => d.title === rel.targetLabel);
            if (!decision) continue;
            const list = decisionsByEmployee.get(employeeId) ?? [];
            list.push({ decisionId: decision.id, title: decision.title, role });
            decisionsByEmployee.set(employeeId, list);
        }

        return {
            employees: employeesOut,
            systems: [...systemById.values()],
            edges: edges.map((e) => ({ sourceId: e.sourceId, targetId: e.targetId, type: e.type, weight: e.weight })),
            decisionsByEmployee,
            systemByName,
        };
    }
}

function safeJson(raw: string): unknown {
    try {
        return JSON.parse(raw || '[]');
    } catch {
        return [];
    }
}
