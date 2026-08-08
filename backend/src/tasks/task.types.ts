// Feature 9 — Agent Task Intelligence Layer domain types.
// A shared integration layer: tasks declare Source Checklists, validate
// evidence against the existing ACE features, and expose readiness, search,
// and export without owning any intelligence itself.

export type TaskFeature =
    | 'org-brain'
    | 'decisions'
    | 'exit-sim'
    | 'risk'
    | 'mentor'
    | 'docs'
    | 'intelligence'
    | 'executive'
    | 'cross-feature';

export type TaskStatus = 'pending' | 'in_progress' | 'awaiting_review' | 'complete' | 'blocked';

export type TaskReadiness =
    | 'ready'
    | 'waiting'
    | 'blocked'
    | 'failed'
    | 'stale'
    | 'missing-data'
    | 'complete';

export type ChecklistValidationState =
    | 'pending'
    | 'validated'
    | 'missing'
    | 'inaccessible'
    | 'stale'
    | 'invalid'
    | 'conflicting'
    | 'needs-review';

export type SourceType =
    | 'brain-entity'
    | 'decision'
    | 'employee'
    | 'team'
    | 'repository'
    | 'document'
    | 'risk'
    | 'simulation'
    | 'timeline'
    | 'ai-analysis'
    | 'connector'
    | 'workflow';

export type DependencyType = 'task' | 'feature' | 'evidence' | 'graph-entity' | 'agent-result' | 'workflow-state';

export type DependencyStatus = 'ready' | 'waiting' | 'blocked' | 'failed' | 'stale' | 'missing-data' | 'complete';

export interface TaskChecklistItem {
    id: string;
    taskId: string;
    requirementName: string;
    description: string;
    sourceType: SourceType;
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
    dependencyType: DependencyType;
    sourceType: string;
    sourceId: string;
    sourceLabel: string;
    status: DependencyStatus;
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
    sources: string[]; // source labels used to generate this section
}

export interface TaskEvidenceMapping {
    sectionId: string;
    heading: string;
    sources: TaskSourceReference[];
}

export interface TaskSourceReference {
    sourceType: SourceType;
    sourceRef: string;
    sourceLabel: string;
    confidence: number;
    feature: TaskFeature | string;
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
    missingData?: string; // 'true' | 'false'
    search?: string;
}

export interface TaskExplorerResponse {
    total: number;
    tasks: AgentTaskView[];
    counts: Record<string, number>;
    defaultView: TaskExplorerFilters;
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
    featureChain: Array<{
        feature: TaskFeature;
        label: string;
        tasks: number;
        ready: number;
        blocked: number;
        missingData: number;
        complete: number;
    }>;
}

export interface TaskGenerateResult {
    task: AgentTaskView;
    preValidation: {
        passed: boolean;
        missing: TaskChecklistItem[];
        failures: string[];
        blocked: boolean;
    };
    executed: boolean;
    executedAgent?: string;
    sections: TaskGeneratedSection[];
}

export interface TaskSourceValidationContext {
    feature: TaskFeature | string;
    sourceType: SourceType;
    sourceRef: string;
}
