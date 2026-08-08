import {
    ArchitectureWorkflow,
    BrainGraphView,
    BrainNode,
    DecisionTimelineEvent,
    DocumentContent,
    DocumentContentSection,
    DocumentationItem,
    ExecutiveBrief,
    ExitSimulationProfile,
    ExitSimulationRecommendation,
    ExitSimulationScenario,
    HeatmapCell,
    IntelligenceAgent,
    IntelligenceEvidenceItem,
    IntelligenceInsights,
    IntelligenceOverview,
    IntelligenceFinding,
    LearningPath,
    MentorPrompt,
    RiskLevel,
} from './phoenix.types';

const brainNodes: BrainNode[] = [
    { id: 'svc-auth', label: 'Auth Service', kind: 'service', owner: 'Sarah Chen', risk: 'high' as RiskLevel },
    { id: 'svc-payments', label: 'Payments Core', kind: 'service', owner: 'Mike Ross', risk: 'critical' as RiskLevel },
    { id: 'repo-frontend', label: 'Frontend Repository', kind: 'repository', owner: 'James Liu', risk: 'medium' as RiskLevel },
    { id: 'db-analytics', label: 'Analytics DB', kind: 'database', owner: 'Mike Ross', risk: 'medium' as RiskLevel },
    { id: 'team-platform', label: 'Platform Team', kind: 'team', risk: 'high' as RiskLevel },
    { id: 'person-sarah', label: 'Sarah Chen', kind: 'person', risk: 'high' as RiskLevel },
];

export function getBrainGraphView(): BrainGraphView {
    const connectionMap: Record<string, string[]> = {
        'svc-auth': ['svc-payments', 'db-analytics', 'team-platform'],
        'svc-payments': ['svc-auth', 'repo-frontend', 'db-analytics'],
        'repo-frontend': ['svc-auth', 'svc-payments'],
        'db-analytics': ['svc-auth', 'svc-payments', 'team-platform'],
        'team-platform': ['svc-auth', 'repo-frontend', 'person-sarah'],
        'person-sarah': ['svc-auth', 'team-platform'],
    };

    return {
        nodes: brainNodes.map((node) => ({
            ...node,
            connections: connectionMap[node.id] ?? [],
        })),
        summary: {
            services: brainNodes.filter((node) => node.kind === 'service').length,
            repositories: brainNodes.filter((node) => node.kind === 'repository').length,
            dependencies: brainNodes.reduce((sum, node) => sum + (connectionMap[node.id] ?? []).length, 0),
            knowledgeNodes: brainNodes.length + 42,
        },
    };
}

export function getDecisionTimelineData(): DecisionTimelineEvent[] {
    return [
        {
            date: 'Jan 2022',
            label: 'Initial PostgreSQL evaluation',
            type: 'meeting',
            confidence: 65,
            summary: 'The team surfaced a performance ceiling with the existing relational setup and began shaping the migration narrative.',
            evidenceSources: 7,
            participants: ['Sarah Chen', 'Mike Ross'],
        },
        {
            date: 'Mar 2022',
            label: 'Performance benchmarks run',
            type: 'commit',
            confidence: 72,
            summary: 'Benchmarks confirmed PostgreSQL would outperform the legacy stack under the target read workload.',
            evidenceSources: 12,
            participants: ['Mike Ross', 'Alice Park'],
        },
        {
            date: 'May 2022',
            label: 'MySQL vs PostgreSQL ADR created',
            type: 'adr',
            confidence: 81,
            summary: 'The ADR captured the trade-offs around JSONB support, indexing, and long-term operational fit.',
            evidenceSources: 9,
            participants: ['Sarah Chen', 'Architecture Council'],
        },
        {
            date: 'Jun 2022',
            label: 'Team vote: PostgreSQL wins (7-2)',
            type: 'meeting',
            confidence: 88,
            summary: 'The decision was formalized after the team reviewed benchmarks, support gaps, and future schema requirements.',
            evidenceSources: 14,
            participants: ['Sarah Chen', 'Platform Team'],
        },
        {
            date: 'Aug 2022',
            label: 'Migration plan drafted',
            type: 'doc',
            confidence: 91,
            summary: 'The migration playbook and risk plan were published so the rollout could be executed in phases.',
            evidenceSources: 11,
            participants: ['Alice Park', 'Engineering Enablement'],
        },
        {
            date: 'Oct 2022',
            label: 'Migration completed',
            type: 'commit',
            confidence: 97,
            summary: 'The full migration landed and the decision was validated against production telemetry and incident history.',
            evidenceSources: 18,
            participants: ['Michael Ross', 'Platform Team'],
        },
    ];
}

