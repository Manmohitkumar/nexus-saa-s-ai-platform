# Project Phoenix Feature 02

## Decision Time Machine

## Reusable Frontend Component Map for Timeline and Replay UX

## UX Principle

The experience should feel like exploring organizational reasoning history, not reading static logs.

Design principles:

- Evidence first
- Temporal clarity
- Dependency transparency
- Progressive disclosure
- Explainability by default

## Route and Screen Map

Primary route:

- /dashboard/decisions

Secondary routes and overlays:

- /dashboard/decisions/[decisionId]
- /dashboard/decisions/[decisionId]/replay
- /dashboard/decisions/[decisionId]/compare
- shared modal for evidence inspection
- shared drawer for graph neighborhood

## Page Composition

### Decisions Workspace Page

Sections:

- Header with context and global filters
- Timeline mode switcher
- Decision stream list
- Graph mini-map panel
- Explainability side panel

### Decision Detail Page

Sections:

- Decision summary card
- Participants and ownership
- Alternatives comparison
- Evidence ledger
- Dependency graph view
- Outcome metrics and risk panel

### Replay Page

Sections:

- Playback controls
- Time window selector
- Timeline frames viewport
- Diff panel for before and after state
- Narrative and confidence trend

## Component Taxonomy

### Foundation Level

Reuse from Feature 01:

- AppShell
- DashboardSidebar
- DashboardTopbar
- Card, Tabs, Table, Badge, Dialog, Drawer
- Global filters and search primitives

New extensions:

- TimelineScale
- PlaybackTransport
- ConfidencePill
- EvidenceTag
- RelationshipBadge

### Composite Components

- DecisionCard
- DecisionHeader
- DecisionStatusTimeline
- DecisionParticipantStrip
- DecisionAlternativeMatrix
- DecisionDependencyGraphPanel
- EvidenceLedger
- HistoricalReplayPanel
- ImpactVisualizationPanel
- ReasoningTracePanel

### High-Order Containers

- DecisionsWorkspaceContainer
- DecisionDetailContainer
- ReplayContainer
- CompareAlternativesContainer

## Component Contracts

### DecisionCard

Inputs:

- decisionId
- title
- status
- decisionType
- confidenceScore
- updatedAt
- owner
- impactedSystemsCount

Outputs and actions:

- onOpenDetail
- onOpenReplay
- onOpenCompare

### DecisionStatusTimeline

Inputs:

- timelineEvents
- mode
- selectedTimestamp

Outputs and actions:

- onSelectEvent
- onZoomRange
- onModeChange

### HistoricalReplayPanel

Inputs:

- replayFrames
- currentFrameIndex
- confidenceTrend

Outputs and actions:

- onPlay
- onPause
- onStepForward
- onStepBack
- onJumpToFrame

### DecisionDependencyGraphPanel

Inputs:

- nodes
- edges
- filters
- selectedNodeId

Outputs and actions:

- onSelectNode
- onExpandNeighborhood
- onTracePath

### EvidenceLedger

Inputs:

- evidenceItems
- groupedByType

Outputs and actions:

- onOpenSource
- onHighlightClaim
- onPinEvidence

## Timeline Visualization Modes

Supported mode tabs:

- Chronological
- Dependency
- Architectural Evolution
- Organizational Impact
- Repository Evolution
- Service Lifecycle

Behavior expectations:

- same component shell with pluggable data adapter per mode
- maintain selection state when switching modes
- preserve filter chips across mode changes

## Interaction Flows

### Flow A: Quick Decision Lookup

- User applies filters
- List updates via query cache
- User opens decision card
- Detail drawer opens with summary and evidence

### Flow B: Historical Replay

- User opens replay
- Chooses time window
- Playback starts with frame transitions
- User pauses and inspects diff and evidence

### Flow C: Alternative Comparison

- User opens compare view
- Matrix highlights accepted versus rejected options
- Evidence support and trade-offs shown side by side

## Data Access and State

Query layer with TanStack Query:

- useDecisionsQuery
- useDecisionByIdQuery
- useDecisionTimelineQuery
- useDecisionReplayMutation
- useAlternativeComparisonQuery
- useDecisionReasoningMutation

Local UI state with Zustand:

- timelineMode
- selectedDecisionId
- selectedTimestamp
- playbackState
- graphFilters
- evidencePanelState

Cache keys:

- decisions.list
- decisions.detail.{decisionId}
- decisions.timeline.{decisionId}.{mode}.{filters}
- decisions.replay.{decisionId}.{window}

## Responsiveness Map

Desktop:

- three-column workspace layout
- timeline center, filters left, explainability right

Tablet:

- two-column with collapsible right panel

Mobile:

- stacked sections with bottom-sheet for evidence and replay controls

## Accessibility Contract

- all playback controls keyboard operable
- timeline events navigable via arrow keys
- graph node focus outlines and screen reader labels
- confidence values include textual interpretation
- reduced motion mode for replay transitions

## Motion Guidelines

- frame transitions use short easing curves under 220 ms
- timeline zoom and pan should prioritize readability over spectacle
- relationship path highlighting should be subtle and reversible

## Visual Language Alignment

Must reuse existing Feature 01 design system tokens:

- spacing scale
- typography scale
- semantic color tokens
- shadows and radius tokens
- focus ring standards

Decision-specific semantic colors should be mapped through shared tokens:

- status approved
- status rejected
- status in review
- risk elevated
- confidence high and medium and low

## Suggested File Placement

Inside existing frontend structure:

- app/dashboard/decisions/page.tsx
- app/dashboard/decisions/[decisionId]/page.tsx
- app/dashboard/decisions/[decisionId]/replay/page.tsx
- components/decisions/decision-card.tsx
- components/decisions/timeline/decision-status-timeline.tsx
- components/decisions/replay/historical-replay-panel.tsx
- components/decisions/graph/decision-dependency-graph-panel.tsx
- components/decisions/evidence/evidence-ledger.tsx
- hooks/decisions/use-decisions.ts
- lib/decisions/formatters.ts

## Frontend Acceptance Criteria

- Decision workspace supports all required timeline modes
- Replay experience is interactive, explainable, and evidence-linked
- Decision detail includes participants, alternatives, dependencies, outcomes, and recommendations
- Filters and mode state persist during navigation
- Accessibility checks pass for keyboard and screen reader flows
- No duplicate design systems or isolated styling frameworks introduced
