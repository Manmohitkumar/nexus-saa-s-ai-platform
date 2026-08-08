import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkforceDataService } from '../workforce/workforce.data.service';
import {
    ChecklistValidationState,
    SourceType,
    TaskChecklistItem,
    TaskFeature,
    TaskSourceValidationContext,
} from './task.types';

export interface ChecklistItemDefinition {
    requirementName: string;
    description: string;
    sourceType: SourceType;
    sourceRef?: string;
    required?: boolean;
    upstreamDependency: string;
    order?: number;
}

export interface ChecklistSourceCheck {
    exists: boolean;
    accessible: boolean;
    freshness: number;
    confidence: number;
    label: string;
    state: ChecklistValidationState;
    notes?: string;
}

const FEATURE_LABELS: Record<string, string> = {
    'org-brain': 'Organizational Digital Brain',
    decisions: 'Decision Time Machine',
    'exit-sim': 'Employee Exit Simulation',
    risk: 'Knowledge Risk Heatmap',
    mentor: 'AI Mentor',
    docs: 'Autonomous Documentation Engine',
    intelligence: 'Organizational Intelligence Engine',
    executive: 'Executive Intelligence Dashboard',
};

/**
 * Source Checklist service for the Agent Task Intelligence Layer. Every task
 * declares the required sources + evidence it needs; checklist items reference
 * EXISTING Project Phoenix entities/features (never duplicate representations)
 * and are validated against the real ACE feature data on demand.
 */
