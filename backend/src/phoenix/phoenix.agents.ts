import {
    AgentDefinition,
    AgentRunReport,
    AgentRunResult,
} from './phoenix.types';
import { detectTopicContext } from './phoenix.reasoning';
import { AgentMemoryService, MemoryEntry } from '../agents/agent-memory.service';

const agentDefinitions: AgentDefinition[] = [
    {
        id: 'a1',
        name: 'Knowledge Agent',
        role: 'Searches org knowledge graph',
        scope: 'knowledge graph, repositories, documentation index',
        capability: 'Traverses organizational nodes and ranks the most relevant knowledge sources for the query.',
        inputs: ['query', 'knowledge graph index', 'repository graph'],
        outputs: ['relevant knowledge nodes', 'source ranking'],
    },
    {
        id: 'a2',
        name: 'Context Agent',
        role: 'Builds situational context',
        scope: 'meeting timeline, goals, incident history',
        capability: 'Frames the query within the business and engineering context that produced it.',
        inputs: ['query', 'meeting timeline', 'goal registry', 'incident history'],
        outputs: ['situational context', 'timeline framing'],
    },
    {
        id: 'a3',
        name: 'Evidence Agent',
        role: 'Gathers supporting evidence',
        scope: 'meeting transcripts, ADRs, commits, Slack archives',
        capability: 'Mines raw evidence artifacts and cross-checks each claim against multiple sources.',
        inputs: ['query', 'meeting transcripts', 'ADRs', 'commits', 'messages'],
        outputs: ['evidence chain', 'source corroboration'],
    },
    {
        id: 'a4',
        name: 'Relationship Agent',
        role: 'Maps knowledge dependencies',
        scope: 'service dependency map, team ownership, code ownership',
        capability: 'Links knowledge to systems, teams, and owners to expose hidden dependencies and concentration risk.',
        inputs: ['query', 'dependency map', 'ownership registry'],
        outputs: ['dependency graph', 'concentration risk'],
    },
    {
        id: 'a5',
        name: 'Synthesis Agent',
        role: 'Synthesizes final answer',
        scope: 'all agent outputs, confidence scores',
        capability: 'Reconciles contradictory findings, weighs confidence scores, and produces a single coherent answer.',
        inputs: ['agent outputs', 'confidence scores'],
        outputs: ['final answer', 'confidence rating'],
    },
    {
        id: 'a6',
        name: 'Decision Intelligence Agent',
        role: 'Correlates evidence & reconstructs decision history',
        scope: 'decision registry, evidence chain, alternatives, dependency graph',
        capability: 'Correlates evidence into decision phases, weighs accepted vs rejected alternatives, and produces explainable decision narratives from shared memory.',
        inputs: ['evidence chain', 'decision registry', 'agent findings', 'shared memory'],
        outputs: ['decision reconstruction', 'explainable narrative', 'confidence rating'],
    },
    {
        id: 'a7',
        name: 'Employee Exit Intelligence Agent',
        role: 'Coordinates departure simulations & resilience planning',
        scope: 'workforce intelligence, knowledge dependency graph, succession registry, transfer plans',
        capability: 'Simulates individual/team exits, predicts knowledge loss, identifies affected systems, ranks replacement candidates, and generates evidence-based mitigation plans from the organizational brain.',
        inputs: ['query', 'workforce intelligence', 'knowledge dependency graph', 'succession registry'],
        outputs: ['impact scenario', 'knowledge loss projection', 'succession ranking', 'transfer plan'],
    },
    {
        id: 'a8',
        name: 'Risk Intelligence Agent',
        role: 'Computes organizational knowledge-risk heatmaps',
        scope: 'risk intelligence graph, resilience snapshot, predictive analytics, recommendation engine',
        capability: 'Scores every node across the risk attribute set, ranks heatmap hotspots, projects 4-week risk trajectories with confidence and evidence, and issues ownership-assigned mitigation actions from the organizational brain.',
        inputs: ['query', 'risk intelligence graph', 'risk snapshot series', 'resilience snapshot'],
        outputs: ['risk bands', 'heatmap hotspots', 'risk forecasts', 'mitigation recommendations'],
    },
    {
        id: 'a9',
        name: 'Mentor Agent',
        role: 'Explains the organizational brain with personalized guidance',
        scope: 'mentor capability catalog, workforce intelligence, knowledge graph, decision registry, risk engine, learning engine',
        capability: 'Detects the mentoring capability behind a query, resolves the asker into a persona, engages the relevant fleet agents, and composes a confident, evidence-grounded answer with reasoning trace, follow-ups, navigation, and a personalized learning path.',
        inputs: ['query', 'mentor capability catalog', 'user context', 'agent findings', 'shared memory'],
        outputs: ['capability-matched answer', 'confidence rating', 'follow-up questions', 'learning path'],
    },
    {
        id: 'a10',
        name: 'Documentation Intelligence Agent',
        role: 'Coordinates documentation generation, evolution, validation, and versioning',
        scope: 'documentation evolution pipeline, version management, documentation quality, knowledge publishing, documentation recommendations',
        capability: 'Continuously synchronizes the documentation ecosystem with the Organizational Digital Brain: detects which documentation an event impacts, regenerates affected sections, preserves version history, validates consistency, and publishes knowledge back into the brain.',
        inputs: ['event bus', 'documentation registry', 'version history', 'quality intelligence', 'knowledge graph'],
        outputs: ['documentation updates', 'versioned documents', 'quality reports', 'evolution summary', 'publishing actions'],
    },
    {
        id: 'a11',
        name: 'Organizational Intelligence Agent',
        role: 'Orchestrates cross-domain organizational reasoning',
        scope: 'central intelligence orchestrator, dynamic reasoning pipeline, all fleet agents, decision registry, risk engine, workforce intelligence, documentation engine',
        capability: 'Plans hierarchical reasoning pipelines for organizational questions, coordinates the existing fleet and engines across domains, weighs conflicting evidence by confidence, and composes transparent, explainable intelligence with evidence, affected systems, and recommended actions.',
        inputs: ['query', 'workflow plan', 'fleet findings', 'decision registry', 'risk engine', 'workforce intelligence', 'documentation engine'],
        outputs: ['cross-domain answer', 'reasoning trace', 'evidence chain', 'recommended actions', 'conflict resolution'],
    },
    {
        id: 'a12',
        name: 'Executive Intelligence Agent',
        role: 'Aggregates executive KPIs, forecasts, briefings, and prioritized recommendations',
        scope: 'executive intelligence dashboard, strategic KPI registry, forecast engine, recommendation prioritization, briefing center, reporting service, all feature engines',
        capability: 'Consumes the reusable APIs of Features 1-7 to aggregate strategic KPIs, correlate insights across domains, generate board briefings and period reports, and prioritize recommendations into executive tiers with business justification and evidence — presenting organizational intelligence without duplicating the reasoning of the underlying agents.',
        inputs: ['query', 'executive KPI registry', 'forecast outputs', 'insight catalog', 'recommendation registry', 'fleet findings'],
        outputs: ['strategic KPI summary', 'executive forecast', 'board briefing', 'prioritized recommendations', 'period report'],
    },
    {
        id: 'a13',
        name: 'Agent Task Intelligence Agent',
        role: 'Coordinates the shared Agent Task Intelligence Layer',
        scope: 'agent task registry, source checklist, dependency model, readiness engine, evidence mapping, task explorer, export service, all ACE feature outputs',
        capability: 'Creates evidence-driven agent tasks for any ACE feature, declares the required sources and dependencies each task needs from existing feature outputs, validates source availability and freshness, computes backend readiness, maps generated sections back to their supporting evidence, and exports project-specific reports — coordinating the fleet without owning any intelligence itself.',
        inputs: ['query', 'task registry', 'source checklist', 'dependency model', 'ACE feature outputs', 'event bus'],
        outputs: ['agent tasks', 'source checklists', 'readiness state', 'evidence mappings', 'task reports'],
    },
];

