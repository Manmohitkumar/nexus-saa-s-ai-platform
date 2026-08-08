import type {
    ArchitectureWorkflow,
    AgentDefinition,
    AgentRunReport,
    AgentRunResult,
    BrainGraphNodeDetail,
    BrainGraphView,
    BusEvent,
    DecisionTimelineEvent,
    DecisionTimelineResponse,
    DecisionListItem,
    DecisionDetail,
    TimelineView,
    DecisionAnalytics,
    DecisionAnswer,
    DecisionReplay,
    DecisionCorrelation,
    DocumentContent,
    DocumentationItem,
    ExecutiveBrief,
    ExitSimulationProfile,
    ExitSimulationRecommendation,
    ExitSimulationScenario,
    HeatmapCell,
    IntelligenceInsights,
    IntelligenceOverview,
    IntelligenceReasoningSnapshot,
    LearningPath,
    MentorPrompt,
    FeatureFlag,
    FeatureFlagSummary,
    FeatureRiskItem,
    FeatureDocsState,
    WorkforceEmployee,
    WorkforceMetricDefinition,
    EmployeeImpact,
    ResilienceSnapshot,
    SimulationRunResult,
    SimulationRunListItem,
    SimulationRunDetail,
    RiskIntelligenceView,
    RiskNodeDetail,
    RiskPrediction,
    RiskTimelinePoint,
    RiskHealthSnapshot,
    RiskRecommendation,
    MentorCapability,
    MentorConversationSummary,
    MentorConversationDetail,
    MentorAnswer,
    DocumentationView,
    DocumentationDetail,
    DocumentationVersionView,
    DocumentationDiff,
    DocumentationHealth,
    HealthTimelinePoint,
    DocumentationRecommendation,
    EvolutionRun,
    DocumentationImpact,
    OrchestratedResponse,
    IntelligenceWorkflow,
    IntelligenceInsight,
    InsightDetailResponse,
    SweepResult,
    OrganizationHealth,
    PredictiveInsight,
    IntelligenceRecommendation,
    EventAssessment,
    IntelligenceTimelinePoint,
    ReasoningTrace,
    ExecutiveOverview,
    ExecutiveKpi,
    ExecutiveSummary,
    ExecutiveForecast,
    ExecutiveTrend,
    ExecutiveRecommendation,
    ExecutiveBriefing,
    ExecutiveSnapshotView,
    ExecutiveReport,
    ExecutiveReportFormat,
    AgentTaskView,
    TaskDetailView,
    TaskExplorerFilters,
    TaskExplorerResponse,
    TaskExportView,
    ProjectExportView,
    TaskGenerateResult,
    TaskOverview,
} from "./types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

