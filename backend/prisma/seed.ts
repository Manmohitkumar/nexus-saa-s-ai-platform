// Project Phoenix — seed script.
// Populates the relational layer from the real feature-flag dataset plus
// derived organizational entities (employees, systems, graph nodes/edges).
// Run with: npx tsx prisma/seed.ts

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: join(process.cwd(), 'phoenix.db') }),
});

type RawFlag = {
    name?: string;
    type?: string;
    description?: string;
    enabled?: boolean;
    strategies?: Array<{ parameters?: { rollout?: string; stickiness?: string } }>;
    variants?: unknown[];
    impressionData?: boolean;
    createdAt?: string;
};

function loadFlags(): RawFlag[] {
    let raw: string;
    try {
        raw = readFileSync(join(__dirname, '..', 'src', 'phoenix', 'unleash.flags.json'), 'utf-8');
    } catch {
        raw = readFileSync(join(process.cwd(), 'src', 'phoenix', 'unleash.flags.json'), 'utf-8');
    }
    return Object.values(JSON.parse(raw) as Record<string, RawFlag>);
}

// Mirror of the backend classifier (phoenix.exit-sim.ts) so system mapping stays in sync.
const SYSTEM_PROFILES: { id: string; label: string; kind: string; keywords: string[] }[] = [
    { id: 'auth-service', label: 'Auth Service', kind: 'service', keywords: ['AUTH', 'SESSION', 'JWT', 'WORKOS', 'ACL', 'BANNED', 'COUNTRY_KILL', 'AUTO_BANNER', 'PLUS-ADDRESS', 'ROLE', 'PERMISSION', 'RBAC'] },
    { id: 'api-gateway', label: 'API Gateway', kind: 'service', keywords: ['API_SERVER', 'API_PROVIDER', 'API-TO-SESSION', 'HTTP_CLIENT', 'HTTP_2', 'SOFT_LIMIT', 'INFERENCE_API', 'PROXY_WEB', 'RESPONSES-API', 'USE_OPENAI', 'USE_ANTHROPIC', 'EXTERNAL_MODEL_STREAM', 'API-', 'CLIENT_'] },
    { id: 'payments', label: 'Payments & Billing', kind: 'service', keywords: ['PRICING', 'PAYMENT', 'BILLING', 'PREMIUM', 'CROSS_SELL', 'QUOTA', 'CREDITS_USED', 'CREDITS', 'PURCHASE', 'PLAN', 'SUBSCRIPTION', 'SERVER-SIDE-PRICING'] },
    { id: 'data-pipeline', label: 'Data Pipeline', kind: 'service', keywords: ['TELEMETRY', 'METRICS', 'EVENT', 'TRAJECTORY', 'PROFILING', 'RECORD_', 'RECORDING', 'SNAPSHOT', 'IMPLICIT', 'STREAM_USER', 'PERSIST_CODE', 'RANGE_TRACKING'] },
    { id: 'analytics', label: 'Analytics', kind: 'service', keywords: ['ANALYTICS', 'SEGMENT', 'ATTRIBUTION', 'SENTIMENT', 'SORT_EOM', 'RECOMMEND'] },
    { id: 'user-db', label: 'User Context & Memory', kind: 'database', keywords: ['MEMORY', 'MEMORIES', 'KNOWLEDGE', 'FAISS', 'EMBEDDING', 'USER_MEMORIES', 'KNOWLEDGE_BASE', 'SEARCH', 'WAVE_8_KNOWLEDGE'] },
    { id: 'infrastructure', label: 'Infrastructure', kind: 'service', keywords: ['LANGUAGE_SERVER', 'R2_', 'DEPLOYMENT', 'DSV', 'SIDECAR', 'PTY', 'TERMINAL', 'VSCODE', 'JETBRAINS', 'MIN_IDE', 'BROWSER_', 'LAUNCH_CHROME', 'CDP', 'GRPC', 'MCP', 'PROXY', 'WINDOWS', 'MINIMUM'] },
    { id: 'ci-cd', label: 'CI/CD & Releases', kind: 'service', keywords: ['AUTOUPDATE', 'VERSION', 'RELEASE', 'RATE_PROTECTION', 'CHECKPOINT', 'BACKFILL', 'FIREWORKS_ON_DEMAND'] },
    { id: 'monitoring', label: 'Monitoring & Reliability', kind: 'service', keywords: ['SENTRY', 'LIVENESS', 'SAMPLE_RATE', 'LOG_CODES', 'MORE_LOGGING', 'ERROR_SAMPLE', 'VERBOSE_ERRORS', 'CLEARCUT', 'LOGGING', 'RECORD_TAB_SLOW', 'SHOW_DEBUG'] },
];

function classify(name: string): string | null {
    const upper = name.toUpperCase();
    for (const s of SYSTEM_PROFILES) {
        if (s.keywords.some((k) => upper.includes(k))) return s.id;
    }
    return null;
}

