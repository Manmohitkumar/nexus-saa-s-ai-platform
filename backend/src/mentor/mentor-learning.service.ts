import { Injectable } from '@nestjs/common';
import { WorkforceIntelligenceService } from '../workforce/workforce-intelligence.service';
import { ResilienceService } from '../workforce/resilience.service';
import { RiskIntelligenceService } from '../risk/risk-intelligence.service';
import { PrismaService } from '../prisma/prisma.service';
import { MentorContextService } from './mentor-context.service';
import { MentorLearningModule, MentorLearningPath } from './mentor.types';

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

/**
 * Learning Services — the Personalized Learning Engine. Generates onboarding
 * plans, architecture walkthroughs, documentation priorities, and risk-aware
 * skill modules by consuming Workforce Intelligence, Organizational
 * Resilience, the Risk Engine, and the knowledge graph. No separate personnel
 * model is introduced.
 */
@Injectable()
export class MentorLearningService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly workforce: WorkforceIntelligenceService,
        private readonly resilience: ResilienceService,
        private readonly risk: RiskIntelligenceService,
        private readonly context: MentorContextService,
    ) {}

    async getLearningPath(userId: string | null): Promise<MentorLearningPath> {
        const ctx = await this.context.getUserContext(userId);
        const [employees, res, view, nodes, decisions] = await Promise.all([
            this.workforce.listEmployees(),
            this.resilience.getResilience(),
            this.risk.getIntelligence('organization'),
            this.prisma.knowledgeNode.findMany(),
            this.prisma.decisionRecord.findMany({ select: { id: true, title: true, domain: true } }),
        ]);

        const me = ctx.userId ? employees.find((e) => e.name.toLowerCase() === ctx.name?.toLowerCase()) : null;
        const metrics = me?.metrics ?? {};
        const docs = nodes.filter((n) => n.kind === 'document' || n.kind === 'meeting');
        const hotspots = [...view.nodes]
            .filter((n) => n.kind !== 'team')
            .sort((a, b) => b.overallRisk - a.overallRisk)
            .slice(0, 4);

        const owned = ctx.ownedSystems.length
            ? view.nodes.filter((n) => ctx.ownedSystems.some((s) => n.label.toLowerCase().includes(s.toLowerCase())))
            : [];

        const modules: MentorLearningModule[] = [];

        modules.push({
            id: 'org-foundations',
            title: 'Organizational Digital Brain foundations',
            kind: 'onboarding',
            objective: `Understand the ${nodes.length} knowledge nodes, ${employees.length} engineers, and ${decisions.length} architectural decisions that make up your organization.`,
            progress: clamp(metrics.documentationReadiness ?? 60),
            route: '/dashboard/brain',
            evidence: [`${nodes.length} knowledge nodes in the graph`, `${employees.length} employees tracked`, 'Begin on the Organizational Brain'],
        });

        modules.push({
            id: 'owned-systems',
            title: ctx.ownedSystems.length
                ? `Systems you own: ${ctx.ownedSystems.join(', ')}`
                : 'Service dependency walkthrough',
            kind: 'architecture',
            objective: owned.length
                ? `Walk the architecture, flags, and risk profile of your ${owned.length} owned system(s).`
                : 'Map services, databases, and repositories and how they depend on each other.',
            progress: clamp(me ? 100 - metrics.onboardingComplexity : 40),
            route: '/dashboard/brain',
            evidence: owned.length
                ? owned.map((o) => `${o.label} · ${o.band}`)
                : ['Service dependency map', 'Repository graph'],
        });

        modules.push({
            id: 'decision-history',
            title: 'Decision Time Machine',
            kind: 'decisions',
            objective: `Replay the ${decisions.length} recorded decisions (${[...new Set(decisions.map((d) => d.domain))].length} domains) with evidence chains and alternatives.`,
            progress: clamp(90 - res.averageRisk),
            route: '/dashboard/decisions',
            evidence: [`${decisions.length} decisions reconstructed`, 'Evidence chains + alternatives', 'Replay any decision'],
        });

        modules.push({
            id: 'risk-awareness',
            title: 'Organizational risk & resilience',
            kind: 'risk',
            objective: `Resilience is ${res.orgResilience}/100 with ${res.undocumentedFlags} undocumented flags. Review the ${hotspots.length} highest-risk nodes on the heatmap.`,
            progress: clamp(100 - res.averageRisk),
            route: '/dashboard/risk',
            evidence: hotspots.map((h) => `${h.label} · ${h.band} (${h.overallRisk})`),
        });

        modules.push({
            id: 'documentation-priorities',
            title: 'Documentation priorities',
            kind: 'documentation',
            objective: `${docs.length} docs/meetings indexed. Prioritize reading what covers the systems you own, then the risk hotspots above.`,
            progress: clamp(metrics.documentationReadiness ?? 50),
            route: '/dashboard/docs',
            evidence: [`${docs.length} documentation nodes`, 'Coverage derived from flag/documentation data'],
        });

        modules.push({
            id: 'mentoring-skills',
            title: 'Collaboration & knowledge transfer',
            kind: 'skill',
            objective: `Boost your bus factor and collaboration diversity by pairing on high-risk systems (${hotspots[0]?.label ?? 'top hotspot'}).`,
            progress: clamp(metrics.collaborationDiversity ?? 55),
            route: '/dashboard/exit-sim',
            evidence: [`collaboration diversity ${metrics.collaborationDiversity ?? 55}%`, 'Succession + transfer plans in Exit Simulation'],
        });

        return {
            userId: userId,
            persona: ctx.persona,
            summary: `A personalized learning path for a ${ctx.persona.replace('-', ' ')}${ctx.team ? ` on the ${ctx.team} team` : ''} derived from workforce intelligence, organizational resilience, and current risk.`,
            modules,
            generatedAt: new Date().toISOString(),
        };
    }
}