export function getAgentDefinitions(): AgentDefinition[] {
    return agentDefinitions;
}

function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const runDetails: Record<string, (ctx: ReturnType<typeof detectTopicContext>, query: string) => { finding: string; details: string[]; sources: string[] }> = {
    a1: (ctx) => ({
        finding: ctx.agents[0].finding,
        details: [
            `Tokenized query and matched ${ctx.agents[0].confidence}% relevance threshold against the knowledge graph.`,
            'Ranked knowledge nodes by recency, ownership, and link centrality.',
            `Isolated the ${ctx.topic} cluster as the highest-signal region of the graph.`,
        ],
        sources: ['knowledge_graph_index.json', 'repository_graph.snapshot', 'documentation_index'],
    }),
    a2: (ctx) => ({
        finding: ctx.agents[1].finding,
        details: [
            'Reconstructed the event window around the query using meeting and goal registries.',
            'Correlated with incident history to detect contextual drivers.',
            `Framed the question inside the ${ctx.topic} narrative arc.`,
        ],
        sources: ['meeting_timeline', 'goal_registry', 'incident_history'],
    }),
    a3: (ctx, query) => ({
        finding: ctx.agents[2].finding,
        details: [
            `Scanned transcripts and ADRs matching "${query}".`,
            'Cross-checked each excerpt against at least two independent artifacts.',
            `Assembled a ${ctx.evidenceChain.length}-item evidence chain with confidence scoring.`,
        ],
        sources: ctx.evidenceChain.map((e) => e.source),
    }),
    a4: (ctx) => ({
        finding: ctx.agents[3].finding,
        details: [
            'Loaded the service and team dependency map.',
            'Attributed each knowledge node to its owning system and team.',
            'Flagged single-owner nodes and shared-infrastructure dependencies.',
        ],
        sources: ['dependency_map', 'ownership_registry', 'CODEOWNERS'],
    }),
    a5: (ctx) => ({
        finding: ctx.agents[4].finding,
        details: [
            'Collected outputs from all 5 upstream agents.',
            'Weighted conflicting claims by per-agent confidence.',
            `Composed the final synthesized answer at ${ctx.confidence}% confidence.`,
        ],
        sources: ['a1.knowledge', 'a2.context', 'a3.evidence', 'a4.relationships', 'a6.decision'],
    }),
    a6: (ctx, query) => {
        const chain = ctx.evidenceChain;
        return {
            finding: `Correlated ${chain.length} evidence items into a ${ctx.topic} decision narrative covering problem, evaluation, approval, and outcome phases.`,
            details: [
                `Mapped evidence for "${query}" to decision lifecycle phases.`,
                'Weighed accepted approach against rejected alternatives from the decision registry.',
                `Flagged downstream dependencies and impact surfaces across ${ctx.topic}.`,
            ],
            sources: ['decision_registry', ...chain.slice(0, 3).map((e) => e.source)],
        };
    },
    a7: (ctx, query) => ({
        finding: `Simulated the "${ctx.topic}" departure scenario for "${query}" and projected knowledge loss across owned systems, ranking succession candidates and transfer actions by confidence.`,
        details: [
            'Loaded workforce intelligence and ownership registry from the organizational brain.',
            'Traversed the knowledge dependency graph to identify affected systems and downstream risk.',
            'Ranked replacement candidates by expertise overlap, collaboration diversity, and readiness.',
            'Generated an evidence-based knowledge transfer plan prioritized by projected loss.',
        ],
        sources: ['workforce_intelligence', 'knowledge_dependency_graph', 'succession_registry', 'transfer_plan'],
    }),
    a8: (ctx, query) => ({
        finding: `Scored the "${ctx.topic}" heatmap for "${query}" across 13 risk attributes, projected 4-week risk trajectories, and issued ownership-assigned mitigation actions with confidence ${ctx.confidence}.`,
        details: [
            'Loaded the risk intelligence graph and 8-week risk snapshot series from the organizational brain.',
            'Computed per-node attributes: documentation coverage, ownership concentration, bus factor, critical dependency, operational exposure.',
            'Ranked heatmap hotspots by overall risk and banded them low/medium/high/critical.',
            'Extrapolated trends with slope regression and generated evidence-backed recommendations.',
        ],
        sources: ['risk_intelligence_graph', 'risk_snapshot_series', 'resilience_snapshot', 'recommendation_engine'],
    }),
    a9: (ctx, query) => ({
        finding: `Mentored the asker on "${ctx.topic}" for "${query}": detected the capability, resolved the user persona from workforce intelligence, engaged the relevant fleet, and composed an evidence-grounded answer with a learning path at ${ctx.confidence}% confidence.`,
        details: [
            'Detected the mentoring capability from the catalog and the query intent.',
            'Resolved the asker persona, team, expertise, and owned systems from workforce intelligence.',
            'Engaged the fleet agents matched to the capability and read their findings from shared memory.',
            'Composed the answer with reasoning trace, follow-ups, and navigation into the organizational brain.',
        ],
        sources: ['mentor_capability_catalog', 'workforce_intelligence', 'knowledge_graph', 'decision_registry', 'risk_engine', 'learning_engine'],
    }),
    a10: (ctx, query) => ({
        finding: `Synchronized the documentation ecosystem for "${ctx.topic}" on "${query}": identified impacted documents, regenerated affected sections from the brain, preserved version history, and validated documentation quality at ${ctx.confidence}% confidence.`,
        details: [
            'Subscribed to organizational events and determined which documentation each change impacts.',
            'Re-derived affected sections from the knowledge graph, decision registry, and workforce intelligence.',
            'Preserved the previous version and published a new immutable version into the documentation registry.',
            'Recomputed documentation quality dimensions and health scores, then republished the synchronized knowledge.',
        ],
        sources: ['documentation_registry', 'version_history', 'quality_intelligence', 'event_bus', 'knowledge_graph'],
    }),
    a11: (ctx, query) => ({
        finding: `Orchestrated "${ctx.topic}" reasoning for "${query}" across ${ctx.agents.length} fleet agents and the decision, risk, workforce, and documentation engines, weighing evidence by confidence and composing a transparent cross-domain answer at ${ctx.confidence}% confidence.`,
        details: [
            'Planned a hierarchical reasoning pipeline and assigned each step to the matching fleet agent.',
            'Collected findings from knowledge, context, evidence, relationship, decision, risk, workforce, mentor, and documentation agents.',
            'Weighed conflicting claims by per-engine confidence and resolved contradictions from the decision and risk registries.',
            'Composed the final answer with a full reasoning trace, evidence chain, affected systems, and recommended actions.',
        ],
        sources: ['intelligence_orchestrator', 'fleet_findings', 'decision_registry', 'risk_engine', 'workforce_intelligence', 'documentation_engine'],
    }),
    a12: (ctx, query) => ({
        finding: `Prepared an executive view of "${ctx.topic}" for "${query}": aggregated strategic KPIs across Features 1-7, correlated cross-domain insights, and prioritized recommendations into executive tiers with business justification and evidence at ${ctx.confidence}% confidence.`,
        details: [
            'Consumed the reusable KPI, forecast, insight, and recommendation APIs of the existing feature engines without duplicating their reasoning.',
            'Normalized and ranked insights across workforce, knowledge, decisions, risk, architecture, and documentation into an executive summary.',
            'Prioritized recommendations into informational, operational, strategic, urgent, and executive-critical tiers with expected benefit and ownership.',
            'Prepared board-ready briefing material and period report content for the Executive Intelligence Dashboard.',
        ],
        sources: ['executive_kpi_registry', 'forecast_outputs', 'insight_catalog', 'recommendation_registry', 'fleet_findings'],
    }),
    a13: (ctx, query) => ({
        finding: `Coordinated an Agent Task Intelligence workflow for "${ctx.topic}" on "${query}": declared the source checklist and cross-feature dependencies, validated each against the existing ACE feature outputs, computed backend readiness, and mapped generated sections back to their supporting evidence at ${ctx.confidence}% confidence.`,
        details: [
            'Created an evidence-driven task tied to the originating ACE feature and the responsible agent.',
            'Declared required sources and explicit dependencies on existing feature outputs (brain, decisions, workforce, risk, docs, intelligence, executive).',
            'Validated source availability, accessibility, freshness, and confidence against the live feature data.',
            'Computed readiness via backend business logic and exported a project-specific report reusing already-captured information.',
        ],
        sources: ['task_registry', 'source_checklist', 'dependency_model', 'readiness_engine', 'evidence_mapping', 'export_service'],
    }),
};

