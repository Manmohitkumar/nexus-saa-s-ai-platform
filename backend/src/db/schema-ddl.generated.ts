// AUTO-GENERATED from `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`.
// Regenerate with: npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > prisma/schema.sql
export const SCHEMA_DDL = `
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "risk" INTEGER NOT NULL,
    "systems" TEXT NOT NULL DEFAULT '[]',
    "createdBy" TEXT,
    "tenureYears" INTEGER NOT NULL DEFAULT 0,
    "expertise" TEXT NOT NULL DEFAULT '[]',
    "mentorship" INTEGER NOT NULL DEFAULT 0,
    "contributions" INTEGER NOT NULL DEFAULT 0,
    "incidentsResolved" INTEGER NOT NULL DEFAULT 0,
    "codeReviews" INTEGER NOT NULL DEFAULT 0,
    "collaborationPartners" INTEGER NOT NULL DEFAULT 0,
    "successionReadiness" INTEGER NOT NULL DEFAULT 0,
    "busFactor" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "System" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'service',
    "owner" TEXT,
    "team" TEXT,
    "risk" TEXT NOT NULL DEFAULT 'low'
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'release',
    "description" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rollout" INTEGER NOT NULL DEFAULT 100,
    "stickiness" TEXT NOT NULL DEFAULT 'default',
    "variants" INTEGER NOT NULL DEFAULT 0,
    "impressionData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TEXT NOT NULL DEFAULT '',
    "systemId" TEXT,
    CONSTRAINT "FeatureFlag_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KnowledgeNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "risk" TEXT NOT NULL DEFAULT 'low',
    "summary" TEXT NOT NULL DEFAULT '',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerId" TEXT,
    "systemId" TEXT,
    CONSTRAINT "KnowledgeNode_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KnowledgeNode_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KnowledgeEdge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KnowledgeEdge_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KnowledgeEdge_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "KnowledgeNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topic" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DecisionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "domain" TEXT NOT NULL DEFAULT 'platform',
    "status" TEXT NOT NULL DEFAULT 'identified',
    "summary" TEXT NOT NULL DEFAULT '',
    "businessContext" TEXT NOT NULL DEFAULT '',
    "technicalContext" TEXT NOT NULL DEFAULT '',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TEXT NOT NULL DEFAULT '',
    "decidedAt" TEXT,
    "implementedAt" TEXT,
    "supersededById" TEXT,
    "createdBy" TEXT,
    "team" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DecisionRecord_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "DecisionRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DecisionAlternative" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decisionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'considered',
    "rationale" TEXT NOT NULL DEFAULT '',
    "votes" INTEGER NOT NULL DEFAULT 0,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DecisionAlternative_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "DecisionRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DecisionEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decisionId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL DEFAULT '',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "date" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "DecisionEvidence_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "DecisionRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DecisionMilestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decisionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "date" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "evidenceSources" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DecisionMilestone_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "DecisionRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DecisionOutcome" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decisionId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "before" TEXT NOT NULL DEFAULT '',
    "after" TEXT NOT NULL DEFAULT '',
    "direction" TEXT NOT NULL DEFAULT 'improved',
    CONSTRAINT "DecisionOutcome_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "DecisionRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DecisionRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decisionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetType" TEXT NOT NULL DEFAULT 'knowledge',
    "targetId" TEXT NOT NULL,
    "targetLabel" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "DecisionRelation_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "DecisionRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentMemory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sources" TEXT NOT NULL DEFAULT '[]',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ExitSimulationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL DEFAULT '',
    "scenarioType" TEXT NOT NULL DEFAULT 'single',
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "employeeIds" TEXT NOT NULL DEFAULT '[]',
    "systemIds" TEXT NOT NULL DEFAULT '[]',
    "projectedKnowledgeLoss" INTEGER NOT NULL DEFAULT 0,
    "resilienceBefore" INTEGER NOT NULL DEFAULT 0,
    "resilienceAfter" INTEGER NOT NULL DEFAULT 0,
    "metrics" TEXT NOT NULL DEFAULT '{}',
    "findings" TEXT NOT NULL DEFAULT '[]',
    "summary" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "KnowledgeTransferAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "simulationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'documentation',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "etaWeeks" INTEGER NOT NULL DEFAULT 1,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "evidence" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'recommended',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KnowledgeTransferAction_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "ExitSimulationRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgResilience" INTEGER NOT NULL DEFAULT 0,
    "averageRisk" INTEGER NOT NULL DEFAULT 0,
    "documentationCoverage" INTEGER NOT NULL DEFAULT 0,
    "knowledgeConcentration" INTEGER NOT NULL DEFAULT 0,
    "technicalDebt" INTEGER NOT NULL DEFAULT 0,
    "singleOwnerSystems" INTEGER NOT NULL DEFAULT 0,
    "undocumentedFlags" INTEGER NOT NULL DEFAULT 0,
    "criticalNodes" INTEGER NOT NULL DEFAULT 0,
    "metrics" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "ip" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MentorConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Mentor conversation',
    "topic" TEXT NOT NULL DEFAULT 'general',
    "capability" TEXT NOT NULL DEFAULT 'general',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MentorMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 0,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MentorMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MentorConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Documentation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "quality" INTEGER NOT NULL DEFAULT 0,
    "owner" TEXT NOT NULL DEFAULT '',
    "team" TEXT NOT NULL DEFAULT '',
    "sourceType" TEXT NOT NULL DEFAULT '',
    "sourceRef" TEXT NOT NULL DEFAULT '',
    "relatedNode" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastVerifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DocumentationVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "change" TEXT NOT NULL DEFAULT '',
    "author" TEXT NOT NULL DEFAULT 'Documentation Agent',
    "status" TEXT NOT NULL DEFAULT 'current',
    "content" TEXT NOT NULL DEFAULT '{}',
    "quality" INTEGER NOT NULL DEFAULT 0,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentationVersion_documentationId_fkey" FOREIGN KEY ("documentationId") REFERENCES "Documentation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentationHealthSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "health" INTEGER NOT NULL DEFAULT 0,
    "coverage" INTEGER NOT NULL DEFAULT 0,
    "freshness" INTEGER NOT NULL DEFAULT 0,
    "consistency" INTEGER NOT NULL DEFAULT 0,
    "completeness" INTEGER NOT NULL DEFAULT 0,
    "currentDocs" INTEGER NOT NULL DEFAULT 0,
    "staleDocs" INTEGER NOT NULL DEFAULT 0,
    "draftDocs" INTEGER NOT NULL DEFAULT 0,
    "missingDocs" INTEGER NOT NULL DEFAULT 0,
    "undocumentedFlags" INTEGER NOT NULL DEFAULT 0,
    "metrics" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DocumentationEvolutionEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trigger" TEXT NOT NULL,
    "resource" TEXT NOT NULL DEFAULT '',
    "detail" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL,
    "documentsAffected" TEXT NOT NULL DEFAULT '[]',
    "summary" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ExecutiveSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "overallHealth" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'watch',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "kpis" TEXT NOT NULL DEFAULT '{}',
    "metrics" TEXT NOT NULL DEFAULT '{}',
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ExecutiveReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "period" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "markdown" TEXT NOT NULL DEFAULT '',
    "json" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "IntelligenceInsight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "detail" TEXT NOT NULL DEFAULT '',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "evidence" TEXT NOT NULL DEFAULT '[]',
    "affectedSystems" TEXT NOT NULL DEFAULT '[]',
    "relatedDecisions" TEXT NOT NULL DEFAULT '[]',
    "relatedDocs" TEXT NOT NULL DEFAULT '[]',
    "recommendation" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "trigger" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AgentTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "feature" TEXT NOT NULL DEFAULT 'executive',
    "project" TEXT NOT NULL DEFAULT 'Project Phoenix',
    "section" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "readiness" TEXT NOT NULL DEFAULT 'waiting',
    "owner" TEXT NOT NULL DEFAULT '',
    "team" TEXT NOT NULL DEFAULT '',
    "responsibleAgent" TEXT NOT NULL DEFAULT 'a13',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "createdBy" TEXT NOT NULL DEFAULT 'system',
    "version" INTEGER NOT NULL DEFAULT 1,
    "requiredTotal" INTEGER NOT NULL DEFAULT 0,
    "requiredComplete" INTEGER NOT NULL DEFAULT 0,
    "optionalTotal" INTEGER NOT NULL DEFAULT 0,
    "optionalComplete" INTEGER NOT NULL DEFAULT 0,
    "requiredPercentage" INTEGER NOT NULL DEFAULT 0,
    "optionalPercentage" INTEGER NOT NULL DEFAULT 0,
    "missingSourceCount" INTEGER NOT NULL DEFAULT 0,
    "staleSourceCount" INTEGER NOT NULL DEFAULT 0,
    "blockedDependencyCount" INTEGER NOT NULL DEFAULT 0,
    "validationFailures" INTEGER NOT NULL DEFAULT 0,
    "generatedSections" TEXT NOT NULL DEFAULT '[]',
    "evidenceMappings" TEXT NOT NULL DEFAULT '[]',
    "sourcesUsed" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AgentTaskChecklistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "requirementName" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sourceType" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL DEFAULT '',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "validationState" TEXT NOT NULL DEFAULT 'pending',
    "missingData" BOOLEAN NOT NULL DEFAULT false,
    "freshness" INTEGER NOT NULL DEFAULT 0,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "owner" TEXT NOT NULL DEFAULT '',
    "responsibleAgent" TEXT NOT NULL DEFAULT 'a13',
    "notes" TEXT NOT NULL DEFAULT '',
    "upstreamDependency" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentTaskChecklistItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AgentTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentTaskDependency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "dependencyType" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'feature',
    "sourceId" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastValidatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentTaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AgentTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentTaskActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "evidenceDelta" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentTaskActivity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AgentTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentTaskExport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "taskVersion" INTEGER NOT NULL DEFAULT 1,
    "exportedBy" TEXT NOT NULL DEFAULT 'system',
    "content" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentTaskExport_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AgentTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentProjectExport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "exportedBy" TEXT NOT NULL DEFAULT 'system',
    "content" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "System_name_key" ON "System"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_name_key" ON "FeatureFlag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeNode_systemId_key" ON "KnowledgeNode"("systemId");

-- CreateIndex
CREATE INDEX "KnowledgeEdge_sourceId_idx" ON "KnowledgeEdge"("sourceId");

-- CreateIndex
CREATE INDEX "KnowledgeEdge_targetId_idx" ON "KnowledgeEdge"("targetId");

-- CreateIndex
CREATE INDEX "DecisionRecord_status_idx" ON "DecisionRecord"("status");

-- CreateIndex
CREATE INDEX "DecisionRecord_domain_idx" ON "DecisionRecord"("domain");

-- CreateIndex
CREATE INDEX "DecisionRelation_type_idx" ON "DecisionRelation"("type");

-- CreateIndex
CREATE INDEX "DecisionRelation_targetId_idx" ON "DecisionRelation"("targetId");

-- CreateIndex
CREATE INDEX "AgentMemory_key_idx" ON "AgentMemory"("key");

-- CreateIndex
CREATE UNIQUE INDEX "AgentMemory_key_agentId_key" ON "AgentMemory"("key", "agentId");

-- CreateIndex
CREATE INDEX "RiskSnapshot_createdAt_idx" ON "RiskSnapshot"("createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "MentorConversation_userId_updatedAt_idx" ON "MentorConversation"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "MentorMessage_conversationId_createdAt_idx" ON "MentorMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Documentation_slug_key" ON "Documentation"("slug");

-- CreateIndex
CREATE INDEX "Documentation_kind_idx" ON "Documentation"("kind");

-- CreateIndex
CREATE INDEX "Documentation_status_idx" ON "Documentation"("status");

-- CreateIndex
CREATE INDEX "Documentation_sourceType_idx" ON "Documentation"("sourceType");

-- CreateIndex
CREATE INDEX "DocumentationVersion_documentationId_createdAt_idx" ON "DocumentationVersion"("documentationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentationVersion_documentationId_version_key" ON "DocumentationVersion"("documentationId", "version");

-- CreateIndex
CREATE INDEX "DocumentationHealthSnapshot_createdAt_idx" ON "DocumentationHealthSnapshot"("createdAt");

-- CreateIndex
CREATE INDEX "DocumentationEvolutionEvent_createdAt_idx" ON "DocumentationEvolutionEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ExecutiveSnapshot_createdAt_idx" ON "ExecutiveSnapshot"("createdAt");

-- CreateIndex
CREATE INDEX "ExecutiveReport_createdAt_idx" ON "ExecutiveReport"("createdAt");

-- CreateIndex
CREATE INDEX "IntelligenceInsight_kind_idx" ON "IntelligenceInsight"("kind");

-- CreateIndex
CREATE INDEX "IntelligenceInsight_priority_idx" ON "IntelligenceInsight"("priority");

-- CreateIndex
CREATE INDEX "IntelligenceInsight_createdAt_idx" ON "IntelligenceInsight"("createdAt");

-- CreateIndex
CREATE INDEX "AgentTask_feature_idx" ON "AgentTask"("feature");

-- CreateIndex
CREATE INDEX "AgentTask_status_idx" ON "AgentTask"("status");

-- CreateIndex
CREATE INDEX "AgentTask_readiness_idx" ON "AgentTask"("readiness");

-- CreateIndex
CREATE INDEX "AgentTask_responsibleAgent_idx" ON "AgentTask"("responsibleAgent");

-- CreateIndex
CREATE INDEX "AgentTask_project_idx" ON "AgentTask"("project");

-- CreateIndex
CREATE INDEX "AgentTask_createdAt_idx" ON "AgentTask"("createdAt");

-- CreateIndex
CREATE INDEX "AgentTaskChecklistItem_taskId_idx" ON "AgentTaskChecklistItem"("taskId");

-- CreateIndex
CREATE INDEX "AgentTaskChecklistItem_sourceType_idx" ON "AgentTaskChecklistItem"("sourceType");

-- CreateIndex
CREATE INDEX "AgentTaskChecklistItem_validationState_idx" ON "AgentTaskChecklistItem"("validationState");

-- CreateIndex
CREATE INDEX "AgentTaskDependency_taskId_idx" ON "AgentTaskDependency"("taskId");

-- CreateIndex
CREATE INDEX "AgentTaskDependency_sourceId_idx" ON "AgentTaskDependency"("sourceId");

-- CreateIndex
CREATE INDEX "AgentTaskActivity_taskId_idx" ON "AgentTaskActivity"("taskId");

-- CreateIndex
CREATE INDEX "AgentTaskActivity_createdAt_idx" ON "AgentTaskActivity"("createdAt");

-- CreateIndex
CREATE INDEX "AgentTaskExport_taskId_idx" ON "AgentTaskExport"("taskId");

-- CreateIndex
CREATE INDEX "AgentProjectExport_project_idx" ON "AgentProjectExport"("project");


`;
