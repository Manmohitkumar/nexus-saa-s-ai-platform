export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface BrainNode {
    id: string;
    label: string;
    kind: "service" | "repository" | "database" | "team" | "person";
    owner?: string;
    risk: RiskLevel;
}

export interface BrainGraphNode extends BrainNode {
    connections: string[];
}

export interface BrainGraphView {
    nodes: BrainGraphNode[];
    summary: {
        services: number;
        repositories: number;
        dependencies: number;
        knowledgeNodes: number;
    };
}

export interface BrainGraphEdge {
    type: string;
    direction: "out" | "in";
    targetId: string;
    targetLabel: string;
}

export interface BrainGraphNodeDetail {
    id: string;
    label: string;
    kind: string;
    risk: RiskLevel;
    summary: string;
    owner: string | null;
    ownerRole: string | null;
    team: string | null;
    systemId: string | null;
    flagStats: {
        total: number;
        undocumented: number;
        enabled: number;
        enabledUndocumented: number;
        killSwitches: number;
        experiments: number;
    };
    connections: BrainGraphEdge[];
    insight: string;
    recommendations: string[];
}

export interface DecisionTimelineEvent {
    date: string;
    label: string;
    type: "meeting" | "commit" | "adr" | "doc";
    confidence: number;
    summary: string;
    evidenceSources: number;
    participants: string[];
}

export interface ExitSimulationProfile {
    id: string;
    name: string;
    role: string;
    risk: number;
    systems: string[];
    onboarding: string;
    summary: string;
    mitigation: Array<{
        icon: string;
        title: string;
        priority: string;
        est: string;
    }>;
}

export interface ExitSimulationScenario {
    summary: string;
    projectedKnowledgeLoss: number;
    criticalSystems: string[];
    primaryRiskOwners: string[];
    actionPlan: Array<{ title: string; eta: string; impact: "critical" | "high" | "medium" }>;
}

export interface ExitSimulationRecommendation {
    id: string;
    title: string;
    detail: string;
    priority: "critical" | "high" | "medium";
    due: string;
}

export interface HeatmapCell {
    name: string;
    risk: RiskLevel | "safe";
    coverage: number;
    owner: string | null;
}

export interface MentorPrompt {
    title: string;
    detail: string;
}

export interface IntelligenceEvidenceItem {
    source: string;
    confidence: number;
    type: "meeting" | "adr" | "commit" | "message";
    excerpt: string;
}

export interface IntelligenceAgent {
    id: string;
    name: string;
    role: string;
    status: "reasoning" | "idle" | "done";
    confidence: number;
    finding: string;
}

export interface IntelligenceOverview {
    summary: string;
    confidence: number;
    focusAreas: string[];
    nodeCount: number;
    evidenceCount: number;
}

export interface IntelligenceInsights {
    evidenceChain: IntelligenceEvidenceItem[];
    agents: IntelligenceAgent[];
    recommendations: string[];
}

export interface LearningPath {
    topic: string;
    progress: number;
    modules: number;
    completed: number;
}

export interface DocumentationItem {
    name: string;
    type: string;
    status: "generated" | "generating" | "stale" | "missing";
    lastGen: string;
    coverage: number;
    icon: string;
}

export interface DocumentContentSection {
    heading: string;
    body?: string;
    code?: string;
    table?: { headers: string[]; rows: string[][] };
    bullets?: string[];
}

export interface DocumentContent {
    name: string;
    type: string;
    generatedAt: string;
    sections: DocumentContentSection[];
}

export interface ArchitectureWorkflow {
    id: string;
    title: string;
    description: string;
    steps: string[];
}

export interface IntelligenceFinding {
    id: string;
    title: string;
    summary: string;
    priority: "info" | "warning" | "critical";
    sourceFeature: 2 | 3 | 4 | 5 | 6 | 7;
}

export interface ExecutiveAction {
    id: string;
    action: string;
    owner: string;
    eta: string;
    impact: "medium" | "high" | "critical";
    linkedRoute: string;
}

export interface ExecutiveBrief {
    generatedAt: string;
    orgHealth: number;
    decisionEffectiveness: number;
    workforceResilience: number;
    documentationHealth: number;
    riskExposure: number;
    findings: IntelligenceFinding[];
    actions: ExecutiveAction[];
}

export interface MentorPrompt {
    title: string;
    detail: string;
}

export interface LearningPath {
    topic: string;
    progress: number;
    completed: number;
    modules: number;
}

export interface ReasoningEvidence {
    source: string;
    excerpt: string;
    type: string;
    confidence: number;
}

export interface IntelligenceReasoningSnapshot {
    query: string;
    topic: string;
    summary: string;
    confidence: number;
    evidenceChain: ReasoningEvidence[];
    agents: Array<{
        id: string;
        name: string;
        role: string;
        status: "reasoning" | "idle" | "done";
        confidence: number;
        finding: string;
    }>;
}

export interface DocumentationEngineState {
    docs: DocumentationItem[];
    workflows: ArchitectureWorkflow[];
}

export interface AgentDefinition {
    id: string;
    name: string;
    role: string;
    scope: string;
    capability: string;
    inputs: string[];
    outputs: string[];
}

export interface AgentRunResult {
    agentId: string;
    name: string;
    role: string;
    status: "done";
    confidence: number;
    finding: string;
    details: string[];
    durationMs: number;
    sources: string[];
}

export interface AgentRunReport {
    query: string;
    topic: string;
    triggeredAt: string;
    totalDurationMs: number;
    results: AgentRunResult[];
}