export function getExitSimulationProfiles(): ExitSimulationProfile[] {
    return [
        {
            id: 'sarah',
            name: 'Sarah Chen',
            role: 'Lead Architect',
            risk: 94,
            systems: ['auth-service', 'api-gateway', 'payments'],
            onboarding: '8-12 weeks',
            summary: 'High concentration of architecture knowledge around auth and platform-critical routing.',
            mitigation: [
                { icon: '📝', title: 'Document auth-service architecture', priority: 'Critical', est: '2 days' },
                { icon: '🎥', title: 'Record architecture walkthrough video', priority: 'High', est: '4 hours' },
                { icon: '👥', title: 'Pair Sarah with 2 junior engineers for 4 weeks', priority: 'High', est: '4 weeks' },
            ],
        },
        {
            id: 'mike',
            name: 'Mike Ross',
            role: 'Backend Lead',
            risk: 71,
            systems: ['data-pipeline', 'analytics', 'user-db'],
            onboarding: '4-6 weeks',
            summary: 'Knowledge loss would create a pronounced delivery risk around analytics and pipeline ownership.',
            mitigation: [
                { icon: '📚', title: 'Create runbooks for all critical paths', priority: 'Medium', est: '3 days' },
                { icon: '🔄', title: 'Transfer analytics ownership to the platform squad', priority: 'Medium', est: '1 week' },
            ],
        },
        {
            id: 'alice',
            name: 'Alice Park',
            role: 'DevOps Engineer',
            risk: 85,
            systems: ['infrastructure', 'ci-cd', 'monitoring'],
            onboarding: '6-8 weeks',
            summary: "Operational continuity and incident readiness are tightly coupled to Alice's runbooks and escalation knowledge.",
            mitigation: [
                { icon: '🧰', title: 'Add failover drills to the runbook set', priority: 'High', est: '1 week' },
                { icon: '🤝', title: 'Rotate an on-call shadow for the next release window', priority: 'High', est: '3 days' },
            ],
        },
    ];
}

export function getExitSimulationScenario(): ExitSimulationScenario {
    return {
        summary: 'Simulating a senior engineering departure shows that the auth gateway and payments orchestration are the most sensitive knowledge domains.',
        projectedKnowledgeLoss: 78,
        criticalSystems: ['auth-service', 'api-gateway', 'payments', 'monitoring'],
        primaryRiskOwners: ['Sarah Chen', 'Mike Ross'],
        actionPlan: [
            { title: 'Document auth service flows and runbooks', eta: '5 days', impact: 'critical' },
            { title: 'Pair Platform team with junior engineers', eta: '3 weeks', impact: 'high' },
            { title: 'Create knowledge handover deck for payments', eta: '1 week', impact: 'high' },
        ],
    };
}

export function getExitSimulationRecommendations(): ExitSimulationRecommendation[] {
    return [
        {
            id: 'r-1',
            title: 'Schedule a knowledge transfer for auth-service',
            detail: 'Run a two-day deep dive with the backup engineering team and capture architecture diagrams in the team wiki.',
            priority: 'critical',
            due: '3 business days',
        },
        {
            id: 'r-2',
            title: 'Formalize incident runbooks',
            detail: 'Document recovery steps for payments and monitoring outages, including service owners and alert details.',
            priority: 'high',
            due: '1 week',
        },
        {
            id: 'r-3',
            title: 'Create onboarding shadow rotations',
            detail: 'Assign backup engineers to the most critical systems and run paired shadowing sessions.',
            priority: 'medium',
            due: '2 weeks',
        },
    ];
}

