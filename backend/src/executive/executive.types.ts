// ============================================================================
// Feature 8 — Executive Intelligence Dashboard domain types.
// Presentation/aggregation layer only: every value derives from Features 1-7
// signals with explicit source attribution, confidence, and drill-down links.
// ============================================================================

export type ExecutiveTier = 'executive-critical' | 'urgent' | 'strategic' | 'operational' | 'informational';

export type ExecutiveKpiCategory =
    | 'health'
    | 'risk'
    | 'workforce'
    | 'knowledge'
    | 'decisions'
    | 'architecture'
    | 'innovation'
    | 'productivity';

export type ExecutiveStatus = 'healthy' | 'watch' | 'critical';
export type ExecutiveTrendDirection = 'improving' | 'stable' | 'declining';

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
    unit: 'score' | 'count' | 'percent';
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
    type: 'achievement' | 'risk' | 'opportunity' | 'notice';
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
    horizon: 'immediate' | 'quarter' | 'annual';
    title: string;
    summary: string;
    likelihood: number;
    impact: 'high' | 'medium' | 'low';
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
    orgImpact: 'high' | 'medium' | 'low';
    effort: 'low' | 'medium' | 'high';
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

export type ExecutiveReportFormat = 'markdown' | 'json' | 'email';

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

// Raw signal bundle gathered from Features 1-7 by the aggregator.
export interface ExecutiveRawSignals {
    orgHealth: import('../intelligence/intelligence.types').OrganizationHealth | null;
    insights: import('../intelligence/intelligence.types').IntelligenceInsight[];
    predictions: import('../intelligence/intelligence.types').PredictiveInsight[];
    intelligenceRecommendations: import('../intelligence/intelligence.types').IntelligenceRecommendation[];
    riskHealth: import('../risk/risk.types').RiskHealthSnapshot | null;
    riskPredictions: import('../risk/risk.types').RiskPrediction[];
    riskRecommendations: import('../risk/risk.types').RiskRecommendation[];
    riskTimeline: import('../risk/risk.types').RiskTimelinePoint[];
    resilience: import('../workforce/resilience.service').ResilienceSnapshot | null;
    analytics: import('../decisions/decision.types').DecisionAnalytics | null;
    docHealth: import('../docs/documentation.types').DocumentationHealth | null;
    docRecommendations: import('../docs/documentation.types').DocumentationRecommendation[];
    agentCount: number;
    gatheredAt: string;
}
