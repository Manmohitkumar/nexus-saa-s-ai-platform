import { Injectable } from '@nestjs/common';
import { getExecutiveBrief } from '../phoenix/phoenix.mock';
import { GraphService } from './graph.service';
import { TimelineService } from '../decisions/timeline.service';

@Injectable()
export class DashboardService {
    constructor(
        private readonly graphService: GraphService,
        private readonly timelineService: TimelineService,
    ) {}

    getExecutiveBrief() {
        return getExecutiveBrief();
    }

    getBrainGraphView() {
        return this.graphService.getGraphView();
    }

    getBrainGraphNode(id: string) {
        return this.graphService.getNodeDetail(id);
    }

    async getDecisionTimeline(query: string) {
        const trimmed = query.trim();
        const view = await this.timelineService.getTimeline('chronological', { query: trimmed || undefined });
        const decisionIds = [...new Set(view.items.map((i) => i.decisionId))];
        const participants = await this.timelineService.getParticipantsMap(decisionIds);

        const events = view.items.map((item) => ({
            date: item.date,
            label: item.label,
            type: phaseToLegacyType(item.phase),
            confidence: item.confidence,
            summary: item.summary,
            evidenceSources: item.evidenceSources ?? 0,
            participants: participants[item.decisionId] ?? [],
        }));

        return {
            query: trimmed,
            topic: view.items.length ? 'Platform Decision Reconstruction' : 'No matching decisions',
            events,
            reasoning: {
                dataSources: 'Decision registry, ADRs, meeting records, commits, and impact relations',
                keyDrivers: 'Reconstructed from the organizational decision graph in the Digital Brain.',
                participantsNote: 'Participants derived from proposed_by, approved_by, implemented_by, and discussed_in relations.',
            },
        };
    }
}

function phaseToLegacyType(phase?: string): 'meeting' | 'commit' | 'adr' | 'doc' {
    switch (phase) {
        case 'problem': return 'meeting';
        case 'evaluation': return 'commit';
        case 'discussion': return 'adr';
        case 'approval': return 'meeting';
        case 'implementation': return 'doc';
        case 'deployment': return 'commit';
        case 'outcome': return 'doc';
        default: return 'meeting';
    }
}
