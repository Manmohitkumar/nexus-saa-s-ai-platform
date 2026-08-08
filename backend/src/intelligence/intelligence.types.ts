export type IntelligenceKind =
    | 'cross-domain'
    | 'health'
    | 'architecture'
    | 'workforce'
    | 'knowledge'
    | 'decision'
    | 'operational'
    | 'strategic'
    | 'executive'
    | 'predictive'
    | 'recommendation'
    | 'event';

export type IntelligencePriority = 'critical' | 'high' | 'medium' | 'info';

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
    status: 'active' | 'dismissed';
    createdAt: string;
}

export interface IntelligenceWorkflowStep {
    agentId: string;
    agentName: string;
    role: string;
    service: string;
    input: string;
    status: 'pending' | 'running' | 'done';
    confidence?: number;
    finding?: string;
    durationMs?: number;
    evidence: string[];
}

export interface IntelligenceWorkflow {
    query: string;
    intent: string;
    topic: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
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
    status: 'healthy' | 'watch' | 'critical';
    drivers: string[];
    evidence: IntelligenceEvidenceItem[];
}

export interface OrganizationHealth {
    overall: number;
    status: 'healthy' | 'watch' | 'critical';
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
    impact: 'high' | 'medium' | 'low';
    indicators: string[];
    evidence: IntelligenceEvidenceItem[];
    createdAt: string;
}

export interface IntelligenceRecommendation {
    id: string;
    title: string;
    detail: string;
    action: string;
    priority: 'critical' | 'high' | 'medium';
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
    severity: 'high' | 'medium' | 'low';
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
