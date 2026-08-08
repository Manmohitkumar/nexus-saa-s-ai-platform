import { IntelligenceReasoningSnapshot } from './phoenix.types';

interface ReasoningTemplate {
    topic: string;
    summary: string;
    confidence: number;
    evidenceChain: IntelligenceReasoningSnapshot['evidenceChain'];
    agents: IntelligenceReasoningSnapshot['agents'];
}

// Feature 3 — Employee Exit Intelligence Agent (a7) participates in every
// reasoning snapshot alongside the existing fleet.
const exitAgentSnapshot: IntelligenceReasoningSnapshot['agents'][number] = {
    id: 'a7',
    name: 'Employee Exit Intelligence Agent',
    role: 'Coordinates departure simulations & resilience planning',
    status: 'done',
    confidence: 87,
    finding: 'Simulated the departure scenario and projected knowledge loss across owned systems with ranked successors',
};

// Feature 4 — Risk Intelligence Agent (a8) participates in every reasoning
// snapshot so risk reasoning is available fleet-wide.
const riskAgentSnapshot: IntelligenceReasoningSnapshot['agents'][number] = {
    id: 'a8',
    name: 'Risk Intelligence Agent',
    role: 'Computes organizational knowledge-risk heatmaps',
    status: 'done',
    confidence: 86,
    finding: 'Scored every node across 13 risk attributes and projected 4-week risk trajectories with mitigation actions',
};

// Feature 5 — Mentor Agent (a9) participates in every reasoning snapshot so
// mentor answers are always grounded in the fleet's shared reasoning.
const mentorAgentSnapshot: IntelligenceReasoningSnapshot['agents'][number] = {
    id: 'a9',
    name: 'Mentor Agent',
    role: 'Explains the organizational brain with personalized guidance',
    status: 'done',
    confidence: 85,
    finding: 'Detected the mentoring capability, resolved the user persona, and composed an evidence-grounded answer with a learning path',
};

// Feature 6 — Documentation Intelligence Agent (a10) participates in every
// documentation reasoning snapshot so generated documents are always derived
// from the fleet's shared reasoning of the organizational brain.
const documentationAgentSnapshot: IntelligenceReasoningSnapshot['agents'][number] = {
    id: 'a10',
    name: 'Documentation Intelligence Agent',
    role: 'Coordinates documentation generation, evolution, validation, and versioning',
    status: 'done',
    confidence: 87,
    finding: 'Identified impacted documents, regenerated affected sections from the brain, and published a new versioned document',
};

// Feature 8 — Executive Intelligence Agent (a12) participates in every reasoning
// snapshot so executive briefings and prioritized recommendations are always
// grounded in the fleet's shared reasoning of the organizational brain.
const executiveAgentSnapshot: IntelligenceReasoningSnapshot['agents'][number] = {
    id: 'a12',
    name: 'Executive Intelligence Agent',
    role: 'Aggregates executive KPIs, forecasts, briefings, and prioritized recommendations',
    status: 'done',
    confidence: 88,
    finding: 'Aggregated strategic KPIs across Features 1-7 and prioritized recommendations into executive tiers with business justification and evidence',
};

// Feature 9 — Agent Task Intelligence Agent (a13) participates in every
// reasoning snapshot so the fleet's task workflows are always tied to the
// organizational brain's shared reasoning and evidence.
const taskAgentSnapshot: IntelligenceReasoningSnapshot['agents'][number] = {
    id: 'a13',
    name: 'Agent Task Intelligence Agent',
    role: 'Coordinates the shared Agent Task Intelligence Layer',
    status: 'done',
    confidence: 87,
    finding: 'Declared source checklists and cross-feature dependencies, validated evidence against ACE feature outputs, and mapped generated sections back to their sources',
};

