# Project Phoenix Feature 02

## Decision Time Machine

## Decision Domain Model and API Contract Draft

## Scope and Rules

- This feature extends Feature 01 Organizational Digital Brain only.
- No duplicate ingestion, auth, memory, graph engine, or agent framework.
- All capabilities are implemented as extension modules that reuse existing infrastructure.
- Decision intelligence writes to existing graph and existing data stores.

## Bounded Contexts

### Decision Intelligence Context

Responsibilities:

- Detect decision candidates from existing indexed artifacts
- Correlate evidence and discussions
- Build and update decision entities
- Compute confidence, status, and downstream impact metrics

Core services:

- DecisionService
- DecisionCorrelationService
- DecisionAnalyticsService

### Historical Replay Context

Responsibilities:

- Build chronological and dependency replays
- Resolve state at any point in time
- Support timeline filtering and playback slices

Core services:

- TimelineService
- HistoricalReplayService

### Explainability Context

Responsibilities:

- Generate evidence-backed decision narratives
- Return reasoning path and confidence details
- Surface recommendation and follow-up actions

Core services:

- ExplainabilityService (extension of Feature 01 explainability module)

## Canonical Decision Entity

Entity name:

- Decision

Primary attributes:

- decisionId: UUID
- organizationId: UUID
- workspaceId: UUID
- title: string
- summary: string
- decisionType: enum
- domain: enum
- status: enum
- businessContext: text
- technicalContext: text
- confidenceScore: float range 0 to 1
- reasoningTraceId: string
- createdAt: timestamp
- updatedAt: timestamp
- decidedAt: timestamp nullable
- deprecatedAt: timestamp nullable
- version: integer
- sourceAttribution: array

Decision type enum:

- ARCHITECTURAL
- TECHNICAL
- OPERATIONAL
- BUSINESS
- SECURITY
- DATA

Decision status enum:

- PROPOSED
- IN_REVIEW
- APPROVED
- IMPLEMENTED
- PARTIALLY_IMPLEMENTED
- REJECTED
- REPLACED
- ROLLED_BACK
- ARCHIVED

## Supporting Entities

### DecisionAlternative

- alternativeId: UUID
- decisionId: UUID
- title: string
- rationale: text
- outcome: enum ACCEPTED or REJECTED
- rejectionReason: text nullable
- confidenceScore: float
- evidenceRefs: array

### DecisionEvidenceLink

- linkId: UUID
- decisionId: UUID
- artifactType: enum
- artifactId: string
- artifactUri: string
- extractedClaim: text
- relevanceScore: float
- sourceTimestamp: timestamp

Artifact type enum:

- COMMIT
- PULL_REQUEST
- ADR
- ISSUE
- CHAT_MESSAGE
- MEETING_TRANSCRIPT
- DEPLOYMENT_EVENT
- INCIDENT_REPORT
- DOC_REVISION
- EMAIL

### DecisionParticipant

- participantId: UUID
- decisionId: UUID
- actorEntityId: UUID
- actorType: USER or TEAM
- role: enum
- involvementScore: float

Role enum:

- PROPOSED_BY
- REVIEWED_BY
- APPROVED_BY
- IMPLEMENTED_BY
- REJECTED_BY
- INFLUENCED_BY

### DecisionOutcome

- outcomeId: UUID
- decisionId: UUID
- metricName: string
- baselineValue: number or string
- postValue: number or string
- observedAt: timestamp
- impactCategory: POSITIVE, NEGATIVE, MIXED, UNKNOWN

## Graph Extension Contract

Decision node label:

- Decision

Relationship set:

- PROPOSED_BY
- DISCUSSED_IN
- APPROVED_BY
- IMPLEMENTED_BY
- REJECTED_BY
- IMPACTS
- DEPENDS_ON
- REPLACES
- INFLUENCED_BY
- VALIDATES
- MITIGATES
- CONTRIBUTES_TO

Relationship metadata:

- confidenceScore
- validFrom
- validTo
- evidenceRefs
- createdByAgent
- version

Temporal behavior:

- all relationship mutations are versioned
- replay queries select state by asOf timestamp

## Event Contract

Topic namespace:

- phoenix.decision

Events:

- phoenix.decision.detected.v1
- phoenix.decision.updated.v1
- phoenix.decision.relationships.updated.v1
- phoenix.decision.timeline.rebuilt.v1
- phoenix.decision.replay.generated.v1
- phoenix.decision.outcome.recomputed.v1