export function getRiskHeatmapData(): HeatmapCell[][] {
    return [
        [
            { name: 'Auth Service', risk: 'high', coverage: 42, owner: 'Sarah Chen' },
            { name: 'API Gateway', risk: 'critical', coverage: 18, owner: null },
            { name: 'Payments Core', risk: 'critical', coverage: 12, owner: 'Mike Ross' },
            { name: 'User Profiles', risk: 'medium', coverage: 67, owner: 'James Liu' },
            { name: 'Notifications', risk: 'low', coverage: 82, owner: 'Alice Park' },
        ],
        [
            { name: 'OAuth Module', risk: 'critical', coverage: 8, owner: null },
            { name: 'Rate Limiter', risk: 'high', coverage: 34, owner: 'Sarah Chen' },
            { name: 'Stripe Webhook', risk: 'high', coverage: 29, owner: null },
            { name: 'Analytics DB', risk: 'medium', coverage: 71, owner: 'Mike Ross' },
            { name: 'Email Queue', risk: 'low', coverage: 88, owner: 'Alice Park' },
        ],
        [
            { name: 'Infrastructure', risk: 'high', coverage: 45, owner: 'Alice Park' },
            { name: 'K8s Config', risk: 'medium', coverage: 58, owner: 'Alice Park' },
            { name: 'Data Pipeline', risk: 'medium', coverage: 63, owner: 'Mike Ross' },
            { name: 'Frontend App', risk: 'low', coverage: 79, owner: 'James Liu' },
            { name: 'Design System', risk: 'safe', coverage: 94, owner: 'James Liu' },
        ],
        [
            { name: 'Security Certs', risk: 'critical', coverage: 5, owner: null },
            { name: 'Load Balancer', risk: 'high', coverage: 38, owner: null },
            { name: 'CI/CD Pipeline', risk: 'medium', coverage: 61, owner: 'Alice Park' },
            { name: 'Feature Flags', risk: 'low', coverage: 77, owner: 'James Liu' },
            { name: 'Logging', risk: 'safe', coverage: 91, owner: 'Mike Ross' },
        ],
    ];
}

export function getMentorPrompts(): MentorPrompt[] {
    return [
        { title: 'Explain our auth architecture', detail: 'Trace the auth path from the gateway through validation and session handling.' },
        { title: 'Show payments API endpoints', detail: 'Map the critical routes, dependencies, and ownership for the payments domain.' },
        { title: 'Best practices for rate limiting', detail: 'Correlate the current gateway and auth decisions with resilience guidance.' },
        { title: 'Why was PostgreSQL chosen?', detail: 'Reconstruct the historical decision from the stored evidence, ADRs, and benchmark notes.' },
    ];
}

export function getMentorLearningPaths(): LearningPath[] {
    return [
        { topic: 'System Design', progress: 72, modules: 18, completed: 13 },
        { topic: 'API Design', progress: 54, modules: 12, completed: 7 },
        { topic: 'Security Patterns', progress: 38, modules: 15, completed: 6 },
        { topic: 'Cloud Architecture', progress: 89, modules: 10, completed: 9 },
    ];
}

export function getDocumentationEngineState(): DocumentationItem[] {
    return [
        { name: 'Auth Service API Reference', type: 'API Docs', status: 'generated', lastGen: '2 min ago', coverage: 98, icon: '📄' },
        { name: 'Payments Architecture ADR', type: 'ADR', status: 'generating', lastGen: 'Live', coverage: 45, icon: '🏗️' },
        { name: 'PR #482 — OAuth refactor', type: 'PR Summary', status: 'generated', lastGen: '5 min ago', coverage: 100, icon: '🔀' },
        { name: 'Q4 Sprint 3 Release Notes', type: 'Release Notes', status: 'generated', lastGen: '1 hr ago', coverage: 100, icon: '🚀' },
        { name: 'Data Pipeline Runbook', type: 'Technical Doc', status: 'stale', lastGen: '3 days ago', coverage: 71, icon: '⚙️' },
        { name: 'New Employee Onboarding Guide', type: 'Onboarding', status: 'stale', lastGen: '1 week ago', coverage: 58, icon: '👋' },
        { name: 'Stripe Webhook Integration', type: 'API Docs', status: 'missing', lastGen: 'Never', coverage: 0, icon: '📄' },
        { name: 'K8s Infrastructure Overview', type: 'Technical Doc', status: 'missing', lastGen: 'Never', coverage: 0, icon: '☸️' },
    ];
}

export function getDocumentContent(name: string): DocumentContent | null {
    const doc = getDocumentationEngineState().find((d) => d.name === name);
    if (!doc) return null;
    const now = new Date().toISOString();
    const builders: Record<string, (n: string) => DocumentContentSection[]> = {
        'API Docs': (n) => apiDocSections(n),
        'ADR': (n) => adrSections(n),
        'PR Summary': (n) => prSections(n),
        'Release Notes': (n) => releaseSections(n),
        'Technical Doc': (n) => techSections(n),
        'Onboarding': (n) => onboardingSections(n),
    };
    const sections = (builders[doc.type] ?? apiDocSections)(name);
    return { name, type: doc.type, generatedAt: now, sections };
}