const EMPLOYEES = [
    { name: 'Sarah Chen', role: 'Lead Architect', team: 'Platform', systems: ['auth-service', 'api-gateway', 'payments'] },
    { name: 'Mike Ross', role: 'Backend Lead', team: 'Data', systems: ['data-pipeline', 'analytics', 'user-db'] },
    { name: 'Alice Park', role: 'DevOps Engineer', team: 'Platform', systems: ['infrastructure', 'ci-cd', 'monitoring'] },
    { name: 'Jane Doe', role: 'Admin', team: 'Executive', systems: [] },
    { name: 'James Liu', role: 'Frontend Lead', team: 'Frontend', systems: ['api-gateway'] },
    { name: 'Priya Nair', role: 'Engineering Manager', team: 'Platform', systems: ['payments', 'ci-cd'] },
    { name: 'Lena Ortiz', role: 'Security Lead', team: 'Security', systems: ['auth-service'] },
    { name: 'Ilya Petrov', role: 'SRE Lead', team: 'Platform', systems: ['infrastructure', 'monitoring'] },
    { name: 'Rhea Kapoor', role: 'ML Lead', team: 'Data', systems: ['analytics', 'user-db'] },
];

// Feature 3 — workforce intelligence metadata reused by the Knowledge
// Dependency Engine, Simulation Engine, Succession Planning, and the
// organizational resilience services. Fields: expertise domains, tenure,
// mentorship influence, contributions, incidents resolved, code reviews,
// collaboration diversity, and how replaceable each person is today.
const WORKFORCE: Record<string, {
    expertise: string[];
    tenureYears: number;
    mentorship: number;
    contributions: number;
    incidentsResolved: number;
    codeReviews: number;
    collaborationPartners: number;
    successionReadiness: number;
    busFactor: number;
}> = {
    'Sarah Chen': { expertise: ['architecture', 'auth', 'api-design', 'postgres', 'platform'], tenureYears: 6, mentorship: 84, contributions: 512, incidentsResolved: 38, codeReviews: 640, collaborationPartners: 22, successionReadiness: 34, busFactor: 2 },
    'Mike Ross': { expertise: ['backend', 'data-pipeline', 'analytics', 'postgres', 'streaming'], tenureYears: 5, mentorship: 62, contributions: 486, incidentsResolved: 31, codeReviews: 410, collaborationPartners: 18, successionReadiness: 47, busFactor: 3 },
    'Alice Park': { expertise: ['devops', 'ci-cd', 'infrastructure', 'kubernetes', 'monitoring'], tenureYears: 4, mentorship: 71, contributions: 340, incidentsResolved: 44, codeReviews: 220, collaborationPartners: 15, successionReadiness: 52, busFactor: 3 },
    'Jane Doe': { expertise: ['operations', 'governance', 'finance'], tenureYears: 3, mentorship: 12, contributions: 40, incidentsResolved: 2, codeReviews: 0, collaborationPartners: 9, successionReadiness: 90, busFactor: 2 },
    'James Liu': { expertise: ['frontend', 'api-design', 'gateway', 'typescript', 'react'], tenureYears: 4, mentorship: 58, contributions: 402, incidentsResolved: 12, codeReviews: 360, collaborationPartners: 16, successionReadiness: 58, busFactor: 3 },
    'Priya Nair': { expertise: ['management', 'delivery', 'payments', 'release-governance'], tenureYears: 5, mentorship: 88, contributions: 95, incidentsResolved: 9, codeReviews: 140, collaborationPartners: 26, successionReadiness: 66, busFactor: 2 },
    'Lena Ortiz': { expertise: ['security', 'auth', 'threat-modeling', 'compliance'], tenureYears: 5, mentorship: 76, contributions: 210, incidentsResolved: 27, codeReviews: 480, collaborationPartners: 17, successionReadiness: 43, busFactor: 2 },
    'Ilya Petrov': { expertise: ['sre', 'infrastructure', 'observability', 'kubernetes', 'reliability'], tenureYears: 6, mentorship: 79, contributions: 356, incidentsResolved: 51, codeReviews: 300, collaborationPartners: 19, successionReadiness: 45, busFactor: 2 },
    'Rhea Kapoor': { expertise: ['ml', 'analytics', 'embeddings', 'evaluation', 'postgres'], tenureYears: 3, mentorship: 66, contributions: 262, incidentsResolved: 14, codeReviews: 190, collaborationPartners: 14, successionReadiness: 51, busFactor: 3 },
};

// Decision intelligence seed data (Feature 2). Relations target existing
// knowledge graph nodes by role: employee, system, document, meeting.
const DOC_NODES: Array<{ label: string; kind: string; summary: string }> = [
    { label: 'ADR-014: Database Selection', kind: 'document', summary: 'Architecture decision record comparing PostgreSQL, MySQL, and MongoDB for the events schema.' },
    { label: 'ADR-019: Hosting Strategy', kind: 'document', summary: 'Architecture decision record defining the multi-region IaC hosting strategy.' },
    { label: 'ADR-021: Auth Architecture', kind: 'document', summary: 'Architecture decision record approving OIDC, short-lived tokens, and MFA.' },
    { label: 'ADR-023: Flagging System', kind: 'document', summary: 'Architecture decision record defining flag lifecycle, ownership, and kill-switch policy.' },
    { label: 'Q2 Architecture Review', kind: 'meeting', summary: 'Quarterly review where the storage engine trade-offs were debated by the council.' },
    { label: 'Architecture Council Ruling', kind: 'meeting', summary: 'The council voted on benchmark evidence and ownership models.' },
    { label: 'Legacy Session Strategy', kind: 'document', summary: 'Previous authentication approach that the OIDC adoption replaced.' },
];

