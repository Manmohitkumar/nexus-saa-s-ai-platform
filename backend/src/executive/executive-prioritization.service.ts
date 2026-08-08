import { Injectable } from '@nestjs/common';
import {
    ExecutiveKpiCategory,
    ExecutiveRawSignals,
    ExecutiveRecommendation,
    ExecutiveTier,
} from './executive.types';

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

const tierWeight: Record<ExecutiveTier, number> = {
    'executive-critical': 5,
    urgent: 4,
    strategic: 3,
    operational: 2,
    informational: 1,
};

const tierLabel = (priority: string, impact: string): ExecutiveTier => {
    if (priority === 'critical' && impact === 'high') return 'executive-critical';
    if (priority === 'critical') return 'urgent';
    if (priority === 'high') return 'strategic';
    if (priority === 'medium' && impact === 'high') return 'operational';
    return 'informational';
};

const categoryFor = (sourceKind: string): ExecutiveKpiCategory => {
    const k = (sourceKind ?? '').toLowerCase();
    if (k.includes('risk')) return 'risk';
    if (k.includes('doc') || k.includes('knowledge')) return 'knowledge';
    if (k.includes('decision')) return 'decisions';
    if (k.includes('workforce') || k.includes('resilience')) return 'workforce';
    if (k.includes('arch')) return 'architecture';
    return 'health';
};

const impactOf = (impact: string): 'high' | 'medium' | 'low' => {
    if (impact === 'critical' || impact === 'high') return 'high';
    if (impact === 'medium') return 'medium';
    return 'low';
};

const benefitFor = (category: ExecutiveKpiCategory): string => {
    switch (category) {
        case 'risk':
            return 'Lowers average organizational risk and improves bus-factor coverage.';
        case 'knowledge':
            return 'Improves documentation coverage, freshness, and knowledge retention.';
        case 'decisions':
            return 'Increases decision implementation rate and outcome confidence.';
        case 'workforce':
            return 'Strengthens resilience against employee and knowledge loss.';
        case 'architecture':
            return 'Reduces technical debt and stabilizes the architecture evolution curve.';
        default:
            return 'Improves overall organizational health posture.';
    }
};

/**
 * Executive Recommendation Prioritization Service — merges every recommendation
 * from Features 1-7 into a single prioritized list with business justification,
 * evidence, confidence, org impact, effort, expected benefit, ownership, and
 * knowledge links. Tiering and ranking are deterministic so the same signal set
 * always produces the same executive prioritization.
 */
@Injectable()
export class ExecutivePrioritizationService {
    recommendations(raw: ExecutiveRawSignals): ExecutiveRecommendation[] {
        const now = new Date().toISOString();
        const seen = new Set<string>();
        const list: ExecutiveRecommendation[] = [];
        const push = (item: Omit<ExecutiveRecommendation, 'id'> & { title: string }) => {
            const key = item.title.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            list.push({ id: `exec-rec-${list.length + 1}-${now}`.replace(/[^a-z0-9-]/gi, '').slice(0, 40), ...item });
        };

        raw.intelligenceRecommendations.forEach((r) => {
            const confidence = clamp(60 + (r.priority === 'critical' ? 20 : r.priority === 'high' ? 10 : 0) + r.evidence.length * 2);
            push({
                title: r.title,
                detail: r.detail,
                justification: `Recommended by Organizational Intelligence at ${confidence}% confidence with ${r.evidence.length} supporting sources.`,
                evidence: r.evidence,
                confidence,
                orgImpact: impactOf(r.impact),
                effort: r.evidence.length >= 3 ? 'high' : r.evidence.length === 2 ? 'medium' : 'low',
                expectedBenefit: benefitFor(categoryFor(r.sourceKind)),
                owner: r.owner || 'Unassigned',
                eta: r.eta,
                category: categoryFor(r.sourceKind),
                source: 'Organizational Intelligence',
                knowledgeLinks: r.evidence,
                drillDown: '/dashboard/intelligence',
                createdAt: r.createdAt,
                tier: tierLabel(r.priority, r.impact),
            });
        });

        raw.riskRecommendations.forEach((r) => {
            const confidence = clamp(60 + (r.priority === 'critical' ? 20 : r.priority === 'high' ? 10 : 0) + r.evidence.length * 2);
            push({
                title: r.action,
                detail: r.detail,
                justification: `Recommended by the Risk Engine at ${confidence}% confidence targeting ${r.linkedTarget || 'organization-wide risk'}.`,
                evidence: r.evidence,
                confidence,
                orgImpact: impactOf(r.impact),
                effort: r.evidence.length >= 3 ? 'high' : r.evidence.length === 2 ? 'medium' : 'low',
                expectedBenefit: benefitFor('risk'),
                owner: r.owner || 'Unassigned',
                eta: r.eta,
                category: 'risk',
                source: 'Risk Engine',
                knowledgeLinks: [r.linkedTarget, ...r.evidence].filter(Boolean),
                drillDown: '/dashboard/risk',
                createdAt: now,
                tier: tierLabel(r.priority, r.impact),
            });
        });

        raw.docRecommendations.forEach((r) => {
            const confidence = clamp(60 + (r.priority === 'critical' ? 20 : r.priority === 'high' ? 10 : 0) + r.evidence.length * 2);
            push({
                title: r.title,
                detail: r.detail,
                justification: `Recommended by the Documentation Engine at ${confidence}% confidence for ${r.targetDoc || r.targetSystem || 'the documentation ecosystem'}.`,
                evidence: r.evidence,
                confidence,
                orgImpact: r.riskImpact >= 0.7 ? 'high' : r.riskImpact >= 0.4 ? 'medium' : 'low',
                effort: r.evidence.length >= 3 ? 'high' : r.evidence.length === 2 ? 'medium' : 'low',
                expectedBenefit: benefitFor('knowledge'),
                owner: 'Documentation Agent',
                eta: r.eta,
                category: 'knowledge',
                source: 'Documentation Engine',
                knowledgeLinks: [r.targetSystem, r.targetDoc, ...r.evidence].filter(Boolean),
                drillDown: '/dashboard/documentation',
                createdAt: now,
                tier: tierLabel(r.priority, r.riskImpact >= 0.7 ? 'high' : 'medium'),
            });
        });

        raw.insights
            .filter((i) => i.priority === 'critical' && i.action)
            .forEach((i) => {
                push({
                    title: i.recommendation || i.action,
                    detail: i.detail,
                    justification: `Derived from a critical insight at ${i.confidence}% confidence with ${i.evidence.length} evidence items.`,
                    evidence: i.evidence.map((e) => e.source),
                    confidence: i.confidence,
                    orgImpact: 'high',
                    effort: i.evidence.length >= 3 ? 'high' : 'medium',
                    expectedBenefit: benefitFor('health'),
                    owner: i.source || 'Unassigned',
                    eta: 'Next cycle',
                    category: 'health',
                    source: 'Organizational Intelligence',
                    knowledgeLinks: i.evidence.map((e) => e.source),
                    drillDown: '/dashboard/intelligence',
                    createdAt: i.createdAt,
                    tier: 'urgent',
                });
            });

        return list.sort((a, b) => tierWeight[b.tier] - tierWeight[a.tier] || b.confidence - a.confidence);
    }
}
