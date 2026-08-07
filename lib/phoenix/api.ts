import type {
    ArchitectureWorkflow,
    BrainGraphView,
    DecisionTimelineEvent,
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
} from "./types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

async function apiGet<T>(path: string): Promise<T> {
    const response = await fetch(`${BACKEND_URL}${path}`);
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

export function fetchDecisionTimeline() {
    return apiGet<DecisionTimelineEvent[]>("/dashboard/timeline");
}

export function fetchDocumentationState() {
    return apiGet<DocumentationItem[]>("/docs/state");
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