type DecisionSeed = {
    title: string;
    topic: string;
    domain: string;
    status: string;
    summary: string;
    businessContext: string;
    technicalContext: string;
    confidence: number;
    startedAt: string;
    decidedAt: string;
    implementedAt: string | null;
    createdBy: string;
    team: string;
    proposedBy: string;
    approvedBy: string;
    implementedBy: string;
    discussedIn: string;
    impacts: string[];
    dependsOn: string[]; // titles of other decision seeds
    alternatives: Array<{ label: string; status: string; rationale: string; votes: number; confidence: number }>;
    milestones: Array<{ label: string; phase: string; date: string; summary: string; evidenceSources: number }>;
    evidence: Array<{ sourceType: string; sourceRef: string; excerpt: string; confidence: number; date: string }>;
    outcomes: Array<{ metric: string; before: string; after: string; direction: string }>;
};

const DECISIONS: DecisionSeed[] = [
    {
        title: 'Migrate to PostgreSQL',
        topic: 'Data Store Selection',
        domain: 'database',
        status: 'validated',
        summary: 'Replaced the legacy store with PostgreSQL for JSONB support, advanced indexing, and read performance.',
        businessContext: 'Read-latency ceilings in the legacy store blocked the events schema and analytics roadmap.',
        technicalContext: 'JSONB, full-text search, and B-tree/GIN indexing were decisive against MySQL and MongoDB.',
        confidence: 93,
        startedAt: 'Apr 2022',
        decidedAt: 'May 2022',
        implementedAt: 'Sep 2022',
        createdBy: 'Sarah Chen',
        team: 'Platform',
        proposedBy: 'Sarah Chen',
        approvedBy: 'Sarah Chen',
        implementedBy: 'Mike Ross',
        discussedIn: 'Q2 Architecture Review',
        impacts: ['user-db', 'data-pipeline', 'analytics'],
        dependsOn: ['Adopt multi-region hosting & IaC'],
        alternatives: [
            { label: 'PostgreSQL', status: 'accepted', rationale: 'JSONB support, mature indexing, operational familiarity.', votes: 7, confidence: 93 },
            { label: 'MySQL', status: 'rejected', rationale: 'JSON handled as a hack; no real JSONB path for analytics.', votes: 2, confidence: 48 },
            { label: 'MongoDB', status: 'rejected', rationale: 'Consistency model added risk for transactional billing reads.', votes: 1, confidence: 41 },
        ],
        milestones: [
            { label: 'Capacity review of legacy store', phase: 'problem', date: 'Apr 2022', summary: 'The team measured read/write ceilings and surfaced performance blockers.', evidenceSources: 7 },
            { label: 'Benchmark spike: candidate engines', phase: 'evaluation', date: 'Apr 2022', summary: 'A benchmark harness compared candidates and produced reproducible numbers.', evidenceSources: 12 },
            { label: 'ADR-014: storage engine trade-offs', phase: 'discussion', date: 'May 2022', summary: 'The ADR captured JSON support, indexing, consistency, and cost trade-offs.', evidenceSources: 9 },
            { label: 'Architecture council ruling', phase: 'approval', date: 'May 2022', summary: 'The council voted on benchmark evidence and future schema requirements.', evidenceSources: 14 },
            { label: 'Migration playbook published', phase: 'implementation', date: 'Jun 2022', summary: 'A phased migration plan, rollback path, and validation checklist were written.', evidenceSources: 11 },
            { label: 'Store migration completed', phase: 'deployment', date: 'Sep 2022', summary: 'The migration landed in production with zero downtime.', evidenceSources: 18 },
            { label: 'Post-migration validation', phase: 'outcome', date: 'Oct 2022', summary: 'Read p95 latency dropped and the events schema shipped on JSONB.', evidenceSources: 16 },
        ],
        evidence: [
            { sourceType: 'meeting', sourceRef: 'Q2 Architecture Review', excerpt: 'The team agreed JSONB support was critical for the new events schema.', confidence: 95, date: 'Apr 2022' },
            { sourceType: 'adr', sourceRef: 'ADR-014', excerpt: 'PostgreSQL was selected for JSONB, full-text search, and advanced indexing.', confidence: 89, date: 'May 2022' },
            { sourceType: 'commit', sourceRef: 'benchmark/pg_vs_mysql_q2.md', excerpt: 'PostgreSQL delivered a 3.2x advantage on the team-specific read workload.', confidence: 92, date: 'Apr 2022' },
            { sourceType: 'message', sourceRef: '#eng-arch (Sarah Chen)', excerpt: "MySQL's JSON support was a hack. We needed a real JSONB path.", confidence: 78, date: 'Apr 2022' },
        ],
        outcomes: [
            { metric: 'Read p95 latency', before: '420ms', after: '85ms', direction: 'improved' },
            { metric: 'Storage cost', before: '$1.2k/mo', after: '$640/mo', direction: 'improved' },
            { metric: 'Events schema delivery', before: 'blocked', after: 'shipped on JSONB', direction: 'improved' },
        ],
    },
    {
        title: 'Adopt OIDC & MFA Authentication',
        topic: 'Authentication Strategy',
        domain: 'auth',
        status: 'implemented',
        summary: 'Standardized on OIDC with short-lived tokens and phased MFA rollout across every service.',
        businessContext: 'Weak session enforcement and expired-token handling risked a compliance deadline for MFA/SSO.',
        technicalContext: 'OIDC + short-lived access tokens with refresh rotation; MFA enforced on privileged flows.',
        confidence: 90,
        startedAt: 'Jan 2023',
        decidedAt: 'Feb 2023',
        implementedAt: 'May 2023',
        createdBy: 'Lena Ortiz',
        team: 'Security',
        proposedBy: 'Lena Ortiz',
        approvedBy: 'Lena Ortiz',
        implementedBy: 'Alice Park',
        discussedIn: 'Architecture Council Ruling',
        impacts: ['auth-service', 'api-gateway'],
        dependsOn: ['Introduce API Gateway'],
        alternatives: [
            { label: 'OIDC + MFA', status: 'accepted', rationale: 'Interoperable standard, mature libraries, meets compliance.', votes: 8, confidence: 90 },
            { label: 'Proprietary SSO', status: 'rejected', rationale: 'Vendor lock-in and weaker audit trail for the compliance review.', votes: 1, confidence: 44 },
        ],
        milestones: [
            { label: 'Security review flags auth gaps', phase: 'problem', date: 'Jan 2023', summary: 'A threat-model session identified weaknesses in session handling and token lifecycle.', evidenceSources: 6 },
            { label: 'Prototype: token + SSO integration', phase: 'evaluation', date: 'Jan 2023', summary: 'A spike proved the identity provider and token format worked across the service mesh.', evidenceSources: 10 },
            { label: 'ADR-021: auth architecture', phase: 'discussion', date: 'Feb 2023', summary: 'The ADR compared OAuth/OIDC options, token expiry, and MFA rollout.', evidenceSources: 9 },
            { label: 'Security sign-off meeting', phase: 'approval', date: 'Feb 2023', summary: 'Security approved the approach after a threat-model walkthrough.', evidenceSources: 13 },
            { label: 'Migration runbook published', phase: 'implementation', date: 'Mar 2023', summary: 'Session migration, revocation, and fallback instructions were documented.', evidenceSources: 11 },
            { label: 'Auth rollout completed', phase: 'deployment', date: 'May 2023', summary: 'All services migrated; login telemetry confirmed fewer auth incidents.', evidenceSources: 17 },
        ],
        evidence: [
            { sourceType: 'meeting', sourceRef: 'Security Review: session-handling audit', excerpt: 'Weak token revocation was flagged as the top identity risk.', confidence: 94, date: 'Jan 2023' },
            { sourceType: 'adr', sourceRef: 'ADR-021', excerpt: 'OIDC + short-lived tokens + MFA was approved across all services.', confidence: 88, date: 'Feb 2023' },
        ],
        outcomes: [
            { metric: 'Auth incidents / month', before: '6', after: '1', direction: 'improved' },
            { metric: 'Compliance MFA coverage', before: '0%', after: '100%', direction: 'improved' },
        ],
    },
    {
        title: 'Introduce API Gateway',
        topic: 'API Design & Gateway',
        domain: 'api',
        status: 'validated',
        summary: 'Consolidated routing, auth, and rate limiting behind a single gateway with versioned contracts.',
        businessContext: 'Duplicated auth logic and inconsistent contracts across services raised maintenance cost.',
        technicalContext: 'Gateway centralizes auth enforcement, rate limiting, and API versioning semantics.',
        confidence: 89,
        startedAt: 'Aug 2022',
        decidedAt: 'Sep 2022',
        implementedAt: 'Dec 2022',
        createdBy: 'James Liu',
        team: 'Frontend',
        proposedBy: 'James Liu',
        approvedBy: 'Sarah Chen',
        implementedBy: 'James Liu',
        discussedIn: 'Architecture Council Ruling',
        impacts: ['api-gateway', 'auth-service', 'payments'],
        dependsOn: ['Adopt multi-region hosting & IaC'],
        alternatives: [
            { label: 'Central gateway', status: 'accepted', rationale: 'Single enforcement point for auth and rate limits.', votes: 6, confidence: 89 },
            { label: 'Per-service edge', status: 'rejected', rationale: 'Kept duplication and drifted enforcement across teams.', votes: 2, confidence: 47 },
        ],
        milestones: [
            { label: 'API consistency review', phase: 'problem', date: 'Aug 2022', summary: 'Teams catalogued endpoint inconsistencies and duplication.', evidenceSources: 7 },
            { label: 'Gateway prototype', phase: 'evaluation', date: 'Aug 2022', summary: 'A prototype consolidated routing, auth, and rate limiting.', evidenceSources: 11 },
            { label: 'ADR: API contract', phase: 'discussion', date: 'Sep 2022', summary: 'The ADR defined versioning, error semantics, and pagination.', evidenceSources: 9 },
            { label: 'Cross-team API council', phase: 'approval', date: 'Sep 2022', summary: 'Every squad agreed on the contract and the migration window.', evidenceSources: 13 },
            { label: 'API reference docs', phase: 'implementation', date: 'Oct 2022', summary: 'Versioned API docs and migration guides were published.', evidenceSources: 12 },
            { label: 'Gateway GA rollout', phase: 'deployment', date: 'Dec 2022', summary: 'Traffic migrated with canary rollout and no breaking changes.', evidenceSources: 16 },
        ],
        evidence: [
            { sourceType: 'meeting', sourceRef: 'Cross-team API council', excerpt: 'Teams agreed to route all traffic through the gateway within a quarter.', confidence: 91, date: 'Sep 2022' },
            { sourceType: 'commit', sourceRef: 'gateway/canary_rollout', excerpt: 'Canary migration completed with zero breaking changes observed.', confidence: 87, date: 'Dec 2022' },
        ],
        outcomes: [
            { metric: 'Duplicate auth logic', before: '6 copies', after: '1', direction: 'improved' },
            { metric: 'Contract drift incidents', before: '12/mo', after: '2/mo', direction: 'improved' },
        ],
    },
    {
        title: 'Adopt multi-region hosting & IaC',
        topic: 'Infrastructure & Hosting',
        domain: 'infrastructure',
        status: 'validated',
        summary: 'Moved workloads to multi-region infrastructure-as-code with autoscaling and failover runbooks.',
        businessContext: 'Rising single-region cost and an availability target required multi-region failover.',
        technicalContext: 'IaC modules provision regions, autoscaling, and observability with runbook coverage.',
        confidence: 91,
        startedAt: 'Mar 2022',
        decidedAt: 'Apr 2022',
        implementedAt: 'Jul 2022',
        createdBy: 'Ilya Petrov',
        team: 'Platform',
        proposedBy: 'Ilya Petrov',
        approvedBy: 'Ilya Petrov',
        implementedBy: 'Alice Park',
        discussedIn: 'Q2 Architecture Review',
        impacts: ['infrastructure', 'ci-cd', 'monitoring'],
        dependsOn: [],
        alternatives: [
            { label: 'Multi-region IaC', status: 'accepted', rationale: 'Autoscaling, failover drills, and cost guardrails in code.', votes: 8, confidence: 91 },
            { label: 'Single-region scale-up', status: 'rejected', rationale: 'Did not meet the availability target; kept blast radius large.', votes: 1, confidence: 39 },
        ],
        milestones: [
            { label: 'Infrastructure cost review', phase: 'problem', date: 'Mar 2022', summary: 'The team audited cloud spend, utilization, and single-region risk.', evidenceSources: 6 },
            { label: 'Provisioning spike', phase: 'evaluation', date: 'Mar 2022', summary: 'IaC spikes validated autoscaling and multi-region failover behavior.', evidenceSources: 10 },
            { label: 'ADR-019: hosting strategy', phase: 'discussion', date: 'Apr 2022', summary: 'The ADR documented provider, region strategy, and cost guardrails.', evidenceSources: 9 },
            { label: 'SRE readiness review', phase: 'approval', date: 'Apr 2022', summary: 'SRE validated runbooks, monitoring coverage, and failover drills.', evidenceSources: 12 },
            { label: 'Infra runbooks written', phase: 'implementation', date: 'May 2022', summary: 'Deployment, scaling, and incident runbooks were published.', evidenceSources: 11 },
            { label: 'Infra migration complete', phase: 'deployment', date: 'Jul 2022', summary: 'All workloads moved with p95 latency and cost within target.', evidenceSources: 18 },
        ],
        evidence: [
            { sourceType: 'meeting', sourceRef: 'Cost Review: cloud spend Q1', excerpt: 'Single-region spend and manual provisioning were flagged.', confidence: 92, date: 'Mar 2022' },
            { sourceType: 'adr', sourceRef: 'ADR-019', excerpt: 'Multi-region IaC with autoscaling was approved.', confidence: 87, date: 'Apr 2022' },
        ],
        outcomes: [
            { metric: 'Deploy time', before: '45m', after: '9m', direction: 'improved' },
            { metric: 'Availability', before: '99.9%', after: '99.99%', direction: 'improved' },
            { metric: 'Cloud cost', before: 'rising', after: '-18% q/q', direction: 'improved' },
        ],
    },
    {
        title: 'Feature Flag & Experimentation Platform',
        topic: 'Feature Flag & Experimentation Platform',
        domain: 'flags',
        status: 'implemented',
        summary: 'Standardized on progressive rollout and kill switches after a rollout incident.',
        businessContext: 'Irreversible rollouts and slow kill switches turned a minor bug into a production incident.',
        technicalContext: 'Flag naming, ownership, expiry, and kill-switch policies defined; 449 flags tracked.',
        confidence: 90,
        startedAt: 'Nov 2022',
        decidedAt: 'Dec 2022',
        implementedAt: 'Feb 2023',
        createdBy: 'Priya Nair',
        team: 'Platform',
        proposedBy: 'Priya Nair',
        approvedBy: 'Sarah Chen',
        implementedBy: 'Alice Park',
        discussedIn: 'Architecture Council Ruling',
        impacts: ['ci-cd', 'api-gateway'],
        dependsOn: ['Adopt multi-region hosting & IaC'],
        alternatives: [
            { label: 'Open-source flag SDK + kill switches', status: 'accepted', rationale: 'Instant rollback and progressive rollout at low latency.', votes: 9, confidence: 90 },
            { label: 'Manual release gates', status: 'rejected', rationale: 'Did not provide instant kill switches or experiment support.', votes: 0, confidence: 35 },
        ],
        milestones: [
            { label: 'Rollout incident postmortem', phase: 'problem', date: 'Nov 2022', summary: 'A bad rollout exposed the lack of fine-grained release controls.', evidenceSources: 8 },
            { label: 'Flag platform spike', phase: 'evaluation', date: 'Nov 2022', summary: 'An evaluation harness confirmed the flag SDK met latency needs.', evidenceSources: 11 },
            { label: 'ADR-023: flagging system', phase: 'discussion', date: 'Dec 2022', summary: 'The ADR defined flag naming, ownership, expiry, and kill-switch policy.', evidenceSources: 9 },
            { label: 'Release train governance', phase: 'approval', date: 'Dec 2022', summary: 'Platform agreed on progressive rollout percentages and approval gates.', evidenceSources: 13 },
            { label: 'Flag documentation & playbook', phase: 'implementation', date: 'Jan 2023', summary: 'Engineers received the flag lifecycle guide with kill-switch examples.', evidenceSources: 10 },
            { label: 'Flags platform GA', phase: 'deployment', date: 'Feb 2023', summary: 'Canary rollouts and kill switches went live; incidents dropped sharply.', evidenceSources: 17 },
        ],
        evidence: [
            { sourceType: 'meeting', sourceRef: 'Postmortem: rollout incident', excerpt: 'Slow kill switches turned a minor bug into a production incident.', confidence: 93, date: 'Nov 2022' },
            { sourceType: 'adr', sourceRef: 'ADR-023', excerpt: 'Flag naming, ownership, expiry, and kill-switch policies defined.', confidence: 88, date: 'Dec 2022' },
            { sourceType: 'jira', sourceRef: 'PLAT-441', excerpt: '449 flags tracked across 9 systems in the Unleash dataset.', confidence: 91, date: 'Feb 2023' },
        ],
        outcomes: [
            { metric: 'Rollout incidents', before: '5/q', after: '0/q', direction: 'improved' },
            { metric: 'Avg rollback time', before: '18m', after: '<1m', direction: 'improved' },
        ],
    },
    {
        title: 'AI Platform Adoption',
        topic: 'AI & ML Platform Adoption',
        domain: 'ai',
        status: 'approved',
        summary: 'Approved the AI platform direction with shadow-mode validation and model governance.',
        businessContext: 'High-value AI use cases needed an evaluation framework and compliance guardrails.',
        technicalContext: 'Model providers, guardrails, and data handling policies locked in ADR; shadow mode first.',
        confidence: 88,
        startedAt: 'Mar 2023',
        decidedAt: 'Apr 2023',
        implementedAt: null,
        createdBy: 'Rhea Kapoor',
        team: 'Data',
        proposedBy: 'Rhea Kapoor',
        approvedBy: 'Rhea Kapoor',
        implementedBy: 'Mike Ross',
        discussedIn: 'Q2 Architecture Review',
        impacts: ['analytics', 'user-db'],
        dependsOn: ['Feature Flag & Experimentation Platform', 'Introduce API Gateway'],
        alternatives: [
            { label: 'Shadow-mode AI platform', status: 'accepted', rationale: 'Safe rollout behind flags with model governance from day one.', votes: 7, confidence: 88 },
            { label: 'Direct feature rollout', status: 'rejected', rationale: 'No evaluation harness or compliance review before GA.', votes: 1, confidence: 40 },
        ],
        milestones: [
            { label: 'AI opportunity workshop', phase: 'problem', date: 'Mar 2023', summary: 'Teams ranked high-value AI use cases and agreed on evaluation criteria.', evidenceSources: 7 },
            { label: 'Model evaluation spike', phase: 'evaluation', date: 'Mar 2023', summary: 'Candidate models were benchmarked on latency, cost, and accuracy.', evidenceSources: 13 },
            { label: 'ADR: AI platform', phase: 'discussion', date: 'Apr 2023', summary: 'The ADR locked model providers, guardrails, and data handling.', evidenceSources: 9 },
            { label: 'Risk & compliance review', phase: 'approval', date: 'Apr 2023', summary: 'Legal and security signed off on data boundaries and output filtering.', evidenceSources: 12 },
            { label: 'ML governance docs', phase: 'implementation', date: 'May 2023', summary: 'Model cards, evaluation reports, and rollout playbooks published.', evidenceSources: 10 },
        ],
        evidence: [
            { sourceType: 'meeting', sourceRef: 'Risk & compliance review', excerpt: 'Data boundaries and output filtering approved for GA path.', confidence: 90, date: 'Apr 2023' },
            { sourceType: 'commit', sourceRef: 'eval/model_benchmarks', excerpt: 'Candidate models benchmarked; latency and cost within guardrails.', confidence: 88, date: 'Mar 2023' },
        ],
        outcomes: [
            { metric: 'Model eval latency', before: 'n/a', after: '<800ms p95', direction: 'improved' },
        ],
    },
];

