import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskService } from './task.service';

/**
 * Demo seed for Feature 9. Creates illustrative tasks:
 *   1. A COMPLETED cross-feature task that consumed outputs from all eight
 *      ACE features (checklist complete, sections + evidence mappings present,
 *      exported report, status complete).
 *   2. A DELIBERATELY INCOMPLETE task whose required sources are missing, so
 *      readiness lands on `blocked`/`missing-data` and generation is prevented.
 *   3. A supporting set across a second project (Project Atlas) covering
 *      several features/statuses/readiness states, so the explorer filters and
 *      project-specific report export have realistic data to operate on.
 * Seeding is idempotent (skips when a task with the same title exists).
 */
@Injectable()
export class TaskSeedService implements OnModuleInit {
    private readonly logger = new Logger(TaskSeedService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly tasks: TaskService,
    ) {}

    async onModuleInit(): Promise<void> {
        await this.seed().catch((err) =>
            this.logger.warn(`Task seed skipped: ${err instanceof Error ? err.message : String(err)}`),
        );
    }

    private async seed(): Promise<void> {
        const existing = await this.prisma.agentTask.count({
            where: {
                OR: [
                    { title: 'Cross-feature resilience deep-dive (seeded)' },
                    { title: 'Exit-impact analysis for contractor onboarding (seeded, blocked)' },
                ],
            },
        });
        if (existing > 0) {
            this.logger.log('Task demo seed already present, skipping.');
        } else {
            await this.seedCompletedTask();
            await this.seedIncompleteTask();
            this.logger.log('Core task demo data seeded.');
        }

        await this.seedSupportingTasks();
    }

    private async seedSupportingTasks(): Promise<void> {
        const supporting: Array<{
            title: string;
            feature: string;
            project: string;
            owner: string;
            team: string;
            priority: string;
            description: string;
            status: 'pending' | 'in_progress' | 'awaiting_review' | 'complete' | 'blocked';
        }> = [
            {
                title: 'Migration risk review for Atlas checkout flow (seeded)',
                feature: 'risk',
                project: 'Project Atlas',
                owner: 'Aarav Mehta',
                team: 'Payments',
                priority: 'high',
                description: 'Assess knowledge + ownership risk around the Atlas checkout migration.',
                status: 'in_progress',
            },
            {
                title: 'Onboarding documentation for Atlas engineering (seeded)',
                feature: 'docs',
                project: 'Project Atlas',
                owner: 'Sarah Chen',
                team: 'Platform',
                priority: 'medium',
                description: 'Generate onboarding + runbook docs for new Atlas services.',
                status: 'awaiting_review',
            },
            {
                title: 'Atlas decision retrospective on gateway provider (seeded)',
                feature: 'decisions',
                project: 'Project Atlas',
                owner: 'Open',
                team: 'Payments',
                priority: 'low',
                description: 'Reconstruct the gateway provider decision timeline.',
                status: 'pending',
            },
            {
                title: 'Executive snapshot for Atlas board review (seeded)',
                feature: 'executive',
                project: 'Project Atlas',
                owner: 'Priya Nair',
                team: 'Strategy',
                priority: 'critical',
                description: 'Consolidate Atlas health, risk, and workforce signals into an executive brief.',
                status: 'awaiting_review',
            },
        ];

        for (const t of supporting) {
            const exists = await this.prisma.agentTask.findFirst({ where: { title: t.title } });
            if (exists) continue;
            const task = await this.tasks.create({
                title: t.title,
                description: t.description,
                feature: t.feature,
                project: t.project,
                owner: t.owner,
                team: t.team,
                priority: t.priority,
                createdBy: 'seed',
            });
            // Complete the optional checklist items so the rows show a mix of
            // required/optional progress, then set the declared status.
            const detail = await this.tasks.detail(task.id);
            for (const item of detail.checklist.filter((c) => !c.required).slice(0, 1)) {
                await this.tasks.toggleChecklistItem(task.id, item.id, true, 'a13');
            }
            await this.tasks.updateStatus(task.id, t.status, 'a13');
        }
        this.logger.log('Supporting task demo data seeded.');
    }

    private async seedCompletedTask(): Promise<void> {
        const task = await this.tasks.create({
            title: 'Cross-feature resilience deep-dive (seeded)',
            description:
                'End-to-end collaboration chain: the AI Mentor surfaced a retention risk, the Knowledge Risk Heatmap quantified knowledge exposure, Decision Time Machine reconstructed the hiring decision, Autonomous Documentation archived the playbook, and Organizational Intelligence swept supporting signals — coordinated as one agent task by the Task Intelligence Agent.',
            feature: 'cross-feature',
            project: 'Project Phoenix',
            owner: 'Priya Nair',
            team: 'Platform',
            responsibleAgent: 'a13',
            priority: 'high',
            createdBy: 'seed',
            notes: 'Demonstrates the shared task layer coordinating eight ACE features without owning their intelligence.',
        });

        // Complete every required checklist item (source validation already
        // confirms they exist in the live brain).
        const detail = await this.tasks.detail(task.id);
        for (const item of detail.checklist.filter((c) => c.required)) {
            await this.tasks.toggleChecklistItem(task.id, item.id, true, 'a13');
        }

        // Generate sections + evidence mappings via the fleet, then mark complete.
        await this.tasks.generate(task.id, 'a13');
        await this.tasks.updateStatus(task.id, 'complete', 'a13');

        // Persist one export so the completed report is available.
        await this.tasks.export(task.id, 'markdown', 'a13');

        this.logger.log(`Seeded completed task ${task.id}`);
    }

    private async seedIncompleteTask(): Promise<void> {
        const task = await this.tasks.create({
            title: 'Exit-impact analysis for contractor onboarding (seeded, blocked)',
            description:
                'Assess the knowledge-loss impact of the new contractor onboarding initiative across repositories, decision records, and documentation. Deliberately seeded with a missing upstream dependency so readiness resolves to failed and generation is blocked rather than hallucinated.',
            feature: 'exit-sim',
            project: 'Project Phoenix',
            owner: 'Open',
            team: 'Onboarding',
            responsibleAgent: 'a7',
            priority: 'medium',
            createdBy: 'seed',
            notes: 'Demonstrates missing/blocked dependency detection and the generation guardrail.',
        });

        const detail = await this.tasks.detail(task.id);
        // Complete only a subset of checklist items — leave required ones open.
        const optional = detail.checklist.filter((c) => !c.required).slice(0, 2);
        for (const item of optional) {
            await this.tasks.toggleChecklistItem(task.id, item.id, true, 'a13');
        }

        // Declare an explicit dependency on a dependent task that does not exist.
        // resolveDependencyStatus returns failed → readiness failed → pre-generation
        // validation blocks generation instead of fabricating content.
        await this.tasks.addDependency(task.id, {
            dependencyType: 'task',
            sourceType: 'task',
            sourceId: 'task-not-created-yet',
            sourceLabel: 'Workforce onboarding exit-plan task',
        }, 'a13');

        // Attempt generation — must be blocked by pre-generation validation.
        const attempt = await this.tasks.generate(task.id, 'a7');
        if (attempt.preValidation.blocked) {
            this.logger.log(`Seeded blocked task ${task.id} (generation blocked: ${attempt.preValidation.failures.join('; ')})`);
        } else {
            await this.tasks.updateStatus(task.id, 'blocked', 'a13');
        }
    }
}
