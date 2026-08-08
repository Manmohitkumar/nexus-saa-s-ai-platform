import { Injectable } from '@nestjs/common';
import {
    IntelligenceInsight,
    OrchestratedResponse,
    ReasoningTrace,
} from './intelligence.types';

/**
 * Explainability Service — renders every intelligence output as a transparent
 * reasoning trace. Nothing is opaque: each trace step names its source,
 * quotes the evidence it relied on, and carries a confidence score.
 */
@Injectable()
export class ExplainabilityService {
    explainInsight(insight: IntelligenceInsight): ReasoningTrace {
        const steps = insight.evidence.map((e, i) => ({
            order: i + 1,
            label: `Evidence consulted: ${e.source}`,
            source: e.source,
            excerpt: e.excerpt,
            confidence: e.confidence,
        }));
        steps.push({
            order: steps.length + 1,
            label: 'Synthesis',
            source: insight.source,
            excerpt: insight.summary,
            confidence: insight.confidence,
        });
        return {
            objectId: insight.id,
            objectTitle: insight.title,
            confidence: insight.confidence,
            steps,
            summary: `This ${insight.kind} insight was derived from ${insight.evidence.length} evidence items across the ${insight.source} source.`,
            generatedAt: insight.createdAt,
        };
    }

    explainOrchestration(response: OrchestratedResponse): ReasoningTrace {
        const steps = response.workflow.map((s, i) => ({
            order: i + 1,
            label: `[${s.agentId}] ${s.agentName} consulted ${s.service}`,
            source: s.service,
            excerpt: s.finding ?? s.input,
            confidence: s.confidence ?? 0,
        }));
        response.conflictResolution.forEach((line, i) => {
            steps.push({
                order: steps.length + 1,
                label: 'Conflict resolution',
                source: 'Cross-Domain Orchestrator',
                excerpt: line,
                confidence: response.confidence,
            });
        });
        return {
            objectId: response.insightId ?? 'live-orchestration',
            objectTitle: response.query,
            confidence: response.confidence,
            steps,
            summary: `${steps.length} reasoning steps across ${response.evidence.length} evidence items; conflicts resolved by weighting engine confidence.`,
            generatedAt: response.createdAt,
        };
    }
}
