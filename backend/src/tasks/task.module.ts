import { Module } from '@nestjs/common';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { TaskChecklistService } from './task-checklist.service';
import { TaskDependencyService } from './task-dependency.service';
import { TaskReadinessService } from './task-readiness.service';
import { TaskEvidenceService } from './task-evidence.service';
import { TaskExportService } from './task-export.service';
import { TaskExplorerService } from './task-explorer.service';
import { TaskCollaborationService } from './task-collaboration.service';
import { TaskSeedService } from './task-seed.service';
import { AgentsModule } from '../agents/agents.module';
import { WorkforceModule } from '../workforce/workforce.module';

/**
 * Feature 9 — Agent Task Intelligence Layer module. A shared integration layer,
 * not a new intelligence silo: it consumes the eight ACE features' existing
 * outputs, validates task checklists against them, and coordinates evidence,
 * readiness, discoverability, review, and reporting across those capabilities.
 */
@Module({
    imports: [AgentsModule, WorkforceModule],
    controllers: [TaskController],
    providers: [
        TaskService,
        TaskChecklistService,
        TaskDependencyService,
        TaskReadinessService,
        TaskEvidenceService,
        TaskExportService,
        TaskExplorerService,
        TaskCollaborationService,
        TaskSeedService,
    ],
    exports: [TaskService],
})
export class TasksModule {}