function apiDocSections(name: string): DocumentContentSection[] {
    const slug = name.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
    return [
        { heading: 'Overview', body: `This reference documents the public contract for ${name}. All endpoints are versioned under /v1 and require a bearer token issued by the auth service. Requests without a valid token receive HTTP 401.` },
        { heading: 'Base URL', code: `https://api.nexus.ai/${slug}` },
        {
            heading: 'Authentication', body: 'Every request must include an Authorization header with a valid access token.',
            code: 'Authorization: Bearer <access_token>',
            bullets: ['Tokens expire after 60 minutes and must be refreshed via POST /auth/refresh', 'Scopes are granted per role (read, write, admin)', 'Refresh tokens are single-use and rotated on every call'],
        },
        {
            heading: 'Endpoints', body: 'The following endpoints are available for this service.',
            table: {
                headers: ['Method', 'Path', 'Description', 'Auth'],
                rows: [
                    ['GET', `/v1/${slug}/health`, 'Liveness probe', 'none'],
                    ['GET', `/v1/${slug}/entities`, 'List entities (paginated)', 'read'],
                    ['GET', `/v1/${slug}/entities/:id`, 'Fetch a single entity', 'read'],
                    ['POST', `/v1/${slug}/entities`, 'Create an entity', 'write'],
                    ['PUT', `/v1/${slug}/entities/:id`, 'Update an entity', 'write'],
                    ['DELETE', `/v1/${slug}/entities/:id`, 'Delete an entity', 'admin'],
                ],
            },
        },
        {
            heading: 'List entities', body: 'Returns a paginated collection. Supports cursor-based pagination and server-side filtering.',
            code: `GET /v1/${slug}/entities?limit=50&cursor=abc123\n\n{
  "data": [],
  "nextCursor": "def456",
  "total": 1284
}`,
        },
        {
            heading: 'Error handling', body: 'Errors use a consistent envelope with an HTTP status code and a machine-readable code.',
            code: '{ "error": { "code": "RESOURCE_NOT_FOUND", "message": "Entity 123 was not found", "traceId": "5f3a..." } }',
            table: {
                headers: ['Status', 'Code', 'Meaning'],
                rows: [
                    ['400', 'VALIDATION_ERROR', 'Request body failed schema validation'],
                    ['401', 'UNAUTHORIZED', 'Missing or invalid token'],
                    ['403', 'FORBIDDEN', 'Token valid but scope insufficient'],
                    ['404', 'RESOURCE_NOT_FOUND', 'Requested entity does not exist'],
                    ['429', 'RATE_LIMITED', 'Too many requests'],
                ],
            },
        },
    ];
}

function adrSections(name: string): DocumentContentSection[] {
    return [
        { heading: 'Context', body: `This ADR records the decision that shaped the design behind ${name}. The proposal was reviewed by the architecture guild, payments, and platform teams over two review cycles.` },
        { heading: 'Decision', body: 'We will adopt the proposed approach as the canonical design, keeping a strict compatibility boundary at the public interface while allowing internal iteration. This keeps the blast radius of future refactors contained to a single service boundary.' },
        {
            heading: 'Alternatives considered', body: 'Three alternatives were evaluated before the final decision was reached.',
            table: {
                headers: ['Option', 'Result', 'Reason'],
                rows: [
                    ['Keep current design', 'Rejected', 'Does not scale past current growth ceiling'],
                    ['Adopt proposal as-is', 'Accepted', 'Best fit for reliability and team velocity'],
                    ['Replatform to external vendor', 'Rejected', 'Cost and data-residency constraints'],
                ],
            },
        },
        {
            heading: 'Consequences', body: 'Adopting this decision introduces both benefits and obligations that the team should track.',
            bullets: ['Reduces operational complexity and incident count', 'Requires a 2-week migration window', 'Adds new monitoring instrumentation responsibilities', 'Update runbooks and on-call playbooks before rollout'],
        },
    ];
}

function prSections(name: string): DocumentContentSection[] {
    return [
        { heading: 'Summary', body: `Automated summary of ${name}. The change touches authentication, configuration, and test infrastructure, and is approved for merge after CI passes.` },
        {
            heading: 'Changes', body: 'Files changed in this pull request.',
            table: {
                headers: ['File', 'Change'],
                rows: [
                    ['src/auth/token.service.ts', 'Modified — rotate refresh tokens on reuse'],
                    ['src/auth/guards/oauth.guard.ts', 'Modified — support PKCE flow'],
                    ['tests/auth.e2e.ts', 'Added — coverage for refresh rotation'],
                    ['docs/auth-flow.md', 'Modified — update sequence diagram'],
                ],
            },
        },
        { heading: 'Testing', body: 'All changes are covered by unit and end-to-end tests.', bullets: ['12 new unit tests added', 'E2E suite passes on staging', 'No regressions in related services'] },
        { heading: 'Review notes', body: 'Two reviewers approved. One comment on logging verbosity was addressed before final approval.' },
    ];
}