async function main() {
    await prisma.riskSnapshot.deleteMany();
    await prisma.knowledgeTransferAction.deleteMany();
    await prisma.exitSimulationRun.deleteMany();
    await prisma.decisionRelation.deleteMany();
    await prisma.decisionOutcome.deleteMany();
    await prisma.decisionMilestone.deleteMany();
    await prisma.decisionEvidence.deleteMany();
    await prisma.decisionAlternative.deleteMany();
    await prisma.decisionRecord.deleteMany();
    await prisma.knowledgeEdge.deleteMany();
    await prisma.knowledgeNode.deleteMany();
    await prisma.featureFlag.deleteMany();
    await prisma.system.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.user.deleteMany();

    // Employees
    const employees: Record<string, string> = {};
    const employeeNodes: Record<string, string> = {};
    for (const e of EMPLOYEES) {
        const wf = WORKFORCE[e.name];
        const created = await prisma.employee.create({
            data: {
                name: e.name,
                role: e.role,
                team: e.team,
                risk: 50,
                systems: JSON.stringify(e.systems),
                tenureYears: wf.tenureYears,
                expertise: JSON.stringify(wf.expertise),
                mentorship: wf.mentorship,
                contributions: wf.contributions,
                incidentsResolved: wf.incidentsResolved,
                codeReviews: wf.codeReviews,
                collaborationPartners: wf.collaborationPartners,
                successionReadiness: wf.successionReadiness,
                busFactor: wf.busFactor,
            },
        });
        employees[e.name] = created.id;
        // Every employee is also a node in the knowledge graph.
        const node = await prisma.knowledgeNode.create({
            data: {
                label: e.name,
                kind: 'employee',
                risk: 'low',
                summary: `${e.role} on the ${e.team} team.`,
                ownerId: created.id,
                metadata: JSON.stringify({ team: e.team }),
            },
        });
        employeeNodes[e.name] = node.id;
    }

    // Systems + node per system
    const systemIds: Record<string, string> = {};
    const systemNodes: Record<string, string> = {};
    for (const s of SYSTEM_PROFILES) {
        const sys = await prisma.system.create({ data: { name: s.id, kind: s.kind, risk: 'medium' } });
        systemIds[s.id] = sys.id;
        const ownerName = EMPLOYEES.find((e) => e.systems.includes(s.id))?.name;
        const node = await prisma.knowledgeNode.create({
            data: {
                label: s.label,
                kind: s.kind,
                risk: 'medium',
                summary: `${s.label} system tracked from the feature-flag dataset.`,
                systemId: sys.id,
                ownerId: ownerName ? employees[ownerName] : null,
                metadata: JSON.stringify({ system: s.id }),
            },
        });
        systemNodes[s.id] = node.id;
    }

    // Document + meeting knowledge nodes (anchors for decision evidence)
    const docNodes: Record<string, string> = {};
    for (const d of DOC_NODES) {
        const node = await prisma.knowledgeNode.create({
            data: {
                label: d.label,
                kind: d.kind,
                risk: 'low',
                summary: d.summary,
                metadata: JSON.stringify({ source: 'decision-intelligence' }),
            },
        });
        docNodes[d.label] = node.id;
    }

    // Flags → systems
    let undocumented = 0;
    for (const raw of loadFlags()) {
        const name = raw.name ?? '';
        const systemId = classify(name) ? systemIds[classify(name)!] : null;
        if (!raw.description) undocumented++;
        await prisma.featureFlag.create({
            data: {
                name,
                type: raw.type ?? 'release',
                description: raw.description ?? '',
                enabled: !!raw.enabled,
                rollout: Number(raw.strategies?.[0]?.parameters?.rollout ?? 100),
                stickiness: raw.strategies?.[0]?.parameters?.stickiness ?? 'default',
                variants: raw.variants?.length ?? 0,
                impressionData: !!raw.impressionData,
                createdAt: raw.createdAt ?? '',
                systemId,
            },
        });
    }

    // Graph edges between systems: auth→gateway, gateway→payments, pipeline→analytics, etc.
    const edges: [string, string, string][] = [
        ['api-gateway', 'auth-service', 'depends_on'],
        ['api-gateway', 'payments', 'depends_on'],
        ['payments', 'user-db', 'depends_on'],
        ['data-pipeline', 'analytics', 'feeds'],
        ['data-pipeline', 'user-db', 'feeds'],
        ['monitoring', 'api-gateway', 'monitors'],
        ['infrastructure', 'ci-cd', 'runs'],
        ['ci-cd', 'api-gateway', 'deploys'],
        ['auth-service', 'user-db', 'uses'],
    ];
    for (const [from, to, type] of edges) {
        const fromNode = await prisma.knowledgeNode.findFirst({ where: { systemId: systemIds[from] } });
        const toNode = await prisma.knowledgeNode.findFirst({ where: { systemId: systemIds[to] } });
        if (fromNode && toNode) {
            await prisma.knowledgeEdge.create({ data: { type, sourceId: fromNode.id, targetId: toNode.id } });
        }
    }

    // Owner edges: employee node → system nodes they own
    for (const e of EMPLOYEES) {
        const empNode = await prisma.knowledgeNode.findFirst({ where: { ownerId: employees[e.name] } });
        if (!empNode) continue;
        for (const sysId of e.systems) {
            const sysNode = await prisma.knowledgeNode.findFirst({ where: { systemId: systemIds[sysId] } });
            if (sysNode) {
                await prisma.knowledgeEdge.create({ data: { type: 'owns', sourceId: empNode.id, targetId: sysNode.id } });
            }
        }
    }

    // Decision records (Feature 2 — Decision Time Machine)
    const decisionIds: Record<string, string> = {};
    for (const d of DECISIONS) {
        const record = await prisma.decisionRecord.create({
            data: {
                title: d.title,
                topic: d.topic,
                domain: d.domain,
                status: d.status,
                summary: d.summary,
                businessContext: d.businessContext,
                technicalContext: d.technicalContext,
                confidence: d.confidence,
                startedAt: d.startedAt,
                decidedAt: d.decidedAt,
                implementedAt: d.implementedAt,
                createdBy: d.createdBy,
                team: d.team,
            },
        });
        decisionIds[d.title] = record.id;

        await prisma.decisionAlternative.createMany({
            data: d.alternatives.map((a, i) => ({ decisionId: record.id, ...a, order: i })),
        });
        await prisma.decisionEvidence.createMany({
            data: d.evidence.map((e) => ({ decisionId: record.id, ...e })),
        });
        await prisma.decisionMilestone.createMany({
            data: d.milestones.map((m, i) => ({ decisionId: record.id, ...m, order: i })),
        });
        await prisma.decisionOutcome.createMany({
            data: d.outcomes.map((o) => ({ decisionId: record.id, ...o })),
        });

        const relations: Array<{ type: string; targetType: string; targetId: string; targetLabel: string }> = [
            { type: 'proposed_by', targetType: 'knowledge', targetId: employeeNodes[d.proposedBy], targetLabel: d.proposedBy },
            { type: 'approved_by', targetType: 'knowledge', targetId: employeeNodes[d.approvedBy], targetLabel: d.approvedBy },
            { type: 'implemented_by', targetType: 'knowledge', targetId: employeeNodes[d.implementedBy], targetLabel: d.implementedBy },
            { type: 'discussed_in', targetType: 'knowledge', targetId: docNodes[d.discussedIn], targetLabel: d.discussedIn },
            ...d.impacts.map((s) => ({ type: 'impacts', targetType: 'knowledge', targetId: systemNodes[s], targetLabel: s })),
        ];
        for (const rel of relations) {
            if (!rel.targetId) continue;
            await prisma.decisionRelation.create({ data: { decisionId: record.id, ...rel } });
        }
    }

    // Decision → decision dependencies (depends_on) using the seeded id map
    for (const d of DECISIONS) {
        for (const dep of d.dependsOn) {
            const targetId = decisionIds[dep];
            if (targetId) {
                await prisma.decisionRelation.create({
                    data: {
                        decisionId: decisionIds[d.title],
                        type: 'depends_on',
                        targetType: 'decision',
                        targetId,
                        targetLabel: dep,
                    },
                });
            }
        }
    }

    // Admin user for real auth
    const { hash } = require('bcrypt');
    await prisma.user.upsert({
        where: { email: 'admin@phoenix.dev' },
        update: {},
        create: {
            email: 'admin@phoenix.dev',
            name: 'Jane Doe',
            passwordHash: await hash('admin123', 10),
            role: 'admin',
        },
    });

    // Feature 4 — historical risk snapshots for the Risk Timeline Viewer.
    // Derived values trend from "healthier past" to the current computed state
    // so predictive analytics can compare organizational risk over time.
    const historyWeeks = 8;
    for (let i = historyWeeks; i >= 1; i--) {
        const t = (historyWeeks - i) / historyWeeks; // 0 (oldest) .. ~0.875 (latest)
        await prisma.riskSnapshot.create({
            data: {
                orgResilience: Math.round(60 - t * 9),
                averageRisk: Math.round(38 + t * 10),
                documentationCoverage: Math.round(48 - t * 6),
                knowledgeConcentration: Math.round(40 + t * 9),
                technicalDebt: Math.round(34 + t * 12),
                singleOwnerSystems: 1,
                undocumentedFlags: 342,
                criticalNodes: 2,
                metrics: JSON.stringify({ seed: true, week: historyWeeks - i + 1 }),
                createdAt: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000),
            },
        });
    }

    const flagCount = await prisma.featureFlag.count();
    const nodeCount = await prisma.knowledgeNode.count();
    const edgeCount = await prisma.knowledgeEdge.count();
    const decisionCount = await prisma.decisionRecord.count();
    const snapshotCount = await prisma.riskSnapshot.count();
    console.log(`Seeded: ${flagCount} flags (${undocumented} undocumented), ${nodeCount} graph nodes, ${edgeCount} edges, ${EMPLOYEES.length} employees, ${decisionCount} decisions, ${snapshotCount} risk snapshots, 1 admin user.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
