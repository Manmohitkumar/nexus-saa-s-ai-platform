export type DecisionStatus =
    | 'identified'
    | 'discussed'
    | 'approved'
    | 'implemented'
    | 'validated'
    | 'superseded';

export type TimelineMode =
    | 'chronological'
    | 'dependency'
    | 'architecture'
    | 'organization'
    | 'repository'
    | 'service';

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
    status: 'accepted' | 'rejected' | 'considered';
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
    type: 'milestone' | 'relation' | 'evidence';
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
    direction: 'depends_on' | 'depends_on_me';
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