function releaseSections(name: string): DocumentContentSection[] {
    return [
        { heading: 'What is in this release', body: `${name} ships improvements across authentication, performance, and developer experience.` },
        {
            heading: 'Highlights', body: 'Key changes in this release.',
            bullets: ['Auth service token refresh rotation enabled for all tenants', 'Reduced API p99 latency by 18%', 'New self-serve onboarding flow for new joiners', 'Multiple dependency and security patches'],
        },
        {
            heading: 'Breaking changes', body: 'Actions required before upgrading.',
            bullets: ['POST /v1/tokens/refresh now returns a new refresh_token — clients must store it', 'Deprecated header X-API-Key removed; use Authorization'],
        },
        { heading: 'Rollout plan', body: 'Progressive rollout: 5% on day one, 25% on day two, 100% by end of week, with a kill-switch feature flag available for instant rollback.' },
    ];
}

function techSections(name: string): DocumentContentSection[] {
    const isK8s = name.toLowerCase().includes('k8s') || name.toLowerCase().includes('kubernetes');
    const isPipeline = name.toLowerCase().includes('pipeline') || name.toLowerCase().includes('data');
    return [
        { heading: 'Purpose', body: `${name} documents the operational architecture and standard procedures for the ${isK8s ? 'Kubernetes infrastructure' : isPipeline ? 'data pipeline' : 'platform component'} described here.` },
        {
            heading: 'Architecture', body: 'A high-level view of the system and how it connects to the rest of the platform.',
            bullets: isK8s
                ? ['Multi-cluster layout with a shared ingress tier', 'Namespace-per-team isolation with RBAC', 'Helm charts versioned alongside application code', 'Pod autoscaling driven by custom metrics']
                : isPipeline
                    ? ['Ingest → clean → transform → load stages', 'Debezium CDC feeds from source databases', 'S3 landing zone with Parquet output', 'Orchestration via scheduled DAG runs']
                    : ['Stateless service behind a load balancer', 'Persistent storage attached to the primary replica', 'Caching layer for read-heavy endpoints', 'Graceful degradation when upstreams are slow'],
        },
        {
            heading: 'Operations', body: 'Standard runbook procedures for operating this component.',
            code: isK8s
                ? `# Rolling restart of the auth service
kubectl rollout restart deployment/auth-service -n platform
kubectl rollout status deployment/auth-service -n platform`
                : isPipeline
                    ? `# Retrigger a failed pipeline run
curl -X POST /v1/pipelines/run --data '{"pipeline": "nightly-etl"}'`
                    : `# Restart service via systemd
sudo systemctl restart phoenix-api
journalctl -u phoenix-api -f`,
        },
        {
            heading: 'Common issues', body: 'Frequently encountered problems and their resolutions.',
            table: {
                headers: ['Issue', 'Symptom', 'Resolution'],
                rows: isK8s
                    ? [['CrashLoopBackOff', 'Pod restarts continuously', 'Check logs: kubectl logs -f deploy/name'], ['OOMKilled', 'Container exceeds memory limit', 'Raise resource limits and re-deploy'], ['ImagePullBackOff', 'Cannot pull image', 'Verify registry credentials']]
                    : isPipeline
                        ? [['SLA breach', 'Run exceeds target duration', 'Scale workers and check backpressure'], ['Dropped records', 'Count mismatch in S3', 'Replay the partition from the offset'], ['Schema drift', 'Validation failures', 'Run the drift detector and backfill']]
                        : [['High latency', 'p99 above target', 'Check cache hit ratio and DB indexes'], ['Disk full', 'Writes start failing', 'Rotate logs and add capacity']],
            },
        },
    ];
}

function onboardingSections(name: string): DocumentContentSection[] {
    return [
        { heading: 'Welcome', body: `Welcome to the team! This guide covers everything you need to get productive in your first two weeks at the company, including ${name}.` },
        {
            heading: 'Day 1', body: 'Accounts, access, and equipment.',
            bullets: ['Receive laptop and enroll in MDM', 'Activate Okta account and MFA', 'Join #general, #eng, and team channels', 'Complete security awareness training'],
        },
        {
            heading: 'Week 1', body: 'Get your local environment running.',
            code: `git clone git@github.com:nexus/platform.git
cd platform
npx nx run bootstrap   # installs deps + local DB
npm run dev`,
            bullets: ['Shadow a senior engineer on a small task', 'Review the architecture and docs libraries', 'Set up your local feature-flag environment'],
        },
        {
            heading: 'Week 2', body: 'Ship your first change.',
            bullets: ['Pick an entry-level ticket from the board', 'Open a PR with tests and docs', 'Give your first demo in the weekly showcase'],
        },
    ];
}