@Injectable()
export class TaskChecklistService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly workforce: WorkforceDataService,
    ) {}

    // ------------------------------------------------------------------
    // Checklist template per ACE feature (dependencies are declared here)
    // ------------------------------------------------------------------

    definitionsFor(feature: TaskFeature | string): ChecklistItemDefinition[] {
        const base: ChecklistItemDefinition[] = [
            {
                requirementName: 'Brain context',
                description: 'Organizational brain entities, relationships, and document/repository knowledge are available.',
                sourceType: 'brain-entity',
                required: true,
                upstreamDependency: 'org-brain',
                order: 0,
            },
        ];

        switch (feature) {
            case 'org-brain':
                return [
                    ...base,
                    { requirementName: 'Graph entities', description: 'Knowledge graph nodes and relationships exist.', sourceType: 'brain-entity', required: true, upstreamDependency: 'org-brain', order: 1 },
                    { requirementName: 'Repositories', description: 'Repository knowledge nodes are indexed.', sourceType: 'repository', required: false, upstreamDependency: 'org-brain', order: 2 },
                ];
            case 'decisions':
                return [
                    ...base,
                    { requirementName: 'Decision evidence', description: 'Historical decision records with evidence chain and participants exist.', sourceType: 'decision', required: true, upstreamDependency: 'decisions', order: 1 },
                    { requirementName: 'Decision timeline', description: 'Decision lifecycle events are reconstructable.', sourceType: 'timeline', required: false, upstreamDependency: 'decisions', order: 2 },
                ];
            case 'exit-sim':
                return [
                    ...base,
                    { requirementName: 'Employee ownership', description: 'Employee ownership and knowledge concentration are available.', sourceType: 'employee', required: true, upstreamDependency: 'exit-sim', order: 1 },
                    { requirementName: 'Knowledge dependencies', description: 'Repository contributions, project dependencies, and resilience info exist.', sourceType: 'workflow', required: true, upstreamDependency: 'exit-sim', order: 2 },
                    { requirementName: 'Simulation history', description: 'Prior exit simulation runs are available for comparison.', sourceType: 'simulation', required: false, upstreamDependency: 'exit-sim', order: 3 },
                ];
            case 'risk':
                return [
                    ...base,
                    { requirementName: 'Risk evidence', description: 'Risk scores, documentation health, and ownership concentration exist.', sourceType: 'risk', required: true, upstreamDependency: 'risk', order: 1 },
                    { requirementName: 'Historical risk trends', description: 'Risk snapshot series for trend analysis exist.', sourceType: 'timeline', required: true, upstreamDependency: 'risk', order: 2 },
                ];
            case 'mentor':
                return [
                    ...base,
                    { requirementName: 'Mentor capabilities', description: 'Mentor capability catalog is available to ground answers.', sourceType: 'ai-analysis', required: true, upstreamDependency: 'mentor', order: 1 },
                    { requirementName: 'Learner context', description: 'Employee persona, team, and expertise are available.', sourceType: 'employee', required: true, upstreamDependency: 'mentor', order: 2 },
                    { requirementName: 'Mentor conversations', description: 'Prior mentor sessions exist to reuse evidence.', sourceType: 'connector', required: false, upstreamDependency: 'mentor', order: 3 },
                ];
            case 'docs':
                return [
                    ...base,
                    { requirementName: 'Documentation registry', description: 'Documentation health, quality, and version history exist.', sourceType: 'document', required: true, upstreamDependency: 'docs', order: 1 },
                    { requirementName: 'Documentation coverage', description: 'Coverage of services/repos/decisions by docs is measurable.', sourceType: 'document', required: true, upstreamDependency: 'docs', order: 2 },
                ];
            case 'intelligence':
                return [
                    ...base,
                    { requirementName: 'Cross-feature evidence', description: 'Evidence from multiple ACE features is aggregatable.', sourceType: 'ai-analysis', required: true, upstreamDependency: 'intelligence', order: 1 },
                    { requirementName: 'Insight catalog', description: 'Persisted organizational intelligence insights exist.', sourceType: 'ai-analysis', required: true, upstreamDependency: 'intelligence', order: 2 },
                    { requirementName: 'Predictive outlook', description: 'Predictive intelligence is available.', sourceType: 'timeline', required: false, upstreamDependency: 'intelligence', order: 3 },
                ];
            case 'executive':
                return [
                    ...base,
                    { requirementName: 'Risk assessment', description: 'Risk Intelligence output is available (not recalculated).', sourceType: 'risk', required: true, upstreamDependency: 'risk', order: 1 },
                    { requirementName: 'Organizational health', description: 'Cross-domain health from the Intelligence Engine.', sourceType: 'ai-analysis', required: true, upstreamDependency: 'intelligence', order: 2 },
                    { requirementName: 'Decision analytics', description: 'Decision Time Machine analytics are available.', sourceType: 'decision', required: true, upstreamDependency: 'decisions', order: 3 },
                    { requirementName: 'Workforce resilience', description: 'Workforce resilience snapshot is available.', sourceType: 'employee', required: true, upstreamDependency: 'exit-sim', order: 4 },
                    { requirementName: 'Documentation health', description: 'Documentation Engine health is available.', sourceType: 'document', required: true, upstreamDependency: 'docs', order: 5 },
                    { requirementName: 'Prior executive reports', description: 'Previous executive snapshots/reports exist for trend.', sourceType: 'timeline', required: false, upstreamDependency: 'executive', order: 6 },
                ];
            case 'cross-feature':
                return [
                    ...base,
                    { requirementName: 'Decision evidence', description: 'Decision Time Machine evidence is available.', sourceType: 'decision', required: true, upstreamDependency: 'decisions', order: 1 },
                    { requirementName: 'Workforce knowledge', description: 'Employee ownership + resilience info is available.', sourceType: 'employee', required: true, upstreamDependency: 'exit-sim', order: 2 },
                    { requirementName: 'Risk intelligence', description: 'Risk heatmap evidence is available.', sourceType: 'risk', required: true, upstreamDependency: 'risk', order: 3 },
                    { requirementName: 'Mentor grounding', description: 'Mentor sources used are exposed.', sourceType: 'ai-analysis', required: true, upstreamDependency: 'mentor', order: 4 },
                    { requirementName: 'Documentation sources', description: 'Documentation sources + health are available.', sourceType: 'document', required: true, upstreamDependency: 'docs', order: 5 },
                    { requirementName: 'Organizational intelligence', description: 'Intelligence Engine aggregate evidence is available.', sourceType: 'ai-analysis', required: true, upstreamDependency: 'intelligence', order: 6 },
                    { requirementName: 'Executive evidence', description: 'Executive evidence behind insights is exportable.', sourceType: 'timeline', required: true, upstreamDependency: 'executive', order: 7 },
                ];
            default:
                return base;
        }
    }

    featureLabel(feature: string): string {
        return FEATURE_LABELS[feature] ?? feature;
    }

    // ------------------------------------------------------------------
    // Validation against the real ACE feature data
    // ------------------------------------------------------------------

    async checkSource(ctx: TaskSourceValidationContext): Promise<ChecklistSourceCheck> {
        const { sourceType, sourceRef } = ctx;
        try {
            switch (sourceType) {
                case 'brain-entity':
                    return await this.checkBrainEntity(sourceRef);
                case 'decision':
                    return await this.checkDecision(sourceRef);
                case 'employee':
                    return await this.checkEmployee(sourceRef);
                case 'repository':
                    return await this.checkRepository(sourceRef);
                case 'document':
                    return await this.checkDocument(sourceRef);
                case 'risk':
                    return await this.checkRisk(sourceRef);
                case 'simulation':
                    return await this.checkSimulation(sourceRef);
                case 'timeline':
                    return await this.checkTimeline(ctx);
                case 'ai-analysis':
                    return await this.checkAnalysis(sourceRef);
                case 'connector':
                    return await this.checkConnector(sourceRef);
                case 'workflow':
                    return await this.checkWorkflow(sourceRef);
                default:
                    return { exists: true, accessible: true, freshness: 60, confidence: 50, label: sourceRef, state: 'needs-review' };
            }
        } catch {
            return { exists: false, accessible: false, freshness: 0, confidence: 0, label: sourceRef, state: 'inaccessible' };
        }
    }

    private async checkBrainEntity(sourceRef: string): Promise<ChecklistSourceCheck> {
        const count = await this.prisma.knowledgeNode.count();
        const [nodeCount, edgeCount] = await Promise.all([
            this.prisma.knowledgeNode.count(),
            this.prisma.knowledgeEdge.count(),
        ]);
        const exists = nodeCount > 0;
        let label = `${nodeCount} graph entities / ${edgeCount} relationships`;
        if (sourceRef) {
            const node = await this.prisma.knowledgeNode.findUnique({ where: { id: sourceRef } }).catch(() => null);
            if (node) label = node.label;
            else {
                const byLabel = await this.prisma.knowledgeNode.findFirst({ where: { label: sourceRef } });
                if (byLabel) label = byLabel.label;
            }
        }
        return {
            exists: count > 0,
            accessible: true,
            freshness: 92,
            confidence: 90,
            label,
            state: count > 0 ? 'validated' : 'missing',
            notes: count > 0 ? `Graph present with ${nodeCount} nodes` : 'No knowledge graph entities seeded',
        };
    }

    private async checkDecision(sourceRef: string): Promise<ChecklistSourceCheck> {
        const count = await this.prisma.decisionRecord.count();
        if (count === 0) {
            return { exists: false, accessible: true, freshness: 0, confidence: 0, label: 'No decision records', state: 'missing', notes: 'Decision registry is empty' };
        }
        let label = `${count} decision records`;
        if (sourceRef) {
            const byId = await this.prisma.decisionRecord.findUnique({ where: { id: sourceRef } }).catch(() => null);
            const decision = byId ?? await this.prisma.decisionRecord.findFirst({ where: { title: sourceRef } });
            if (decision) label = decision.title;
        }
        const evidenceCount = await this.prisma.decisionEvidence.count();
        return {
            exists: true,
            accessible: true,
            freshness: 88,
            confidence: 87,
            label,
            state: 'validated',
            notes: `${count} decisions, ${evidenceCount} evidence items`,
        };
    }

    private async checkEmployee(sourceRef: string): Promise<ChecklistSourceCheck> {
        const count = await this.prisma.employee.count();
        if (count === 0) {
            return { exists: false, accessible: true, freshness: 0, confidence: 0, label: 'No employees', state: 'missing', notes: 'Workforce registry is empty' };
        }
        let label = `${count} employees`;
        if (sourceRef) {
            const byId = await this.prisma.employee.findUnique({ where: { id: sourceRef } }).catch(() => null);
            const employee = byId ?? await this.prisma.employee.findFirst({ where: { name: sourceRef } });
            if (employee) label = `${employee.name} (${employee.role})`;
        }
        return { exists: true, accessible: true, freshness: 90, confidence: 88, label, state: 'validated', notes: `Workforce registry has ${count} employees` };
    }

    private async checkRepository(sourceRef: string): Promise<ChecklistSourceCheck> {
        const count = await this.prisma.knowledgeNode.count({ where: { kind: 'repo' } });
        const total = await this.prisma.knowledgeNode.count();
        return {
            exists: count > 0 || total > 0,
            accessible: true,
            freshness: 85,
            confidence: 82,
            label: sourceRef || `${count} repository nodes`,
            state: count > 0 ? 'validated' : total > 0 ? 'validated' : 'missing',
            notes: count > 0 ? `${count} repository knowledge nodes indexed` : 'No repositories indexed in the graph',
        };
    }

    private async checkDocument(sourceRef: string): Promise<ChecklistSourceCheck> {
        const count = await this.prisma.documentation.count();
        if (count === 0) {
            return { exists: false, accessible: true, freshness: 0, confidence: 0, label: 'No documentation', state: 'missing', notes: 'Documentation registry is empty' };
        }
        let label = `${count} documents`;
        if (sourceRef) {
            const byId = await this.prisma.documentation.findUnique({ where: { id: sourceRef } }).catch(() => null);
            const doc = byId ?? await this.prisma.documentation.findFirst({ where: { title: sourceRef } });
            if (doc) label = `${doc.title} (${doc.kind})`;
        }
        const current = await this.prisma.documentation.count({ where: { status: 'current' } });
        return {
            exists: true,
            accessible: true,
            freshness: 86,
            confidence: 85,
            label,
            state: 'validated',
            notes: `${current} of ${count} documents current`,
        };
    }

    private async checkRisk(sourceRef: string): Promise<ChecklistSourceCheck> {
        const snapshot = await this.prisma.riskSnapshot.findFirst({ orderBy: { createdAt: 'desc' } });
        const recommendationCount = await this.prisma.intelligenceInsight.count().catch(() => 0);
        if (!snapshot) {
            return { exists: false, accessible: true, freshness: 0, confidence: 0, label: 'No risk snapshot', state: 'missing', notes: 'Risk Intelligence has not produced a snapshot yet' };
        }
        return {
            exists: true,
            accessible: true,
            freshness: 90,
            confidence: 89,
            label: `Risk snapshot (avg ${snapshot.averageRisk})`,
            state: 'validated',
            notes: `Resilience ${snapshot.orgResilience}, coverage ${snapshot.documentationCoverage}, ${snapshot.criticalNodes} critical nodes`,
        };
    }

    private async checkSimulation(sourceRef: string): Promise<ChecklistSourceCheck> {
        const count = await this.prisma.exitSimulationRun.count();
        return {
            exists: count > 0,
            accessible: true,
            freshness: 80,
            confidence: 78,
            label: sourceRef || `${count} simulations`,
            state: count > 0 ? 'validated' : 'missing',
            notes: count > 0 ? `${count} exit simulation runs available` : 'No exit simulations run yet',
        };
    }

    private async checkTimeline(ctx: TaskSourceValidationContext): Promise<ChecklistSourceCheck> {
        const riskSnapshots = await this.prisma.riskSnapshot.count();
        const execSnapshots = await this.prisma.executiveSnapshot.count();
        const insightTimeline = await this.prisma.intelligenceInsight.count();
        const total = riskSnapshots + execSnapshots + insightTimeline;
        return {
            exists: total > 0,
            accessible: true,
            freshness: 84,
            confidence: 80,
            label: `${total} timeline points (${riskSnapshots} risk, ${execSnapshots} exec, ${insightTimeline} insights)`,
            state: total > 0 ? 'validated' : 'missing',
            notes: `Historical series available: risk ${riskSnapshots}, executive ${execSnapshots}, insights ${insightTimeline}`,
        };
    }

    private async checkAnalysis(sourceRef: string): Promise<ChecklistSourceCheck> {
        const insightCount = await this.prisma.intelligenceInsight.count().catch(() => 0);
        const convCount = await this.prisma.mentorConversation.count().catch(() => 0);
        const exists = insightCount > 0 || convCount > 0;
        return {
            exists,
            accessible: true,
            freshness: 87,
            confidence: 84,
            label: sourceRef || `${insightCount} insights / ${convCount} mentor sessions`,
            state: exists ? 'validated' : 'missing',
            notes: exists ? `Intelligence catalog has ${insightCount} insights` : 'No intelligence insights or mentor sessions yet',
        };
    }

    private async checkConnector(sourceRef: string): Promise<ChecklistSourceCheck> {
        const convCount = await this.prisma.mentorConversation.count().catch(() => 0);
        return {
            exists: true,
            accessible: true,
            freshness: 82,
            confidence: 80,
            label: sourceRef || `${convCount} mentor conversations`,
            state: 'validated',
            notes: `${convCount} mentor conversations available`,
        };
    }

    private async checkWorkflow(sourceRef: string): Promise<ChecklistSourceCheck> {
        const systemCount = await this.prisma.system.count();
        const edgeCount = await this.prisma.knowledgeEdge.count();
        return {
            exists: systemCount > 0 || edgeCount > 0,
            accessible: true,
            freshness: 88,
            confidence: 86,
            label: sourceRef || `${systemCount} systems / ${edgeCount} dependency edges`,
            state: systemCount > 0 || edgeCount > 0 ? 'validated' : 'missing',
            notes: `Workforce dependency graph has ${systemCount} systems and ${edgeCount} edges`,
        };
    }

    // ------------------------------------------------------------------
    // Persisted checklist row building
    // ------------------------------------------------------------------

    buildRows(taskId: string, definitions: ChecklistItemDefinition[]): Array<Record<string, unknown>> {
        return definitions.map((def, idx) => ({
            taskId,
            requirementName: def.requirementName,
            description: def.description,
            sourceType: def.sourceType,
            sourceRef: def.sourceRef ?? '',
            required: def.required ?? true,
            completed: false,
            validationState: 'pending' as const,
            missingData: false,
            freshness: 0,
            confidence: 0,
            owner: '',
            responsibleAgent: 'a13',
            notes: '',
            upstreamDependency: def.upstreamDependency,
            order: def.order ?? idx,
        }));
    }

    async materializeViews(items: Array<{
        id: string;
        taskId: string;
        requirementName: string;
        description: string;
        sourceType: string;
        sourceRef: string;
        required: boolean;
        completed: boolean;
        validationState: string;
        missingData: boolean;
        freshness: number;
        confidence: number;
        owner: string;
        responsibleAgent: string;
        notes: string;
        upstreamDependency: string;
        order: number;
        createdAt: Date;
        updatedAt: Date;
    }>): Promise<TaskChecklistItem[]> {
        return Promise.all(items.map(async (r) => {
            let freshness = r.freshness;
            let confidence = r.confidence;
            if (r.validationState === 'validated') {
                const check = await this.checkSource({
                    feature: r.upstreamDependency,
                    sourceType: r.sourceType as SourceType,
                    sourceRef: r.sourceRef,
                });
                freshness = check.freshness;
                confidence = check.confidence;
            }
            return {
                id: r.id,
                taskId: r.taskId,
                requirementName: r.requirementName,
                description: r.description,
                sourceType: r.sourceType as SourceType,
                sourceRef: r.sourceRef,
                required: r.required,
                completed: r.completed,
                validationState: r.validationState as ChecklistValidationState,
                missingData: r.missingData,
                freshness,
                confidence,
                owner: r.owner,
                responsibleAgent: r.responsibleAgent,
                notes: r.notes,
                upstreamDependency: r.upstreamDependency,
                order: r.order,
                createdAt: r.createdAt.toISOString(),
                updatedAt: r.updatedAt.toISOString(),
            };
        }));
    }
}
