export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface BrainNode {
    id: string;
    label: string;
    kind: "service" | "repository" | "database" | "team" | "person";
    owner?: string;
    risk: RiskLevel;
}

export interface DecisionRecord {
    id: string;
    title: string;
    confidence: number;
    impact: "low" | "medium" | "high";
    timestamp: string;
}

export interface WorkforceSignal {
    person: string;
    team: string;
    concentrationRisk: number;
    replacementWeeks: number;
}

export interface DocumentationSignal {
    asset: string;
    coverage: number;
    freshnessDays: number;
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

export interface HeatmapCell {
    name: string;
    risk: RiskLevel | "safe";
    coverage: number;
    owner: string | null;
}

export interface ArchitectureWorkflow {
    id: string;
    title: string;
    description: string;
    steps: string[];
}

export interface IntelligenceOverview {
    summary: string;
    confidence: number;
    focusAreas: string[];
    nodeCount: number;
    evidenceCount: number;
}

export interface IntelligenceInsights {
    evidenceChain: ReasoningEvidence[];
    agents: Array<{
        id: string;
        name: string;
        role: string;
        status: "reasoning" | "idle" | "done";
        confidence: number;
        finding: string;
    }>;
    recommendations: string[];
}

export interface DocumentationItem {
    name: string;
    type: string;
    status: "generated" | "generating" | "stale" | "missing";
    lastGen: string;
    coverage: number;
    icon: string;
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

export interface FeatureFlag {
    name: string;
    type: string;
    description: string;
    enabled: boolean;
    rollout: number;
    stickiness: string;
    variants: number;
    impressionData: boolean;
    createdAt: string;
}

export interface FeatureFlagSummary {
    total: number;
    enabled: number;
    disabled: number;
    enabledPct: number;
    byType: Record<string, number>;
    killSwitches: number;
    experiments: number;
    releases: number;
    operational: number;
    described: number;
    undocumented: number;
}

export interface FeatureRiskItem {
    name: string;
    type: string;
    risk: RiskLevel;
    coverage: number;
    owner: string | null;
}

export interface FeatureDocsState {
    total: number;
    documented: number;
    missing: number;
    items: DocumentationItem[];
}
