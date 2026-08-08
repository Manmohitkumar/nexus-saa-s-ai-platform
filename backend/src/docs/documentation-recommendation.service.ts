import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkforceDataService } from '../workforce/workforce.data.service';
import { RiskService } from '../risk/risk.service';
import { DocumentationQualityService } from './documentation-quality.service';
import { DocumentationRecommendation } from './documentation.types';

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

/**
 * Documentation Recommendation Services — identifies missing documentation,
 * stale sections, undocumented APIs/flags/decisions, missing ownership, and
 * orphaned repositories. Improvements are prioritized by organizational risk
 * (Feature 4) and workforce dependency (Feature 3) — never by a separate
 * analytics pipeline.
 */
@Injectable()
export class DocumentationRecommendationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly data: WorkforceDataService,
        private readonly risk: RiskService,
        private readonly quality: DocumentationQualityService,
    ) {}

    async getRecommendations(): Promise<DocumentationRecommendation[]> {
        const [snapshot, riskView, health, qualityCtx, decisions, docs] = await Promise.all([
            this.data.snapshot(),
            this.risk.getIntelligence('organization'),
            this.quality.health(),
            this.quality.context(),
            this.prisma.decisionRecord.findMany({ include: { evidence: true } }),
            this.prisma.documentation.findMany(),
        ]);

        const recs: DocumentationRecommendation[] = [];
        const systems = riskView.nodes.filter((n) => ['service', 'database', 'repo', 'external'].includes(n.kind));
        const riskNode = (name: string) => systems.find((s) => s.label.toLowerCase() === name.toLowerCase());

        // 1. Undocumented flags / configuration on risk-ranked systems.
        const undoc = [...systems].sort((a, b) => b.flagUndocumented - a.flagUndocumented).slice(0, 4);
        for (const n of undoc) {
            if (n.flagUndocumented === 0) continue;
            const workforce = n.knowledgeConcentration;
            recs.push({
                id: `flags-${n.id}`,
                type: 'undocumented-configuration',
                title: `Document ${n.flagUndocumented} flags on ${n.label}`,
                detail: `Only ${n.documentationCoverage}% of ${n.label}'s configuration is documented. Flag descriptions and owner metadata are the missing source-of-truth entries.`,
                targetDoc: '',
                targetSystem: n.label,
                priority: n.band === 'critical' ? 'critical' : n.band === 'high' ? 'high' : 'medium',
                riskImpact: n.overallRisk,
                workforceImpact: workforce,
                evidence: [`${n.flagUndocumented}/${n.flagTotal} flags undocumented`, `coverage ${n.documentationCoverage}%`],
                action: `Update the ${n.label} service documentation with the ${n.flagUndocumented} missing flag descriptions`,
                eta: '2 weeks',
            });
        }

        // 2. Stale documentation.
        const byFreshness = docs
            .map((d) => {
                const row = this.rowFromDoc(d);
                return { d, freshness: this.quality.freshnessFor(row, qualityCtx) };
            })
            .filter((x) => x.freshness < 55)
            .sort((a, b) => a.freshness - b.freshness)
            .slice(0, 5);
        for (const { d, freshness } of byFreshness) {
            recs.push({
                id: `stale-${d.id}`,
                type: 'stale-documentation',
                title: `Regenerate stale document: ${d.title}`,
                detail: `${d.title} scores ${freshness}% freshness. The source entity has drifted (decision superseded, flags added, or coverage changed).`,
                targetDoc: d.id,
                targetSystem: '',
                priority: freshness < 35 ? 'high' : 'medium',
                riskImpact: clamp(100 - freshness),
                workforceImpact: d.owner ? 60 : 35,
                evidence: [`freshness ${freshness}%`, `last verified ${d.lastVerifiedAt.toISOString().slice(0, 10)}`],
                action: `Run the evolution pipeline on ${d.title} to re-derive sections from current brain state`,
                eta: '1 week',
            });
        }

        // 3. Missing ownership → documentation has no accountable owner.
        const unowned = snapshot.systems.filter((s) => s.ownerIds.length === 0);
        for (const s of unowned.slice(0, 3)) {
            const rn = riskNode(s.name);
            recs.push({
                id: `owner-${s.id}`,
                type: 'missing-ownership',
                title: `Assign an owner for ${s.name}`,
                detail: `${s.name} has no registered owner. Documentation without ownership cannot be kept synchronized.`,
                targetDoc: '',
                targetSystem: s.name,
                priority: rn?.band === 'critical' || rn?.band === 'high' ? 'high' : 'medium',
                riskImpact: rn?.overallRisk ?? 40,
                workforceImpact: rn?.knowledgeConcentration ?? 50,
                evidence: ['no owner in workforce registry', 'no CODEOWNERS entry'],
                action: `Nominate an owner in the workforce registry and assign ${s.name}'s documentation`,
                eta: '1 week',
            });
        }

        // 4. Undocumented decisions (no evidence → thin ADRs).
        const thinDecisions = decisions
            .filter((d) => d.evidence.length === 0)
            .sort((a, b) => (a.supersededById ? 1 : 0) - (b.supersededById ? 1 : 0))
            .slice(0, 3);
        for (const d of thinDecisions) {
            recs.push({
                id: `decision-${d.id}`,
                type: 'undocumented-decision',
                title: `Strengthen ADR evidence: ${d.title}`,
                detail: `${d.title} has no evidence artifacts linked. The ADR is generated but thin — link meetings, commits, or documents to raise its accuracy.`,
                targetDoc: '',
                targetSystem: '',
                priority: 'medium',
                riskImpact: clamp(100 - d.confidence),
                workforceImpact: 40,
                evidence: ['0 evidence artifacts', `confidence ${d.confidence}%`],
                action: `Attach evidence artifacts to ${d.title} in the Decision Time Machine`,
                eta: '2 weeks',
            });
        }

        // 5. Orphaned repositories (no edges, no owner).
        const orphaned = snapshot.systems.filter((s) => {
            const hasEdges = snapshot.edges.some((e) => e.sourceId === s.nodeId || e.targetId === s.nodeId);
            return s.kind === 'repo' && !hasEdges && s.ownerIds.length === 0;
        });
        for (const s of orphaned.slice(0, 2)) {
            recs.push({
                id: `orphan-${s.id}`,
                type: 'orphaned-repository',
                title: `Reconnect orphaned repository ${s.name}`,
                detail: `${s.name} has no graph edges and no owner. Its documentation exists but nothing links it to the knowledge graph.`,
                targetDoc: '',
                targetSystem: s.name,
                priority: 'medium',
                riskImpact: 45,
                workforceImpact: 50,
                evidence: ['no graph edges', 'no owner'],
                action: `Link ${s.name} to its consuming services and team in the Org Brain`,
                eta: '2 weeks',
            });
        }

        // 6. Health shortfall — overall coverage gap surfaced as a rec.
        recs.push({
            id: `health-${Date.now()}`,
            type: 'health-gap',
            title: `Raise documentation health from ${health.health}%`,
            detail: `Coverage is ${health.coverage}% with ${health.staleDocs} stale and ${health.undocumentedFlags} undocumented flags. Closing the top items above is the fastest path to a healthier knowledge ecosystem.`,
            targetDoc: '',
            targetSystem: '',
            priority: health.health < 60 ? 'high' : 'medium',
            riskImpact: clamp(100 - health.health),
            workforceImpact: clamp(100 - health.freshness),
            evidence: [`health ${health.health}%`, `coverage ${health.coverage}%`, `${health.undocumentedFlags} undocumented flags`],
            action: 'Run the Documentation Evolution Pipeline and action the flagged recommendations',
            eta: '4 weeks',
        });

        return recs
            .sort((a, b) => weight(a.priority) - weight(b.priority))
            .slice(0, 12);
    }

    private rowFromDoc(d: {
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
        lastVerifiedAt: Date;
    }) {
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
            version: 1,
            lastVerifiedAt: d.lastVerifiedAt,
        };
    }
}

function weight(p: DocumentationRecommendation['priority']): number {
    return p === 'critical' ? 0 : p === 'high' ? 1 : 2;
}
