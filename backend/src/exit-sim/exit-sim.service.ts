import { Injectable } from '@nestjs/common';
import { WorkforceIntelligenceService } from '../workforce/workforce-intelligence.service';
import { SimulationService } from '../workforce/simulation.service';
import type {
    ExitSimulationProfile,
    ExitSimulationRecommendation,
    ExitSimulationScenario,
} from '../phoenix/phoenix.types';

@Injectable()
export class ExitSimService {
    constructor(
        private readonly intelligence: WorkforceIntelligenceService,
        private readonly simulation: SimulationService,
    ) {}

    async getProfiles(): Promise<ExitSimulationProfile[]> {
        const employees = await this.intelligence.listEmployees();
        const top = [...employees].sort((a, b) => b.metrics.knowledgeCriticality - a.metrics.knowledgeCriticality).slice(0, 3);

        return top.map((e) => {
            const m = e.metrics;
            const weeks = Math.max(2, Math.round(3 + m.onboardingComplexity / 15));
            return {
                id: e.id,
                name: e.name,
                role: e.role,
                risk: m.knowledgeCriticality,
                systems: e.systems,
                onboarding: `${weeks}-${weeks + 2} weeks`,
                summary: this.profileSummary(e.name, e.role, m.ownershipConcentration, m.documentationReadiness),
                mitigation: [
                    ...(m.documentationReadiness < 60
                        ? [{ icon: '📝', title: `Document architecture for ${e.name}'s systems`, priority: m.documentationReadiness < 40 ? 'Critical' : 'High', est: `${Math.max(1, Math.round((60 - m.documentationReadiness) / 12))} week(s)` }]
                        : []),
                    ...(m.ownershipConcentration >= 70
                        ? [{ icon: '👥', title: 'Assign co-owners to concentrated systems', priority: 'High', est: '1 week' }]
                        : []),
                    ...(e.mentorship >= 60
                        ? [{ icon: '🎥', title: `Record walkthrough of ${e.expertise.slice(0, 2).join(' & ')}`, priority: 'High', est: '4 hours' }]
                        : []),
                    { icon: '🔄', title: 'Begin succession shadow rotation', priority: 'Medium', est: '4 weeks' },
                ].slice(0, 3),
            };
        });
    }

    async getExitScenario(): Promise<ExitSimulationScenario> {
        const run = await this.simulation.simulate();
        const criticalSystems = run.affectedSystems.filter((s) => s.knowledgeLoss >= 50).map((s) => s.label);
        return {
            summary: run.summary,
            projectedKnowledgeLoss: run.projectedKnowledgeLoss,
            criticalSystems: criticalSystems.length ? criticalSystems : run.affectedSystems.slice(0, 3).map((s) => s.label),
            primaryRiskOwners: run.employees.map((e) => e.name),
            actionPlan: run.transferActions.slice(0, 3).map((a) => ({
                title: a.title,
                eta: `${a.etaWeeks} week(s)`,
                impact: a.priority,
            })),
        };
    }

    async getRecommendations(): Promise<ExitSimulationRecommendation[]> {
        const run = await this.simulation.simulate();
        return run.transferActions.slice(0, 4).map((a, i) => ({
            id: `r-${i + 1}`,
            title: a.title,
            detail: a.detail,
            priority: a.priority,
            due: `${a.etaWeeks} week(s)`,
        }));
    }

    private profileSummary(name: string, role: string, ownershipConcentration: number, documentationReadiness: number): string {
        const parts: string[] = [`${name} holds ${role} knowledge`];
        if (ownershipConcentration >= 70) parts.push('with highly concentrated single-owner systems');
        if (documentationReadiness < 60) parts.push('where documentation coverage is thin');
        return parts.join(', ') + '.';
    }
}
