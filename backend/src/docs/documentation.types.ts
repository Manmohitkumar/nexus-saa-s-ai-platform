// Feature 6 — Autonomous Documentation Engine domain types.
// Every document is derived from the Organizational Digital Brain and
// versioned through the Documentation Evolution Pipeline.

export type DocKind =
    | 'architecture'
    | 'api'
    | 'database'
    | 'repository'
    | 'service'
    | 'infrastructure'
    | 'runbook'
    | 'onboarding'
    | 'team'
    | 'adr'
    | 'specification'
    | 'release-notes'
    | 'deployment-guide'
    | 'incident-report'
    | 'rca'
    | 'changelog'
    | 'business-process'
    | 'playbook'
    | 'knowledge-transfer'
    | 'executive-summary';

export type DocStatus = 'current' | 'draft' | 'stale' | 'missing';

export interface DocSection {
    heading: string;
    body?: string;
    bullets?: string[];
    code?: string;
    table?: { headers: string[]; rows: string[][] };
    evidence?: string[];
}

export interface DocCandidate {
    title: string;
    slug: string;
    kind: DocKind;
    summary: string;
    sourceType: string;
    sourceRef: string;
    relatedNode: string;
    owner: string;
    team: string;
    confidence: number;
    content: DocSection[];
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

export interface DocumentationDiffSection {
    heading: string;
    change: 'added' | 'removed' | 'changed' | 'unchanged';
    summary: string;
}

export interface DocumentationDiff {
    id: string;
    title: string;
    fromVersion: number;
    toVersion: number;
    added: number;
    removed: number;
    changed: number;
    sections: DocumentationDiffSection[];
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
    priority: 'critical' | 'high' | 'medium';
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