const defaultTemplate: ReasoningTemplate = {
    topic: 'Platform',
    summary: 'Phoenix has linked the organizational graph, historical decisions, and risk edges into a cohesive reasoning snapshot for this request.',
    confidence: 91,
    evidenceChain: [
        { source: 'Meeting: Q2 Architecture Review (Apr 2022)', confidence: 95, type: 'meeting', excerpt: 'The team aligned on the constraints and success criteria for this decision.' },
        { source: 'ADR-014: Architecture Decision Record', confidence: 89, type: 'adr', excerpt: 'The chosen approach was recorded with rejected alternatives and rationale.' },
        { source: 'Benchmark: perf_spike_q2.md', confidence: 92, type: 'commit', excerpt: 'The spike confirmed the approach under the target workload.' },
        { source: 'Slack #eng-arch', confidence: 78, type: 'message', excerpt: 'Engineering discussed the trade-offs before the council ruling.' },
    ],
    agents: [
        { id: 'a1', name: 'Knowledge Agent', role: 'Searches org knowledge graph', status: 'done', confidence: 94, finding: 'Found 6 linked knowledge nodes across 1 repositories' },
        { id: 'a2', name: 'Context Agent', role: 'Builds situational context', status: 'done', confidence: 88, finding: 'Decision made in the context of the current engineering roadmap' },
        { id: 'a3', name: 'Evidence Agent', role: 'Gathers supporting evidence', status: 'done', confidence: 82, finding: 'Analyzed meeting transcripts and ADRs for corroboration' },
        { id: 'a4', name: 'Relationship Agent', role: 'Maps knowledge dependencies', status: 'done', confidence: 79, finding: 'Mapped dependencies between services, teams, and decisions' },
        { id: 'a5', name: 'Synthesis Agent', role: 'Synthesizes final answer', status: 'done', confidence: 91, finding: 'Reconciled all agent outputs into a single coherent explanation' },
        { id: 'a6', name: 'Decision Intelligence Agent', role: 'Correlates evidence & reconstructs decision history', status: 'done', confidence: 90, finding: 'Reconstructed the decision lifecycle from problem through outcome with traceable evidence' },
    ],
};