Event envelope:

- eventId
- eventType
- occurredAt
- organizationId
- workspaceId
- correlationId
- causationId
- producer
- payload
- schemaVersion

Idempotency:

- consumer dedup key eventId plus payload hash
- exactly-once semantics emulated via outbox and dedup store

## API Extension Strategy

Base path:

- /api/v1/decisions

Rules:

- reuse existing auth middleware and RBAC guards
- reuse existing response envelope conventions
- reuse existing pagination and filtering conventions
- expose only decision-specific endpoints

## REST Endpoints

### Create or Upsert Decision

- Method: POST
- Path: /api/v1/decisions
- Purpose: create or upsert decision reconstructed by agents
- Auth: service token or privileged role

Request payload fields:

- title
- summary
- decisionType
- domain
- status
- businessContext
- technicalContext
- confidenceScore
- participants array
- alternatives array
- evidenceLinks array
- dependencies array

Response:

- decision entity
- version
- graphSyncStatus

### List Decisions

- Method: GET
- Path: /api/v1/decisions

Query filters:

- workspaceId
- projectId
- teamId
- repositoryId
- decisionType
- status
- ownerId
- impactedSystemId
- from
- to
- minConfidence
- text
- page
- pageSize
- sortBy
- sortOrder

Response:

- items
- page
- pageSize
- total

### Get Decision by Id

- Method: GET
- Path: /api/v1/decisions/{decisionId}

Response includes:

- core decision
- alternatives
- participants
- evidence links
- dependencies
- outcomes
- explainability summary

### Get Decision Timeline

- Method: GET
- Path: /api/v1/decisions/{decisionId}/timeline

Query:

- mode chronological or dependency or architecture or impact or repository or service
- asOf optional timestamp
- includeEvidence boolean

Response:

- ordered timeline events
- relationship snapshots
- confidence trend

### Replay Decision State

- Method: POST
- Path: /api/v1/decisions/{decisionId}/replay

Request:

- from timestamp
- to timestamp
- granularity hour or day or week
- includeComparisons boolean

Response:

- replayId
- frames
- stateTransitions
- decisionNarrative

### Compare Alternatives

- Method: GET
- Path: /api/v1/decisions/{decisionId}/alternatives/compare

Response:

- alternatives matrix
- evidence support heat
- trade-off summary

### Decision Reasoning Answer

- Method: POST
- Path: /api/v1/decisions/reason

Request:

- question
- scope filters
- asOf optional timestamp

Response:

- answer
- evidence references
- confidence
- reasoning path
- related decisions
- recommended actions

## RBAC Contract

Roles and permissions:

- ORG_ADMIN: full read and write
- ARCHITECT: read plus approve plus replay
- ENGINEERING_MANAGER: read plus timeline plus reason queries
- CONTRIBUTOR: read scoped decisions
- AUDITOR: read plus historical export only

Policy notes:

- decisions can inherit workspace visibility
- sensitive decisions can be marked restricted and require explicit grants

## Validation Rules

- decision title required and max length enforced
- confidence score required when status is APPROVED or REJECTED
- at least one evidence link required for APPROVED or REJECTED status
- alternative marked ACCEPTED must be unique per decision version
- timeline events must be timestamp ordered

## Non-Functional Requirements

- P95 list endpoint under 250 ms for common filters
- P95 decision detail under 400 ms with cached graph neighborhood
- replay generation async for long windows with job tracking
- full audit log for every status change
- trace IDs propagated across API, agent, and graph operations

## Testing Matrix

- unit tests for decision aggregation, confidence calculation, dependency resolver
- integration tests for API plus graph sync consistency
- contract tests for event schemas and versioning
- replay determinism tests with fixed asOf timestamps
- security tests for RBAC and restricted decision views

## Implementation Notes for Feature Branching

Recommended module additions in existing backend structure:

- modules/decision
- modules/timeline
- modules/replay
- modules/decision-analytics

Each module should:

- export interfaces only through shared contracts
- use existing dependency injection container
- publish events through existing outbox bus
- consume existing observability wrappers

## Done Criteria for Feature 02 Backend

- Decision entities reconstructed from existing indexed data
- Decision graph relationships persisted and queryable with temporal versions
- Timeline and replay endpoints stable and documented
- Explainable answer endpoint returns evidence-backed responses
- No duplicated foundation capabilities introduced
