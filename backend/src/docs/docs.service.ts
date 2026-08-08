import { Injectable, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getArchitectureWorkflows } from '../phoenix/phoenix.mock';
import { DocumentationIntelligenceService } from './documentation-intelligence.service';
import { DocumentationVersionService } from './documentation-version.service';
import { DocumentationQualityService } from './documentation-quality.service';
import { DocumentationRecommendationService } from './documentation-recommendation.service';
import { DocumentationEvolutionService } from './documentation-evolution.service';
import {
    DocumentationDetail,
    DocumentationHealth,
    DocumentationImpact,
    DocumentationRecommendation,
    DocumentationRelatedDecision,
    DocumentationRelatedLink,
    DocumentationVersionView,
    DocumentationView,
    DocSection,
    EvolutionRun,
    HealthTimelinePoint,
} from './documentation.types';
import {
    ArchitectureWorkflow,
    DocumentContent,
    DocumentationItem,
} from '../phoenix/phoenix.types';

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

/**
 * Documentation Services — the Autonomous Documentation Engine facade. It
 * composes the Documentation Intelligence, Version, Quality, Recommendation,
 * and Evolution engines, keeps the legacy `/docs/*` contracts alive, and
 * self-materializes the canonical documentation set from the Organizational
 * Digital Brain on boot.
 */
@Injectable()
export class DocsService implements OnApplicationBootstrap {
    constructor(
        private readonly prisma: PrismaService,
        private readonly intelligence: DocumentationIntelligenceService,
        private readonly versions: DocumentationVersionService,
        private readonly quality: DocumentationQualityService,
        private readonly recommendations: DocumentationRecommendationService,
        private readonly evolution: DocumentationEvolutionService,
    ) {}

    async onApplicationBootstrap(): Promise<void> {
        const materialized = await this.intelligence.materializeIfEmpty();
        if (materialized > 0) {
            await this.quality.snapshot();
        }
    }

    // --- legacy contracts (kept alive) ---

    async getDocumentationState(): Promise<DocumentationItem[]> {
        const docs = await this.prisma.documentation.findMany({ orderBy: { updatedAt: 'desc' } });
        return docs.map((d) => ({
            name: d.title,
            type: this.typeLabel(d.kind),
            status: d.status === 'current' ? 'generated' : d.status === 'stale' ? 'stale' : 'missing',
            lastGen: d.lastVerifiedAt.toISOString().slice(0, 10),
            coverage: d.quality,
            icon: this.iconFor(d.kind),
        }));
    }

    async getDocumentContent(name: string): Promise<DocumentContent> {
        const doc = await this.prisma.documentation.findFirst({ where: { title: name } });
        if (!doc) throw new NotFoundException(`Unknown document: ${name}`);
        const latest = await this.versions.get(doc.id, doc.version);
        return {
            name: doc.title,
            type: this.typeLabel(doc.kind),
            generatedAt: latest.createdAt,
            sections: latest.content,
        };
    }

    getArchitectureWorkflows(): ArchitectureWorkflow[] {
        return getArchitectureWorkflows();
    }

    // --- list / detail ---

    async list(opts: { kind?: string; status?: string; search?: string } = {}): Promise<DocumentationView[]> {
        const docs = await this.prisma.documentation.findMany({
            include: { _count: { select: { versions: true } } },
            orderBy: { updatedAt: 'desc' },
        });
        const currentContents = await this.currentContents(docs.map((d) => d.id));
        const ctx = await this.quality.context();

        let out = docs.map((doc) => {
            const row = this.rowFromDoc(doc, doc._count.versions);
            const content = currentContents.get(doc.id) ?? [];
            const freshness = this.quality.freshnessFor(row, ctx);
            const report = this.quality.assess(row, content, freshness);
            const status = this.statusFor(freshness, doc.status);
            return this.toView(doc, report.overall, report.dimensions.find((d) => d.key === 'freshness')?.score ?? freshness, freshness, status);
        });

        if (opts.kind) out = out.filter((d) => d.kind === opts.kind);
        if (opts.status) out = out.filter((d) => d.status === opts.status);
        if (opts.search) {
            const q = opts.search.toLowerCase();
            out = out.filter((d) => d.title.toLowerCase().includes(q) || d.summary.toLowerCase().includes(q) || d.owner.toLowerCase().includes(q));
        }
        return out;
    }

    async getDetail(id: string): Promise<DocumentationDetail> {
        const doc = await this.prisma.documentation.findUnique({ where: { id } });
        if (!doc) throw new NotFoundException(`Documentation not found: ${id}`);
        const versionsCount = await this.prisma.documentationVersion.count({ where: { documentationId: id } });
        const latest = await this.versions.get(id, doc.version);
        const ctx = await this.quality.context();
        const row = this.rowFromDoc(doc, versionsCount);
        const freshness = this.quality.freshnessFor(row, ctx);
        const report = this.quality.assess(row, latest.content, freshness);

        const brainCtx = await this.intelligence.context();
        const { related, relatedDecisions, impactedSystems } = await this.buildRelations(doc, brainCtx);

        return {
            ...this.toView(doc, report.overall, freshness, freshness, this.statusFor(freshness, doc.status), versionsCount),
            content: latest.content,
            related,
            relatedDecisions,
            impactedSystems,
            qualityReport: report,
        };
    }

