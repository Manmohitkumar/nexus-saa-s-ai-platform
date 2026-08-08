import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBus, PhoenixEvent } from '../events/event-bus';
import { CrossDomainAnalysisService } from './cross-domain.service';
import { EventAssessment } from './intelligence.types';

const MAX_ASSESSMENTS = 50;

/**
 * Event Intelligence Layer — sits on the global event bus and turns lifecycle
 * events into reusable organizational intelligence. Events that carry new
 * knowledge (decisions reconstructed, documentation evolved, system boot)
 * trigger targeted insight generation; high-volume signals are assessed but
 * deliberately do not spawn noise.
 */
@Injectable()
export class EventIntelligenceService implements OnModuleInit {
    private readonly assessments: EventAssessment[] = [];

    constructor(
        private readonly eventBus: EventBus,
        private readonly crossDomain: CrossDomainAnalysisService,
    ) {}

    onModuleInit() {
        this.eventBus.subscribe((event) => {
            this.onEvent(event).catch(() => {
                // Event intelligence must never break the producer.
            });
        });
    }

    recent(): EventAssessment[] {
        return this.assessments;
    }

    private async onEvent(event: PhoenixEvent) {
        let severity: EventAssessment['severity'] = 'low';
        let intelligence = 'Event observed; no insight generated.';
        let insightGenerated = false;
        let insightIds: string[] = [];

        switch (event.type) {
            case 'phoenix.boot':
                severity = 'medium';
                intelligence = 'Boot completed; orchestrator online. Running the initial cross-domain insight sweep.';
                {
                    const result = await this.crossDomain.sweep();
                    insightGenerated = result.generated > 0;
                    if (insightGenerated) {
                        const recent = await this.recentInsightIds(1);
                        insightIds = recent;
                    }
                    intelligence = `Boot completed; sweep generated ${result.generated} insights (${result.total} total).`;
                }
                break;
            case 'decision.reconstructed':
                severity = 'medium';
                {
                    const result = await this.crossDomain.persistDrafts([
                        ...(await this.crossDomain.decisionInsights()),
                        ...(await this.crossDomain.architectureInsights()),
                    ]);
                    insightGenerated = result.generated > 0;
                    if (insightGenerated) {
                        insightIds = await this.recentInsightIds(result.generated);
                    }
                    intelligence = `Decision reconstruction detected; generated ${result.generated} decision/architecture insights.`;
                }
                break;
            case 'documentation.evolved':
                severity = event.detail.toLowerCase().includes('regenerat') ? 'medium' : 'low';
                {
                    const result = await this.crossDomain.persistDrafts(await this.crossDomain.knowledgeInsights());
                    insightGenerated = result.generated > 0;
                    if (insightGenerated) {
                        insightIds = await this.recentInsightIds(result.generated);
                    }
                    intelligence = `Documentation evolution detected; refreshed ${result.generated} knowledge insights.`;
                }
                break;
            case 'mentor.answered':
                severity = 'low';
                intelligence = 'Mentor answered; assessed for learning value (no insight persisted).';
                break;
            case 'agent.completed':
            case 'fleet.completed':
                severity = 'low';
                intelligence = 'Fleet activity; assessed for orchestration value (no insight persisted).';
                break;
            case 'intelligence.generated':
            case 'intelligence.sweep':
                severity = 'low';
                intelligence = 'Orchestrator output; acknowledged (feedback loop suppressed).';
                break;
            default:
                severity = 'low';
                intelligence = 'Lifecycle event observed; not actionable for insight generation.';
                break;
        }

        this.assessments.push({
            eventType: event.type,
            resource: event.resource,
            detail: event.detail,
            at: event.at,
            severity,
            intelligence,
            insightGenerated,
            insightIds,
        });
        if (this.assessments.length > MAX_ASSESSMENTS) {
            this.assessments.splice(0, this.assessments.length - MAX_ASSESSMENTS);
        }
    }

    private async recentInsightIds(count: number): Promise<string[]> {
        try {
            const rows = await this.crossDomain.latestInsights(count);
            return rows.map((r) => r.id);
        } catch {
            return [];
        }
    }
}
