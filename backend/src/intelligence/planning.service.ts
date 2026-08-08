import { Injectable } from '@nestjs/common';
import {
    IntelligenceWorkflow,
    IntelligenceWorkflowStep,
} from './intelligence.types';

interface StepTemplate {
    agentId: string;
    service: string;
    input: string;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

const TOPIC_KEYWORDS: Record<string, string[]> = {
    strategy: ['strateg', 'roadmap', 'quarter', 'priorit', 'vision', 'portfolio', 'growth', 'market', 'competitive', 'long-term'],
    crossdomain: ['cross', 'org-wide', 'company-wide', 'whole org', 'overall', 'system-wide', 'across the', 'portfolio'],
    health: ['health', 'wellness', 'healthy', 'org health', 'healthiest', 'thriving'],
    architecture: ['architect', 'service', 'migration', 'platform', 'postgres', 'database', 'technology', 'system design', 'monolith', 'microservice', 'api design', 'catalog', 'scalability'],
    workforce: ['workforce', 'employee', 'engineer', 'team', 'bus factor', 'exit', 'onboarding', 'hire', 'succession', 'knowledge loss', 'departure', 'mentor', 'resilience'],
    knowledge: ['knowledge', 'document', 'doc', 'handbook', 'runbook', 'documentation', 'write-up', 'coverage'],
    decisions: ['decision', 'why did we', 'historical', 'decided', 'adr', 'chose', 'selected', 'migrated', 'value', 'outcome', 'rationale', 'evaluate'],
    operations: ['operational', 'incident', 'deployment', 'latency', 'failure', 'production', 'performance', 'on-call', 'bottleneck', 'availability', 'sla'],
    predictive: ['predict', 'forecast', 'likely', 'next quarter', 'will ', 'trajectory', 'trend', 'projection', 'risk of', 'anticipate'],
    recommendations: ['recommend', 'should we', 'what should', 'improve', 'fix', 'mitigation', 'prevent', 'optimize', 'action'],
    executive: ['executive', 'brief', 'board', 'roi', 'capital', 'revenue', 'profit', 'investment', 'talent risk'],
    general: [],
};

const STEP_TEMPLATES: Record<string, StepTemplate[]> = {
    architecture: [
        { agentId: 'a1', service: 'Organizational Knowledge Graph', input: 'Retrieve knowledge nodes for the architecture, platforms, and services in scope.' },
        { agentId: 'a4', service: 'Workforce / Dependency Map', input: 'Map service ownership, dependencies, and concentration for the architecture.' },
        { agentId: 'a6', service: 'Decision Time Machine', input: 'Reconstruct the architectural decisions and alternatives that shaped this area.' },
        { agentId: 'a10', service: 'Documentation Engine', input: 'Correlate documentation coverage and freshness for affected systems.' },
        { agentId: 'a11', service: 'Cross-Domain Analysis + Orchestrator', input: 'Synthesize an architecture intelligence answer with evidence and actions.' },
    ],
    workforce: [
        { agentId: 'a1', service: 'Organizational Knowledge Graph', input: 'Retrieve knowledge nodes owned by the teams and individuals in scope.' },
        { agentId: 'a7', service: 'Workforce Intelligence', input: 'Evaluate ownership, bus factor, and knowledge-transfer risk for the workforce.' },
        { agentId: 'a8', service: 'Risk Engine', input: 'Score workforce knowledge risk and single-owner concentration.' },
        { agentId: 'a11', service: 'Cross-Domain Analysis + Orchestrator', input: 'Synthesize a workforce intelligence answer with evidence and actions.' },
    ],
    decisions: [
        { agentId: 'a1', service: 'Organizational Knowledge Graph', input: 'Retrieve knowledge nodes relevant to the decision question.' },
        { agentId: 'a3', service: 'Decision Time Machine / Evidence Registry', input: 'Gather evidence artifacts (ADRs, meetings, commits) supporting the decision.' },
        { agentId: 'a6', service: 'Decision Time Machine', input: 'Reconstruct the decision lifecycle, alternatives, and outcomes.' },
        { agentId: 'a11', service: 'Cross-Domain Analysis + Orchestrator', input: 'Synthesize a decision intelligence answer with evidence and actions.' },
    ],
    risk: [
        { agentId: 'a8', service: 'Risk Engine', input: 'Score the risk heatmap and project near-term trajectories.' },
        { agentId: 'a4', service: 'Workforce / Dependency Map', input: 'Trace dependencies and ownership behind the risk hotspots.' },
        { agentId: 'a11', service: 'Cross-Domain Analysis + Orchestrator', input: 'Synthesize a risk intelligence answer with evidence and actions.' },
    ],
    knowledge: [
        { agentId: 'a1', service: 'Organizational Knowledge Graph', input: 'Retrieve knowledge nodes and their documentation status.' },
        { agentId: 'a10', service: 'Documentation Engine', input: 'Assess documentation coverage, freshness, and missing knowledge.' },
        { agentId: 'a11', service: 'Cross-Domain Analysis + Orchestrator', input: 'Synthesize a knowledge intelligence answer with evidence and actions.' },
    ],
    health: [
        { agentId: 'a8', service: 'Risk Engine / Health Snapshot', input: 'Compute the organizational risk and resilience health snapshot.' },
        { agentId: 'a7', service: 'Workforce Intelligence', input: 'Compute workforce resilience, bus-factor coverage, and single-owner systems.' },
        { agentId: 'a10', service: 'Documentation Engine', input: 'Compute documentation health pillars.' },
        { agentId: 'a11', service: 'Cross-Domain Analysis + Orchestrator', input: 'Synthesize an organizational health assessment.' },
    ],
    strategy: [
        { agentId: 'a2', service: 'Context Engine', input: 'Frame the strategic question in business and historical context.' },
        { agentId: 'a6', service: 'Decision Time Machine', input: 'Reconstruct decision momentum, outcomes, and confidence trends.' },
        { agentId: 'a8', service: 'Risk Engine', input: 'Read risk trajectories that constrain strategic options.' },
        { agentId: 'a11', service: 'Cross-Domain Analysis + Orchestrator', input: 'Synthesize a strategic intelligence answer.' },
    ],
    operations: [
        { agentId: 'a1', service: 'Organizational Knowledge Graph', input: 'Retrieve knowledge nodes for the operational systems in scope.' },
        { agentId: 'a4', service: 'Workforce / Dependency Map', input: 'Trace operational dependencies, owners, and single points of failure.' },
        { agentId: 'a8', service: 'Risk Engine', input: 'Score operational exposure and critical dependencies.' },
        { agentId: 'a11', service: 'Cross-Domain Analysis + Orchestrator', input: 'Synthesize an operational intelligence answer.' },
    ],
    predictive: [
        { agentId: 'a8', service: 'Risk Engine / Forecasts', input: 'Read risk predictions and 4-week trajectories.' },
        { agentId: 'a7', service: 'Workforce Intelligence', input: 'Read resilience and knowledge-concentration projections.' },
        { agentId: 'a11', service: 'Cross-Domain Analysis + Orchestrator', input: 'Synthesize a predictive intelligence answer with likelihoods.' },
    ],
    recommendations: [
        { agentId: 'a8', service: 'Recommendation Engine (Risk)', input: 'Read ownership-assigned mitigation recommendations.' },
        { agentId: 'a10', service: 'Documentation Engine', input: 'Read documentation gap recommendations.' },
        { agentId: 'a11', service: 'Cross-Domain Analysis + Orchestrator', input: 'Merge, de-duplicate, and prioritize recommendations.' },
    ],
    crossdomain: [
        { agentId: 'a1', service: 'Organizational Knowledge Graph', input: 'Retrieve knowledge nodes spanning all domains.' },
        { agentId: 'a6', service: 'Decision Time Machine', input: 'Read decision outcomes and their business value.' },
        { agentId: 'a8', service: 'Risk Engine', input: 'Read risk hotspots and trajectories.' },
        { agentId: 'a10', service: 'Documentation Engine', input: 'Read documentation coverage.' },
        { agentId: 'a5', service: 'Synthesis Engine', input: 'Weigh cross-domain confidence and reconcile findings.' },
        { agentId: 'a11', service: 'Cross-Domain Analysis + Orchestrator', input: 'Compose the final cross-domain intelligence answer.' },
    ],
    executive: [
        { agentId: 'a2', service: 'Context Engine', input: 'Frame the executive question in business and historical context.' },
        { agentId: 'a6', service: 'Decision Time Machine', input: 'Read decision momentum, implemented rate, and outcome improvements.' },
        { agentId: 'a8', service: 'Risk Engine', input: 'Read risk trajectory and workforce risk exposure.' },
        { agentId: 'a11', service: 'Cross-Domain Analysis + Orchestrator', input: 'Synthesize the executive brief with evidence.' },
    ],
    general: [
        { agentId: 'a1', service: 'Organizational Knowledge Graph', input: 'Retrieve the most relevant knowledge nodes for the query.' },
        { agentId: 'a2', service: 'Context Engine', input: 'Frame the query in situational context.' },
        { agentId: 'a3', service: 'Evidence Registry', input: 'Gather corroborating evidence artifacts.' },
        { agentId: 'a5', service: 'Synthesis Engine', input: 'Reconcile findings and weight confidence.' },
        { agentId: 'a11', service: 'Cross-Domain Analysis + Orchestrator', input: 'Compose the final synthesized answer.' },
    ],
};

const INTENT_KEYWORDS: Record<string, string[]> = {
    prediction: ['predict', 'forecast', 'likely', 'will ', 'trajectory', 'trend', 'next quarter', 'anticipate'],
    recommendation: ['recommend', 'should we', 'what should', 'improve', 'fix', 'mitigation', 'prevent', 'optimize', 'action'],
    analysis: ['analyze', 'assess', 'evaluate', 'compare', 'review', 'measure', 'health', 'score'],
    plan: ['plan', 'roadmap', 'strategy', 'prepare', 'organize', 'sequence'],
    explanation: ['why', 'explain', 'how did', 'what happened', 'tell me', 'understand', 'detail'],
    synthesis: ['synthesis', 'overview', 'summarize', 'brief', 'what do we know', 'across'],
};

/**
 * Workflow Planning Service — decomposes an intelligence request into a
 * transparent, hierarchical reasoning pipeline. Each step binds to an existing
 * fleet agent and the existing engine that step reads from; nothing is invented.
 */
@Injectable()
export class WorkflowPlanningService {
    detectTopic(query: string): string {
        const q = ` ${query.toLowerCase()} `;
        let best = 'general';
        let bestScore = 0;
        for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
            const score = keywords.reduce((s, k) => s + (q.includes(` ${k}`) || q.includes(k) ? 1 : 0), 0);
            if (score > bestScore) {
                best = topic;
                bestScore = score;
            }
        }
        return best;
    }

