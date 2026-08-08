import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgentMemoryService } from '../agents/agent-memory.service';
import { runAllAgents, runAgent } from '../phoenix/phoenix.agents';
import { EventBus } from '../events/event-bus';
import type {
    DecisionAnswer,
    DecisionDetail,
    DecisionListItem,
    DecisionStatus,
} from './decision.types';

interface ListFilters {
    domain?: string;
    status?: string;
    team?: string;
    query?: string;
}

const PARTICIPANT_RELATIONS = ['proposed_by', 'approved_by', 'implemented_by', 'rejected_by'];

@Injectable()
export class DecisionService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly memory: AgentMemoryService,
        private readonly eventBus: EventBus,
    ) {}

    private async buildWhere(filters: ListFilters) {
        const where: Record<string, unknown> = {};
        if (filters.domain) where.domain = filters.domain;
        if (filters.status) where.status = filters.status;
        if (filters.team) where.team = filters.team;
        if (filters.query) {
            where.OR = [
                { title: { contains: filters.query } },
                { topic: { contains: filters.query } },
                { summary: { contains: filters.query } },
            ];
        }
        return where;
    }

    async list(filters: ListFilters = {}): Promise<DecisionListItem[]> {
        const where = await this.buildWhere(filters);
        const rows = await this.prisma.decisionRecord.findMany({
            where,
            orderBy: { startedAt: 'desc' },
            include: {
                _count: { select: { alternatives: true, outcomes: true } },
                relations: { where: { type: 'depends_on' } },
            },
        });
        return rows.map((r) => this.toListItem(r));
    }

    private toListItem(r: {
        id: string;
        title: string;
        topic: string;
        domain: string;
        status: string;
        summary: string;
        confidence: number;
        createdBy: string | null;
        team: string | null;
        startedAt: string;
        decidedAt: string | null;
        implementedAt: string | null;
        _count?: { alternatives: number; outcomes: number };
        relations?: Array<{ type: string }>;
    }): DecisionListItem {
        return {
            id: r.id,
            title: r.title,
            topic: r.topic,
            domain: r.domain,
            status: r.status as DecisionStatus,
            summary: r.summary,
            confidence: r.confidence,
            createdBy: r.createdBy,
            team: r.team,
            startedAt: r.startedAt,
            decidedAt: r.decidedAt,
            implementedAt: r.implementedAt,
            alternativeCount: r._count?.alternatives ?? 0,
            outcomeCount: r._count?.outcomes ?? 0,
            dependencies: r.relations?.length ?? 0,
        };
    }

    async detail(id: string): Promise<DecisionDetail> {
        const record = await this.prisma.decisionRecord.findUnique({
            where: { id },
            include: {
                _count: { select: { alternatives: true, outcomes: true } },
                alternatives: { orderBy: { order: 'asc' } },
                evidence: { orderBy: { date: 'asc' } },
                milestones: { orderBy: { order: 'asc' } },
                outcomes: true,
                relations: true,
                supersedes: { select: { id: true, title: true } },
                supersededBy: { select: { id: true, title: true } },
            },
        });
        if (!record) {
            throw new NotFoundException(`Unknown decision: ${id}`);
        }

        const participants = record.relations
            .filter((rel) => PARTICIPANT_RELATIONS.includes(rel.type))
            .map((rel) => rel.targetLabel)
            .filter(Boolean);

        return {
            ...this.toListItem(record),
            businessContext: record.businessContext,
            technicalContext: record.technicalContext,
            alternatives: record.alternatives.map((a) => ({
                id: a.id,
                label: a.label,
                status: a.status as 'accepted' | 'rejected' | 'considered',
                rationale: a.rationale,
                votes: a.votes,
                confidence: a.confidence,
                order: a.order,
            })),
            evidence: record.evidence.map((e) => ({
                sourceType: e.sourceType,
                sourceRef: e.sourceRef,
                excerpt: e.excerpt,
                confidence: e.confidence,
                date: e.date,
            })),
            milestones: record.milestones.map((m) => ({
                id: m.id,
                label: m.label,
                phase: m.phase,
                date: m.date,
                summary: m.summary,
                evidenceSources: m.evidenceSources,
                order: m.order,
            })),
            outcomes: record.outcomes.map((o) => ({
                metric: o.metric,
                before: o.before,
                after: o.after,
                direction: o.direction,
            })),
            relations: record.relations.map((rel) => ({
                type: rel.type,
                targetType: rel.targetType,
                targetId: rel.targetId,
                targetLabel: rel.targetLabel,
            })),
            participants: [...new Set(participants)],
            recommendations: this.buildRecommendations(record),
        };
    }

    private buildRecommendations(record: {
        status: string;
        confidence: number;
        summary: string;
        domain: string;
    }): string[] {
        const recs: string[] = [];
        if (record.status === 'identified' || record.status === 'discussed') {
            recs.push('Record the architecture decision record (ADR) to lock in rationale and rejected alternatives.');
            recs.push('Schedule the approval review with the Architecture Council before implementation starts.');
        }
        if (record.status === 'approved') {
            recs.push('Publish the implementation plan with owners, milestones, and rollback criteria.');
        }
        if (record.status === 'implemented') {
            recs.push('Validate the decision against its success metrics and record measurable outcomes.');
        }
        if (record.status === 'validated') {
            recs.push('Review downstream decisions that depend on this one for staleness.');
        }
        if (record.confidence < 70) {
            recs.push('Collect additional corroborating evidence to raise reconstruction confidence.');
        }
        return recs;
    }

    /** Continuously evolve the decision registry: run the shared agent fleet and
     *  persist a reconstructed DecisionRecord keyed by the detected topic. */
    async reconstruct(query: string): Promise<DecisionDetail> {
        const report = await runAllAgents(query, this.memory);
        await runAgent('a6', query, this.memory);

        const topic = report.topic;
        const existing = await this.prisma.decisionRecord.findFirst({
            where: { topic },
            include: { _count: { select: { alternatives: true, outcomes: true } }, relations: { where: { type: 'depends_on' } } },
        });
        const confidence = Math.round(report.results.reduce((s, r) => s + r.confidence, 0) / Math.max(1, report.results.length));

        const record = existing
            ? await this.prisma.decisionRecord.update({
                  where: { id: existing.id },
                  data: {
                      title: topic,
                      summary: `Reconstructed from shared agent memory for query "${query}".`,
                      confidence,
                      status: existing.status === 'validated' ? 'validated' : 'discussed',
                  },
              })
            : await this.prisma.decisionRecord.create({
                  data: {
                      title: topic,
                      topic,
                      domain: 'platform',
                      status: 'identified',
                      summary: `Reconstructed from shared agent memory for query "${query}".`,
                      confidence,
                      startedAt: new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' }),
                      createdBy: 'Phoenix Agent Fleet',
                      team: 'Platform',
                  },
              });

        this.eventBus.emit('decision.reconstructed', `decision:${record.id}`, `Decision "${topic}" reconstructed from agent memory`);
        return this.detail(record.id);
    }

    /** Evidence-based semantic answers reconstructed from the real decision registry. */
    async answer(question: string): Promise<DecisionAnswer> {
        const q = question.toLowerCase();
        const all = await this.prisma.decisionRecord.findMany({
            include: {
                evidence: true,
                outcomes: true,
                relations: { where: { type: { in: ['proposed_by', 'impacts'] } } },
            },
        });
        const scored = all
            .map((d) => {
                const haystack = `${d.title} ${d.topic} ${d.domain} ${d.summary} ${d.businessContext} ${d.technicalContext}`.toLowerCase();
                let score = 0;
                const tokens = q.replace(/[?.!,]/g, '').split(/\s+/).filter((t) => t.length > 3);
                for (const t of tokens) {
                    if (haystack.includes(t)) score += 1;
                    for (const e of d.evidence) {
                        if (`${e.sourceRef} ${e.excerpt}`.toLowerCase().includes(t)) score += 0.5;
                    }
                }
                return { d, score };
            })
            .filter((s) => s.score > 0)
            .sort((a, b) => b.score - a.score);

        if (scored.length === 0) {
            return {
                question,
                answer: `No decision in the registry matches "${question}". Run a reconstruction to evolve the brain.`,
                confidence: 0,
                evidence: [],
                decisionIds: [],
            };
        }

        const top = scored[0];
        const best = top.d;
        const reasoning = this.answerFor(best, q);
        const evidence = best.evidence.map((e) => ({
            source: e.sourceRef,
            excerpt: e.excerpt,
            type: e.sourceType,
            confidence: e.confidence,
        }));

        return {
            question,
            answer: reasoning,
            confidence: best.confidence,
            evidence,
            decisionIds: scored.slice(0, 3).map((s) => s.d.id),
        };
    }

    private answerFor(d: {
        title: string;
        topic: string;
        domain: string;
        status: string;
        summary: string;
        businessContext: string;
        technicalContext: string;
        startedAt: string;
        decidedAt: string | null;
        team: string | null;
        outcomes: Array<{ metric: string; before: string; after: string; direction: string }>;
        relations: Array<{ type: string; targetLabel: string }>;
    }, question: string): string {
        const proposer = d.relations.find((r) => r.type === 'proposed_by')?.targetLabel ?? 'unrecorded';
        const decisionDate = d.decidedAt ?? d.startedAt;
        const outcomes = d.outcomes.length
            ? d.outcomes.map((o) => `${o.metric} ${o.before} → ${o.after}`).join('; ')
            : 'outcomes not yet recorded';

        if (/(why|reason|driver)/.test(question)) {
            return `${d.title} (${d.domain}) was adopted because: ${d.businessContext} Technically, ${d.technicalContext} The decision is recorded as ${d.status} as of ${decisionDate}.`;
        }
        if (/(who|participant|propos|owner|team)/.test(question)) {
            return `${d.title} was proposed by ${proposer} on ${d.startedAt} and is tracked under the ${d.team ?? 'Platform'} team. Status: ${d.status}.`;
        }
        if (/(impact|affect|system|service)/.test(question)) {
            const impacts = d.relations
                .filter((r) => r.type === 'impacts')
                .map((r) => r.targetLabel);
            return `${d.title} impacts: ${impacts.length ? impacts.join(', ') : 'systems not yet mapped'}. Measured so far: ${outcomes}.`;
        }
        if (/(improve|result|outcome|better|performance)/.test(question)) {
            return `Measured outcomes for ${d.title}: ${outcomes}.`;
        }
        return `${d.title} — ${d.summary} Status: ${d.status}. Evidence-backed reconstruction: ${outcomes}.`;
    }
}
