import { Injectable } from '@nestjs/common';
import { RiskIntelligenceService } from './risk-intelligence.service';
import { RiskRecommendation } from './risk.types';

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

/**
 * Risk Recommendation Service — derives actionable, ownership-assigned
 * recommendations from the risk intelligence graph (no separate AI engine;
 * purely consumes Feature 1-3 outputs).
 */
@Injectable()
export class RiskRecommendationService {
    constructor(private readonly intelligence: RiskIntelligenceService) {}

    async getRecommendations(): Promise<RiskRecommendation[]> {
        const view = await this.intelligence.getIntelligence('organization');
        const systems = view.nodes.filter((n) => ['service', 'database', 'repo', 'external'].includes(n.kind));

        const recs: RiskRecommendation[] = [];

        // 1. Documentation debt on worst systems.
        const undocNodes = [...systems].sort((a, b) => b.flagUndocumented - a.flagUndocumented).slice(0, 3);
        for (const n of undocNodes) {
            if (n.flagUndocumented === 0) continue;
            const priority: RiskRecommendation['priority'] = n.band === 'critical' ? 'critical' : n.band === 'high' ? 'high' : 'medium';
            recs.push({
                id: `doc-${n.id}`,
                action: `Document ${n.flagUndocumented} flags on ${n.label}`,
                detail: `Only ${n.documentationCoverage}% of ${n.label}'s configuration is documented. Add descriptions and owner metadata to reduce knowledge loss exposure.`,
                owner: n.owner ?? 'Platform Engineering',
                eta: `2 weeks`,
                impact: priority,
                priority,
                linkedTarget: n.id,
                evidence: [`${n.flagUndocumented}/${n.flagTotal} flags undocumented`, `coverage ${n.documentationCoverage}%`],
            });
        }

        // 2. Single-owner / concentrated ownership.
        const concentrated = [...systems].sort((a, b) => b.knowledgeConcentration - a.knowledgeConcentration).slice(0, 3);
        for (const n of concentrated) {
            if (n.knowledgeConcentration < 60) continue;
            const priority: RiskRecommendation['priority'] = n.knowledgeConcentration >= 90 ? 'critical' : 'high';
            recs.push({
                id: `own-${n.id}`,
                action: `Redistribute ownership of ${n.label}`,
                detail: `${n.label} shows ${n.knowledgeConcentration}% ownership concentration with a bus factor of ${n.busFactor}. Add a second owner and rotate on-call.`,
                owner: n.owner ?? 'Engineering Manager',
                eta: `4 weeks`,
                impact: priority,
                priority,
                linkedTarget: n.id,
                evidence: [`concentration ${n.knowledgeConcentration}%`, `bus factor ${n.busFactor}`, `resilience ${n.organizationalResilience}%`],
            });
        }

        // 3. Critical dependencies (SPOF nodes).
        const spof = [...systems].filter((n) => n.criticalDependency >= 55).slice(0, 3);
        for (const n of spof) {
            recs.push({
                id: `dep-${n.id}`,
                action: `Harden critical dependency ${n.label}`,
                detail: `${n.label} is a critical dependency (${n.criticalDependency}% pressure). Ensure redundancy, runbooks and cross-team coverage exist before it becomes a bottleneck.`,
                owner: n.owner ?? 'SRE',
                eta: `6 weeks`,
                impact: 'high',
                priority: 'high',
                linkedTarget: n.id,
                evidence: [`critical-dependency pressure ${n.criticalDependency}%`, `operational exposure ${n.operationalExposure}%`],
            });
        }

        // 4. Operational exposure (live-but-undocumented).
        const exposed = [...systems].filter((n) => n.operationalExposure >= 50).slice(0, 2);
        for (const n of exposed) {
            recs.push({
                id: `ops-${n.id}`,
                action: `Add kill-switch coverage to ${n.label}`,
                detail: `${n.label} has live-but-undocumented flags (${n.operationalExposure}% exposure). Add rollback and kill-switch coverage.`,
                owner: n.owner ?? 'SRE',
                eta: `2 weeks`,
                impact: 'high',
                priority: 'high',
                linkedTarget: n.id,
                evidence: [`exposure ${n.operationalExposure}%`, `band ${n.band}`],
            });
        }

        // 5. Bus factor floor.
        const lowBus = [...systems].sort((a, b) => a.busFactor - b.busFactor).slice(0, 2);
        for (const n of lowBus) {
            if (n.busFactor >= 45) continue;
            recs.push({
                id: `bus-${n.id}`,
                action: `Improve bus factor on ${n.label}`,
                detail: `${n.label} has a bus factor of ${n.busFactor}%. Pair engineers and document onboarding paths.`,
                owner: n.owner ?? 'Engineering Manager',
                eta: `4 weeks`,
                impact: 'medium',
                priority: 'medium',
                linkedTarget: n.id,
                evidence: [`bus factor ${n.busFactor}%`, `ownership distribution ${n.ownershipDistribution}%`],
            });
        }

        return recs.sort((a, b) => weight(a.priority) - weight(b.priority));
    }
}

function weight(p: RiskRecommendation['priority']): number {
    return p === 'critical' ? 0 : p === 'high' ? 1 : 2;
}