export function getArchitectureWorkflows(): ArchitectureWorkflow[] {
    return [
        {
            id: 'platform-architecture',
            title: 'Platform Architecture',
            description: 'A single-stack view of how Phoenix connects frontend, gateway, agents, knowledge processing, storage, and integrations.',
            steps: [
                'Next.js frontend with React, TypeScript, Tailwind, Shadcn UI, Framer Motion, React Flow, Cytoscape, Recharts, TanStack Query, React Hook Form, Zustand',
                'API Gateway powered by NestJS/Express with JWT, RBAC, rate limiting, routing, logging, and Swagger',
                'Multi-agent orchestration using LangGraph / MCP with optional OpenAI Agents SDK or CrewAI',
                'AI agents for knowledge collection, decision intelligence, documentation, risk, mentor advice, exit simulation, search, and executive reasoning',
                'Knowledge processing pipeline with ingestion, cleaning, chunking, embeddings, entity extraction, and relationship building',
                'Hybrid storage: PostgreSQL for org entities, Neo4j for graph relationships, vector DB for embeddings, Redis for cache and memory',
                'External integrations with GitHub, Slack, Notion, Jira, Google Drive, Confluence, Microsoft Graph, email, calendar, CI/CD and more',
                'DevOps and deployment via Docker, GitHub Actions, Vercel, Railway / Render, NGINX, Cloudflare',
                'Monitoring with Sentry, OpenTelemetry, Prometheus, Grafana',
            ],
        },
        {
            id: 'knowledge-building',
            title: 'Knowledge Building Workflow',
            description: 'How Phoenix continuously collects, processes, and synthesizes enterprise knowledge into the living digital brain.',
            steps: [
                'Organization connects workspace and external services such as GitHub, Slack, Notion, Jira, Google Drive, and Confluence',
                'Knowledge Collector Agent fetches enterprise data and metadata across connected systems',
                'Data cleaning removes duplicates and normalizes content while validating sources',
                'Knowledge processing pipeline chunks content, runs OCR, creates embeddings, and extracts entities',
                'Relationship Builder Agent maps links between people, teams, APIs, services, documents, and decisions',
                'Organizational Knowledge Graph stores entities and relationships',
                'Hybrid backend combines PostgreSQL, Neo4j, and vector database storage',
                'Organizational Digital Brain updates continuously with new knowledge',
            ],
        },
        {
            id: 'ai-reasoning',
            title: 'AI Query & Reasoning Workflow',
            description: 'The path from user question to explainable answer through coordinated agents and reasoning layers.',
            steps: [
                'User asks a question in the frontend',
                'Planner Agent breaks the request into tasks',
                'Knowledge Search Agent queries the graph and vector database',
                'Decision Intelligence Agent reconstructs historical reasoning',
                'Risk Analysis Agent evaluates ownership, documentation, dependencies, and technical debt',
                'Reasoning Agent combines evidence and generates the final explanation',
                'AI Mentor formats the answer with confidence, timeline, related decisions, and recommended actions',
                'Frontend displays the response alongside supporting evidence and intelligence signals',
            ],
        },
    ];
}

function riskScore(level: RiskLevel): number {
    if (level === 'critical') return 100;
    if (level === 'high') return 75;
    if (level === 'medium') return 50;
    return 20;
}

