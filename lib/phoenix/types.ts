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

export interface BrainGraphNode extends BrainNode {
    connections: string[];
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

export interface BrainGraphView {
    nodes: BrainGraphNode[];
    summary: {
        services: number;
        repositories: number;
        dependencies: number;
        knowledgeNodes: number;
    };
}

export interface BusEvent {
    type: string;
    resource: string;
    detail: string;
    payload?: Record<string, unknown>;
    at: string;
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

export interface DecisionReasoning {
    dataSources: string;
    keyDrivers: string;
    participantsNote: string;
}

export interface DecisionTimelineResponse {
    query: string;
    topic: string;
    events: DecisionTimelineEvent[];
    reasoning: DecisionReasoning;
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

// ============================================================================
// Feature 3 — Employee Exit Simulation / Organizational Resilience
// Shared contract for the workforce intelligence, dependency, simulation,
// succession, transfer, and resilience services.
// ============================================================================

export interface WorkforceEmployee {
    id: string;
    name: string;
    role: string;
    team: string;
    risk: number;
    systems: string[];
    tenureYears: number;
    expertise: string[];
    mentorship: number;
    contributions: number;
    incidentsResolved: number;
    codeReviews: number;
    collaborationPartners: number;
    successionReadiness: number;
    busFactor: number;
    nodeId: string | null;
    metrics: Record<string, number>;
}

export interface WorkforceMetricDefinition {
    code: string;
    label: string;
}

export interface WorkforceDependencyNode {
    systemId: string;
    label: string;
    kind: string;
    risk: RiskLevel;
    knowledgeLoss: number;
    flagTotal: number;
    flagUndocumented: number;
}

export interface WorkforceDependencyEdge {
    sourceId: string;
    targetId: string;
    type: string;
}

export interface EmployeeImpact {
    employeeId: string;
    systems: WorkforceDependencyNode[];
    edges: WorkforceDependencyEdge[];
    affectedDecisions: Array<{ decisionId: string; title: string; role: string }>;
    impactedEmployeeIds: string[];
    projectedKnowledgeLoss: number;
}

export interface ResilienceSnapshot {
    orgResilience: number;
    totalEmployees: number;
    averageRisk: number;
    averageReplacementWeeks: number;
    busFactorCoverage: number;
    singleOwnerSystems: number;
    undocumentedFlags: number;
    criticalEmployees: Array<{ id: string; name: string; role: string; risk: number; metrics: Record<string, number> }>;
    workforceDistribution: Record<string, number>;
}

export interface SimulationFinding {
    id: string;
    severity: "info" | "warning" | "critical";
    title: string;
    detail: string;
    evidence: string[];
    confidence: number;
}

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

export interface TransferAction {
    type: "documentation" | "mentorship" | "ownership_transfer" | "pairing" | "walkthrough" | "training" | "handover";
    title: string;
    detail: string;
    priority: "critical" | "high" | "medium";
    etaWeeks: number;
    confidence: number;
    evidence: string[];
}

export interface SimulationRunResult {
    id: string;
    label: string;
    scenarioType: "single" | "team" | "domain" | "system" | "group";
    employees: Array<{ id: string; name: string; role: string; team: string }>;
    projectedKnowledgeLoss: number;
    resilienceBefore: number;
    resilienceAfter: number;
    affectedSystems: Array<{ systemId: string; label: string; kind: string; risk: RiskLevel; knowledgeLoss: number }>;
    findings: SimulationFinding[];
    succession: SuccessionCandidate[];
    transferActions: TransferAction[];
    summary: string;
    createdAt: string;
}

export interface SimulationRunListItem {
    id: string;
    label: string;
    scenarioType: string;
    trigger: string;
    projectedKnowledgeLoss: number;
    resilienceBefore: number;
    resilienceAfter: number;
    summary: string;
    createdAt: string;
    transferCount: number;
}

export interface SimulationRunDetail extends SimulationRunResult {
    transferActions: Array<TransferAction & { id: string; status: string }>;
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

export type DecisionStatus =
    | "identified"
    | "discussed"
    | "approved"
    | "implemented"
    | "validated"
    | "superseded";

export type TimelineMode =
    | "chronological"
    | "dependency"
    | "architecture"
    | "organization"
    | "repository"
    | "service";

export interface DecisionListItem {
    id: string;
    title: string;
    topic: string;
    domain: string;
    status: DecisionStatus;
    summary: string;
    confidence: number;
    createdBy: string | null;
    team: string | null;
    startedAt: string;
    decidedAt: string | null;
    implementedAt: string | null;
    alternativeCount: number;
    outcomeCount: number;
    dependencies: number;
}

export interface DecisionAlternativeView {
    id: string;
    label: string;
    status: "accepted" | "rejected" | "considered";
    rationale: string;
    votes: number;
    confidence: number;
    order: number;
}

export interface DecisionEvidenceView {
    sourceType: string;
    sourceRef: string;
    excerpt: string;
    confidence: number;
    date: string;
}

export interface DecisionMilestoneView {
    id: string;
    label: string;
    phase: string;
    date: string;
    summary: string;
    evidenceSources: number;
    order: number;
}

export interface DecisionOutcomeView {
    metric: string;
    before: string;
    after: string;
    direction: string;
}

export interface DecisionRelationView {
    type: string;
    targetType: string;
    targetId: string;
    targetLabel: string;
}

export interface DecisionDetail extends DecisionListItem {
    businessContext: string;
    technicalContext: string;
    alternatives: DecisionAlternativeView[];
    evidence: DecisionEvidenceView[];
    milestones: DecisionMilestoneView[];
    outcomes: DecisionOutcomeView[];
    relations: DecisionRelationView[];
    participants: string[];
    recommendations: string[];
}

export interface TimelineItem {
    id: string;
    decisionId: string;
    decisionTitle: string;
    date: string;
    label: string;
    type: "milestone" | "relation" | "evidence";
    phase?: string;
    relationType?: string;
    targetLabel?: string;
    confidence: number;
    summary: string;
    evidenceSources?: number;
}

export interface TimelineView {
    mode: TimelineMode;
    filters: { domain?: string; status?: string; team?: string; query?: string };
    items: TimelineItem[];
    decisions: DecisionListItem[];
}

export interface ReplayStep {
    phase: string;
    label: string;
    date: string;
    summary: string;
    evidenceSources: number;
    confidence: number;
    order: number;
}

export interface DecisionReplay {
    decision: DecisionListItem & { businessContext: string; technicalContext: string; topic: string };
    steps: ReplayStep[];
    totalSteps: number;
}

export interface DecisionCorrelationLink {
    id: string;
    title: string;
    domain: string;
    relation: string;
    direction: "depends_on" | "depends_on_me";
}

export interface DecisionCorrelation {
    decisionId: string;
    dependencies: DecisionCorrelationLink[];
    related: Array<{
        id: string;
        title: string;
        domain: string;
        confidence: number;
        sharedTargets: string[];
    }>;
    causeEffect: Array<{ from: string; to: string; type: string }>;
}

export interface DecisionAnalytics {
    total: number;
    byStatus: Record<string, number>;
    byDomain: Record<string, number>;
    averageConfidence: number;
    implementedRate: number;
    validatedCount: number;
    improvedOutcomes: number;
    totalOutcomes: number;
    topParticipants: Array<{ name: string; count: number }>;
    confidenceTrend: Array<{ label: string; value: number }>;
}

export interface DecisionAnswer {
    question: string;
    answer: string;
    confidence: number;
    evidence: Array<{ source: string; excerpt: string; type: string; confidence: number }>;
    decisionIds: string[];
}

// ============================================================================
// Feature 4 — Knowledge Risk Heatmap
// Shared contract for the risk intelligence, predictive, health, and
// recommendation engines (consumes Features 1-3 outputs only).
// ============================================================================

export interface RiskNode {
    id: string;
    nodeId: string | null;
    label: string;
    kind: string;
    owner: string | null;
    team: string | null;
    documentationCoverage: number;
    knowledgeConcentration: number;
    ownershipDistribution: number;
    organizationalResilience: number;
    technicalDebt: number;
    decisionComplexity: number;
    collaborationDiversity: number;
    busFactor: number;
    updateFrequency: number;
    criticalDependency: number;
    operationalExposure: number;
    aiConfidence: number;
    historicalStability: number;
    overallRisk: number;
    band: RiskLevel;
    flagTotal: number;
    flagUndocumented: number;
    contributingFactors: string[];
}

export interface RiskIntelligenceView {
    mode: string;
    nodes: RiskNode[];
    filters: { teams: string[]; kinds: string[] };
}

export interface RiskNodeDetail extends RiskNode {
    relatedDecisions: Array<{ decisionId: string; title: string; role: string }>;
    relatedEmployees: Array<{ id: string; name: string; role: string }>;
    mitigation: string[];
}

export interface RiskPrediction {
    id: string;
    title: string;
    severity: "info" | "warning" | "critical";
    detail: string;
    evidence: string[];
    contributingFactors: string[];
    confidence: number;
    trend: "increasing" | "stable" | "decreasing";
    mitigation: string[];
}

export interface RiskTimelinePoint {
    date: string;
    orgResilience: number;
    averageRisk: number;
    documentationCoverage: number;
    knowledgeConcentration: number;
    technicalDebt: number;
}

export interface RiskHealthSnapshot {
    orgResilience: number;
    averageRisk: number;
    documentationCoverage: number;
    knowledgeConcentration: number;
    technicalDebt: number;
    busFactorCoverage: number;
    singleOwnerSystems: number;
    undocumentedFlags: number;
    criticalNodes: number;
    spofCount: number;
    totalEmployees: number;
    workforceDistribution: Record<string, number>;
    createdAt: string;
}

export interface RiskRecommendation {
    id: string;
    action: string;
    detail: string;
    owner: string;
    eta: string;
    impact: "medium" | "high" | "critical";
    priority: "medium" | "high" | "critical";
    linkedTarget: string;
    evidence: string[];
}

export interface RiskGridCell {
    name: string;
    risk: RiskLevel | "safe";
    coverage: number;
    owner: string | null;
    nodeId: string | null;
}

// ============================================================================
// Feature 5 — AI Mentor
// Shared contract for the conversational/contextual intelligence layer. Every
// answer originates from Features 1-4 services (brain, decisions, workforce,
// risk) plus the shared agent fleet and memory; no parallel knowledge base.
// ============================================================================

export type MentorPersona =
    | "developer"
    | "engineering-manager"
    | "architect"
    | "devops"
    | "product-manager"
    | "executive"
    | "new-hire"
    | "guest";

export interface MentorUserContext {
    userId: string | null;
    name: string | null;
    role: string | null;
    team: string | null;
    persona: MentorPersona;
    expertise: string[];
    ownedSystems: string[];
    permissions: string[];
}

export interface MentorCapability {
    id: string;
    name: string;
    description: string;
    prompts: string[];
}

export interface MentorEvidenceItem {
    source: string;
    excerpt: string;
    type: string;
    confidence: number;
}

export interface MentorRelatedKnowledge {
    id: string;
    label: string;
    kind: string;
    route: string;
    reason: string;
}

export interface MentorDependencyPath {
    source: string;
    target: string;
    type: string;
}

export interface MentorNavigationLink {
    label: string;
    route: string;
    description: string;
}

export interface MentorLearningModule {
    id: string;
    title: string;
    kind: "onboarding" | "architecture" | "documentation" | "decisions" | "risk" | "skill";
    objective: string;
    progress: number;
    route: string;
    evidence: string[];
}

export interface MentorLearningPath {
    userId: string | null;
    persona: MentorPersona;
    summary: string;
    modules: MentorLearningModule[];
    generatedAt: string;
}

export interface MentorSuggestion {
    id: string;
    text: string;
    capability: string;
    context: string;
}

export interface MentorAnswer {
    conversationId: string | null;
    messageId: string;
    capability: string;
    topic: string;
    answer: string;
    reasoning: string[];
    confidence: number;
    evidence: MentorEvidenceItem[];
    relatedKnowledge: MentorRelatedKnowledge[];
    dependencies: MentorDependencyPath[];
    impactedSystems: string[];
    followUps: string[];
    navigation: MentorNavigationLink[];
    learningModules: MentorLearningModule[];
    context: MentorUserContext;
    createdAt: string;
}

export interface MentorConversationSummary {
    id: string;
    title: string;
    topic: string;
    capability: string;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface MentorMessageView {
    id: string;
    role: "user" | "mentor";
    content: string;
    confidence: number;
    payload: MentorAnswer | null;
    createdAt: string;
}

export interface MentorConversationDetail {
    conversation: MentorConversationSummary;
    messages: MentorMessageView[];
}

// ============================================================================
// Feature 6 — Autonomous Documentation Engine
// Shared contract for the documentation intelligence, versioning, quality,
// recommendation, and evolution engines. Every document is derived from the
// Organizational Digital Brain (Features 1-5) and versioned immutably; no
// parallel knowledge base.
// ============================================================================

export type DocKind =
    | "architecture"
    | "api"
    | "database"
    | "repository"
    | "service"
    | "infrastructure"
    | "runbook"
    | "onboarding"
    | "team"
    | "adr"
    | "specification"
    | "release-notes"
    | "deployment-guide"
    | "incident-report"
    | "rca"
    | "changelog"
    | "business-process"
    | "playbook"
    | "knowledge-transfer"
    | "executive-summary";

export type DocStatus = "current" | "draft" | "stale" | "missing";

export interface DocSection {
    heading: string;
    body?: string;
    bullets?: string[];
    code?: string;
    table?: { headers: string[]; rows: string[][] };
    evidence?: string[];
}

export interface DocumentationView {
    id: string;
    title: string;
    slug: string;
    kind: DocKind;
    summary: string;
    status: DocStatus;
    quality: number;
    confidence: number;
    owner: string;
    team: string;
    sourceType: string;
    sourceRef: string;
    version: number;
    versions: number;
    freshness: number;
    completeness: number;
    lastVerifiedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface DocumentationRelatedLink {
    id: string;
    label: string;
    kind: string;
    relation: string;
    route: string;
}

export interface DocumentationRelatedDecision {
    id: string;
    title: string;
    role: string;
    status: string;
    confidence: number;
}

export interface QualityDimension {
    key: string;
    label: string;
    score: number;
    detail: string;
}

export interface QualityReport {
    overall: number;
    confidence: number;
    dimensions: QualityDimension[];
}

export interface DocumentationDetail extends DocumentationView {
    content: DocSection[];
    related: DocumentationRelatedLink[];
    relatedDecisions: DocumentationRelatedDecision[];
    impactedSystems: string[];
    qualityReport: QualityReport;
}

export interface DocumentationVersionView {
    id: string;
    version: number;
    change: string;
    author: string;
    status: string;
    quality: number;
    confidence: number;
    createdAt: string;
}

export interface DocumentationDiff {
    id: string;
    title: string;
    fromVersion: number;
    toVersion: number;
    added: number;
    removed: number;
    changed: number;
    sections: Array<{ heading: string; change: "added" | "removed" | "changed" | "unchanged"; summary: string }>;
}

export interface DocumentationHealth {
    health: number;
    coverage: number;
    freshness: number;
    consistency: number;
    completeness: number;
    currentDocs: number;
    staleDocs: number;
    draftDocs: number;
    missingDocs: number;
    totalDocs: number;
    undocumentedFlags: number;
    byKind: Array<{ kind: string; count: number; avgQuality: number }>;
    dimensions: QualityDimension[];
    generatedAt: string;
}

export interface HealthTimelinePoint {
    id: string;
    at: string;
    health: number;
    coverage: number;
    freshness: number;
    staleDocs: number;
    missingDocs: number;
}

export interface DocumentationRecommendation {
    id: string;
    type: string;
    title: string;
    detail: string;
    targetDoc: string;
    targetSystem: string;
    priority: "critical" | "high" | "medium";
    riskImpact: number;
    workforceImpact: number;
    evidence: string[];
    action: string;
    eta: string;
}

export interface EvolutionRun {
    id: string;
    trigger: string;
    resource: string;
    detail: string;
    action: string;
    documentsAffected: string[];
    summary: string;
    createdAt: string;
}

export interface DocumentationImpact {
    id: string;
    title: string;
    kind: DocKind;
    sourceType: string;
    sourceRef: string;
    status: DocStatus;
    quality: number;
    freshness: number;
    relatedSystems: string[];
    relatedDecisions: DocumentationRelatedDecision[];
    relatedEmployees: string[];
    version: number;
    versions: number;
}

// ============================================================================
// Feature 7 — Organizational Intelligence Engine
// ============================================================================

export type IntelligenceKind =
    | "cross-domain"
    | "health"
    | "architecture"
    | "workforce"
    | "knowledge"
    | "decision"
    | "operational"
    | "strategic"
    | "executive"
    | "predictive"
    | "recommendation"
    | "event";

export type IntelligencePriority = "critical" | "high" | "medium" | "info";

export interface IntelligenceEvidenceItem {
    source: string;
    excerpt: string;
    type: string;
    confidence: number;
}

export interface IntelligenceInsight {
    id: string;
    kind: IntelligenceKind;
    title: string;
    summary: string;
    detail: string;
    confidence: number;
    priority: IntelligencePriority;
    evidence: IntelligenceEvidenceItem[];
    affectedSystems: string[];
    relatedDecisions: string[];
    relatedDocs: string[];
    recommendation: string;
    action: string;
    source: string;
    trigger: string;
    status: "active" | "dismissed";
    createdAt: string;
}

export interface IntelligenceWorkflowStep {
    agentId: string;
    agentName: string;
    role: string;
    service: string;
    input: string;
    status: "pending" | "running" | "done";
    confidence?: number;
    finding?: string;
    durationMs?: number;
    evidence: string[];
}

export interface IntelligenceWorkflow {
    query: string;
    intent: string;
    topic: string;
    priority: "critical" | "high" | "medium" | "low";
    steps: IntelligenceWorkflowStep[];
    parallelBranches: number;
    estimatedMs: number;
    createdAt: string;
}

export interface OrchestratedResponse {
    query: string;
    intent: string;
    topic: string;
    priority: string;
    answer: string;
    summary: string;
    confidence: number;
    reasoning: string[];
    evidence: IntelligenceEvidenceItem[];
    affectedSystems: string[];
    relatedDecisions: string[];
    relatedDocs: string[];
    recommendedActions: string[];
    workflow: IntelligenceWorkflowStep[];
    conflictResolution: string[];
    insightId: string | null;
    createdAt: string;
}

export interface OrganizationHealthPillar {
    key: string;
    label: string;
    score: number;
    status: "healthy" | "watch" | "critical";
    drivers: string[];
    evidence: IntelligenceEvidenceItem[];
}

export interface OrganizationHealth {
    overall: number;
    status: "healthy" | "watch" | "critical";
    pillars: OrganizationHealthPillar[];
    generatedAt: string;
}

export interface PredictiveInsight {
    id: string;
    kind: string;
    title: string;
    summary: string;
    horizon: string;
    likelihood: number;
    impact: "high" | "medium" | "low";
    indicators: string[];
    evidence: IntelligenceEvidenceItem[];
    createdAt: string;
}

export interface IntelligenceRecommendation {
    id: string;
    title: string;
    detail: string;
    action: string;
    priority: "critical" | "high" | "medium";
    owner: string;
    eta: string;
    impact: string;
    sourceKind: string;
    evidence: string[];
    createdAt: string;
}

export interface EventAssessment {
    eventType: string;
    resource: string;
    detail: string;
    at: string;
    severity: "high" | "medium" | "low";
    intelligence: string;
    insightGenerated: boolean;
    insightIds: string[];
}

export interface ReasoningTraceStep {
    order: number;
    label: string;
    source: string;
    excerpt: string;
    confidence: number;
}

export interface ReasoningTrace {
    objectId: string;
    objectTitle: string;
    confidence: number;
    steps: ReasoningTraceStep[];
    summary: string;
    generatedAt: string;
}

export interface IntelligenceTimelinePoint {
    id: string;
    kind: string;
    title: string;
    confidence: number;
    priority: string;
    createdAt: string;
}

export interface InsightDetailResponse {
    insight: IntelligenceInsight;
    trace: ReasoningTrace;
}

export interface SweepResult {
    generated: number;
    total: number;
    skipped: number;
}

// ============================================================================
// Feature 8 — Executive Intelligence Dashboard
// ============================================================================

export type ExecutiveTier = "executive-critical" | "urgent" | "strategic" | "operational" | "informational";

export type ExecutiveKpiCategory =
    | "health"
    | "risk"
    | "workforce"
    | "knowledge"
    | "decisions"
    | "architecture"
    | "innovation"
    | "productivity";

export type ExecutiveStatus = "healthy" | "watch" | "critical";
export type ExecutiveTrendDirection = "improving" | "stable" | "declining";

export interface ExecutiveKpiSource {
    source: string;
    label: string;
    value: number;
    confidence: number;
}

export interface ExecutiveKpi {
    key: string;
    label: string;
    value: number;
    unit: "score" | "count" | "percent";
    category: ExecutiveKpiCategory;
    status: ExecutiveStatus;
    trend: ExecutiveTrendDirection;
    confidence: number;
    change: number;
    drillDown: string;
    sources: ExecutiveKpiSource[];
    summary: string;
}

export interface ExecutiveHighlight {
    id: string;
    type: "achievement" | "risk" | "opportunity" | "notice";
    title: string;
    detail: string;
    confidence: number;
    sourceFeature: number;
    linkedRoute: string;
}

export interface ExecutiveNarrative {
    opening: string;
    achievements: string[];
    risks: string[];
    focus: string[];
    closing: string;
}

export interface ExecutivePillar {
    key: string;
    label: string;
    score: number;
    status: ExecutiveStatus;
    drivers: string[];
    drillDown: string;
}

export interface ExecutiveOverview {
    generatedAt: string;
    overallHealth: number;
    overallStatus: ExecutiveStatus;
    pillars: ExecutivePillar[];
    kpis: ExecutiveKpi[];
    highlights: ExecutiveHighlight[];
    narrative: ExecutiveNarrative;
    confidence: number;
    sources: string[];
    snapshotId: string | null;
}

export interface ExecutiveForecastPoint {
    id: string;
    category: ExecutiveKpiCategory;
    horizon: "immediate" | "quarter" | "annual";
    title: string;
    summary: string;
    likelihood: number;
    impact: "high" | "medium" | "low";
    trend: ExecutiveTrendDirection;
    confidence: number;
    indicators: string[];
    evidence: string[];
    source: string;
}

export interface ExecutiveForecast {
    generatedAt: string;
    overallStability: number;
    points: ExecutiveForecastPoint[];
    byHorizon: Array<{ horizon: string; averageLikelihood: number; averageConfidence: number; averageImpact: number }>;
}

export interface ExecutiveTrendPoint {
    date: string;
    kpis: Record<string, number>;
}

export interface ExecutiveTrendDelta {
    key: string;
    label: string;
    change: number;
    direction: ExecutiveTrendDirection;
}

export interface ExecutiveTrend {
    generatedAt: string;
    series: ExecutiveTrendPoint[];
    deltas: ExecutiveTrendDelta[];
}

export interface ExecutiveSummaryFinding {
    id: string;
    kind: string;
    title: string;
    summary: string;
    confidence: number;
    priority: string;
    sourceFeature: number;
    evidence: string[];
    linkedRoute: string;
    createdAt: string;
}

export interface ExecutiveSummary {
    generatedAt: string;
    findings: ExecutiveSummaryFinding[];
    topFindings: ExecutiveSummaryFinding[];
    actionItems: string[];
}

export interface ExecutiveRecommendation {
    id: string;
    tier: ExecutiveTier;
    title: string;
    detail: string;
    justification: string;
    evidence: string[];
    confidence: number;
    orgImpact: "high" | "medium" | "low";
    effort: "low" | "medium" | "high";
    expectedBenefit: string;
    owner: string;
    eta: string;
    category: ExecutiveKpiCategory;
    source: string;
    knowledgeLinks: string[];
    drillDown: string;
    createdAt: string;
}

export interface ExecutiveBriefingItem {
    title: string;
    detail: string;
    priority?: string;
}

export interface ExecutiveBriefingSection {
    id: string;
    title: string;
    content: string[];
    items: ExecutiveBriefingItem[];
}

export interface ExecutiveBriefingPlanItem {
    rank: number;
    title: string;
    tier: string;
    owner: string;
    eta: string;
}

export interface ExecutiveBriefing {
    period: string;
    title: string;
    generatedAt: string;
    summary: string;
    sections: ExecutiveBriefingSection[];
    confidence: number;
    businessImpact: string[];
    prioritizedPlan: ExecutiveBriefingPlanItem[];
}

export type ExecutiveReportFormat = "markdown" | "json" | "email";

export interface ExecutiveReport {
    id: string;
    period: string;
    title: string;
    generatedAt: string;
    format: ExecutiveReportFormat;
    summary: string;
    markdown: string;
    json: Record<string, unknown>;
}

export interface ExecutiveSnapshotView {
    id: string;
    overallHealth: number;
    status: string;
    confidence: number;
    kpis: Record<string, number>;
    trigger: string;
    createdAt: string;
}

// ============================================================================
// Feature 9 — Agent Task Intelligence Layer
// A shared integration layer that coordinates agent tasks across the eight ACE
// features. Tasks declare Source Checklists, validate evidence against EXISTING
// feature outputs, and expose readiness, search, evidence mapping, and export.
// ============================================================================

export type TaskFeature =
    | "org-brain"
    | "decisions"
    | "exit-sim"
    | "risk"
    | "mentor"
    | "docs"
    | "intelligence"
    | "executive"
    | "cross-feature";

export type TaskStatus = "pending" | "in_progress" | "awaiting_review" | "complete" | "blocked";

export type TaskReadiness =
    | "ready"
    | "waiting"
    | "blocked"
    | "failed"
    | "stale"
    | "missing-data"
    | "complete";

export type ChecklistValidationState =
    | "pending"
    | "validated"
    | "missing"
    | "inaccessible"
    | "stale"
    | "invalid"
    | "conflicting"
    | "needs-review";

export type TaskSourceType =
    | "brain-entity"
    | "decision"
    | "employee"
    | "team"
    | "repository"
    | "document"
    | "risk"
    | "simulation"
    | "timeline"
    | "ai-analysis"
    | "connector"
    | "workflow";

export type TaskDependencyType = "task" | "feature" | "evidence" | "graph-entity" | "agent-result" | "workflow-state";

export type TaskDependencyStatus = "ready" | "waiting" | "blocked" | "failed" | "stale" | "missing-data" | "complete";

export interface TaskChecklistItem {
    id: string;
    taskId: string;
    requirementName: string;
    description: string;
    sourceType: TaskSourceType;
    sourceRef: string;
    required: boolean;
    completed: boolean;
    validationState: ChecklistValidationState;
    missingData: boolean;
    freshness: number;
    confidence: number;
    owner: string;
    responsibleAgent: string;
    notes: string;
    upstreamDependency: string;
    order: number;
    createdAt: string;
    updatedAt: string;
}

export interface TaskDependency {
    id: string;
    taskId: string;
    dependencyType: TaskDependencyType;
    sourceType: string;
    sourceId: string;
    sourceLabel: string;
    status: TaskDependencyStatus;
    reason: string;
    createdAt: string;
    lastValidatedAt: string;
}

export interface TaskActivity {
    id: string;
    taskId: string;
    actor: string;
    action: string;
    detail: string;
    evidenceDelta: Record<string, unknown>;
    createdAt: string;
}

export interface TaskGeneratedSection {
    id: string;
    heading: string;
    body: string;
    sectionId: string;
    sources: string[];
}

export interface TaskSourceReference {
    sourceType: TaskSourceType;
    sourceRef: string;
    sourceLabel: string;
    confidence: number;
    feature: TaskFeature | string;
}

export interface TaskEvidenceMapping {
    sectionId: string;
    heading: string;
    sources: TaskSourceReference[];
}

export interface TaskCompletionIndicators {
    requiredTotal: number;
    requiredComplete: number;
    optionalTotal: number;
    optionalComplete: number;
    requiredPercentage: number;
    optionalPercentage: number;
    missingSourceCount: number;
    staleSourceCount: number;
    blockedDependencyCount: number;
    validationFailures: number;
}

export interface AgentTaskView {
    id: string;
    title: string;
    description: string;
    feature: TaskFeature;
    project: string;
    section: string;
    status: TaskStatus;
    readiness: TaskReadiness;
    owner: string;
    team: string;
    responsibleAgent: string;
    priority: string;
    createdBy: string;
    version: number;
    indicators: TaskCompletionIndicators;
    generatedSections: TaskGeneratedSection[];
    evidenceMappings: TaskEvidenceMapping[];
    sourcesUsed: TaskSourceReference[];
    notes: string;
    createdAt: string;
    updatedAt: string;
}

export interface TaskDetailView extends AgentTaskView {
    checklist: TaskChecklistItem[];
    dependencies: TaskDependency[];
    activities: TaskActivity[];
    exportCount: number;
}

export interface TaskExplorerFilters {
    feature?: string;
    status?: string;
    readiness?: string;
    owner?: string;
    responsibleAgent?: string;
    project?: string;
    section?: string;
    dependencyState?: string;
    missingData?: string;
    search?: string;
}

export interface TaskExplorerResponse {
    total: number;
    tasks: AgentTaskView[];
    counts: Record<string, number>;
    defaultView: TaskExplorerFilters;
}

export interface TaskFeatureChainEntry {
    feature: TaskFeature;
    label: string;
    tasks: number;
    ready: number;
    blocked: number;
    missingData: number;
    complete: number;
}

export interface TaskOverview {
    total: number;
    byFeature: Record<string, number>;
    byStatus: Record<string, number>;
    byReadiness: Record<string, number>;
    byAgent: Record<string, number>;
    missingDataTasks: number;
    blockedTasks: number;
    awaitingReview: number;
    complete: number;
    exportsGenerated: number;
    featureChain: TaskFeatureChainEntry[];
}

export interface TaskPreValidation {
    passed: boolean;
    missing: TaskChecklistItem[];
    failures: string[];
    blocked: boolean;
}

export interface TaskGenerateResult {
    task: AgentTaskView;
    preValidation: TaskPreValidation;
    executed: boolean;
    executedAgent?: string;
    sections: TaskGeneratedSection[];
}

export interface TaskExportView {
    id: string;
    taskId: string;
    format: "markdown" | "csv" | "html";
    exportedBy: string;
    content: string;
    createdAt: string;
}
