import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { TimelineItem, TimelineMode, TimelineView } from './decision.types';

interface TimelineFilters {
    domain?: string;
    status?: string;
    team?: string;
    query?: string;
}

const ARCHITECTURE_DOMAINS = ['database', 'auth', 'api', 'infrastructure', 'architecture'];
const ORGANIZATION_RELATIONS = ['proposed_by', 'approved_by', 'implemented_by', 'discussed_in', 'rejected_by'];
const SERVICE_RELATIONS = ['impacts', 'depends_on', 'mitigates', 'validates', 'contributes_to'];

@Injectable()
export class TimelineService {
    constructor(private readonly prisma: PrismaService) {}

    async getTimeline(mode: TimelineMode, filters: TimelineFilters = {}): Promise<TimelineView> {        const where: Record<string, unknown> = {};
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

        const decisions = await this.prisma.decisionRecord.findMany({
            where,
            orderBy: { startedAt: 'asc' },
            include: {
                milestones: { orderBy: { order: 'asc' } },
                evidence: { orderBy: { date: 'asc' } },
                relations: true,
                _count: { select: { alternatives: true, outcomes: true } },
            },
        });

        let items: TimelineItem[] = [];
        switch (mode) {
            case 'dependency':
                items = this.dependencyItems(decisions);
                break;
            case 'architecture':
                items = this.architectureItems(decisions);
                break;
            case 'organization':
                items = this.organizationItems(decisions);
                break;
            case 'repository':
                items = this.repositoryItems(decisions);
                break;
            case 'service':
                items = await this.serviceItems(decisions);
                break;
            default:
                items = this.chronologicalItems(decisions);
        }

        return {
            mode,
            filters: {
                domain: filters.domain,
                status: filters.status,
                team: filters.team,
                query: filters.query,
            },
            items: items.sort((a, b) => a.date.localeCompare(b.date)),
            decisions: decisions.map((d) => ({
                id: d.id,
                title: d.title,
                topic: d.topic,
                domain: d.domain,
                status: d.status as TimelineView['decisions'][number]['status'],
                summary: d.summary,
                confidence: d.confidence,
                createdBy: d.createdBy,
                team: d.team,
                startedAt: d.startedAt,
                decidedAt: d.decidedAt,
                implementedAt: d.implementedAt,
                alternativeCount: d._count.alternatives,
                outcomeCount: d._count.outcomes,
                dependencies: d.relations.filter((r) => r.type === 'depends_on').length,
            })),
        };
    }

    private chronologicalItems(decisions: Array<{ id: string; title: string; milestones: Array<{ id: string; label: string; phase: string; date: string; summary: string; evidenceSources: number }> }>): TimelineItem[] {
        const items: TimelineItem[] = [];
        for (const d of decisions) {
            for (const m of d.milestones) {
                items.push({
                    id: m.id,
                    decisionId: d.id,
                    decisionTitle: d.title,
                    date: m.date,
                    label: m.label,
                    type: 'milestone',
                    phase: m.phase,
                    confidence: 90,
                    summary: m.summary,
                    evidenceSources: m.evidenceSources,
                });
            }
        }
        return items;
    }

    private dependencyItems(decisions: Array<{ id: string; title: string; relations: Array<{ id: string; type: string; targetType: string; targetId: string; targetLabel: string }> }>): TimelineItem[] {
        const byId = new Map(decisions.map((d) => [d.id, d.title]));
        const items: TimelineItem[] = [];
        for (const d of decisions) {
            for (const rel of d.relations.filter((r) => r.type === 'depends_on' && r.targetType === 'decision')) {
                items.push({
                    id: rel.id,
                    decisionId: d.id,
                    decisionTitle: d.title,
                    date: '—',
                    label: `${d.title} depends on ${rel.targetLabel}`,
                    type: 'relation',
                    relationType: 'depends_on',
                    targetLabel: rel.targetLabel,
                    confidence: 88,
                    summary: `${d.title} relies on the outcome of ${byId.get(rel.targetId) ?? rel.targetLabel}.`,
                });
            }
        }
        return items;
    }