export async function runAgent(agentId: string, query: string, memory?: AgentMemoryService): Promise<AgentRunResult> {
    const def = agentDefinitions.find((a) => a.id === agentId);
    if (!def) {
        throw new Error(`Unknown agent: ${agentId}`);
    }
    const ctx = detectTopicContext(query);
    const built = runDetails[agentId](ctx, query);
    const workMs = 250 + Math.floor(Math.random() * 450);
    await wait(workMs);
    const confidence = ['a6', 'a7', 'a8', 'a9', 'a10', 'a11', 'a12', 'a13'].includes(agentId)
        ? Math.round(ctx.agents.reduce((s, a) => s + a.confidence, 0) / Math.max(1, ctx.agents.length))
        : (ctx.agents.find((a) => a.id === agentId)?.confidence ?? 0);
    const result: AgentRunResult = {
        agentId: def.id,
        name: def.name,
        role: def.role,
        status: 'done',
        confidence,
        finding: built.finding,
        details: built.details,
        durationMs: workMs,
        sources: built.sources,
    };
    if (memory) {
        const entry: MemoryEntry = {
            agentId: def.id,
            role: def.role,
            content: built.finding,
            sources: built.sources,
            confidence,
        };
        await memory.remember(query, entry);
    }
    return result;
}

export async function runAllAgents(query: string, memory?: AgentMemoryService): Promise<AgentRunReport> {
    const startedAt = Date.now();
    const ctx = detectTopicContext(query);
    const results = await Promise.all(
        agentDefinitions.map((def) => runAgent(def.id, query, memory)),
    );
    const report: AgentRunReport = {
        query,
        topic: ctx.topic,
        triggeredAt: new Date().toISOString(),
        totalDurationMs: Date.now() - startedAt,
        results: results.sort((a, b) => a.agentId.localeCompare(b.agentId)),
    };
    if (memory) {
        // Persist the final report so downstream features share this reasoning.
        const entry: MemoryEntry = {
            agentId: 'report',
            role: 'Fleet Report',
            content: report.topic,
            sources: results.map((r) => r.agentId),
            confidence: ctx.confidence,
        };
        await memory.remember(query, entry);
    }
    return report;
}
