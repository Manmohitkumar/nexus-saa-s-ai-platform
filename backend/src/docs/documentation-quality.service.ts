import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkforceDataService, WorkforceSystem } from '../workforce/workforce.data.service';
import { RiskNode } from '../risk/risk.types';
import {
    DocumentationHealth,
    DocSection,
    HealthTimelinePoint,
    QualityDimension,
    QualityReport,
} from './documentation.types';

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

export interface DocRow {
    id: string;
    title: string;
    kind: string;
    status: string;
    quality: number;
    confidence: number;
    owner: string;
    team: string;
    sourceType: string;
    sourceRef: string;
    relatedNode: string;
    version: number;
    lastVerifiedAt: Date;
}

export interface QualityContext {
    systems: WorkforceSystem[];
    decisions: Array<{ id: string; status: string }>;
    riskByNodeId: Map<string, RiskNode>;
}

/**
 * Documentation Quality Intelligence Service — evaluates every document across
 * the reusable quality dimensions (completeness, freshness, consistency,
 * readability, technical accuracy, ownership, version history, dependency
 * coverage, architectural alignment, onboarding usefulness, business
 * relevance) and produces Documentation Health Scores consumed by the Risk
 * Heatmap, AI Mentor, Executive Dashboard, and future analytics.
 */