    private architectureItems(decisions: Array<{ id: string; title: string; domain: string; startedAt: string; milestones: Array<{ id: string; label: string; phase: string; date: string; summary: string; evidenceSources: number }>; relations: Array<{ id: string; type: string; targetLabel: string }> }>): TimelineItem[] {
        const items: TimelineItem[] = [];
        for (const d of decisions) {
            if (!ARCHITECTURE_DOMAINS.includes(d.domain)) continue;
            for (const m of d.milestones) {
                items.push({
                    id: m.id,
                    decisionId: d.id,
                    decisionTitle: d.title,
                    date: m.date,
                    label: m.label,
                    type: 'milestone',
                    phase: m.phase,
                    confidence: 90,
                    summary: m.summary,
                    evidenceSources: m.evidenceSources,
                });
            }
            for (const rel of d.relations.filter((r) => r.type === 'impacts')) {
                items.push({
                    id: rel.id,
                    decisionId: d.id,
                    decisionTitle: d.title,
                    date: d.startedAt,
                    label: `${d.title} impacts ${rel.targetLabel}`,
                    type: 'relation',
                    relationType: 'impacts',
                    targetLabel: rel.targetLabel,
                    confidence: 85,
                    summary: `Architecture change affects the ${rel.targetLabel} surface.`,
                });
            }
        }
        return items;
    }

    private organizationItems(decisions: Array<{ id: string; title: string; startedAt: string; relations: Array<{ id: string; type: string; targetLabel: string }> }>): TimelineItem[] {
        const items: TimelineItem[] = [];
        for (const d of decisions) {
            for (const rel of d.relations.filter((r) => ORGANIZATION_RELATIONS.includes(r.type))) {
                items.push({
                    id: rel.id,
                    decisionId: d.id,
                    decisionTitle: d.title,
                    date: d.startedAt,
                    label: `${rel.targetLabel} ${rel.type.replace('_', ' ')} ${d.title}`,
                    type: 'relation',
                    relationType: rel.type,
                    targetLabel: rel.targetLabel,
                    confidence: 84,
                    summary: `Organizational role in the ${d.title} decision.`,
                });
            }
        }
        return items;
    }

    private repositoryItems(decisions: Array<{ id: string; title: string; startedAt: string; evidence: Array<{ id: string; sourceType: string; sourceRef: string; excerpt: string; confidence: number; date: string }> }>): TimelineItem[] {
        const items: TimelineItem[] = [];
        for (const d of decisions) {
            for (const e of d.evidence.filter((ev) => ev.sourceType === 'commit')) {
                items.push({
                    id: e.id,
                    decisionId: d.id,
                    decisionTitle: d.title,
                    date: e.date,
                    label: e.sourceRef,
                    type: 'evidence',
                    phase: 'implementation',
                    confidence: e.confidence,
                    summary: e.excerpt,
                });
            }
        }
        return items;
    }

    private async serviceItems(decisions: Array<{ id: string; title: string; startedAt: string; milestones: Array<{ id: string; label: string; phase: string; date: string; summary: string; evidenceSources: number }>; relations: Array<{ id: string; type: string; targetType: string; targetId: string; targetLabel: string }> }>): Promise<TimelineItem[]> {
        const serviceTargets = decisions
            .flatMap((d) => d.relations)
            .filter((r) => SERVICE_RELATIONS.includes(r.type))
            .map((r) => r.targetId);
        const nodes = serviceTargets.length
            ? await this.prisma.knowledgeNode.findMany({ where: { id: { in: serviceTargets } } })
            : [];
        const serviceIds = new Set(nodes.filter((n) => ['service', 'database', 'repository', 'external'].includes(n.kind)).map((n) => n.id));

        const items: TimelineItem[] = [];
        for (const d of decisions) {
            for (const rel of d.relations.filter((r) => SERVICE_RELATIONS.includes(r.type) && serviceIds.has(r.targetId))) {
                items.push({
                    id: rel.id,
                    decisionId: d.id,
                    decisionTitle: d.title,
                    date: d.startedAt,
                    label: `${d.title} ${rel.type} ${rel.targetLabel}`,
                    type: 'relation',
                    relationType: rel.type,
                    targetLabel: rel.targetLabel,
                    confidence: 86,
                    summary: `Service lifecycle link from the ${d.title} decision.`,
                });
            }
            for (const m of d.milestones.filter((m) => m.phase === 'deployment' || m.phase === 'outcome')) {
                items.push({
                    id: m.id,
                    decisionId: d.id,
                    decisionTitle: d.title,
                    date: m.date,
                    label: m.label,
                    type: 'milestone',
                    phase: m.phase,
                    confidence: 90,
                    summary: m.summary,
                    evidenceSources: m.evidenceSources,
                });
            }
        }
        return items;
    }

    async getParticipantsMap(decisionIds: string[]): Promise<Record<string, string[]>> {
        if (decisionIds.length === 0) return {};
        const rels = await this.prisma.decisionRelation.findMany({
            where: {
                decisionId: { in: decisionIds },
                type: { in: ['proposed_by', 'approved_by', 'implemented_by', 'discussed_in', 'rejected_by'] },
            },
        });
        const map: Record<string, string[]> = {};
        for (const r of rels) {
            if (!r.targetLabel) continue;
            (map[r.decisionId] ??= []).push(r.targetLabel);
        }
        return map;
    }
}
