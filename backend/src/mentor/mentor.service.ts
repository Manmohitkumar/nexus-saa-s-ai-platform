import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventBus } from '../events/event-bus';
import { getMentorLearningPaths, getMentorPrompts } from '../phoenix/phoenix.mock';
import { getReasoningSnapshot } from '../phoenix/phoenix.reasoning';
import { runAgent } from '../phoenix/phoenix.agents';
import { AgentMemoryService } from '../agents/agent-memory.service';
import { DecisionService } from '../decisions/decision.service';
import { RiskService } from '../risk/risk.service';
import { ResilienceService } from '../workforce/resilience.service';
import { MentorContextService } from './mentor-context.service';
import { MentorConversationService } from './mentor-conversation.service';
import { MentorGuidanceService } from './mentor-guidance.service';
import { MentorLearningService } from './mentor-learning.service';
import {
    MentorAnswer,
    MentorDependencyPath,
    MentorEvidenceItem,
    MentorNavigationLink,
    MentorRelatedKnowledge,
} from './mentor.types';

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

export interface MentorAskInput {
    query: string;
    conversationId?: string;
    userId?: string | null;
}

/**
 * Mentor Services — AI Mentor orchestrator. It never builds its own knowledge
 * base: every answer originates from the agent fleet, the Organizational
 * Knowledge Graph, Decision Time Machine, Workforce Intelligence, the Risk
 * Engine, and shared memory. It is the interaction layer that explains the
 * Organizational Digital Brain.
 */