export function getExecutiveBrief(): ExecutiveBrief {
    const orgHealth = Math.max(
        0,
        Math.round(100 - brainNodes.reduce((sum, node) => sum + riskScore(node.risk), 0) / brainNodes.length * 0.55),
    );
    const decisionEffectiveness = Math.round(getDecisionTimelineData().reduce((sum, item) => sum + item.confidence, 0) / getDecisionTimelineData().length);
    const workforceResilience = Math.max(0, Math.round(100 - 69 * 0.62));
    const documentationHealth = Math.round(getDocumentationEngineState().reduce((sum, item) => sum + item.coverage, 0) / getDocumentationEngineState().length);
    const riskExposure = Math.round(brainNodes.reduce((sum, node) => sum + riskScore(node.risk), 0) / brainNodes.length);

    return {
        generatedAt: new Date().toISOString(),
        orgHealth,
        decisionEffectiveness,
        workforceResilience,
        documentationHealth,
        riskExposure,
        findings: [
            {
                id: 'f-1',
                title: 'Auth knowledge concentration is elevated',
                summary: 'Exit simulation and risk heatmap both flag single-owner dependency on critical auth pathways.',
                priority: 'critical',
                sourceFeature: 3,
            },
            {
                id: 'f-2',
                title: 'Decision confidence is strong but not fully documented',
                summary: 'Decision timelines are complete, but supporting docs lag in architecture and onboarding sections.',
                priority: 'warning',
                sourceFeature: 2,
            },
            {
                id: 'f-3',
                title: 'Mentor queries indicate repeated onboarding confusion',
                summary: 'AI Mentor conversations show recurring questions around gateway auth ownership and escalation flows.',
                priority: 'warning',
                sourceFeature: 5,
            },
            {
                id: 'f-4',
                title: 'Intelligence orchestrator recommends two immediate actions',
                summary: 'Prioritize knowledge transfer for Platform and refresh runbooks linked to incident pathways.',
                priority: 'info',
                sourceFeature: 7,
            },
        ],
        actions: [
            {
                id: 'a-1',
                action: 'Assign co-owner and complete auth service transfer plan',
                owner: 'Platform Director',
                eta: '5 business days',
                impact: 'critical',
                linkedRoute: '/dashboard/exit-sim',
            },
            {
                id: 'a-2',
                action: 'Close documentation gaps on runbooks and onboarding',
                owner: 'Engineering Enablement',
                eta: '7 business days',
                impact: 'high',
                linkedRoute: '/dashboard/docs',
            },
            {
                id: 'a-3',
                action: 'Revalidate high-impact architectural decisions against current risk graph',
                owner: 'Architecture Council',
                eta: '10 business days',
                impact: 'medium',
                linkedRoute: '/dashboard/decisions',
            },
        ],
    };
}

export function getIntelligenceOverview(): IntelligenceOverview {
    return {
        summary: 'Phoenix has fused the organizational graph, historical decisions, and risk edges into a cohesive reasoning snapshot for this request.',
        confidence: 91,
        focusAreas: ['auth ownership', 'documentation coverage', 'system dependencies'],
        nodeCount: brainNodes.length,
        evidenceCount: getDecisionTimelineData().length,
    };
}

export function getIntelligenceInsights(): IntelligenceInsights {
    return {
        evidenceChain: [
            {
                source: 'Meeting: Q2 Architecture Review (Apr 2022)',
                confidence: 95,
                type: 'meeting',
                excerpt: 'The team agreed that JSONB support was critical for the new events schema.',
            },
            {
                source: 'ADR-014: Database Selection',
                confidence: 89,
                type: 'adr',
                excerpt: 'PostgreSQL was selected for JSONB, full-text search, and advanced indexing.',
            },
            {
                source: 'Benchmark: pg_vs_mysql_q2.md',
                confidence: 92,
                type: 'commit',
                excerpt: 'PostgreSQL delivered a 3.2× advantage on the team-specific read workload.',
            },
            {
                source: 'Slack #eng-arch (Sarah Chen)',
                confidence: 78,
                type: 'message',
                excerpt: "MySQL's JSON support was a hack. We needed a real JSONB path for the analytics model.",
            },
        ],
        agents: [
            { id: 'a1', name: 'Knowledge Agent', role: 'Searches org knowledge graph', status: 'done', confidence: 94, finding: `Found ${brainNodes.length} linked knowledge nodes across ${brainNodes.filter((node) => node.kind === 'repository').length} repositories` },
            { id: 'a2', name: 'Context Agent', role: 'Builds situational context', status: 'done', confidence: 88, finding: 'Decision made in context of the Q2 2022 performance crisis' },
            { id: 'a3', name: 'Evidence Agent', role: 'Gathers supporting evidence', status: 'reasoning', confidence: 76, finding: 'Analyzing 8 meeting transcripts and 23 ADRs' },
            { id: 'a4', name: 'Relationship Agent', role: 'Maps knowledge dependencies', status: 'idle', confidence: 0, finding: 'Waiting for evidence synthesis' },
            { id: 'a5', name: 'Synthesis Agent', role: 'Synthesizes final answer', status: 'idle', confidence: 0, finding: 'Waiting for all agents' },
            { id: 'a6', name: 'Decision Intelligence Agent', role: 'Correlates evidence & reconstructs decision history', status: 'idle', confidence: 0, finding: 'Queued behind evidence synthesis' },
            { id: 'a7', name: 'Employee Exit Intelligence Agent', role: 'Coordinates departure simulations & resilience planning', status: 'idle', confidence: 0, finding: 'Queued behind dependency mapping' },
            { id: 'a8', name: 'Risk Intelligence Agent', role: 'Computes organizational knowledge-risk heatmaps', status: 'idle', confidence: 0, finding: 'Queued behind resilience snapshot' },
            { id: 'a9', name: 'Mentor Agent', role: 'Explains the organizational brain with personalized guidance', status: 'idle', confidence: 0, finding: 'Queued behind agent findings' },
            { id: 'a10', name: 'Documentation Intelligence Agent', role: 'Coordinates documentation generation, evolution, validation, and versioning', status: 'idle', confidence: 0, finding: 'Queued behind documentation event scope' },
            { id: 'a11', name: 'Organizational Intelligence Agent', role: 'Orchestrates cross-domain organizational reasoning', status: 'idle', confidence: 0, finding: 'Queued behind fleet findings' },
        ],
        recommendations: [
            'Validate auth ownership across the payments and gateway domains.',
            'Refresh runbooks for all systems with critical risk or missing documentation.',
            'Add backup engineers to the most concentrated knowledge nodes.',
        ],
    };
}