async function apiGet<T>(path: string): Promise<T> {
    const token = typeof window !== "undefined" ? localStorage.getItem("phoenix_token") : null;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${BACKEND_URL}${path}`, { headers });
    if (!response.ok) {
        throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

export function fetchExecutiveBrief() {
    return apiGet<ExecutiveBrief>("/dashboard/brief");
}

export function fetchBrainGraphView() {
    return apiGet<BrainGraphView>("/dashboard/graph");
}

export function fetchBrainGraphNode(id: string) {
    return apiGet<BrainGraphNodeDetail>(`/dashboard/graph/node/${encodeURIComponent(id)}`);
}

export function fetchRecentEvents() {
    return apiGet<{ total: number; events: BusEvent[] }>("/events");
}

export function fetchDecisionTimeline(query: string) {
    return apiGet<DecisionTimelineResponse>(`/dashboard/timeline?query=${encodeURIComponent(query)}`);
}

export function fetchDocumentationState() {
    return apiGet<DocumentationItem[]>("/docs/state");
}

export function fetchDocumentContent(name: string) {
    return apiGet<DocumentContent>(`/docs/content?name=${encodeURIComponent(name)}`);
}

export function fetchArchitectureWorkflows() {
    return apiGet<ArchitectureWorkflow[]>("/docs/workflows");
}

export function fetchExitSimulationProfiles() {
    return apiGet<ExitSimulationProfile[]>("/exit-sim/profiles");
}

export function fetchExitSimulationScenario() {
    return apiGet<ExitSimulationScenario>("/exit-sim/scenario");
}

export function fetchExitSimulationRecommendations() {
    return apiGet<ExitSimulationRecommendation[]>("/exit-sim/recommendations");
}

export function fetchRiskHeatmap() {
    return apiGet<HeatmapCell[][]>("/risk/heatmap");
}

export function fetchMentorPrompts() {
    return apiGet<MentorPrompt[]>("/mentor/prompts");
}

export function fetchMentorLearningPaths() {
    return apiGet<LearningPath[]>("/mentor/learning-paths");
}

export function fetchIntelligenceOverview() {
    return apiGet<IntelligenceOverview>("/intelligence/overview");
}

export function fetchIntelligenceInsights() {
    return apiGet<IntelligenceInsights>("/intelligence/insights");
}

export function fetchReasoningSnapshot(query: string) {
    return apiGet<IntelligenceReasoningSnapshot>(`/intelligence/reason?query=${encodeURIComponent(query)}`);
}

export function fetchFeatureSummary() {
    return apiGet<FeatureFlagSummary>("/features/summary");
}

export function fetchFeatureFlags(limit?: number) {
    return apiGet<FeatureFlag[]>(`/features/flags${limit ? `?limit=${limit}` : ""}`);
}

export function searchFeatureFlags(query: string) {
    return apiGet<FeatureFlag[]>(`/features/search?q=${encodeURIComponent(query)}`);
}

export function fetchFeatureRisk() {
    return apiGet<FeatureRiskItem[]>("/features/risk");
}

export function fetchFeatureDocs() {
    return apiGet<FeatureDocsState>("/features/docs");
}

export function fetchAgents() {
    return apiGet<AgentDefinition[]>("/agents");
}

export function runAllAgents(query: string) {
    return apiGet<AgentRunReport>(`/agents/run?query=${encodeURIComponent(query)}`);
}

export function runAgent(agentId: string, query: string) {
    return apiGet<AgentRunResult>(`/agents/${agentId}/run?query=${encodeURIComponent(query)}`);
}

export function fetchAgentMemory() {
    return apiGet<AgentMemoryEntry[]>("/agents/memory");
}

export interface AgentMemoryEntry {
    agentId: string;
    role: string;
    content: string;
    sources: string[];
    confidence: number;
    key: string;
    createdAt: string;
}

export interface TimelineFilters {
    domain?: string;
    status?: string;
    team?: string;
    query?: string;
}

function queryString(params: object): string {
    const parts = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    return parts.length ? `?${parts.join("&")}` : "";
}

export function fetchDecisionList(filters: TimelineFilters = {}) {
    return apiGet<DecisionListItem[]>("/decisions" + queryString(filters));
}

export function fetchDecisionDetail(id: string) {
    return apiGet<DecisionDetail>(`/decisions/${encodeURIComponent(id)}`);
}

export function fetchDecisionTimeline2(mode: string, filters: TimelineFilters = {}) {
    return apiGet<TimelineView>("/decisions/timeline" + queryString({ mode, ...filters }));
}

export function fetchDecisionAnalytics() {
    return apiGet<DecisionAnalytics>("/decisions/analytics");
}

export function fetchDecisionAnswer(question: string) {
    return apiGet<DecisionAnswer>(`/decisions/answer?question=${encodeURIComponent(question)}`);
}

export function reconstructDecision(query: string) {
    return apiPost<DecisionDetail>(`/decisions/reconstruct?query=${encodeURIComponent(query)}`);
}

export function fetchDecisionReplay(id: string) {
    return apiGet<DecisionReplay>(`/decisions/${encodeURIComponent(id)}/replay`);
}

export function fetchDecisionCorrelations(id: string) {
    return apiGet<DecisionCorrelation>(`/decisions/${encodeURIComponent(id)}/correlations`);
}

async function apiPost<T>(path: string): Promise<T> {
    const token = typeof window !== "undefined" ? localStorage.getItem("phoenix_token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${BACKEND_URL}${path}`, { method: "POST", headers });
    if (!response.ok) {
        throw new Error(`Failed to POST ${path}: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

async function apiPostBody<T>(path: string, body: unknown): Promise<T> {
    const token = typeof window !== "undefined" ? localStorage.getItem("phoenix_token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${BACKEND_URL}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
    if (!response.ok) {
        throw new Error(`Failed to POST ${path}: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

export function fetchWorkforceEmployees() {
    return apiGet<WorkforceEmployee[]>("/workforce/employees");
}

export function fetchWorkforceEmployee(id: string) {
    return apiGet<WorkforceEmployee>(`/workforce/employees/${encodeURIComponent(id)}`);
}

export function fetchEmployeeDependencies(id: string) {
    return apiGet<EmployeeImpact>(`/workforce/employees/${encodeURIComponent(id)}/dependencies`);
}

export function fetchWorkforceMetrics() {
    return apiGet<WorkforceMetricDefinition[]>("/workforce/metrics");
}

export function fetchWorkforceResilience() {
    return apiGet<ResilienceSnapshot>("/workforce/resilience");
}

export function runExitSimulation(input: { employeeIds?: string[]; team?: string; system?: string; domain?: string; label?: string }) {
    return apiPostBody<SimulationRunResult>("/workforce/simulate", input);
}

export function fetchSimulationHistory() {
    return apiGet<SimulationRunListItem[]>("/workforce/simulations");
}

export function fetchSimulationRun(id: string) {
    return apiGet<SimulationRunDetail>(`/workforce/simulations/${encodeURIComponent(id)}`);
}

export function fetchRiskIntelligence(mode = "organization", team?: string) {
    return apiGet<RiskIntelligenceView>(`/risk/nodes${queryString({ mode, team })}`);
}

export function fetchRiskNodeDetail(id: string) {
    return apiGet<RiskNodeDetail>(`/risk/nodes/${encodeURIComponent(id)}`);
}

export function fetchRiskPredictions() {
    return apiGet<RiskPrediction[]>("/risk/predictions");
}

export function fetchRiskTimeline() {
    return apiGet<RiskTimelinePoint[]>("/risk/timeline");
}

export function fetchRiskHealth() {
    return apiGet<RiskHealthSnapshot>("/risk/health");
}

export function fetchRiskRecommendations() {
    return apiGet<RiskRecommendation[]>("/risk/recommendations");
}

export function fetchMentorCapabilities() {
    return apiGet<MentorCapability[]>("/mentor/capabilities");
}

export function fetchMentorConversations() {
    return apiGet<MentorConversationSummary[]>("/mentor/conversations");
}

export function fetchMentorConversation(id: string) {
    return apiGet<MentorConversationDetail>(`/mentor/conversations/${encodeURIComponent(id)}`);
}

export function askMentor(query: string, conversationId?: string) {
    return apiPostBody<MentorAnswer>("/mentor/ask", { query, conversationId });
}

// ============================================================================
// Feature 6 — Autonomous Documentation Engine fetchers
// ============================================================================

export interface DocumentationListFilters {
    kind?: string;
    status?: string;
    search?: string;
}

export function fetchDocumentationList(filters: DocumentationListFilters = {}) {
    return apiGet<DocumentationView[]>("/docs" + queryString(filters));
}

export function fetchDocumentationDetail(id: string) {
    return apiGet<DocumentationDetail>(`/docs/${encodeURIComponent(id)}`);
}

export function fetchDocumentationVersions(id: string) {
    return apiGet<DocumentationVersionView[]>(`/docs/${encodeURIComponent(id)}/versions`);
}

export function fetchDocumentationDiff(id: string, from: number, to: number) {
    return apiGet<DocumentationDiff>(`/docs/${encodeURIComponent(id)}/diff?from=${from}&to=${to}`);
}

export function fetchDocumentationHealth() {
    return apiGet<DocumentationHealth>("/docs/health");
}

export function fetchDocumentationHealthTimeline() {
    return apiGet<HealthTimelinePoint[]>("/docs/health/timeline");
}

export function fetchDocumentationRecommendations() {
    return apiGet<DocumentationRecommendation[]>("/docs/recommendations");
}

export function fetchEvolutionHistory() {
    return apiGet<EvolutionRun[]>("/docs/evolution");
}

export function triggerDocumentationEvolution(trigger = "manual", resource = "", detail = "") {
    return apiPostBody<EvolutionRun>("/docs/evolve", { trigger, resource, detail });
}

export function regenerateDocument(id: string) {
    return apiPost<EvolutionRun>(`/docs/${encodeURIComponent(id)}/regenerate`);
}

export function rollbackDocument(id: string, to: number) {
    return apiPost<{ version: number }>(`/docs/${encodeURIComponent(id)}/rollback?to=${to}`);
}

export function fetchDocumentationImpact(id: string) {
    return apiGet<DocumentationImpact>(`/docs/impact/${encodeURIComponent(id)}`);
}

// ============================================================================
// Feature 7 — Organizational Intelligence Engine fetchers
// ============================================================================

export function askIntelligence(query: string) {
    return apiPostBody<OrchestratedResponse>("/intelligence/ask", { query });
}

export function planIntelligence(query: string) {
    return apiPostBody<IntelligenceWorkflow>("/intelligence/plan", { query });
}

export function fetchIntelligenceCatalog(kind?: string) {
    return apiGet<IntelligenceInsight[]>(`/intelligence/insight${kind ? `?kind=${encodeURIComponent(kind)}` : ""}`);
}

export function fetchIntelligenceInsight(id: string) {
    return apiGet<InsightDetailResponse>(`/intelligence/insight/${encodeURIComponent(id)}`);
}

export function runIntelligenceSweep() {
    return apiPost<SweepResult>("/intelligence/sweep");
}

export function fetchOrganizationHealth() {
    return apiGet<OrganizationHealth>("/intelligence/health");
}

export function fetchIntelligenceArchitecture() {
    return apiGet<IntelligenceInsight[]>("/intelligence/architecture");
}

export function fetchIntelligencePredictions() {
    return apiGet<PredictiveInsight[]>("/intelligence/predictions");
}

export function fetchIntelligenceRecommendations() {
    return apiGet<IntelligenceRecommendation[]>("/intelligence/recommendations");
}

export function fetchIntelligenceEvents() {
    return apiGet<EventAssessment[]>("/intelligence/events");
}

export function fetchIntelligenceTimeline() {
    return apiGet<IntelligenceTimelinePoint[]>("/intelligence/timeline");
}

export function fetchIntelligenceExplain(id: string) {
    return apiGet<ReasoningTrace>(`/intelligence/explain/${encodeURIComponent(id)}`);
}

// ============================================================================
// Feature 8 — Executive Intelligence Dashboard fetchers
// ============================================================================

export function fetchExecutiveOverview() {
    return apiGet<ExecutiveOverview>("/executive/overview");
}

export function fetchExecutiveKpis() {
    return apiGet<ExecutiveKpi[]>("/executive/kpis");
}

export function fetchExecutiveSummary() {
    return apiGet<ExecutiveSummary>("/executive/summary");
}

export function fetchExecutiveForecast() {
    return apiGet<ExecutiveForecast>("/executive/forecast");
}

export function fetchExecutiveTrends() {
    return apiGet<ExecutiveTrend>("/executive/trends");
}

export function fetchExecutiveRecommendations() {
    return apiGet<ExecutiveRecommendation[]>("/executive/recommendations");
}

export function fetchExecutiveBriefing(period = "weekly") {
    return apiGet<ExecutiveBriefing>(`/executive/briefing?period=${encodeURIComponent(period)}`);
}

export function refreshExecutive(trigger = "manual") {
    return apiPostBody<ExecutiveOverview>("/executive/refresh", { trigger });
}

export function fetchExecutiveSnapshots(limit = 30) {
    return apiGet<ExecutiveSnapshotView[]>(`/executive/snapshots?limit=${limit}`);
}

export function fetchExecutiveEvents() {
    return apiGet<BusEvent[]>("/executive/events");
}

export function fetchExecutiveReports() {
    return apiGet<ExecutiveReport[]>("/executive/reports");
}

export function generateExecutiveReport(period = "weekly", format: ExecutiveReportFormat = "markdown") {
    return apiPostBody<ExecutiveReport>("/executive/reports/generate", { period, format });
}

export function fetchExecutiveReport(id: string) {
    return apiGet<ExecutiveReport>(`/executive/reports/${encodeURIComponent(id)}`);
}

// ============================================================================
// Feature 9 — Agent Task Intelligence Layer fetchers
// ============================================================================

export function fetchTasks(filters: TaskExplorerFilters = {}) {
    return apiGet<TaskExplorerResponse>("/tasks" + queryString(filters));
}

export function fetchTaskOverview() {
    return apiGet<TaskOverview>("/tasks/overview");
}

export function fetchTaskDetail(id: string) {
    return apiGet<TaskDetailView>(`/tasks/${encodeURIComponent(id)}`);
}

export function fetchTaskEvents() {
    return apiGet<BusEvent[]>("/tasks/events");
}

export function createTask(input: {
    title: string;
    description?: string;
    feature: string;
    project?: string;
    owner?: string;
    team?: string;
    responsibleAgent?: string;
    priority?: string;
    notes?: string;
    createdBy?: string;
}) {
    return apiPostBody<TaskDetailView>("/tasks", input);
}

export function generateTask(id: string, actor = "a13") {
    return apiPostBody<TaskGenerateResult>(`/tasks/${encodeURIComponent(id)}/generate`, { actor });
}

export function validateTask(id: string, trigger = "manual", actor = "system") {
    return apiPostBody<TaskDetailView>(`/tasks/${encodeURIComponent(id)}/validate`, { trigger, actor });
}

export function toggleChecklistItem(id: string, itemId: string, completed: boolean, actor = "human") {
    return apiPostBody<TaskDetailView>(`/tasks/${encodeURIComponent(id)}/checklist/${encodeURIComponent(itemId)}`, { completed, actor });
}

export function addTaskDependency(id: string, dep: { dependencyType: string; sourceType: string; sourceId: string; sourceLabel: string }, actor = "system") {
    return apiPostBody<TaskDetailView>(`/tasks/${encodeURIComponent(id)}/dependencies`, { ...dep, actor });
}

export function removeTaskDependency(id: string, dependencyId: string) {
    return apiDelete<TaskDetailView>(`/tasks/${encodeURIComponent(id)}/dependencies/${encodeURIComponent(dependencyId)}`);
}

export function updateTaskStatus(id: string, status: string, actor = "system") {
    return apiPostBody<TaskDetailView>(`/tasks/${encodeURIComponent(id)}/status`, { status, actor });
}

export function assignTask(id: string, owner: string, responsibleAgent?: string, actor = "system") {
    return apiPostBody<TaskDetailView>(`/tasks/${encodeURIComponent(id)}/assign`, { owner, responsibleAgent, actor });
}

export function fetchTaskProjects() {
    return apiGet<Array<{ project: string; count: number }>>("/tasks/projects");
}

export function exportProjectTasks(project: string, format: "markdown" | "csv" | "html" | "json", exportedBy = "system") {
    return apiPostBody<ProjectExportView>("/tasks/exports/project", { project, format, exportedBy });
}

export function fetchProjectExports(project: string) {
    return apiGet<ProjectExportView[]>(`/tasks/projects/${encodeURIComponent(project)}/exports`);
}

export function fetchTaskExports(id: string) {
    return apiGet<TaskExportView[]>(`/tasks/${encodeURIComponent(id)}/exports`);
}

export function exportTask(id: string, format: "markdown" | "csv" | "html", exportedBy = "system") {
    return apiPostBody<TaskExportView>(`/tasks/${encodeURIComponent(id)}/exports`, { format, exportedBy });
}

export function fetchTaskExport(id: string) {
    return apiGet<TaskExportView>(`/tasks/exports/${encodeURIComponent(id)}`);
}

async function apiDelete<T>(path: string): Promise<T> {
    const token = typeof window !== "undefined" ? localStorage.getItem("phoenix_token") : null;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${BACKEND_URL}${path}`, { method: "DELETE", headers });
    if (!response.ok) {
        throw new Error(`Failed to DELETE ${path}: ${response.status} ${response.statusText}`);
    }
    return response.json();
}