@Injectable()
export class MentorService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly eventBus: EventBus,
        private readonly memory: AgentMemoryService,
        private readonly context: MentorContextService,
        private readonly conversations: MentorConversationService,
        private readonly guidance: MentorGuidanceService,
        private readonly learning: MentorLearningService,
        private readonly resilience: ResilienceService,
        private readonly risk: RiskService,
        private readonly decisions: DecisionService,
    ) {}

    getMentorPrompts() {
        return getMentorPrompts();
    }

    getMentorLearningPaths() {
        return getMentorLearningPaths();
    }

    getCapabilities() {
        return this.guidance.capabilities();
    }

    async getConversations(userId: string | null) {
        return this.conversations.list(userId);
    }

    async getConversation(conversationId: string, userId: string | null) {
        return this.conversations.get(conversationId);
    }

    async ask(input: MentorAskInput): Promise<MentorAnswer> {
        const query = input.query.trim();
        if (!query) throw new Error('A query is required');

        const userCtx = await this.context.getUserContext(input.userId ?? null);
        const capability = this.guardCapability(this.guidance.detectCapability(query));
        const reasoning = getReasoningSnapshot(query);

        this.eventBus.emit('mentor.asked', `user:${userCtx.userId ?? 'guest'}`, `Mentor asked: ${query}`, { capability, query });

        const fleet = await this.runFleet(query, capability);
        const brain = await this.gatherBrain(query, capability, userCtx);

        const answer = await this.buildAnswer(query, capability, reasoning, fleet, brain, userCtx);

        let conversationId = input.conversationId ?? null;
        let messageId = `ephemeral-${Date.now()}`;

        if (conversationId) {
            try {
                await this.conversations.addUserMessage(conversationId, query);
                const saved = await this.conversations.addMentorMessage(conversationId, answer);
                messageId = saved.id;
            } catch {
                conversationId = null;
            }
        }
        if (!conversationId) {
            const title = this.titleFor(query);
            const conv = await this.conversations.create(userCtx.userId, title, answer.topic, capability);
            await this.conversations.addUserMessage(conv.id, query);
            const saved = await this.conversations.addMentorMessage(conv.id, answer);
            conversationId = conv.id;
            messageId = saved.id;
        }

        const final: MentorAnswer = { ...answer, conversationId, messageId };

        this.eventBus.emit('mentor.answered', `conversation:${conversationId}`, `Mentor answered at ${final.confidence}% confidence`, {
            capability,
            confidence: final.confidence,
        });

        return final;
    }

    private guardCapability(id: string): string {
        const ids = this.guidance.capabilities().map((c) => c.id);
        return ids.includes(id) ? id : 'general';
    }

    private agentSelection(capability: string): string[] {
        switch (capability) {
            case 'decision':
            case 'history':
                return ['a9', 'a6'];
            case 'debt':
            case 'best-practice':
                return ['a9', 'a8'];
            case 'dependency':
            case 'architecture':
            case 'repository':
            case 'api':
            case 'database':
                return ['a9', 'a1', 'a4'];
            case 'incident':
                return ['a9', 'a3'];
            case 'navigation':
                return ['a9', 'a2'];
            case 'onboarding':
                return ['a9', 'a2', 'a7'];
            default:
                return ['a9', 'a1'];
        }
    }

    private async runFleet(query: string, capability: string) {
        const ids = this.agentSelection(capability);
        const results = await Promise.all(ids.map((id) => runAgent(id, query, this.memory)));
        return results.map((r) => ({
            agentId: r.agentId,
            name: r.name,
            finding: r.finding,
            details: r.details,
            confidence: r.confidence,
            sources: r.sources,
        }));
    }

    private async gatherBrain(
        query: string,
        capability: string,
        ctx: { ownedSystems: string[] },
    ) {
        const tokens = query
            .toLowerCase()
            .replace(/[?.!,]/g, '')
            .split(/\s+/)
            .filter((t) => t.length > 3);

        const [nodes, decisions, res, hotspots, recs, decisionAnswer] = await Promise.all([
            this.prisma.knowledgeNode.findMany(),
            this.prisma.decisionRecord.findMany({ include: { relations: true, outcomes: true } }),
            this.resilience.getResilience(),
            this.risk.getIntelligence('organization'),
            this.risk.getRecommendations(),
            ['decision', 'history'].includes(capability)
                ? this.decisions.answer(query).catch(() => null)
                : Promise.resolve(null),
        ]);

        const score = (haystack: string) => {
            const h = haystack.toLowerCase();
            return tokens.reduce((s, t) => s + (h.includes(t) ? 1 : 0), 0);
        };

        const matchedNodes = nodes
            .map((n) => ({ node: n, score: score(`${n.label} ${n.summary} ${n.metadata ?? ''}`) }))
            .filter((m) => m.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 6);

        const matchedDecisions = decisions
            .map((d) => ({ d, score: score(`${d.title} ${d.topic} ${d.domain} ${d.summary}`) }))
            .filter((m) => m.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 4);

        const matchedSystems = [...hotspots.nodes]
            .filter((n) => n.kind !== 'team')
            .map((n) => ({ n, score: score(`${n.label} ${(n.contributingFactors ?? []).join(' ')}`) }))
            .filter((m) => m.score > 0 || (m.n.kind === 'service' && ctx.ownedSystems.some((s) => nLabelIncludes(m.n.label, s))))
            .sort((a, b) => b.score - a.score)
            .slice(0, 4);

        const evidence: MentorEvidenceItem[] = [];
        if (decisionAnswer && decisionAnswer.evidence.length) {
            evidence.push(...decisionAnswer.evidence.slice(0, 3).map((e) => ({ source: e.source, excerpt: e.excerpt, type: e.type, confidence: e.confidence })));
        }
        for (const m of matchedDecisions.slice(0, 3)) {
            evidence.push({
                source: `Decision: ${m.d.title}`,
                excerpt: m.d.summary,
                type: 'decision',
                confidence: m.d.confidence,
            });
        }
        for (const m of matchedNodes.slice(0, 3)) {
            evidence.push({
                source: `${m.node.kind}: ${m.node.label}`,
                excerpt: m.node.summary || 'Knowledge node in the organizational graph',
                type: m.node.kind,
                confidence: 80,
            });
        }
        for (const m of matchedSystems.slice(0, 2)) {
            evidence.push({
                source: `System: ${m.n.label}`,
                excerpt: (m.n.contributingFactors ?? []).slice(0, 2).join('; ') || `${m.n.band} risk`,
                type: 'risk',
                confidence: m.n.aiConfidence,
            });
        }

        const relatedKnowledge: MentorRelatedKnowledge[] = [
            ...matchedNodes.slice(0, 4).map((m) => ({
                id: m.node.id,
                label: m.node.label,
                kind: m.node.kind,
                route: '/dashboard/brain',
                reason: 'matched knowledge node',
            })),
            ...matchedDecisions.slice(0, 3).map((m) => ({
                id: m.d.id,
                label: m.d.title,
                kind: 'decision',
                route: `/dashboard/decisions?id=${m.d.id}`,
                reason: `matched decision · ${m.d.domain}`,
            })),
            ...matchedSystems.slice(0, 3).map((m) => ({
                id: m.n.id,
                label: m.n.label,
                kind: m.n.kind,
                route: '/dashboard/risk',
                reason: `${m.n.band} risk hotspot`,
            })),
        ].slice(0, 8);

        const dependencies: MentorDependencyPath[] = [];
        const systemIds = new Set<string>(matchedSystems.map((m) => m.n.nodeId).filter((id): id is string => Boolean(id)));
        if (systemIds.size) {
            const edges = await this.prisma.knowledgeEdge.findMany({
                where: { OR: [{ sourceId: { in: [...systemIds] } }, { targetId: { in: [...systemIds] } }] },
            });
            for (const e of edges.slice(0, 8)) {
                const src = nodes.find((n) => n.id === e.sourceId);
                const tgt = nodes.find((n) => n.id === e.targetId);
                if (src && tgt) dependencies.push({ source: src.label, target: tgt.label, type: e.type });
            }
        }

        return {
            evidence,
            relatedKnowledge,
            dependencies,
            impactedSystems: matchedSystems.map((m) => m.n.label),
            hotspots: [...hotspots.nodes].filter((n) => n.kind !== 'team').slice(0, 3),
            recommendations: recs.slice(0, 3),
            resilience: res,
        };
    }

    private async buildAnswer(
        query: string,
        capability: string,
        reasoning: ReturnType<typeof getReasoningSnapshot>,
        fleet: Array<{ agentId: string; name: string; finding: string; confidence: number }>,
        brain: Awaited<ReturnType<typeof this.gatherBrain>>,
        ctx: Awaited<ReturnType<typeof this.context.getUserContext>>,
    ): Promise<Omit<MentorAnswer, 'conversationId' | 'messageId'>> {
        const mentor = fleet.find((f) => f.agentId === 'a9');
        const topSystem = brain.impactedSystems[0];
        const topRecommendation = brain.recommendations[0];
        const personaLabel = ctx.persona.replace('-', ' ');

        const intro = `As your mentor (${personaLabel}${ctx.team ? `, ${ctx.team} team` : ''}), here is what the Organizational Digital Brain tells us about "${query}".`;

        let body: string;
        switch (capability) {
            case 'decision':
                body = brain.evidence.some((e) => e.type === 'decision')
                    ? `The decision registry reconstructs this from real evidence. ${brain.evidence.filter((e) => e.type === 'decision').slice(0, 2).map((e) => `${e.source}: ${e.excerpt}`).join(' ')}`
                    : 'No matching decision is reconstructed yet. Ask me to reconstruct it, or open the Decision Time Machine and replay related decisions.';
                break;
            case 'debt':
                body = brain.hotspots.length
                    ? `The risk engine ranks these as the highest-risk nodes: ${brain.hotspots.map((h) => `${h.label} (${h.band}, ${h.overallRisk}/100)`).join(', ')}. ${topRecommendation ? `The top recommended action is to ${topRecommendation.action.toLowerCase()} (owner ${topRecommendation.owner}, ${topRecommendation.eta}).` : ''}`
                    : 'No high-risk nodes detected in the current heatmap.';
                break;
            case 'dependency':
                body = brain.dependencies.length
                    ? `The knowledge graph shows these dependency edges: ${brain.dependencies.map((d) => `${d.source} → ${d.target} (${d.type})`).join('; ')}. ${topSystem ? `The most affected system is ${topSystem}.` : ''}`
                    : 'No dependency edges matched this query in the knowledge graph.';
                break;
            case 'documentation':
            case 'onboarding':
                body = `Documentation coverage sits at ${100 - brain.resilience.averageRisk}% implied health with ${brain.resilience.undocumentedFlags} undocumented flags. ` +
                    `${topSystem ? `Start with ${topSystem} — it is on the risk heatmap (${brain.hotspots[0]?.band ?? 'medium'}).` : 'Start with the Documentation page for the full inventory.'} ` +
                    `Use the learning path below for a step-by-step sequence.`;
                break;
            default:
                body = mentor?.finding ?? reasoning.summary;
        }

        const answer = `${intro}\n\n${body}`;

        const reasoningTrace = [
            `Detected capability: ${capability} (topic "${reasoning.topic}").`,
            `Resolved your context: ${personaLabel}${ctx.team ? ` · ${ctx.team}` : ''}${ctx.ownedSystems.length ? ` · owns ${ctx.ownedSystems.join(', ')}` : ''}.`,
            `Fleet engaged: ${fleet.map((f) => f.agentId).join(', ')} — each persisted findings to shared organizational memory.`,
            `Cross-referenced ${brain.evidence.length} evidence items, ${brain.relatedKnowledge.length} related knowledge artifacts, and ${brain.dependencies.length} dependency edges.`,
            `Synthesis weighted agent confidence (${Math.round(fleet.reduce((s, f) => s + f.confidence, 0) / Math.max(1, fleet.length))}% mean) with evidence richness.`,
        ];

        const confidence = clamp(
            reasoning.confidence * 0.4 +
                fleet.reduce((s, f) => s + f.confidence, 0) / Math.max(1, fleet.length) * 0.3 +
                clamp(40 + brain.evidence.length * 8) * 0.3,
        );

        const navigation: MentorNavigationLink[] = [
            { label: 'Organizational Brain', route: '/dashboard/brain', description: 'Explore the knowledge graph' },
            { label: 'Decision Time Machine', route: '/dashboard/decisions', description: 'Replay evidence-based decisions' },
            { label: 'Knowledge Risk Heatmap', route: '/dashboard/risk', description: 'See risk nodes and predictions' },
            { label: 'Employee Exit Simulation', route: '/dashboard/exit-sim', description: 'Resilience and succession planning' },
            { label: 'Documentation', route: '/dashboard/docs', description: 'Documentation inventory and state' },
        ];

        const learningPath = await this.learning.getLearningPath(ctx.userId);

        return {
            capability,
            topic: reasoning.topic,
            answer,
            reasoning: reasoningTrace,
            confidence,
            evidence: brain.evidence,
            relatedKnowledge: brain.relatedKnowledge,
            dependencies: brain.dependencies,
            impactedSystems: brain.impactedSystems,
            followUps: this.guidance.followUps(answer, capability),
            navigation,
            learningModules: learningPath.modules,
            context: ctx,
            createdAt: new Date().toISOString(),
        };
    }

    private titleFor(query: string): string {
        const words = query.trim().split(/\s+/);
        const title = words.slice(0, 8).join(' ');
        return words.length > 8 ? `${title}…` : title || 'Mentor conversation';
    }
}

function nLabelIncludes(label: string, owned: string): boolean {
    return label.toLowerCase().includes(owned.toLowerCase());
}