export function getReasoningSnapshot(query: string) {
    return {
        query,
        summary: `Phoenix has linked ${brainNodes.length} organizational nodes and ${getDecisionTimelineData().length} decision records to explain this request.`,
        confidence: 91,
        evidenceChain: [
            {
                source: 'Meeting: Q2 Architecture Review (Apr 2022)',
                confidence: 95,
                type: 'meeting',
                excerpt: 'The team agreed that JSONB support was critical for the new events schema.',
            },
            {
                source: 'ADR-014: Database Selection',
                confidence: 89,
                type: 'adr',
                excerpt: 'PostgreSQL was selected for JSONB, full-text search, and advanced indexing.',
            },
            {
                source: 'Benchmark: pg_vs_mysql_q2.md',
                confidence: 92,
                type: 'commit',
                excerpt: 'PostgreSQL delivered a 3.2× advantage on the team-specific read workload.',
            },
            {
                source: 'Slack #eng-arch (Sarah Chen)',
                confidence: 78,
                type: 'message',
                excerpt: "MySQL's JSON support was a hack. We needed a real JSONB path for the analytics model.",
            },
        ],
        agents: [
            { id: 'a1', name: 'Knowledge Agent', role: 'Searches org knowledge graph', status: 'done', confidence: 94, finding: `Found ${brainNodes.length} linked knowledge nodes across ${brainNodes.filter((node) => node.kind === 'repository').length} repositories` },
            { id: 'a2', name: 'Context Agent', role: 'Builds situational context', status: 'done', confidence: 88, finding: 'Decision made in context of the Q2 2022 performance crisis' },
            { id: 'a3', name: 'Evidence Agent', role: 'Gathers supporting evidence', status: 'done', confidence: 76, finding: 'Analyzing 8 meeting transcripts and 23 ADRs' },
            { id: 'a4', name: 'Relationship Agent', role: 'Maps knowledge dependencies', status: 'done', confidence: 0, finding: 'Waiting for evidence synthesis' },
            { id: 'a5', name: 'Synthesis Agent', role: 'Synthesizes final answer', status: 'done', confidence: 0, finding: 'Waiting for all agents' },
            { id: 'a6', name: 'Decision Intelligence Agent', role: 'Correlates evidence & reconstructs decision history', status: 'done', confidence: 90, finding: 'Reconstructed decision lifecycle with traceable evidence' },
            { id: 'a7', name: 'Employee Exit Intelligence Agent', role: 'Coordinates departure simulations & resilience planning', status: 'done', confidence: 87, finding: 'Simulated exit and projected knowledge loss across owned systems' },
            { id: 'a8', name: 'Risk Intelligence Agent', role: 'Computes organizational knowledge-risk heatmaps', status: 'done', confidence: 86, finding: 'Scored 13 risk attributes per node and projected 4-week risk trajectories' },
            { id: 'a9', name: 'Mentor Agent', role: 'Explains the organizational brain with personalized guidance', status: 'done', confidence: 85, finding: 'Detected the mentoring capability, resolved the user persona, and composed an evidence-grounded answer with a learning path' },
            { id: 'a10', name: 'Documentation Intelligence Agent', role: 'Coordinates documentation generation, evolution, validation, and versioning', status: 'done', confidence: 87, finding: 'Synchronized the documentation ecosystem and published a new versioned document' },
            { id: 'a11', name: 'Organizational Intelligence Agent', role: 'Orchestrates cross-domain organizational reasoning', status: 'done', confidence: 88, finding: 'Planned the reasoning pipeline, coordinated the fleet, and composed a transparent cross-domain answer' },
        ],
    };
}
