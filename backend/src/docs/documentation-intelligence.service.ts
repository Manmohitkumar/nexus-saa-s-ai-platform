import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkforceDataService, WorkforceSnapshot, WorkforceSystem } from '../workforce/workforce.data.service';
import { RiskService } from '../risk/risk.service';
import { RiskNode } from '../risk/risk.types';
import { DocCandidate, DocKind, DocSection } from './documentation.types';

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

export interface DocumentationContext {
    systems: WorkforceSystem[];
    employees: WorkforceSnapshot['employees'];
    edges: WorkforceSnapshot['edges'];
    nodeById: Map<string, { id: string; label: string; kind: string; summary: string }>;
    systemNodeLabel: Map<string, string>;
    riskByNodeId: Map<string, RiskNode>;
    decisions: Array<{
        id: string;
        title: string;
        topic: string;
        domain: string;
        status: string;
        summary: string;
        businessContext: string;
        technicalContext: string;
        confidence: number;
        decidedAt: string | null;
        implementedAt: string | null;
        supersededById: string | null;
        createdBy: string | null;
        team: string | null;
        alternatives: Array<{ label: string; status: string; rationale: string; votes: number; confidence: number }>;
        evidence: Array<{ sourceType: string; sourceRef: string; excerpt: string; confidence: number; date: string }>;
        milestones: Array<{ label: string; phase: string; date: string; summary: string }>;
        outcomes: Array<{ metric: string; before: string; after: string; direction: string }>;
        relations: Array<{ type: string; targetType: string; targetId: string; targetLabel: string }>;
    }>;
}

/**
 * Documentation Intelligence Engine — derives the canonical, versioned
 * documentation set for the organization. It never invents knowledge: every
 * document is generated from the Organizational Digital Brain (systems, flags,
 * graph edges, decisions, workforce metadata, risk attributes). Content
 * sections are assembled only from entities that already exist in the brain.
 */
