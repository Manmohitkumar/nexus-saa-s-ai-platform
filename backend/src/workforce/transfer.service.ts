import { Injectable } from '@nestjs/common';
import { WorkforceDataService } from './workforce.data.service';
import { DependencyNode, EmployeeImpact } from './knowledge-dependency.service';

export interface TransferAction {
    type: 'documentation' | 'mentorship' | 'ownership_transfer' | 'pairing' | 'walkthrough' | 'training' | 'handover';
    title: string;
    detail: string;
    priority: 'critical' | 'high' | 'medium';
    etaWeeks: number;
    confidence: number;
    evidence: string[];
}

/**
 * Knowledge Transfer Recommendation Engine — generates personalized transition
 * plans: documentation updates, mentoring sessions, architecture walkthroughs,
 * ownership transfers, pair-programming schedules, and handover tasks. Every
 * action is evidence-backed from graph, flag, and decision data.
 */
@Injectable()
export class TransferService {
    constructor(private readonly data: WorkforceDataService) {}

    async buildTransferPlan(departingIds: string[], impacts: EmployeeImpact[]): Promise<TransferAction[]> {
        const snapshot = await this.data.snapshot();
        const departing = snapshot.employees.filter((e) => departingIds.includes(e.id));
        const actions: TransferAction[] = [];

        const ownedLoss = new Map<string, number>();
        const affectedDecisions: Array<{ title: string; role: string }> = [];
        for (const impact of impacts) {
            for (const sys of impact.systems) {
                ownedLoss.set(sys.systemId, Math.max(ownedLoss.get(sys.systemId) ?? 0, sys.knowledgeLoss));
            }
            for (const d of impact.affectedDecisions) {
                if (!affectedDecisions.some((x) => x.title === d.title)) affectedDecisions.push({ title: d.title, role: d.role });
            }
        }

        const systems = [...ownedLoss.entries()].sort((a, b) => b[1] - a[1]);

        for (const [systemId, loss] of systems) {
            const sys = snapshot.systems.find((s) => s.id === systemId);
            if (!sys) continue;
            const severity: TransferAction['priority'] = loss >= 70 ? 'critical' : loss >= 45 ? 'high' : 'medium';
            const evidence = [
                `${sys.flagUndocumented}/${sys.flagTotal} flags undocumented`,
                `projected knowledge loss ${loss}%`,
                `owners: ${sys.ownerIds.length}`,
            ];
            if (sys.flagUndocumented > 0) {
                actions.push({
                    type: 'documentation',
                    title: `Document ${sys.name} architecture and runbooks`,
                    detail: `Close the ${sys.flagUndocumented} undocumented flag(s) on ${sys.name} and capture architecture diagrams, ownership, and escalation paths in the team wiki.`,
                    priority: severity,
                    etaWeeks: loss >= 70 ? 2 : 3,
                    confidence: clamp(70 + loss / 3),
                    evidence,
                });
            }
            if (sys.ownerIds.length === 1) {
                actions.push({
                    type: 'ownership_transfer',
                    title: `Add a co-owner to ${sys.name}`,
                    detail: `${sys.name} has a single owner. Assign a backup engineer and transfer repository, flag, and runbook ownership before the departure window.`,
                    priority: severity,
                    etaWeeks: loss >= 70 ? 1 : 2,
                    confidence: clamp(75 + loss / 4),
                    evidence,
                });
            }
        }

        for (const d of affectedDecisions) {
            actions.push({
                type: 'walkthrough',
                title: `Architecture walkthrough: ${d.title}`,
                detail: `Run a recorded walkthrough of the ${d.title} decision (role: ${d.role}) so the rationale and constraints survive the departure.`,
                priority: 'high',
                etaWeeks: 2,
                confidence: 82,
                evidence: [`decision authored by departing employee (${d.role})`, 'ADR and milestone trail available in the decision registry'],
            });
        }

        for (const e of departing) {
            if (e.mentorship >= 60) {
                actions.push({
                    type: 'mentorship',
                    title: `Schedule knowledge handover sessions with ${e.name}`,
                    detail: `Rotate mentees and direct reports through structured handover sessions covering ${e.expertise.slice(0, 3).join(', ')} while ${e.name} is still available.`,
                    priority: 'high',
                    etaWeeks: 2,
                    confidence: 85,
                    evidence: [`${e.mentorship}/100 mentorship influence`, `${e.expertise.length} expertise domains`],
                });
            }
            if (e.contributions > 200) {
                actions.push({
                    type: 'pairing',
                    title: `Pair-programming shadow rotation`,
                    detail: `Assign the top successor candidate to pair with ${e.name} on critical paths for two weeks to absorb decision context and repository history.`,
                    priority: 'medium',
                    etaWeeks: 2,
                    confidence: 78,
                    evidence: [`${e.contributions} contributions`, `${e.codeReviews} code reviews on record`],
                });
            }
        }

        if (actions.length === 0) {
            actions.push({
                type: 'handover',
                title: 'Standard handover checklist',
                detail: 'Run the standard departure checklist: access revocation, ownership reassignment, and a final knowledge handover document.',
                priority: 'medium',
                etaWeeks: 1,
                confidence: 70,
                evidence: ['no undocumented flags or single-owner systems detected'],
            });
        }

        const priorityRank = { critical: 0, high: 1, medium: 2 };
        return actions.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
    }
}

function clamp(n: number, lo = 0, hi = 100): number {
    return Math.max(lo, Math.min(hi, Math.round(n)));
}