const templates: Array<{ keys: string[]; template: ReasoningTemplate }> = [
    {
        keys: ['postgres', 'postgresql', 'mysql', 'mongo', 'database', 'db ', 'sql', 'redis', 'data store'],
        template: {
            topic: 'Data Store Selection',
            summary: 'Phoenix traced the data store decision back to performance ceilings, JSON support gaps, and the Q2 2022 scalability review, and confirms PostgreSQL was the highest-confidence outcome.',
            confidence: 93,
            evidenceChain: [
                { source: 'Meeting: Q2 Architecture Review (Apr 2022)', confidence: 95, type: 'meeting', excerpt: 'The team agreed that JSONB support was critical for the new events schema.' },
                { source: 'ADR-014: Database Selection', confidence: 89, type: 'adr', excerpt: 'PostgreSQL was selected for JSONB, full-text search, and advanced indexing.' },
                { source: 'Benchmark: pg_vs_mysql_q2.md', confidence: 92, type: 'commit', excerpt: 'PostgreSQL delivered a 3.2× advantage on the team-specific read workload.' },
                { source: 'Slack #eng-arch (Sarah Chen)', confidence: 78, type: 'message', excerpt: "MySQL's JSON support was a hack. We needed a real JSONB path for the analytics model." },
            ],
            agents: [
                { id: 'a1', name: 'Knowledge Agent', role: 'Searches org knowledge graph', status: 'done', confidence: 94, finding: 'Found 6 linked knowledge nodes across 1 repositories' },
                { id: 'a2', name: 'Context Agent', role: 'Builds situational context', status: 'done', confidence: 88, finding: 'Decision made in context of the Q2 2022 performance crisis' },
                { id: 'a3', name: 'Evidence Agent', role: 'Gathers supporting evidence', status: 'done', confidence: 86, finding: 'Analyzed 8 meeting transcripts and 23 ADRs' },
                { id: 'a4', name: 'Relationship Agent', role: 'Maps knowledge dependencies', status: 'done', confidence: 82, finding: 'Linked 4 repositories and 12 services to the data layer decision' },
                { id: 'a5', name: 'Synthesis Agent', role: 'Synthesizes final answer', status: 'done', confidence: 93, finding: 'JSONB support and read performance were the decisive factors' },
                { id: 'a6', name: 'Decision Intelligence Agent', role: 'Correlates evidence & reconstructs decision history', status: 'done', confidence: 92, finding: 'PostgreSQL chosen; MySQL and MongoDB rejected in the council ruling' },
            ],
        },
    },
    {
        keys: ['auth', 'oauth', 'jwt', 'login', 'sso', 'saml', 'identity', 'session', 'token', 'mfa', 'security'],
        template: {
            topic: 'Authentication Strategy',
            summary: 'Phoenix connected the authentication decision to security findings, token lifecycle issues, and the compliance deadline for MFA and SSO adoption.',
            confidence: 90,
            evidenceChain: [
                { source: 'Security Review: session-handling audit', confidence: 94, type: 'meeting', excerpt: 'Weak token revocation was flagged as the top identity risk.' },
                { source: 'ADR-021: Auth Architecture', confidence: 88, type: 'adr', excerpt: 'OIDC + short-lived tokens + MFA was approved across all services.' },
                { source: 'Commit: sso_prototype', confidence: 91, type: 'commit', excerpt: 'The identity provider spike validated the mesh-wide flow.' },
                { source: 'Incident #118 postmortem', confidence: 80, type: 'message', excerpt: 'Expired-session bugs were traced to inconsistent enforcement.' },
            ],
            agents: [
                { id: 'a1', name: 'Knowledge Agent', role: 'Searches org knowledge graph', status: 'done', confidence: 93, finding: 'Found 11 auth-related nodes and 3 identity services' },
                { id: 'a2', name: 'Context Agent', role: 'Builds situational context', status: 'done', confidence: 87, finding: 'Compliance deadline and incident #118 drove urgency' },
                { id: 'a3', name: 'Evidence Agent', role: 'Gathers supporting evidence', status: 'done', confidence: 84, finding: 'Reviewed 5 security audits and 12 ADRs' },
                { id: 'a4', name: 'Relationship Agent', role: 'Maps knowledge dependencies', status: 'done', confidence: 81, finding: 'Auth touches all 8 services and 4 external integrations' },
                { id: 'a5', name: 'Synthesis Agent', role: 'Synthesizes final answer', status: 'done', confidence: 90, finding: 'OIDC with MFA was chosen for compliance and lifecycle control' },
                { id: 'a6', name: 'Decision Intelligence Agent', role: 'Correlates evidence & reconstructs decision history', status: 'done', confidence: 89, finding: 'Proprietary SSO rejected on vendor lock-in and audit risk' },
            ],
        },
    },
    {
        keys: ['who owns', 'ownership', 'owner'],
        template: {
            topic: 'Domain Ownership',
            summary: 'Phoenix mapped service ownership across teams and flag owners, and identified the concentrated single points of knowledge that need co-owners.',
            confidence: 87,
            evidenceChain: [
                { source: 'Ownership registry scan', confidence: 92, type: 'meeting', excerpt: 'Payments core is owned by a single engineer with no co-owner.' },
                { source: 'ADR-006: Service Ownership', confidence: 84, type: 'adr', excerpt: 'Two-person ownership was required but never enforced.' },
                { source: 'Repo: CODEOWNERS audit', confidence: 89, type: 'commit', excerpt: 'Payments and auth paths list only one owner each.' },
                { source: 'Slack #platform (Mike Ross)', confidence: 75, type: 'message', excerpt: 'I am the only reviewer on payments PRs.' },
            ],
            agents: [
                { id: 'a1', name: 'Knowledge Agent', role: 'Searches org knowledge graph', status: 'done', confidence: 92, finding: 'Found 5 ownership nodes with single-owner risk' },
                { id: 'a2', name: 'Context Agent', role: 'Builds situational context', status: 'done', confidence: 84, finding: 'Single-owner services align with the risk heatmap hotspots' },
                { id: 'a3', name: 'Evidence Agent', role: 'Gathers supporting evidence', status: 'done', confidence: 83, finding: 'Analyzed CODEOWNERS and 9 service registries' },
                { id: 'a4', name: 'Relationship Agent', role: 'Maps knowledge dependencies', status: 'done', confidence: 82, finding: 'Payments and auth have the highest knowledge concentration' },
                { id: 'a5', name: 'Synthesis Agent', role: 'Synthesizes final answer', status: 'done', confidence: 87, finding: 'Payments core: single owner, no co-owner, critical risk' },
                { id: 'a6', name: 'Decision Intelligence Agent', role: 'Correlates evidence & reconstructs decision history', status: 'done', confidence: 86, finding: 'Concentration risk tied to a single payments owner across systems' },
            ],
        },
    },
    {
        keys: ['payment', 'payments', 'billing', 'checkout', 'invoice', 'stripe', 'subscription', 'pricing'],
        template: {
            topic: 'Payments & Billing Platform',
            summary: 'Phoenix reconstructed the payments decision from billing gaps, provider benchmarks, and finance requirements for subscription billing and PCI compliance.',
            confidence: 91,
            evidenceChain: [
                { source: 'Finance Review: billing gaps', confidence: 93, type: 'meeting', excerpt: 'Manual billing and missing subscription models were the top gaps.' },
                { source: 'ADR-017: Payments Provider', confidence: 88, type: 'adr', excerpt: 'Provider delegation was selected to reduce PCI scope.' },
                { source: 'Benchmark: provider_spike.md', confidence: 90, type: 'commit', excerpt: 'The chosen provider met latency and webhook reliability targets.' },
                { source: 'Slack #payments (Mike Ross)', confidence: 76, type: 'message', excerpt: 'Cutting PCI scope alone justified the migration.' },
            ],
            agents: [
                { id: 'a1', name: 'Knowledge Agent', role: 'Searches org knowledge graph', status: 'done', confidence: 92, finding: 'Found 9 payments nodes across 2 repositories' },
                { id: 'a2', name: 'Context Agent', role: 'Builds situational context', status: 'done', confidence: 86, finding: 'Finance required subscription models before next fiscal' },
                { id: 'a3', name: 'Evidence Agent', role: 'Gathers supporting evidence', status: 'done', confidence: 85, finding: 'Analyzed billing logs and 6 provider benchmarks' },
                { id: 'a4', name: 'Relationship Agent', role: 'Maps knowledge dependencies', status: 'done', confidence: 80, finding: 'Billing depends on auth, inventory, and finance systems' },
                { id: 'a5', name: 'Synthesis Agent', role: 'Synthesizes final answer', status: 'done', confidence: 91, finding: 'Provider delegation minimized PCI scope and enabled subscriptions' },
                { id: 'a6', name: 'Decision Intelligence Agent', role: 'Correlates evidence & reconstructs decision history', status: 'done', confidence: 90, finding: 'Payments cutover validated zero-downtime billing migration' },
            ],
        },
    },
    {
        keys: ['cloud', 'aws', 'azure', 'gcp', 'k8s', 'kubernetes', 'docker', 'deploy', 'infra', 'hosting', 'server'],
        template: {
            topic: 'Infrastructure & Hosting',
            summary: 'Phoenix linked the hosting decision to cost reviews, availability targets, and the SRE requirement for multi-region failover and infrastructure-as-code.',
            confidence: 89,
            evidenceChain: [
                { source: 'Cost Review: cloud spend Q1', confidence: 92, type: 'meeting', excerpt: 'Single-region spend and manual provisioning were flagged.' },
                { source: 'ADR-019: Hosting Strategy', confidence: 87, type: 'adr', excerpt: 'Multi-region IaC with autoscaling was approved.' },
                { source: 'Commit: iaac_module_spike', confidence: 90, type: 'commit', excerpt: 'Provisioning spikes validated failover and autoscaling.' },
                { source: 'SRE runbook review', confidence: 79, type: 'message', excerpt: 'Monitoring coverage needed improvement before migration.' },
            ],
            agents: [
                { id: 'a1', name: 'Knowledge Agent', role: 'Searches org knowledge graph', status: 'done', confidence: 91, finding: 'Found 14 infrastructure nodes across 3 environments' },
                { id: 'a2', name: 'Context Agent', role: 'Builds situational context', status: 'done', confidence: 85, finding: 'Availability target required multi-region failover' },
                { id: 'a3', name: 'Evidence Agent', role: 'Gathers supporting evidence', status: 'done', confidence: 83, finding: 'Reviewed cloud billing exports and 4 IaC diffs' },
                { id: 'a4', name: 'Relationship Agent', role: 'Maps knowledge dependencies', status: 'done', confidence: 81, finding: 'All services depend on the shared hosting platform' },
                { id: 'a5', name: 'Synthesis Agent', role: 'Synthesizes final answer', status: 'done', confidence: 89, finding: 'IaC multi-region hosting reduced cost and met SLOs' },
                { id: 'a6', name: 'Decision Intelligence Agent', role: 'Correlates evidence & reconstructs decision history', status: 'done', confidence: 90, finding: 'Single-region scale-up rejected; multi-region IaC approved by SRE' },
            ],
        },
    },
    {
        keys: ['outage', 'incident', 'downtime', 'crash', 'failure', 'postmortem', 'degrad'],
        template: {
            topic: 'Outage & Incident Analysis',
            summary: 'Phoenix correlated the outage with dependency chains, missing runbooks, and a change that shipped without a kill switch, and ranks the contributing factors by confidence.',
            confidence: 92,
            evidenceChain: [
                { source: 'Incident #203 timeline', confidence: 96, type: 'meeting', excerpt: 'Degradation began at 14:02 UTC after the 13:58 deployment.' },
                { source: 'Postmortem: payments outage', confidence: 90, type: 'adr', excerpt: 'Missing circuit breaker allowed cascading failure.' },
                { source: 'Commit: deploy at 13:58', confidence: 88, type: 'commit', excerpt: 'The change had no feature flag or progressive rollout.' },
                { source: 'Slack #incident (on-call)', confidence: 82, type: 'message', excerpt: 'No runbook existed for this dependency chain.' },
            ],
            agents: [
                { id: 'a1', name: 'Knowledge Agent', role: 'Searches org knowledge graph', status: 'done', confidence: 95, finding: 'Found 7 incident nodes across the dependency graph' },
                { id: 'a2', name: 'Context Agent', role: 'Builds situational context', status: 'done', confidence: 89, finding: 'Outage followed a deployment without progressive rollout' },
                { id: 'a3', name: 'Evidence Agent', role: 'Gathers supporting evidence', status: 'done', confidence: 87, finding: 'Correlated telemetry across 3 services and 14 log streams' },
                { id: 'a4', name: 'Relationship Agent', role: 'Maps knowledge dependencies', status: 'done', confidence: 84, finding: 'Payments → inventory → gateway cascaded to full outage' },
                { id: 'a5', name: 'Synthesis Agent', role: 'Synthesizes final answer', status: 'done', confidence: 92, finding: 'Unflagged deploy plus missing runbook caused the outage' },
                { id: 'a6', name: 'Decision Intelligence Agent', role: 'Correlates evidence & reconstructs decision history', status: 'done', confidence: 91, finding: 'Missing kill switch converted a minor bug into an incident' },
            ],
        },
    },
    {
        keys: ['feature flag', 'feature flag', 'unleash', 'flag', 'experiment', 'rollout', 'canary', 'a/b'],
        template: {
            topic: 'Feature Flag & Experimentation Platform',
            summary: 'Phoenix connected the flag platform decision to rollout incidents, the need for instant kill switches, and the shift to canary releases and safe experimentation.',
            confidence: 90,
            evidenceChain: [
                { source: 'Postmortem: rollout incident', confidence: 93, type: 'meeting', excerpt: 'Slow kill switches turned a minor bug into a production incident.' },
                { source: 'ADR-023: Flagging System', confidence: 88, type: 'adr', excerpt: 'Flag naming, ownership, expiry, and kill-switch policies defined.' },
                { source: 'Commit: flag_sdk_spike', confidence: 91, type: 'commit', excerpt: 'Evaluation latency stayed under the 5ms budget.' },
                { source: 'Slack #release (Priya Nair)', confidence: 77, type: 'message', excerpt: 'We need instant kill switches before the next release train.' },
            ],
            agents: [
                { id: 'a1', name: 'Knowledge Agent', role: 'Searches org knowledge graph', status: 'done', confidence: 93, finding: 'Found 449 flags and 12 rollout policies in the dataset' },
                { id: 'a2', name: 'Context Agent', role: 'Builds situational context', status: 'done', confidence: 86, finding: 'Rollout incident surfaced lack of instant kill switches' },
                { id: 'a3', name: 'Evidence Agent', role: 'Gathers supporting evidence', status: 'done', confidence: 85, finding: 'Analyzed 449 flag records and deployment logs' },
                { id: 'a4', name: 'Relationship Agent', role: 'Maps knowledge dependencies', status: 'done', confidence: 80, finding: 'Flag system connects to CI, dashboards, and experiments' },
                { id: 'a5', name: 'Synthesis Agent', role: 'Synthesizes final answer', status: 'done', confidence: 90, finding: 'Progressive rollout with kill switches became the standard' },
                { id: 'a6', name: 'Decision Intelligence Agent', role: 'Correlates evidence & reconstructs decision history', status: 'done', confidence: 89, finding: 'Manual release gates rejected; kill switches and canaries adopted' },
            ],
        },
    },
    {
        keys: ['exit', 'departure', 'leaving', 'resign', 'onboard', 'succession', 'replace', 'resilience', 'redundancy', 'bus factor', 'knowledge loss', 'backup', 'handover', 'knowledge transfer', 'mentor', 'who knows', 'who owns'],
        template: {
            topic: 'Employee Exit & Knowledge Resilience',
            summary: 'Phoenix combined workforce intelligence, the knowledge dependency graph, and the succession registry to project organizational knowledge loss, affected systems, replacement candidates, and transfer actions for the departure scenario.',
            confidence: 88,
            evidenceChain: [
                { source: 'Workforce intelligence snapshot', confidence: 92, type: 'meeting', excerpt: 'Ownership concentration and documentation readiness computed from the organizational brain.' },
                { source: 'Knowledge dependency graph', confidence: 89, type: 'adr', excerpt: 'Affected systems and downstream dependencies traced from owned systems and flag data.' },
                { source: 'Succession registry', confidence: 83, type: 'commit', excerpt: 'Replacement candidates ranked by expertise overlap and collaboration diversity.' },
                { source: 'Transfer plan', confidence: 80, type: 'message', excerpt: 'Documentation, co-owner, and pairing actions prioritized by projected loss.' },
            ],
            agents: [
                { id: 'a1', name: 'Knowledge Agent', role: 'Searches org knowledge graph', status: 'done', confidence: 91, finding: 'Found ownership and expertise nodes relevant to the departure' },
                { id: 'a2', name: 'Context Agent', role: 'Builds situational context', status: 'done', confidence: 84, finding: 'Framed the exit within team and delivery context' },
                { id: 'a3', name: 'Evidence Agent', role: 'Gathers supporting evidence', status: 'done', confidence: 85, finding: 'Collected flag, decision, and contribution evidence' },
                { id: 'a4', name: 'Relationship Agent', role: 'Maps knowledge dependencies', status: 'done', confidence: 86, finding: 'Traced affected systems and single-owner concentration' },
                { id: 'a5', name: 'Synthesis Agent', role: 'Synthesizes final answer', status: 'done', confidence: 88, finding: 'Weighted agents outputs into a resilience projection' },
                { id: 'a6', name: 'Decision Intelligence Agent', role: 'Correlates evidence & reconstructs decision history', status: 'done', confidence: 85, finding: 'Linked decisions authored by the departing employee' },
                { id: 'a7', name: 'Employee Exit Intelligence Agent', role: 'Coordinates departure simulations & resilience planning', status: 'done', confidence: 90, finding: 'Simulated exit and ranked successors and transfer actions' },
            ],
        },
    },
    {
        keys: ['risk', 'heatmap', 'exposure', 'spof', 'single point of failure', 'documentation coverage', 'concentration', 'at risk', 'risk profile', 'risk assessment', 'vulnerab', 'redundancy', 'criticality', 'bottleneck', 'bus factor'],
        template: {
            topic: 'Knowledge Risk & Resilience',
            summary: 'Phoenix computed per-node risk attributes from the organizational brain — documentation coverage, ownership concentration, dependency pressure, operational exposure — and projected 4-week trajectories with mitigation actions.',
            confidence: 89,
            evidenceChain: [
                { source: 'Risk intelligence graph', confidence: 91, type: 'meeting', excerpt: '13 risk attributes scored per node across systems, teams, and decisions.' },
                { source: 'Resilience snapshot', confidence: 88, type: 'adr', excerpt: 'Organizational resilience and bus-factor coverage derived from workforce intelligence.' },
                { source: 'Risk snapshot series', confidence: 84, type: 'commit', excerpt: '8 weekly snapshots power the predictive trend and trajectory forecasts.' },
                { source: 'Recommendation engine', confidence: 82, type: 'message', excerpt: 'Mitigation actions assigned to owners with priority and impact.' },
            ],
            agents: [
                { id: 'a1', name: 'Knowledge Agent', role: 'Searches org knowledge graph', status: 'done', confidence: 92, finding: 'Located 25 graph nodes and 26 edges for risk scoring' },
                { id: 'a2', name: 'Context Agent', role: 'Builds situational context', status: 'done', confidence: 85, finding: 'Framed current risk against the 8-week snapshot history' },
                { id: 'a3', name: 'Evidence Agent', role: 'Gathers supporting evidence', status: 'done', confidence: 83, finding: 'Correlated flag, decision, and dependency evidence per node' },
                { id: 'a4', name: 'Relationship Agent', role: 'Maps knowledge dependencies', status: 'done', confidence: 87, finding: 'Traced critical-dependency pressure and propagation edges' },
                { id: 'a5', name: 'Synthesis Agent', role: 'Synthesizes final answer', status: 'done', confidence: 90, finding: 'Weighted attributes into banded overall risk per node' },
                { id: 'a6', name: 'Decision Intelligence Agent', role: 'Correlates evidence & reconstructs decision history', status: 'done', confidence: 84, finding: 'Linked decisions to risk hotspots for impact narratives' },
                { id: 'a8', name: 'Risk Intelligence Agent', role: 'Computes organizational knowledge-risk heatmaps', status: 'done', confidence: 91, finding: 'Projected rising risk on critical nodes with evidence-backed mitigations' },
            ],
        },
    },
    {
        keys: ['documentation', 'runbook', 'runbooks', 'wiki', 'documented', 'documentation engine', 'knowledge publishing', 'generate documentation', 'docs for', 'how is documented'],
        template: {
            topic: 'Documentation & Knowledge Publishing',
            summary: 'Phoenix reviewed the documentation ecosystem against the organizational brain — completeness, freshness, consistency, ownership, and version history — and regenerated impacted documents from live evidence.',
            confidence: 88,
            evidenceChain: [
                { source: 'Documentation registry', confidence: 90, type: 'meeting', excerpt: 'Every document derives its content from the organizational brain, never from a parallel knowledge base.' },
                { source: 'Version history', confidence: 86, type: 'adr', excerpt: 'Each change supersedes the previous version and preserves an immutable audit trail.' },
                { source: 'Quality intelligence', confidence: 85, type: 'commit', excerpt: '11 quality dimensions are scored per document and rolled into a health score.' },
                { source: 'Event bus', confidence: 82, type: 'message', excerpt: 'Documentation evolution reacts to decision, mentor, fleet, and boot events.' },
            ],
            agents: [
                { id: 'a1', name: 'Knowledge Agent', role: 'Searches org knowledge graph', status: 'done', confidence: 92, finding: 'Located the knowledge nodes backing the documentation set' },
                { id: 'a2', name: 'Context Agent', role: 'Builds situational context', status: 'done', confidence: 85, finding: 'Framed which documents an event impacts and why' },
                { id: 'a3', name: 'Evidence Agent', role: 'Gathers supporting evidence', status: 'done', confidence: 84, finding: 'Collected decision, flag, and workforce evidence per document' },
                { id: 'a4', name: 'Relationship Agent', role: 'Maps knowledge dependencies', status: 'done', confidence: 83, finding: 'Linked documents to owning systems and the dependency graph' },
                { id: 'a5', name: 'Synthesis Agent', role: 'Synthesizes final answer', status: 'done', confidence: 88, finding: 'Weighted agent outputs into synchronized documentation sections' },
                { id: 'a6', name: 'Decision Intelligence Agent', role: 'Correlates evidence & reconstructs decision history', status: 'done', confidence: 86, finding: 'Traced decision history into ADR and release-note documents' },
                { id: 'a10', name: 'Documentation Intelligence Agent', role: 'Coordinates documentation generation, evolution, validation, and versioning', status: 'done', confidence: 90, finding: 'Regenerated impacted sections and published a new versioned document' },
            ],
        },
    },
];

