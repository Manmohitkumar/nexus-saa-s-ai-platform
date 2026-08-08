import { Injectable } from '@nestjs/common';
import { WorkforceDataService } from './workforce.data.service';

export interface SuccessionCandidate {
    employeeId: string;
    name: string;
    role: string;
    team: string;
    matchScore: number;
    sharedExpertise: string[];
    onboardingWeeks: number;
    readiness: number;
    confidence: number;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

/**
 * Succession Planning Service — ranks the best-fit replacements for a
 * departing employee using expertise overlap, collaboration diversity, team
 * proximity, and documented succession readiness. Estimates onboarding time
 * from expertise gap and documentation maturity.
 */
@Injectable()
export class SuccessionService {
    constructor(private readonly data: WorkforceDataService) {}

    async getCandidates(departingIds: string[], limit = 3): Promise<SuccessionCandidate[]> {
        const snapshot = await this.data.snapshot();
        const departing = snapshot.employees.filter((e) => departingIds.includes(e.id));
        if (departing.length === 0) return [];

        const pool = snapshot.employees.filter((e) => !departingIds.includes(e.id));
        const scored = pool.map((candidate) => {
            const departure = departing[0];
            const overlap = departing.reduce((max, d) => {
                const shared = d.expertise.filter((x) => candidate.expertise.includes(x));
                const ratio = d.expertise.length ? shared.length / d.expertise.length : 0;
                return Math.max(max, ratio);
            }, 0);

            const sharedExpertise = departing[0].expertise.filter((x) => candidate.expertise.includes(x));
            const sameTeam = candidate.team === departure.team ? 1 : 0;
            const collab = candidate.collaborationPartners / Math.max(1, departure.collaborationPartners);
            const tenureFit = candidate.tenureYears >= Math.max(1, departure.tenureYears - 2) ? 1 : 0.5;

            const matchScore = clamp(45 * overlap + 18 * sameTeam + 20 * Math.min(1, collab) + 17 * tenureFit);
            const readiness = clamp(candidate.successionReadiness);
            const gap = 1 - overlap;
            const onboardingWeeks = Math.max(2, Math.round(3 + gap * 9 + (100 - readiness) / 30));

            const confidence = clamp(60 + matchScore * 0.3 + readiness * 0.1);
            return {
                employeeId: candidate.id,
                name: candidate.name,
                role: candidate.role,
                team: candidate.team,
                matchScore,
                sharedExpertise,
                onboardingWeeks,
                readiness,
                confidence,
            };
        });

        return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
    }
}
