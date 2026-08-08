import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskService } from '../risk/risk.service';
import { ResilienceService } from '../workforce/resilience.service';
import { AnalyticsService } from '../decisions/analytics.service';
import { OrganizationHealth, OrganizationHealthPillar } from './intelligence.types';

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));
const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

/**
 * Organizational Health Service — aggregates the existing health signals into
 * a reusable composite health model across workforce resilience, knowledge,
 * decisions, and risk exposure.
 */
@Injectable()
export class OrganizationalHealthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly risk: RiskService,
        private readonly resilience: ResilienceService,
        private readonly analytics: AnalyticsService,
    ) {}

    async health(): Promise<OrganizationHealth> {
        const [resilience, riskHealth, analytics, docHealth] = await Promise.allSettled([
            this.resilience.getResilience(),
            this.risk.getHealth(),
            this.analytics.getAnalytics(),
            this.latestDocHealth(),
        ]);

        const resilienceSnap = resilience.status === 'fulfilled' ? resilience.value : null;
        const riskSnap = riskHealth.status === 'fulfilled' ? riskHealth.value : null;
        const analyticsSnap = analytics.status === 'fulfilled' ? analytics.value : null;
        const docSnap = docHealth.status === 'fulfilled' ? docHealth.value : null;

        const pillars: OrganizationHealthPillar[] = [];

        const workforceScore = resilienceSnap ? resilienceSnap.orgResilience : 50;
        pillars.push({
            key: 'workforce-resilience',
            label: 'Workforce Resilience',
            score: workforceScore,
            status: this.statusFor(workforceScore),
            drivers: resilienceSnap
                ? [
                      `Bus-factor coverage ${resilienceSnap.busFactorCoverage}%`,
                      `${resilienceSnap.singleOwnerSystems} single-owner systems`,
                      `${resilienceSnap.criticalEmployees.length} critical employees`,
                  ]
                : [],
            evidence: resilienceSnap
                ? [
                      {
                          source: 'Workforce Resilience Snapshot',
                          excerpt: `Resilience ${resilienceSnap.orgResilience}; bus-factor coverage ${resilienceSnap.busFactorCoverage}%; ${resilienceSnap.singleOwnerSystems} single-owner systems.`,
                          type: 'workforce',
                          confidence: resilienceSnap.orgResilience,
                      },
                  ]
                : [],
        });

        const docScore = docSnap?.health ?? 50;
        pillars.push({
            key: 'knowledge-documentation',
            label: 'Knowledge & Documentation',
            score: docScore,
            status: this.statusFor(docScore),
            drivers: docSnap
                ? [
                      `Coverage ${docSnap.coverage}%`,
                      `Freshness ${docSnap.freshness}%`,
                      `${docSnap.undocumentedFlags} undocumented flags`,
                  ]
                : [],
            evidence: docSnap
                ? [
                      {
                          source: 'Documentation Health Snapshot',
                          excerpt: `Health ${docSnap.health}; coverage ${docSnap.coverage}%; freshness ${docSnap.freshness}%.`,
                          type: 'documentation',
                          confidence: docSnap.health,
                      },
                  ]
                : [],
        });

        const decisionScore = analyticsSnap
            ? clamp(
                  analyticsSnap.averageConfidence * 0.5 +
                      analyticsSnap.implementedRate * 0.3 +
                      pct(analyticsSnap.improvedOutcomes, analyticsSnap.totalOutcomes) * 0.2,
              )
            : 50;
        pillars.push({
            key: 'decision-effectiveness',
            label: 'Decision Effectiveness',
            score: decisionScore,
            status: this.statusFor(decisionScore),
            drivers: analyticsSnap
                ? [
                      `Implemented rate ${analyticsSnap.implementedRate}%`,
                      `Average confidence ${analyticsSnap.averageConfidence}%`,
                      `${analyticsSnap.improvedOutcomes}/${analyticsSnap.totalOutcomes} outcomes improved`,
                  ]
                : [],
            evidence: analyticsSnap
                ? [
                      {
                          source: 'Decision Analytics',
                          excerpt: `${analyticsSnap.total} decisions; implemented ${analyticsSnap.implementedRate}%; confidence ${analyticsSnap.averageConfidence}%.`,
                          type: 'decision',
                          confidence: analyticsSnap.averageConfidence,
                      },
                  ]
                : [],
        });

        const riskExposureScore = riskSnap ? clamp(100 - riskSnap.averageRisk) : 50;
        pillars.push({
            key: 'risk-exposure',
            label: 'Risk Exposure',
            score: riskExposureScore,
            status: this.statusFor(riskExposureScore),
            drivers: riskSnap
                ? [
                      `Average risk ${riskSnap.averageRisk}`,
                      `${riskSnap.criticalNodes} critical nodes`,
                      `${riskSnap.spofCount} single points of failure`,
                  ]
                : [],
            evidence: riskSnap
                ? [
                      {
                          source: 'Risk Health Snapshot',
                          excerpt: `Average risk ${riskSnap.averageRisk}; ${riskSnap.criticalNodes} critical nodes; ${riskSnap.spofCount} SPOFs.`,
                          type: 'risk',
                          confidence: riskExposureScore,
                      },
                  ]
                : [],
        });

        pillars.sort((a, b) => b.score - a.score);
        const overall = clamp(
            pillars.reduce((sum, p) => sum + p.score, 0) / Math.max(1, pillars.length),
        );

        return {
            overall,
            status: this.statusFor(overall),
            pillars,
            generatedAt: new Date().toISOString(),
        };
    }

    private statusFor(score: number): 'healthy' | 'watch' | 'critical' {
        if (score >= 75) return 'healthy';
        if (score >= 50) return 'watch';
        return 'critical';
    }

    private async latestDocHealth() {
        try {
            const snap = await this.prisma.documentationHealthSnapshot.findFirst({ orderBy: { createdAt: 'desc' } });
            if (!snap) return null;
            return {
                health: snap.health,
                coverage: snap.coverage,
                freshness: snap.freshness,
                consistency: snap.consistency,
                completeness: snap.completeness,
                undocumentedFlags: snap.undocumentedFlags,
            };
        } catch {
            return null;
        }
    }
}