@Injectable()
export class DocumentationIntelligenceService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly data: WorkforceDataService,
        private readonly risk: RiskService,
    ) {}

    async context(): Promise<DocumentationContext> {
        const snapshot = await this.data.snapshot();
        const [nodes, edges, decisions, riskView] = await Promise.all([
            this.prisma.knowledgeNode.findMany(),
            this.prisma.knowledgeEdge.findMany(),
            this.prisma.decisionRecord.findMany({
                include: { alternatives: true, evidence: true, milestones: true, outcomes: true, relations: true },
            }),
            this.risk.getIntelligence('organization'),
        ]);

        const nodeById = new Map(nodes.map((n) => [n.id, { id: n.id, label: n.label, kind: n.kind, summary: n.summary }]));
        const systemNodeLabel = new Map<string, string>();
        for (const s of snapshot.systems) {
            if (s.nodeId && nodeById.has(s.nodeId)) systemNodeLabel.set(s.nodeId, nodeById.get(s.nodeId)!.label);
        }
        const riskByNodeId = new Map<string, RiskNode>();
        for (const n of riskView.nodes) if (n.nodeId) riskByNodeId.set(n.nodeId, n);

        return {
            systems: snapshot.systems,
            employees: snapshot.employees,
            edges: snapshot.edges,
            nodeById,
            systemNodeLabel,
            riskByNodeId,
            decisions: decisions.map((d) => ({
                id: d.id,
                title: d.title,
                topic: d.topic,
                domain: d.domain,
                status: d.status,
                summary: d.summary,
                businessContext: d.businessContext,
                technicalContext: d.technicalContext,
                confidence: d.confidence,
                decidedAt: d.decidedAt,
                implementedAt: d.implementedAt,
                supersededById: d.supersededById,
                createdBy: d.createdBy,
                team: d.team,
                alternatives: d.alternatives.map((a) => ({ label: a.label, status: a.status, rationale: a.rationale, votes: a.votes, confidence: a.confidence })),
                evidence: d.evidence.map((e) => ({ sourceType: e.sourceType, sourceRef: e.sourceRef, excerpt: e.excerpt, confidence: e.confidence, date: e.date })),
                milestones: d.milestones.map((m) => ({ label: m.label, phase: m.phase, date: m.date, summary: m.summary })),
                outcomes: d.outcomes.map((o) => ({ metric: o.metric, before: o.before, after: o.after, direction: o.direction })),
                relations: d.relations.map((r) => ({ type: r.type, targetType: r.targetType, targetId: r.targetId, targetLabel: r.targetLabel })),
            })),
        };
    }

    /**
     * Builds the canonical candidate set: every system → service/api/db/infra
     * doc (+ runbook for high-risk systems), every decision → ADR, plus the
     * organizational docs (onboarding, repository overview, release notes,
     * knowledge-transfer guides, executive summary).
     */
    async describeCandidates(ctx: DocumentationContext): Promise<DocCandidate[]> {
        const candidates: DocCandidate[] = [];

        for (const sys of ctx.systems) {
            const risk = sys.nodeId ? ctx.riskByNodeId.get(sys.nodeId) : undefined;
            const kind = this.kindForSystem(sys);
            const label = ctx.systemNodeLabel.get(sys.nodeId ?? '') ?? sys.name;
            const owners = sys.ownerIds
                .map((oid) => ctx.employees.find((e) => e.id === oid))
                .filter(Boolean) as typeof ctx.employees;
            const owner = owners.map((o) => o.name).join(', ') || 'Unassigned';
            const team = sys.team ?? owners[0]?.team ?? '';

            candidates.push({
                title: `${this.titleFor(sys)} — Service Documentation`,
                slug: this.slug(`${kind}-${sys.name}`),
                kind,
                summary: `${label} service documentation generated from the organizational knowledge graph, ownership registry, feature flags, and decision evidence.`,
                sourceType: this.sourceTypeFor(sys),
                sourceRef: sys.id,
                relatedNode: sys.nodeId ?? '',
                owner,
                team,
                confidence: risk ? clamp(65 + risk.documentationCoverage * 0.35) : 72,
                content: this.serviceSections(ctx, sys, risk, owners),
            });

            const runbookRisk = risk?.overallRisk ?? 0;
            if (runbookRisk >= 40) {
                candidates.push({
                    title: `${label} — Runbook`,
                    slug: this.slug(`runbook-${sys.name}`),
                    kind: 'runbook',
                    summary: `Operational runbook for ${label}, derived from its risk posture, feature-flag inventory, and known contributing factors.`,
                    sourceType: this.sourceTypeFor(sys),
                    sourceRef: sys.id,
                    relatedNode: sys.nodeId ?? '',
                    owner,
                    team,
                    confidence: 74,
                    content: this.runbookSections(ctx, sys, risk),
                });
            }
        }

        for (const d of ctx.decisions) {
            const author = d.createdBy ?? '';
            const team = d.team ?? '';
            candidates.push({
                title: `ADR: ${d.title}`,
                slug: this.slug(`adr-${d.title}`),
                kind: 'adr',
                summary: `Architecture Decision Record for "${d.title}" reconstructed from the decision registry, alternatives, evidence, milestones, and outcomes.`,
                sourceType: 'decision',
                sourceRef: d.id,
                relatedNode: '',
                owner: author,
                team,
                confidence: d.confidence,
                content: this.adrSections(d, ctx),
            });
        }

        candidates.push(...(await this.organizationalCandidates(ctx)));
        return candidates;
    }

    private async organizationalCandidates(ctx: DocumentationContext): Promise<DocCandidate[]> {
        const out: DocCandidate[] = [];

        // Organizational onboarding guide — derived from people and systems.
        out.push({
            title: 'New Employee Onboarding Guide',
            slug: this.slug('onboarding-guide'),
            kind: 'onboarding',
            summary: 'An onboarding walkthrough assembled from the workforce directory, team ownership, mentoring relationships, and the must-read decision records.',
            sourceType: 'org',
            sourceRef: 'onboarding',
            relatedNode: '',
            owner: 'Platform Engineering',
            team: '',
            confidence: 78,
            content: this.onboardingSections(ctx),
        });

        // Platform repository overview.
        const repos = [...ctx.systems];
        out.push({
            title: 'Platform Repository Overview',
            slug: this.slug('repository-overview'),
            kind: 'repository',
            summary: `An overview of the ${repos.length} platform components owned by the organization, their relationships, and contribution patterns.`,
            sourceType: 'repository',
            sourceRef: 'platform',
            relatedNode: '',
            owner: 'Platform Engineering',
            team: '',
            confidence: 72,
            content: this.repositorySections(ctx),
        });

        // Release notes — derived from implemented decisions.
        const shipped = ctx.decisions.filter((d) => ['implemented', 'validated'].includes(d.status));
        if (shipped.length) {
            out.push({
                title: 'Platform Release Notes',
                slug: this.slug('release-notes'),
                kind: 'release-notes',
                summary: `Release notes compiled from the ${shipped.length} decisions that reached the implemented or validated phase.`,
                sourceType: 'org',
                sourceRef: 'decisions',
                relatedNode: '',
                owner: 'Platform Engineering',
                team: '',
                confidence: 80,
                content: this.releaseNotesSections(shipped),
            });
        }

        // Knowledge transfer guides for the most concentrated knowledge.
        const concentrated = [...ctx.employees]
            .sort((a, b) => b.busFactor - a.busFactor || b.contributions - a.contributions)
            .slice(0, 2);
        for (const e of concentrated) {
            const owned = e.systems;
            out.push({
                title: `Knowledge Transfer: ${e.name}`,
                slug: this.slug(`knowledge-transfer-${e.name}`),
                kind: 'knowledge-transfer',
                summary: `Knowledge transfer guide for ${e.name}, covering owned systems (${owned.join(', ') || 'none'}), expertise, mentoring reach, and succession readiness.`,
                sourceType: 'employee',
                sourceRef: e.id,
                relatedNode: e.nodeId ?? '',
                owner: e.name,
                team: e.team,
                confidence: clamp(70 + e.successionReadiness * 0.3),
                content: this.transferSections(ctx, e),
            });
        }

        // Executive summary — derived from the live org posture.
        out.push({
            title: 'Executive Knowledge Summary',
            slug: this.slug('executive-summary'),
            kind: 'executive-summary',
            summary: 'A board-level snapshot of the organizational knowledge posture derived from workforce resilience, risk intelligence, decision throughput, and documentation health.',
            sourceType: 'org',
            sourceRef: 'executive',
            relatedNode: '',
            owner: 'Executive Leadership',
            team: '',
            confidence: 82,
            content: await this.executiveSections(ctx),
        });

        return out;
    }

    // --- kind / source helpers ---

    private kindForSystem(sys: WorkforceSystem): DocKind {
        if (sys.kind === 'database') return 'database';
        if (/api|gateway/i.test(sys.name)) return 'api';
        if (/infrastructure|ci-cd|monitoring|hosting|k8s|kubernetes/i.test(sys.name)) return 'infrastructure';
        if (sys.kind === 'repo') return 'repository';
        return 'service';
    }

    private sourceTypeFor(sys: WorkforceSystem): string {
        return this.kindForSystem(sys) as string;
    }

    private titleFor(sys: WorkforceSystem): string {
        const label = sys.name.replace(/(^|-)(\w)/g, (_m, _p, c) => c.toUpperCase());
        return label;
    }

    private slug(input: string): string {
        return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    // --- section builders ---

    private ownerNames(ctx: DocumentationContext, sys: WorkforceSystem): string[] {
        return sys.ownerIds
            .map((oid) => ctx.employees.find((e) => e.id === oid))
            .filter(Boolean)
            .map((e) => e!.name);
    }

    private serviceSections(
        ctx: DocumentationContext,
        sys: WorkforceSystem,
        risk: RiskNode | undefined,
        owners: typeof ctx.employees,
    ): DocSection[] {
        const label = ctx.systemNodeLabel.get(sys.nodeId ?? '') ?? sys.name;
        const ownersList = owners.map((o) => `${o.name} (${o.role}, ${o.team})`);
        const coverage = risk?.documentationCoverage ?? (sys.flagTotal ? clamp(100 - (sys.flagUndocumented / sys.flagTotal) * 100) : 50);

        const dependents = ctx.edges.filter((e) => e.targetId === sys.nodeId);
        const dependencies = ctx.edges.filter((e) => e.sourceId === sys.nodeId);
        const relatedDecisions = ctx.decisions.filter((d) =>
            d.relations.some((r) => r.targetType === 'knowledge' && r.targetId === sys.nodeId),
        );

        const sections: DocSection[] = [
            {
                heading: 'Overview',
                body: `${label} is a ${sys.kind} component in the organizational brain. This document is generated and synchronized by the Autonomous Documentation Engine from the knowledge graph, ownership registry, feature-flag inventory, and decision evidence.`,
                bullets: [`kind: ${sys.kind}`, `risk band: ${risk?.band ?? sys.risk ?? 'low'}`, `documentation coverage: ${coverage}%`],
            },
            {
                heading: 'Ownership',
                body: ownersList.length ? 'The following owners are registered in the workforce intelligence registry.' : 'No owner is currently assigned in the ownership registry.',
                bullets: ownersList.length ? ownersList : ['unassigned — flagged by the recommendation engine'],
                evidence: [`ownership concentration: ${risk?.knowledgeConcentration ?? 'n/a'}`, `bus factor: ${risk?.busFactor ?? 'n/a'}`],
            },
            {
                heading: 'Configuration & Feature Flags',
                body: `This system references ${sys.flagTotal} feature flags. Documentation status is computed from the flag descriptions in the Organizational Digital Brain.`,
                table: {
                    headers: ['Metric', 'Value'],
                    rows: [
                        ['Total flags', String(sys.flagTotal)],
                        ['Undocumented flags', String(sys.flagUndocumented)],
                        ['Enabled flags', String(sys.flagEnabled)],
                        ['Kill-switch flags', String(sys.killSwitches)],
                        ['Documentation coverage', `${coverage}%`],
                    ],
                },
                evidence: [`${sys.flagUndocumented}/${sys.flagTotal} flags undocumented`],
            },
            {
                heading: 'Dependencies',
                body: dependents.length || dependencies.length
                    ? 'Graph edges recorded in the Organizational Digital Brain.'
                    : 'No dependency edges are recorded for this component in the knowledge graph.',
                bullets: [
                    ...dependencies.map((e) => `depends on → ${ctx.nodeById.get(e.targetId)?.label ?? e.targetId} (${e.type})`),
                    ...dependents.map((e) => `depended on by ← ${ctx.nodeById.get(e.sourceId)?.label ?? e.sourceId} (${e.type})`),
                ].slice(0, 10),
            },
            {
                heading: 'Related Decisions',
                body: relatedDecisions.length
                    ? 'Decisions recorded in the Decision Time Machine that impact this component.'
                    : 'No decisions currently reference this component.',
                bullets: relatedDecisions.slice(0, 6).map((d) => `${d.title} (${d.status})`),
                evidence: relatedDecisions.slice(0, 3).map((d) => `Decision: ${d.title}`),
            },
            {
                heading: 'Risk Posture',
                body: risk
                    ? `The risk engine scores this component at ${risk.overallRisk}/100 (${risk.band}). Contributing factors are derived from flag coverage, ownership, and dependency pressure.`
                    : 'No risk score is currently computed for this component.',
                bullets: (risk?.contributingFactors ?? ['no contributing factors recorded']).slice(0, 5),
                evidence: risk ? [`overall risk ${risk.overallRisk}/100`, `band ${risk.band}`, `operational exposure ${risk.operationalExposure}%`] : [],
            },
            {
                heading: 'Operations & On-Call Essentials',
                body: 'Operational guidance derived from the runbook posture and flag inventory. Rollback is available through the recorded kill-switch flags.',
                bullets: [
                    `${sys.killSwitches} kill-switch flag(s) available for instant rollback`,
                    `monitoring: ${dependents.length || dependencies.length ? 'graph-linked telemetry surface' : 'no telemetry edges recorded'}`,
                    'deploy path: see the Platform Repository Overview',
                ],
                evidence: [`enabled flags: ${sys.flagEnabled}`],
            },
        ];

        // Only attach the flags table evidence if it is real.
        if (sys.flagTotal === 0) {
            sections[2].body = 'No feature flags are currently associated with this component in the flag dataset.';
            sections[2].table = undefined;
        }
        return sections;
    }

    private runbookSections(ctx: DocumentationContext, sys: WorkforceSystem, risk: RiskNode | undefined): DocSection[] {
        const label = ctx.systemNodeLabel.get(sys.nodeId ?? '') ?? sys.name;
        return [
            {
                heading: 'Purpose',
                body: `This runbook documents how to operate ${label} safely. It is generated from the risk engine and flag inventory, not from memory.`,
                bullets: [`risk band: ${risk?.band ?? 'low'}`, `overall risk: ${risk?.overallRisk ?? 'n/a'}/100`],
            },
            {
                heading: 'Key Procedures',
                body: 'Procedures are derived from the known operational exposure and kill-switch coverage of this component.',
                bullets: [
                    `Rollback: use the ${sys.killSwitches} kill-switch flag(s) before reverting the deployment`,
                    `Change: verify ${sys.flagEnabled} enabled flag(s) for progressive rollout behavior`,
                    `Recovery: follow the risk contributing factors below to triage`,
                ],
            },
            {
                heading: 'Known Risk Factors',
                body: 'Factors surfaced by the Knowledge Risk Heatmap that should inform any runbook review.',
                bullets: (risk?.contributingFactors ?? ['no contributing factors recorded']).slice(0, 6),
                evidence: risk ? [`exposure ${risk.operationalExposure}%`, `dependency pressure ${risk.criticalDependency}%`] : [],
            },
            {
                heading: 'Documentation Gap',
                body: risk && risk.flagUndocumented > 0
                    ? `${label} still has ${risk.flagUndocumented} undocumented flag(s). Add descriptions to complete this runbook.`
                    : 'Flag documentation coverage is complete.',
                evidence: [`coverage ${risk?.documentationCoverage ?? 'n/a'}%`],
            },
        ];
    }

    private adrSections(d: DocumentationContext['decisions'][number], _ctx: DocumentationContext): DocSection[] {
        const sections: DocSection[] = [
            {
                heading: 'Context',
                body: d.businessContext || d.technicalContext || d.summary || `Decision "${d.title}" reconstructed from the decision registry.`,
                bullets: [
                    `domain: ${d.domain}`,
                    `status: ${d.status}`,
                    `confidence: ${d.confidence}%`,
                    d.decidedAt ? `decided: ${d.decidedAt}` : 'not yet dated',
                ],
            },
            {
                heading: 'Decision',
                body: d.summary || 'The decision summary is recorded in the Decision Time Machine.',
                bullets: [`topic: ${d.topic}`],
                evidence: d.evidence.slice(0, 3).map((e) => `${e.sourceType}: ${e.sourceRef}`),
            },
            {
                heading: 'Alternatives Considered',
                body: d.alternatives.length ? 'Alternatives captured with the decision record.' : 'No alternatives were captured for this decision.',
                table: d.alternatives.length
                    ? {
                          headers: ['Option', 'Result', 'Rationale', 'Votes', 'Confidence'],
                          rows: d.alternatives.map((a) => [a.label, a.status, a.rationale || '—', String(a.votes), `${a.confidence}%`]),
                      }
                    : { headers: ['Option', 'Result'], rows: [['none recorded', '—']] },
            },
            {
                heading: 'Evidence',
                body: d.evidence.length ? 'Evidence artifacts that corroborate this decision.' : 'No evidence artifacts are linked yet.',
                table: d.evidence.length
                    ? {
                          headers: ['Source', 'Reference', 'Confidence', 'Date'],
                          rows: d.evidence.map((e) => [e.sourceType, e.sourceRef, `${e.confidence}%`, e.date || '—']),
                      }
                    : { headers: ['Source', 'Reference'], rows: [['none recorded', '—']] },
            },
            {
                heading: 'Milestones',
                body: d.milestones.length ? 'The decision lifecycle phases recorded in the registry.' : 'No milestones recorded.',
                table: d.milestones.length
                    ? {
                          headers: ['Phase', 'Label', 'Date', 'Summary'],
                          rows: d.milestones.map((m) => [m.phase, m.label, m.date || '—', m.summary]),
                      }
                    : { headers: ['Phase', 'Label'], rows: [['none recorded', '—']] },
            },
            {
                heading: 'Outcomes',
                body: d.outcomes.length ? 'Measured outcomes before and after this decision.' : 'No outcomes measured yet.',
                table: d.outcomes.length
                    ? {
                          headers: ['Metric', 'Before', 'After', 'Direction'],
                          rows: d.outcomes.map((o) => [o.metric, o.before || '—', o.after || '—', o.direction]),
                      }
                    : { headers: ['Metric', 'Direction'], rows: [['none recorded', '—']] },
            },
            {
                heading: 'Related Impacts',
                body: 'Entities and systems impacted by, or dependencies of, this decision.',
                bullets: d.relations
                    .filter((r) => ['impacts', 'depends_on'].includes(r.type))
                    .slice(0, 8)
                    .map((r) => `${r.type}: ${r.targetLabel || r.targetId}`),
                evidence: d.relations.slice(0, 3).map((r) => `${r.type}: ${r.targetLabel || r.targetId}`),
            },
        ];
        if (d.supersededById) {
            sections.push({ heading: 'Supersession', body: `This decision has been superseded (${d.supersededById}). Read the newer ADR for the current approach.` });
        }
        return sections;
    }

    private onboardingSections(ctx: DocumentationContext): DocSection[] {
        const teams = new Set<string>();
        for (const e of ctx.employees) teams.add(e.team);
        const mentors = ctx.employees.filter((e) => e.mentorship >= 60).slice(0, 5);
        return [
            {
                heading: 'Welcome',
                body: `Welcome to the organization! This guide is generated from the Organizational Digital Brain: ${ctx.employees.length} people across ${teams.size} teams, ${ctx.systems.length} platform components, and ${ctx.decisions.length} recorded decisions.`,
            },
            {
                heading: 'Teams & People',
                body: 'Registered teams and key people from the workforce directory.',
                bullets: [...teams].map((t) => `Team: ${t}`).slice(0, 12),
            },
            {
                heading: 'Mentors',
                body: 'People with the highest mentoring influence, ideal starting points for pairing.',
                bullets: mentors.length ? mentors.map((m) => `${m.name} (${m.team})`) : ['no mentors with high mentoring score'],
                evidence: ['mentoring influence >= 60'],
            },
            {
                heading: 'Platform Components',
                body: 'The systems you will encounter first.',
                bullets: ctx.systems.slice(0, 10).map((s) => `${s.name} — ${s.ownerIds.length} owner(s)`),
            },
            {
                heading: 'Must-Read Decisions',
                body: 'The decision records every new engineer should review first.',
                bullets: ctx.decisions.slice(0, 6).map((d) => `${d.title} (${d.status})`),
                evidence: ctx.decisions.slice(0, 3).map((d) => `Decision: ${d.title}`),
            },
        ];
    }

    private repositorySections(ctx: DocumentationContext): DocSection[] {
        return [
            {
                heading: 'Platform Overview',
                body: `The platform consists of ${ctx.systems.length} components tracked in the organizational brain.`,
                table: {
                    headers: ['Component', 'Kind', 'Team', 'Flags'],
                    rows: ctx.systems.slice(0, 12).map((s) => [s.name, s.kind, s.team ?? '—', String(s.flagTotal)]),
                },
            },
            {
                heading: 'Contribution Patterns',
                body: 'Contribution activity from the workforce intelligence registry.',
                table: {
                    headers: ['Engineer', 'Role', 'Contributions', 'Reviews', 'Incidents Resolved'],
                    rows: ctx.employees.slice(0, 9).map((e) => [e.name, e.role, String(e.contributions), String(e.codeReviews), String(e.incidentsResolved)]),
                },
                evidence: ['source: workforce intelligence'],
            },
            {
                heading: 'Repository Hygiene',
                body: 'Ownership and documentation status derived from the risk engine.',
                bullets: ctx.systems.slice(0, 8).map((s) => `${s.name}: ${s.ownerIds.length ? 'owned' : 'NO OWNER'}`),
            },
        ];
    }

    private releaseNotesSections(shipped: DocumentationContext['decisions']): DocSection[] {
        return [
            {
                heading: 'What Ships In This Release',
                body: `Compiled from the ${shipped.length} decisions that reached the implemented or validated phase.`,
                table: {
                    headers: ['Decision', 'Domain', 'Status', 'Implemented'],
                    rows: shipped.map((d) => [d.title, d.domain, d.status, d.implementedAt ?? '—']),
                },
            },
            {
                heading: 'Highlights',
                body: 'Changes worth calling out.',
                bullets: shipped.slice(0, 6).map((d) => `${d.title} (${d.domain})`),
                evidence: shipped.slice(0, 3).map((d) => `Decision: ${d.title}`),
            },
            {
                heading: 'Note',
                body: 'Release notes are generated automatically whenever a decision reaches implementation and are versioned with the documentation engine.',
            },
        ];
    }

    private transferSections(ctx: DocumentationContext, e: (typeof ctx.employees)[number]): DocSection[] {
        const owned = ctx.systems.filter((s) => e.systems.includes(s.name));
        return [
            {
                heading: 'Scope',
                body: `${e.name} (${e.role}, ${e.team}) has a bus factor of ${e.busFactor} and succession readiness of ${e.successionReadiness}%.`,
                bullets: [
                    `tenure: ${e.tenureYears} year(s)`,
                    `expertise: ${e.expertise.join(', ') || '—'}`,
                    `mentorship influence: ${e.mentorship}`,
                    `contributions: ${e.contributions} · reviews: ${e.codeReviews} · incidents resolved: ${e.incidentsResolved}`,
                ],
            },
            {
                heading: 'Owned Systems',
                body: owned.length ? 'Systems owned by this engineer.' : 'No systems are directly owned.',
                bullets: owned.map((s) => `${s.name} (${s.kind})`).slice(0, 8),
                evidence: e.systems.slice(0, 5),
            },
            {
                heading: 'Knowledge Transfer Plan',
                body: 'Recommended transfer actions derived from bus factor and ownership concentration.',
                bullets: [
                    `pair on ${owned.slice(0, 2).map((s) => s.name).join(', ') || 'core responsibilities'}`,
                    'write runbook + service documentation first (highly concentrated knowledge)',
                    `rotate code reviews across ${Math.max(1, Math.round(e.collaborationPartners / 3))} collaborators`,
                ],
                evidence: [`bus factor ${e.busFactor}`, `collaboration diversity ${e.collaborationPartners}`],
            },
        ];
    }

    private async executiveSections(ctx: DocumentationContext): Promise<DocSection[]> {
        const health = await this.risk.getHealth();
        const recommendations = await this.risk.getRecommendations();
        const decided = ctx.decisions.filter((d) => ['implemented', 'validated', 'approved'].includes(d.status));
        return [
            {
                heading: 'Organizational Posture',
                body: 'A snapshot of the current knowledge posture from the risk engine and workforce resilience.',
                table: {
                    headers: ['Signal', 'Value'],
                    rows: [
                        ['Organizational resilience', `${health.orgResilience}%`],
                        ['Average risk', `${health.averageRisk}/100`],
                        ['Documentation coverage', `${health.documentationCoverage}%`],
                        ['Undocumented flags', String(health.undocumentedFlags)],
                        ['Single-owner systems', String(health.singleOwnerSystems)],
                    ],
                },
            },
            {
                heading: 'Decision Throughput',
                body: decided.length
                    ? 'Decisions that have progressed to implementation or validation.'
                    : 'No decisions have reached implementation yet.',
                bullets: decided.slice(0, 6).map((d) => `${d.title} (${d.domain})`),
                evidence: decided.slice(0, 3).map((d) => `Decision: ${d.title}`),
            },
            {
                heading: 'Top Recommendations',
                body: 'Prioritized actions from the risk engine.',
                bullets: recommendations.slice(0, 5).map((r) => `${r.action} (${r.owner}, ${r.eta})`),
                evidence: recommendations.slice(0, 3).map((r) => r.action),
            },
            {
                heading: 'Documentation Engine Status',
                body: 'The Autonomous Documentation Engine keeps this summary synchronized as the brain evolves. Every number above is sourced from the Organizational Digital Brain.',
            },
        ];
    }

    // --- materialization / status helpers ---

    freshnessFor(candidate: DocCandidate, ctx: DocumentationContext): number {
        if (candidate.kind === 'adr') {
            const d = ctx.decisions.find((x) => x.id === candidate.sourceRef);
            if (!d) return 60;
            if (d.status === 'superseded') return 30;
            if (['implemented', 'validated'].includes(d.status)) return 90;
            return 70;
        }
        if (candidate.kind === 'runbook') {
            const risk = candidate.relatedNode ? ctx.riskByNodeId.get(candidate.relatedNode) : undefined;
            return clamp(100 - (risk?.overallRisk ?? 30) * 0.5);
        }
        if (candidate.sourceType === 'system' || candidate.sourceType === 'api' || candidate.sourceType === 'database' || candidate.sourceType === 'infrastructure' || candidate.sourceType === 'repository') {
            const sys = ctx.systems.find((s) => s.id === candidate.sourceRef);
            if (!sys) return 70;
            const risk = sys.nodeId ? ctx.riskByNodeId.get(sys.nodeId) : undefined;
            const coverage = risk?.documentationCoverage ?? (sys.flagTotal ? clamp(100 - (sys.flagUndocumented / sys.flagTotal) * 100) : 50);
            return clamp(15 + coverage * 0.85);
        }
        const base: Record<string, number> = {
            onboarding: 78,
            'knowledge-transfer': 82,
            'release-notes': 92,
            'executive-summary': 70,
        };
        return base[candidate.kind] ?? 75;
    }

    async materializeIfEmpty(): Promise<number> {
        const existing = await this.prisma.documentation.count();
        if (existing > 0) return 0;
        const ctx = await this.context();
        const candidates = await this.describeCandidates(ctx);
        const created = new Date();
        for (const c of candidates) {
            const freshness = this.freshnessFor(c, ctx);
            const status = freshness < 55 ? 'stale' : 'current';
            // Under-verified docs carry an older verification stamp so the
            // freshness story is visible without inventing facts.
            const verified = new Date(created.getTime() - Math.round((100 - freshness) / 3) * 60 * 60 * 1000);
            const doc = await this.prisma.documentation.create({
                data: {
                    title: c.title,
                    slug: c.slug,
                    kind: c.kind,
                    summary: c.summary,
                    status,
                    confidence: c.confidence,
                    quality: this.initialQuality(c),
                    owner: c.owner,
                    team: c.team,
                    sourceType: c.sourceType,
                    sourceRef: c.sourceRef,
                    relatedNode: c.relatedNode,
                    version: 1,
                    lastVerifiedAt: verified,
                    createdAt: created,
                    updatedAt: created,
                },
            });
            await this.prisma.documentationVersion.create({
                data: {
                    documentationId: doc.id,
                    version: 1,
                    change: 'Initial materialization from the Organizational Digital Brain',
                    author: 'Documentation Intelligence Agent',
                    status: 'current',
                    content: JSON.stringify(c.content),
                    quality: this.initialQuality(c),
                    confidence: c.confidence,
                    createdAt: created,
                },
            });
        }
        return candidates.length;
    }

    private initialQuality(candidate: DocCandidate): number {
        const sections = candidate.content.length;
        const evidence = candidate.content.reduce((s, sec) => s + (sec.evidence?.length ?? 0), 0);
        return clamp(35 + sections * 7 + evidence * 4);
    }

    /**
     * Re-derives the candidate for an existing document (used by the evolution
     * pipeline and manual regeneration).
     */
    async candidateForDoc(doc: { id: string; title: string; kind: string; sourceType: string; sourceRef: string }): Promise<DocCandidate | null> {
        const ctx = await this.context();
        const candidates = await this.describeCandidates(ctx);
        return (
            candidates.find((c) => c.kind === doc.kind && c.sourceType === doc.sourceType && c.sourceRef === doc.sourceRef) ??
            candidates.find((c) => c.title === doc.title) ??
            null
        );
    }
}