    detectIntent(query: string): string {
        const q = ` ${query.toLowerCase()} `;
        for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
            if (keywords.some((k) => q.includes(k))) return intent;
        }
        return 'explanation';
    }

    prioritize(query: string): 'critical' | 'high' | 'medium' | 'low' {
        const q = query.toLowerCase();
        const critical = ['critical', 'failure', 'incident', 'security', 'outage', 'risk', 'breach', 'departure', 'lost'];
        const high = ['should', 'recommend', 'improve', 'plan', 'strateg', 'predict', 'mitigat', 'action', 'executive'];
        if (critical.some((k) => q.includes(k))) return 'critical';
        if (high.some((k) => q.includes(k))) return 'high';
        return 'medium';
    }

    plan(query: string): IntelligenceWorkflow {
        const topic = this.detectTopic(query);
        const intent = this.detectIntent(query);
        const priority = this.prioritize(query);
        const templates = STEP_TEMPLATES[topic] ?? STEP_TEMPLATES.general;
        const steps: IntelligenceWorkflowStep[] = templates.map((t) => ({
            agentId: t.agentId,
            agentName: this.agentName(t.agentId),
            role: this.agentRole(t.agentId),
            service: t.service,
            input: t.input,
            status: 'pending',
            evidence: [],
        }));
        const parallelBranches = steps.filter((s) => s.agentId !== 'a11' && s.agentId !== 'a5').length;
        const estimatedMs = Math.max(900, steps.length * 380 + parallelBranches * 60);
        return {
            query,
            intent,
            topic,
            priority,
            steps,
            parallelBranches,
            estimatedMs,
            createdAt: new Date().toISOString(),
        };
    }

    private agentName(agentId: string): string {
        const names: Record<string, string> = {
            a1: 'Knowledge Agent',
            a2: 'Context Agent',
            a3: 'Evidence Agent',
            a4: 'Relationship Agent',
            a5: 'Synthesis Agent',
            a6: 'Decision Intelligence Agent',
            a7: 'Employee Exit Intelligence Agent',
            a8: 'Risk Intelligence Agent',
            a9: 'Mentor Agent',
            a10: 'Documentation Intelligence Agent',
            a11: 'Organizational Intelligence Agent',
        };
        return names[agentId] ?? agentId;
    }

    private agentRole(agentId: string): string {
        const roles: Record<string, string> = {
            a1: 'Searches org knowledge graph',
            a2: 'Builds situational context',
            a3: 'Gathers supporting evidence',
            a4: 'Maps knowledge dependencies',
            a5: 'Synthesizes final answer',
            a6: 'Correlates evidence & reconstructs decision history',
            a7: 'Coordinates departure simulations & resilience planning',
            a8: 'Computes organizational knowledge-risk heatmaps',
            a9: 'Explains the organizational brain with personalized guidance',
            a10: 'Coordinates documentation generation, evolution, validation, and versioning',
            a11: 'Orchestrates cross-domain organizational reasoning',
        };
        return roles[agentId] ?? agentId;
    }

    scoreBand(score: number): 'healthy' | 'watch' | 'critical' {
        if (score >= 75) return 'healthy';
        if (score >= 50) return 'watch';
        return 'critical';
    }

    clamp(n: number) {
        return clamp(n);
    }
}