    async getContent(id: string): Promise<DocSection[]> {
        const doc = await this.prisma.documentation.findUnique({ where: { id } });
        if (!doc) throw new NotFoundException(`Documentation not found: ${id}`);
        const latest = await this.versions.get(id, doc.version);
        return latest.content;
    }

    // --- versions ---

    getVersions(id: string): Promise<DocumentationVersionView[]> {
        return this.versions.list(id);
    }

    getVersion(id: string, version: number) {
        return this.versions.get(id, Number(version));
    }

    diff(id: string, from: number, to: number) {
        return this.versions.diff(id, Number(from), Number(to));
    }

    async rollback(id: string, to: number) {
        const version = await this.versions.rollback(id, Number(to));
        await this.evolution.runEvolution('regenerate', `document:${id}`, `Rolled back to version ${to}`);
        return { version };
    }

    async regenerate(id: string) {
        const doc = await this.prisma.documentation.findUnique({ where: { id } });
        if (!doc) throw new NotFoundException(`Documentation not found: ${id}`);
        const run = await this.evolution.runEvolution('regenerate', `document:${id}`, `Manual regeneration of ${doc.title}`);
        return run;
    }

    // --- health / recommendations / evolution ---

    getHealth(): Promise<DocumentationHealth> {
        return this.quality.health();
    }

    getHealthTimeline(): Promise<HealthTimelinePoint[]> {
        return this.quality.timeline();
    }

    getRecommendations(): Promise<DocumentationRecommendation[]> {
        return this.recommendations.getRecommendations();
    }

    getEvolution(limit?: number): Promise<EvolutionRun[]> {
        return this.evolution.history(limit);
    }

    runEvolution(trigger = 'manual', resource = '', detail = '') {
        return this.evolution.runEvolution(trigger, resource, detail);
    }

    // --- impact / graph ---

    async getImpact(id: string): Promise<DocumentationImpact> {
        const doc = await this.prisma.documentation.findUnique({ where: { id } });
        if (!doc) throw new NotFoundException(`Documentation not found: ${id}`);
        const versionsCount = await this.prisma.documentationVersion.count({ where: { documentationId: id } });
        const brainCtx = await this.intelligence.context();
        const { impactedSystems, relatedDecisions } = await this.buildRelations(doc, brainCtx);

        const employees: string[] = [];
        if (doc.relatedNode) {
            const node = brainCtx.nodeById.get(doc.relatedNode);
            if (node) {
                for (const e of brainCtx.employees) {
                    if (e.systems.some((s) => doc.title.toLowerCase().includes(s.toLowerCase()) || doc.summary.toLowerCase().includes(s.toLowerCase()))) {
                        employees.push(e.name);
                    }
                }
            }
        }

        return {
            id: doc.id,
            title: doc.title,
            kind: doc.kind as DocumentationImpact['kind'],
            sourceType: doc.sourceType,
            sourceRef: doc.sourceRef,
            status: doc.status as DocumentationImpact['status'],
            quality: doc.quality,
            freshness: this.quality.freshnessFor(this.rowFromDoc(doc, versionsCount), await this.quality.context()),
            relatedSystems: impactedSystems,
            relatedDecisions,
            relatedEmployees: employees.slice(0, 5),
            version: doc.version,
            versions: versionsCount,
        };
    }

    // --- helpers ---

    private async currentContents(ids: string[]): Promise<Map<string, DocSection[]>> {
        if (ids.length === 0) return new Map();
        const rows = await this.prisma.documentationVersion.findMany({
            where: { documentationId: { in: ids }, status: 'current' },
        });
        const map = new Map<string, DocSection[]>();
        for (const r of rows) {
            map.set(r.documentationId, safeJson<DocSection[]>(r.content));
        }
        return map;
    }

