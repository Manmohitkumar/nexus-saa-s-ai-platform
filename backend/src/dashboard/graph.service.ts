import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
    BrainGraphEdge,
    BrainGraphNode,
    BrainGraphNodeDetail,
    BrainGraphView,
    RiskLevel,
} from '../phoenix/phoenix.types';

const KIND_MAP: Record<string, 'service' | 'repository' | 'database' | 'team' | 'person'> = {
    service: 'service',
    database: 'database',
    repo: 'repository',
    team: 'team',
    employee: 'person',
};

function flagToRisk(undocRatio: number, enabled: boolean, killSwitch: boolean): RiskLevel {
    if (killSwitch && enabled) return 'critical';
    if (undocRatio > 0.5 && enabled) return 'high';
    if (undocRatio > 0.5) return 'medium';
    if (undocRatio > 0.2) return 'medium';
    return 'low';
}

@Injectable()
export class GraphService {
    constructor(private readonly prisma: PrismaService) {}

    async getGraphView(): Promise<BrainGraphView> {
        const nodes = await this.prisma.knowledgeNode.findMany({
            include: { owner: true, system: { include: { flags: true } } },
        });
        const edges = await this.prisma.knowledgeEdge.findMany();

        const edgeMap = new Map<string, string[]>();
        for (const e of edges) {
            const list = edgeMap.get(e.sourceId) ?? [];
            list.push(e.targetId);
            edgeMap.set(e.sourceId, list);
        }

        const graphNodes: BrainGraphNode[] = nodes.map((node) => {
            let risk: RiskLevel = node.risk as RiskLevel;
            if (node.system) {
                const flags = node.system.flags;
                const undocumented = flags.filter((f) => !f.description).length;
                const enabled = flags.filter((f) => f.enabled).length;
                const killSwitches = flags.filter((f) => f.type === 'kill-switch').length;
                risk = flags.length
                    ? flagToRisk(undocumented / flags.length, enabled > 0, killSwitches > 0)
                    : (node.risk as RiskLevel);
            }
            return {
                id: node.id,
                label: node.label,
                kind: KIND_MAP[node.kind] ?? 'service',
                owner: node.owner?.name ?? undefined,
                risk,
                connections: edgeMap.get(node.id) ?? [],
            };
        });

        const services = graphNodes.filter((n) => n.kind === 'service').length;
        const repositories = graphNodes.filter((n) => n.kind === 'repository').length;

        return {
            nodes: graphNodes,
            summary: {
                services,
                repositories,
                dependencies: edges.length,
                knowledgeNodes: graphNodes.length,
            },
        };
    }

    async getNodeDetail(nodeId: string): Promise<BrainGraphNodeDetail> {
        const node = await this.prisma.knowledgeNode.findUnique({
            where: { id: nodeId },
            include: {
                owner: true,
                system: { include: { flags: true } },
                sourceEdges: { include: { target: true } },
                targetEdges: { include: { source: true } },
            },
        });
        if (!node) {
            throw new NotFoundException(`Unknown node: ${nodeId}`);
        }

        const flags = node.system?.flags ?? [];
        const undocumented = flags.filter((f) => !f.description).length;
        const enabled = flags.filter((f) => f.enabled).length;
        const enabledUndocumented = flags.filter((f) => f.enabled && !f.description).length;
        const killSwitches = flags.filter((f) => f.type === 'kill-switch').length;
        const experiments = flags.filter((f) => f.type === 'experiment').length;

        const connections: BrainGraphEdge[] = [
            ...node.sourceEdges.map((e) => ({
                type: e.type,
                direction: 'out' as const,
                targetId: e.targetId,
                targetLabel: e.target.label,
            })),
            ...node.targetEdges.map((e) => ({
                type: e.type,
                direction: 'in' as const,
                targetId: e.sourceId,
                targetLabel: e.source.label,
            })),
        ];

        const risk = flags.length
            ? flagToRisk(undocumented / flags.length, enabled > 0, killSwitches > 0)
            : (node.risk as RiskLevel);

        const { insight, recommendations } = this.buildInsight(node.label, risk, flags.length, undocumented, enabledUndocumented, killSwitches, experiments);

        return {
            id: node.id,
            label: node.label,
            kind: node.kind,
            risk,
            summary: node.summary,
            owner: node.owner?.name ?? null,
            ownerRole: node.owner?.role ?? null,
            team: node.owner?.team ?? null,
            systemId: node.systemId,
            flagStats: {
                total: flags.length,
                undocumented,
                enabled,
                enabledUndocumented,
                killSwitches,
                experiments,
            },
            connections,
            insight,
            recommendations,
        };
    }

    private buildInsight(
        label: string,
        risk: RiskLevel,
        total: number,
        undocumented: number,
        enabledUndocumented: number,
        killSwitches: number,
        experiments: number,
    ): { insight: string; recommendations: string[] } {
        const recommendations: string[] = [];
        const parts: string[] = [];

        if (total === 0) {
            parts.push(`${label} has no tracked feature flags in the dataset, so direct flag risk cannot be computed from real data.`);
            recommendations.push('Tag feature flags owned by this system in Unleash to surface live risk.');
        } else {
            parts.push(`${label} owns ${total} tracked feature flag(s), of which ${undocumented} (${Math.round((undocumented / total) * 100)}%) have no documentation.`);
            if (undocumented > 0) {
                recommendations.push(`Document the ${undocumented} undocumented flag(s) on ${label} to reduce blind operational risk.`);
            }
            if (enabledUndocumented > 0) {
                parts.push(`${enabledUndocumented} are live in production while undocumented — highest exposure.`);
                recommendations.push(`Audit the ${enabledUndocumented} live-but-undocumented flag(s) for rollback ownership.`);
            }
        }
        if (killSwitches > 0) {
            parts.push(`${killSwitches} kill-switch(es) are available, indicating active incident control tooling.`);
            recommendations.push(`Verify kill-switch ownership and drill procedures for ${label}.`);
        }
        if (experiments > 0) {
            parts.push(`${experiments} experiment flag(s) are running.`);
            recommendations.push('Review experiment lifecycles and archive completed experiments on ' + label + '.');
        }

        const riskClause = risk === 'critical' ? 'critical knowledge risk' : risk === 'high' ? 'elevated knowledge risk' : risk === 'medium' ? 'moderate knowledge risk' : 'low knowledge risk';
        parts.push(`Overall this node carries ${riskClause}.`);
        if (recommendations.length === 0) {
            recommendations.push('Maintain current documentation cadence for ' + label + '.');
        }

        return { insight: parts.join(' '), recommendations };
    }
}
