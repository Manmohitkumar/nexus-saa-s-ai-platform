export type RiskBand = 'low' | 'medium' | 'high' | 'critical';

/**
 * A single node's risk profile. Attributes are 0-100 "health" metrics
 * (100 = healthy) except `overallRisk` which is 0-100 where higher = riskier.
 */
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
    band: RiskBand;
    flagTotal: number;
    flagUndocumented: number;
    contributingFactors: string[];
}

export interface RiskGridCell {
    name: string;
    risk: RiskBand | 'safe';
    coverage: number;
    owner: string | null;
    nodeId: string | null;
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
    severity: 'info' | 'warning' | 'critical';
    detail: string;
    evidence: string[];
    contributingFactors: string[];
    confidence: number;
    trend: 'increasing' | 'stable' | 'decreasing';
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
    impact: 'medium' | 'high' | 'critical';
    priority: 'medium' | 'high' | 'critical';
    linkedTarget: string;
    evidence: string[];
}