@Injectable()
export class DocumentationQualityService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly data: WorkforceDataService,
    ) {}

    async context(): Promise<QualityContext> {
        const snapshot = await this.data.snapshot();
        const decisions = await this.prisma.decisionRecord.findMany({
            select: { id: true, status: true },
        });
        return { systems: snapshot.systems, decisions, riskByNodeId: new Map() };
    }

    freshnessFor(doc: DocRow, ctx: QualityContext): number {
        if (doc.kind === 'adr') {
            const d = ctx.decisions.find((x) => x.id === doc.sourceRef);
            if (!d) return 60;
            if (d.status === 'superseded') return 30;
            if (['implemented', 'validated'].includes(d.status)) return 90;
            return 70;
        }
        if (doc.kind === 'runbook') {
            return clamp(100 - (100 - (doc.quality || 60)) * 0.6);
        }
        if (['service', 'api', 'database', 'infrastructure', 'repository'].includes(doc.kind)) {
            return clamp(15 + (doc.quality || 50) * 0.85);
        }
        const base: Record<string, number> = {
            onboarding: 78,
            'knowledge-transfer': 82,
            'release-notes': 92,
            'executive-summary': 70,
        };
        return base[doc.kind] ?? 75;
    }

    assess(doc: DocRow, content: DocSection[], freshness?: number): QualityReport {
        const sections = content.length;
        const evidenceCount = content.reduce((s, sec) => s + (sec.evidence?.length ?? 0), 0);
        const hasTables = content.some((s) => !!s.table);
        const hasBody = content.some((s) => !!s.body);

        const dims: QualityDimension[] = [];

        const completeness = clamp(20 + sections * 8 + evidenceCount * 4);
        dims.push({ key: 'completeness', label: 'Completeness', score: completeness, detail: `${sections} section(s), ${evidenceCount} evidence reference(s)` });

        const freshnessScore = freshness ?? 70;
        dims.push({ key: 'freshness', label: 'Freshness', score: freshnessScore, detail: freshnessScore < 55 ? 'stale — source data has drifted' : 'reflects current brain state' });

        const consistency = clamp(55 + Math.max(0, doc.version - 1) * 12);
        dims.push({ key: 'consistency', label: 'Consistency', score: consistency, detail: `${doc.version} published version(s)` });

        const readability = clamp(58 + sections * 4 + (hasBody ? 8 : 0));
        dims.push({ key: 'readability', label: 'Readability', score: readability, detail: hasTables ? 'structured tables present' : 'prose + lists' });

        const technicalAccuracy = clamp(doc.confidence * 0.5 + evidenceCount * 9 + (hasTables ? 8 : 0));
        dims.push({ key: 'technical-accuracy', label: 'Technical Accuracy', score: technicalAccuracy, detail: `${evidenceCount} cited brain source(s)` });

        const owned = doc.owner && doc.owner !== 'Unassigned';
        const ownership = owned ? (doc.team ? 95 : 75) : 30;
        dims.push({ key: 'ownership', label: 'Ownership', score: ownership, detail: owned ? `owner: ${doc.owner}` : 'no owner assigned' });

        const versionHistory = clamp(Math.min(100, doc.version * 25));
        dims.push({ key: 'version-history', label: 'Version History', score: versionHistory, detail: `${doc.version} version(s)` });

        const architecturalAlignment = doc.kind === 'adr' ? clamp(55 + doc.confidence * 0.4) : 80;
        dims.push({ key: 'architectural-alignment', label: 'Architectural Alignment', score: architecturalAlignment, detail: doc.kind === 'adr' ? 'aligned to decision registry' : 'aligned to platform architecture' });

        const onboardingUsefulness = doc.kind === 'onboarding' ? 90 : doc.kind === 'knowledge-transfer' ? 88 : clamp(55 + completeness * 0.4);
        dims.push({ key: 'onboarding-usefulness', label: 'Onboarding Usefulness', score: onboardingUsefulness, detail: doc.kind === 'onboarding' ? 'primary onboarding asset' : 'secondary reference' });

        const businessRelevance = doc.kind === 'executive-summary' ? 95 : doc.kind === 'adr' ? 80 : clamp(55 + completeness * 0.4);
        dims.push({ key: 'business-relevance', label: 'Business Relevance', score: businessRelevance, detail: doc.kind });

        const confidenceDim = clamp(doc.confidence);
        dims.push({ key: 'confidence', label: 'AI Confidence', score: confidenceDim, detail: `derived from ${doc.sourceType} source richness` });

        const overall = clamp(
            completeness * 0.16 +
                freshnessScore * 0.16 +
                consistency * 0.1 +
                readability * 0.08 +
                technicalAccuracy * 0.12 +
                ownership * 0.1 +
                versionHistory * 0.06 +
                architecturalAlignment * 0.08 +
                onboardingUsefulness * 0.06 +
                businessRelevance * 0.08,
        );

        return { overall: clamp(overall), confidence: confidenceDim, dimensions: dims };
    }

    async health(): Promise<DocumentationHealth> {
        const [docs, snapshot, versionGroups] = await Promise.all([
            this.prisma.documentation.findMany(),
            this.data.snapshot(),
            this.prisma.documentationVersion.groupBy({ by: ['documentationId'], _count: { _all: true } }),
        ]);
        const versionCount = new Map(versionGroups.map((c) => [c.documentationId, c._count._all]));
        const ctx: QualityContext = { systems: snapshot.systems, decisions: [], riskByNodeId: new Map() };

        const assessed = docs.map((doc) => {
            const row: DocRow = {
                id: doc.id,
                title: doc.title,
                kind: doc.kind,
                status: doc.status,
                quality: doc.quality,
                confidence: doc.confidence,
                owner: doc.owner,
                team: doc.team,
                sourceType: doc.sourceType,
                sourceRef: doc.sourceRef,
                relatedNode: doc.relatedNode,
                version: versionCount.get(doc.id) ?? 1,
                lastVerifiedAt: doc.lastVerifiedAt,
            };
            return { doc, row, freshness: this.freshnessFor(row, ctx) };
        });

        const totalDocs = docs.length;
        const current = assessed.filter((a) => a.freshness >= 55).length;
        const stale = assessed.filter((a) => a.freshness < 55).length;
        const coverage = totalDocs ? clamp((current / totalDocs) * 100) : 0;
        const avgFreshness = assessed.length ? clamp(assessed.reduce((s, a) => s + a.freshness, 0) / assessed.length) : 0;

        const byKindMap = new Map<string, { count: number; qualitySum: number }>();
        for (const d of docs) {
            const entry = byKindMap.get(d.kind) ?? { count: 0, qualitySum: 0 };
            entry.count += 1;
            entry.qualitySum += d.quality;
            byKindMap.set(d.kind, entry);
        }

        const flagTotal = snapshot.systems.reduce((s, sys) => s + sys.flagTotal, 0);
        const undocumentedFlags = snapshot.systems.reduce((s, sys) => s + sys.flagUndocumented, 0);
        const flagCoverage = flagTotal ? clamp(100 - (undocumentedFlags / flagTotal) * 100) : 100;

        const dimensions: QualityDimension[] = [
            { key: 'coverage', label: 'Documentation Coverage', score: coverage, detail: `${current} current / ${totalDocs} total` },
            { key: 'freshness', label: 'Average Freshness', score: avgFreshness, detail: `${stale} stale document(s)` },
            { key: 'flag-coverage', label: 'Flag Documentation', score: flagCoverage, detail: `${undocumentedFlags} undocumented flags` },
            { key: 'versioning', label: 'Versioning', score: clamp(docs.reduce((s, d) => s + (versionCount.get(d.id) ?? 1), 0) / Math.max(1, totalDocs) * 40), detail: 'average version history depth' },
        ];

        const health = clamp(coverage * 0.4 + avgFreshness * 0.3 + flagCoverage * 0.3);

        return {
            health,
            coverage,
            freshness: avgFreshness,
            consistency: dimensions[3].score,
            completeness: clamp(avgFreshness),
            currentDocs: current,
            staleDocs: stale,
            draftDocs: docs.filter((d) => d.status === 'draft').length,
            missingDocs: docs.filter((d) => d.status === 'missing').length,
            totalDocs,
            undocumentedFlags,
            byKind: [...byKindMap.entries()].map(([kind, v]) => ({ kind, count: v.count, avgQuality: clamp(v.qualitySum / v.count) })),
            dimensions,
            generatedAt: new Date().toISOString(),
        };
    }

    async snapshot(): Promise<DocumentationHealth> {
        const health = await this.health();
        await this.prisma.documentationHealthSnapshot.create({
            data: {
                health: health.health,
                coverage: health.coverage,
                freshness: health.freshness,
                consistency: health.consistency,
                completeness: health.completeness,
                currentDocs: health.currentDocs,
                staleDocs: health.staleDocs,
                draftDocs: health.draftDocs,
                missingDocs: health.missingDocs,
                undocumentedFlags: health.undocumentedFlags,
                metrics: JSON.stringify(Object.fromEntries(health.byKind.map((k) => [k.kind, k.avgQuality]))),
            },
        });
        return health;
    }

    async timeline(limit = 14): Promise<HealthTimelinePoint[]> {
        let rows = await this.prisma.documentationHealthSnapshot.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        if (rows.length === 0) {
            await this.snapshot();
            rows = await this.prisma.documentationHealthSnapshot.findMany({
                orderBy: { createdAt: 'desc' },
                take: limit,
            });
        }
        return rows.map((r) => ({
            id: r.id,
            at: r.createdAt.toISOString(),
            health: r.health,
            coverage: r.coverage,
            freshness: r.freshness,
            staleDocs: r.staleDocs,
            missingDocs: r.missingDocs,
        }));
    }
}