    private async buildRelations(
        doc: { kind: string; sourceType: string; sourceRef: string; relatedNode: string; title: string },
        ctx: Awaited<ReturnType<typeof this.intelligence.context>>,
    ): Promise<{ related: DocumentationRelatedLink[]; relatedDecisions: DocumentationRelatedDecision[]; impactedSystems: string[] }> {
        const related: DocumentationRelatedLink[] = [];
        const impactedSystems = new Set<string>();
        const relatedDecisions: DocumentationRelatedDecision[] = [];

        if (doc.relatedNode) {
            const edges = ctx.edges.filter((e) => e.sourceId === doc.relatedNode || e.targetId === doc.relatedNode);
            for (const e of edges.slice(0, 10)) {
                const otherId = e.sourceId === doc.relatedNode ? e.targetId : e.sourceId;
                const node = ctx.nodeById.get(otherId);
                if (!node) continue;
                const direction = e.sourceId === doc.relatedNode ? 'depends_on' : 'dependency_of';
                related.push({ id: node.id, label: node.label, kind: node.kind, relation: direction, route: '/dashboard/brain' });
                if (['service', 'database', 'repo', 'api'].includes(node.kind)) impactedSystems.add(node.label);
            }
        }

        for (const d of ctx.decisions) {
            const role = d.relations.find((r) => r.targetId === doc.relatedNode && r.targetType === 'knowledge');
            if (role) {
                relatedDecisions.push({ id: d.id, title: d.title, role: role.type, status: d.status, confidence: d.confidence });
                const impactRelation = d.relations.find((r) => r.type === 'impacts' && r.targetId === doc.relatedNode);
                if (impactRelation) {
                    const node = ctx.nodeById.get(doc.relatedNode);
                    if (node) impactedSystems.add(node.label);
                }
            }
        }

        if (doc.kind === 'adr') {
            const decision = ctx.decisions.find((d) => d.id === doc.sourceRef);
            if (decision) {
                for (const r of decision.relations) {
                    if (!['impacts', 'depends_on'].includes(r.type)) continue;
                    const node = ctx.nodeById.get(r.targetId);
                    if (node) {
                        related.push({ id: node.id, label: node.label, kind: node.kind, relation: r.type, route: '/dashboard/brain' });
                        if (['service', 'database', 'repo', 'api'].includes(node.kind)) impactedSystems.add(node.label);
                    } else {
                        related.push({ id: r.targetId, label: r.targetLabel || r.targetId, kind: 'entity', relation: r.type, route: '/dashboard/decisions' });
                    }
                }
            }
        }

        const owners = ctx.employees.filter((e) => e.systems.some((s) => doc.title.toLowerCase().includes(s.toLowerCase())));
        for (const e of owners.slice(0, 3)) {
            related.push({ id: e.id, label: e.name, kind: 'employee', relation: 'owner', route: '/dashboard/exit-sim' });
        }

        return { related, relatedDecisions, impactedSystems: [...impactedSystems].slice(0, 8) };
    }

    private statusFor(freshness: number, stored: string): DocumentationView['status'] {
        if (freshness < 55) return 'stale';
        if (stored === 'draft' || stored === 'missing') return stored === 'missing' ? 'missing' : 'draft';
        return 'current';
    }

    private rowFromDoc(d: { id: string; title: string; kind: string; status: string; quality: number; confidence: number; owner: string; team: string; sourceType: string; sourceRef: string; relatedNode: string; lastVerifiedAt: Date }, version: number) {
        return {
            id: d.id,
            title: d.title,
            kind: d.kind,
            status: d.status,
            quality: d.quality,
            confidence: d.confidence,
            owner: d.owner,
            team: d.team,
            sourceType: d.sourceType,
            sourceRef: d.sourceRef,
            relatedNode: d.relatedNode,
            version,
            lastVerifiedAt: d.lastVerifiedAt,
        };
    }

    private toView(
        doc: {
            id: string;
            title: string;
            slug: string;
            kind: string;
            summary: string;
            confidence: number;
            owner: string;
            team: string;
            sourceType: string;
            sourceRef: string;
            lastVerifiedAt: Date;
            createdAt: Date;
            updatedAt: Date;
        },
        quality: number,
        freshness: number,
        completeness: number,
        status: DocumentationView['status'],
        versions = 1,
    ): DocumentationView {
        return {
            id: doc.id,
            title: doc.title,
            slug: doc.slug,
            kind: doc.kind as DocumentationView['kind'],
            summary: doc.summary,
            status,
            quality: clamp(quality),
            confidence: doc.confidence,
            owner: doc.owner,
            team: doc.team,
            sourceType: doc.sourceType,
            sourceRef: doc.sourceRef,
            version: versions,
            versions,
            freshness: clamp(freshness),
            completeness: clamp(completeness),
            lastVerifiedAt: doc.lastVerifiedAt.toISOString(),
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString(),
        };
    }

    private typeLabel(kind: string): string {
        const map: Record<string, string> = {
            service: 'Service Documentation',
            api: 'API Documentation',
            database: 'Database Documentation',
            infrastructure: 'Infrastructure Documentation',
            runbook: 'Runbook',
            adr: 'Architecture Decision Record',
            onboarding: 'Onboarding Guide',
            repository: 'Repository Overview',
            'knowledge-transfer': 'Knowledge Transfer',
            'release-notes': 'Release Notes',
            'executive-summary': 'Executive Summary',
        };
        return map[kind] ?? kind;
    }

    private iconFor(kind: string): string {
        const map: Record<string, string> = {
            service: '⚙️',
            api: '🔌',
            database: '🗄️',
            infrastructure: '☸️',
            runbook: '📟',
            adr: '🏗️',
            onboarding: '👋',
            repository: '📦',
            'knowledge-transfer': '🤝',
            'release-notes': '🚀',
            'executive-summary': '📊',
        };
        return map[kind] ?? '📄';
    }
}

function safeJson<T>(raw: string): T {
    try {
        return JSON.parse(raw || '[]');
    } catch {
        return [] as T;
    }
}