function matchTemplate(query: string): ReasoningTemplate {
    const q = ` ${query.toLowerCase()} `;
    for (const entry of templates) {
        if (entry.keys.some((key) => q.includes(key))) {
            return entry.template;
        }
    }
    return defaultTemplate;
}

export function detectTopicContext(query: string) {
    const t = matchTemplate(query);
    return {
        topic: t.topic,
        confidence: t.confidence,
        summary: t.summary,
        evidenceChain: t.evidenceChain,
        agents: withFeatureAgents(t.agents, t.topic),
    };
}

export function getReasoningSnapshot(query: string): IntelligenceReasoningSnapshot {
    const t = matchTemplate(query);
    return {
        query,
        topic: t.topic,
        summary: t.summary,
        confidence: t.confidence,
        evidenceChain: t.evidenceChain,
        agents: withFeatureAgents(t.agents, t.topic),
    };
}

function withFeatureAgents(agents: IntelligenceReasoningSnapshot['agents'], topic: string) {
    let out = agents.some((a) => a.id === 'a7') ? agents : [...agents];
    if (topic === 'Employee Exit & Knowledge Resilience' && !out.some((a) => a.id === 'a7')) {
        out = [...out, exitAgentSnapshot];
    }
    if (topic === 'Knowledge Risk & Resilience' && !out.some((a) => a.id === 'a8')) {
        out = [...out, riskAgentSnapshot];
    }
    if (!out.some((a) => a.id === 'a9')) {
        out = [...out, mentorAgentSnapshot];
    }
    if (topic === 'Documentation & Knowledge Publishing' && !out.some((a) => a.id === 'a10')) {
        out = [...out, documentationAgentSnapshot];
    }
    if (!out.some((a) => a.id === 'a12')) {
        out = [...out, executiveAgentSnapshot];
    }
    if (!out.some((a) => a.id === 'a13')) {
        out = [...out, taskAgentSnapshot];
    }
    return out;
}
