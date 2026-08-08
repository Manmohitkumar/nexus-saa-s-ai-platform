import {
    ArchitectureWorkflow,
    BrainGraphView,
    DecisionTimelineEvent,
    DocumentationItem,
    ExecutiveAction,
    ExecutiveBrief,
    ExitSimulationProfile,
    HeatmapCell,
    IntelligenceFinding,
    MentorPrompt,
    RiskLevel,
} from "./types";
import { brainNodes, decisions, documentationSignals, workforceSignals } from "./mock-data";

function riskScore(level: RiskLevel): number {
    if (level === "critical") return 100;
    if (level === "high") return 75;
    if (level === "medium") return 50;
    return 20;
}

export function getOrgHealthScore(): number {
    const averageRisk = brainNodes.reduce((sum, node) => sum + riskScore(node.risk), 0) / brainNodes.length;
    return Math.max(0, Math.round(100 - averageRisk * 0.55));
}

export function getDecisionEffectiveness(): number {
    return Math.round(decisions.reduce((sum, item) => sum + item.confidence, 0) / decisions.length);
}

export function getWorkforceResilience(): number {
    const averageRisk = workforceSignals.reduce((sum, item) => sum + item.concentrationRisk, 0) / workforceSignals.length;
    return Math.max(0, Math.round(100 - averageRisk * 0.62));
}

export function getDocumentationHealth(): number {
    const avgCoverage = documentationSignals.reduce((sum, item) => sum + item.coverage, 0) / documentationSignals.length;
    return Math.round(avgCoverage);
}

export function getRiskExposure(): number {
    const weighted = brainNodes.reduce((sum, node) => sum + riskScore(node.risk), 0);
    return Math.round(weighted / brainNodes.length);
}

export function getBrainGraphView(): BrainGraphView {
    const connectionMap: Record<string, string[]> = {
        "svc-auth": ["svc-payments", "db-analytics", "team-platform"],
        "svc-payments": ["svc-auth", "repo-frontend", "db-analytics"],
        "repo-frontend": ["svc-auth", "svc-payments"],
        "db-analytics": ["svc-auth", "svc-payments", "team-platform"],
        "team-platform": ["svc-auth", "repo-frontend", "person-sarah"],
        "person-sarah": ["svc-auth", "team-platform"],
    };

    return {
        nodes: brainNodes.map((node) => ({
            ...node,
            connections: connectionMap[node.id] ?? [],
        })),
        summary: {
            services: brainNodes.filter((node) => node.kind === "service").length,
            repositories: brainNodes.filter((node) => node.kind === "repository").length,
            dependencies: brainNodes.reduce((sum, node) => sum + (connectionMap[node.id] ?? []).length, 0),
            knowledgeNodes: brainNodes.length + 42,
        },
    };
}

export function getDecisionTimelineData(): DecisionTimelineEvent[] {
    return [
        {
            date: "Jan 2022",
            label: "Initial PostgreSQL evaluation",
            type: "meeting",
            confidence: 65,
            summary: "The team surfaced a performance ceiling with the existing relational setup and began shaping the migration narrative.",
            evidenceSources: 7,
            participants: ["Sarah Chen", "Mike Ross"],
        },
        {
            date: "Mar 2022",
            label: "Performance benchmarks run",
            type: "commit",
            confidence: 72,
            summary: "Benchmarks confirmed PostgreSQL would outperform the legacy stack under the target read workload.",
            evidenceSources: 12,
            participants: ["Mike Ross", "Alice Park"],
        },
        {
            date: "May 2022",
            label: "MySQL vs PostgreSQL ADR created",
            type: "adr",
            confidence: 81,
            summary: "The ADR captured the trade-offs around JSONB support, indexing, and long-term operational fit.",
            evidenceSources: 9,
            participants: ["Sarah Chen", "Architecture Council"],
        },
        {
            date: "Jun 2022",
            label: "Team vote: PostgreSQL wins (7-2)",
            type: "meeting",
            confidence: 88,
            summary: "The decision was formalized after the team reviewed benchmarks, support gaps, and future schema requirements.",
            evidenceSources: 14,
            participants: ["Sarah Chen", "Platform Team"],
        },
        {
            date: "Aug 2022",
            label: "Migration plan drafted",
            type: "doc",
            confidence: 91,
            summary: "The migration playbook and risk plan were published so the rollout could be executed in phases.",
            evidenceSources: 11,
            participants: ["Alice Park", "Engineering Enablement"],
        },
        {
            date: "Oct 2022",
            label: "Migration completed",
            type: "commit",
            confidence: 97,
            summary: "The full migration landed and the decision was validated against production telemetry and incident history.",
            evidenceSources: 18,
            participants: ["Michael Ross", "Platform Team"],
        },
    ];
}

export function getExitSimulationProfiles(): ExitSimulationProfile[] {
    return [
        {
            id: "sarah",
            name: "Sarah Chen",
            role: "Lead Architect",
            risk: 94,
            systems: ["auth-service", "api-gateway", "payments"],
            onboarding: "8-12 weeks",
            summary: "High concentration of architecture knowledge around auth and platform-critical routing.",
            mitigation: [
                { icon: "📝", title: "Document auth-service architecture", priority: "Critical", est: "2 days" },
                { icon: "🎥", title: "Record architecture walkthrough video", priority: "High", est: "4 hours" },
                { icon: "👥", title: "Pair Sarah with 2 junior engineers for 4 weeks", priority: "High", est: "4 weeks" },
            ],
        },
        {
            id: "mike",
            name: "Mike Ross",
            role: "Backend Lead",
            risk: 71,
            systems: ["data-pipeline", "analytics", "user-db"],
            onboarding: "4-6 weeks",
            summary: "Knowledge loss would create a pronounced delivery risk around analytics and pipeline ownership.",
            mitigation: [
                { icon: "📚", title: "Create runbooks for all critical paths", priority: "Medium", est: "3 days" },
                { icon: "🔄", title: "Transfer analytics ownership to the platform squad", priority: "Medium", est: "1 week" },
            ],
        },
        {
            id: "alice",
            name: "Alice Park",
            role: "DevOps Engineer",
            risk: 85,
            systems: ["infrastructure", "ci-cd", "monitoring"],
            onboarding: "6-8 weeks",
            summary: "Operational continuity and incident readiness are tightly coupled to Alice's runbooks and escalation knowledge.",
            mitigation: [
                { icon: "🧰", title: "Add failover drills to the runbook set", priority: "High", est: "1 week" },
                { icon: "🤝", title: "Rotate an on-call shadow for the next release window", priority: "High", est: "3 days" },
            ],
        },
    ];
}

export function getRiskHeatmapData(): HeatmapCell[][] {
    return [
        [
            { name: "Auth Service", risk: "high", coverage: 42, owner: "Sarah Chen" },
            { name: "API Gateway", risk: "critical", coverage: 18, owner: null },
            { name: "Payments Core", risk: "critical", coverage: 12, owner: "Mike Ross" },
            { name: "User Profiles", risk: "medium", coverage: 67, owner: "James Liu" },
            { name: "Notifications", risk: "low", coverage: 82, owner: "Alice Park" },
        ],
        [
            { name: "OAuth Module", risk: "critical", coverage: 8, owner: null },
            { name: "Rate Limiter", risk: "high", coverage: 34, owner: "Sarah Chen" },
            { name: "Stripe Webhook", risk: "high", coverage: 29, owner: null },
            { name: "Analytics DB", risk: "medium", coverage: 71, owner: "Mike Ross" },
            { name: "Email Queue", risk: "low", coverage: 88, owner: "Alice Park" },
        ],
        [
            { name: "Infrastructure", risk: "high", coverage: 45, owner: "Alice Park" },
            { name: "K8s Config", risk: "medium", coverage: 58, owner: "Alice Park" },
            { name: "Data Pipeline", risk: "medium", coverage: 63, owner: "Mike Ross" },
            { name: "Frontend App", risk: "low", coverage: 79, owner: "James Liu" },
            { name: "Design System", risk: "safe", coverage: 94, owner: "James Liu" },
        ],
        [
            { name: "Security Certs", risk: "critical", coverage: 5, owner: null },
            { name: "Load Balancer", risk: "high", coverage: 38, owner: null },
            { name: "CI/CD Pipeline", risk: "medium", coverage: 61, owner: "Alice Park" },
            { name: "Feature Flags", risk: "low", coverage: 77, owner: "James Liu" },
            { name: "Logging", risk: "safe", coverage: 91, owner: "Mike Ross" },
        ],
    ];
}

export function getMentorPrompts(): MentorPrompt[] {
    return [
        { title: "Explain our auth architecture", detail: "Trace the auth path from the gateway through validation and session handling." },
        { title: "Show payments API endpoints", detail: "Map the critical routes, dependencies, and ownership for the payments domain." },
        { title: "Best practices for rate limiting", detail: "Correlate the current gateway and auth decisions with resilience guidance." },
        { title: "Why was PostgreSQL chosen?", detail: "Reconstruct the historical decision from the stored evidence, ADRs, and benchmark notes." },
    ];
}

export function getMentorLearningPaths() {
    return [
        { topic: "System Design", progress: 72, modules: 18, completed: 13 },
        { topic: "API Design", progress: 54, modules: 12, completed: 7 },
        { topic: "Security Patterns", progress: 38, modules: 15, completed: 6 },
        { topic: "Cloud Architecture", progress: 89, modules: 10, completed: 9 },
    ];
}

export function getDocumentationEngineState(): DocumentationItem[] {
    return [
        { name: "Auth Service API Reference", type: "API Docs", status: "generated", lastGen: "2 min ago", coverage: 98, icon: "📄" },
        { name: "Payments Architecture ADR", type: "ADR", status: "generating", lastGen: "Live", coverage: 45, icon: "🏗️" },
        { name: "PR #482 — OAuth refactor", type: "PR Summary", status: "generated", lastGen: "5 min ago", coverage: 100, icon: "🔀" },
        { name: "Q4 Sprint 3 Release Notes", type: "Release Notes", status: "generated", lastGen: "1 hr ago", coverage: 100, icon: "🚀" },
        { name: "Data Pipeline Runbook", type: "Technical Doc", status: "stale", lastGen: "3 days ago", coverage: 71, icon: "⚙️" },
        { name: "New Employee Onboarding Guide", type: "Onboarding", status: "stale", lastGen: "1 week ago", coverage: 58, icon: "👋" },
        { name: "Stripe Webhook Integration", type: "API Docs", status: "missing", lastGen: "Never", coverage: 0, icon: "📄" },
        { name: "K8s Infrastructure Overview", type: "Technical Doc", status: "missing", lastGen: "Never", coverage: 0, icon: "☸️" },
    ];
}

export function getArchitectureWorkflows(): ArchitectureWorkflow[] {
    return [
        {
            id: "platform-architecture",
            title: "Platform Architecture",
            description: "A single-stack view of how Phoenix connects frontend, gateway, agents, knowledge processing, storage, and integrations.",
            steps: [
                "Next.js frontend with React, TypeScript, Tailwind, Shadcn UI, Framer Motion, React Flow, Cytoscape, Recharts, TanStack Query, React Hook Form, Zustand",
                "API Gateway powered by NestJS/Express with JWT, RBAC, rate limiting, routing, logging, and Swagger",
                "Multi-agent orchestration using LangGraph / MCP with optional OpenAI Agents SDK or CrewAI",
                "AI agents for knowledge collection, decision intelligence, documentation, risk, mentor advice, exit simulation, search, and executive reasoning",
                "Knowledge processing pipeline with ingestion, cleaning, chunking, embeddings, entity extraction, and relationship building",
                "Hybrid storage: PostgreSQL for org entities, Neo4j for graph relationships, vector DB for embeddings, Redis for cache and memory",
                "External integrations with GitHub, Slack, Notion, Jira, Google Drive, Confluence, Microsoft Graph, email, calendar, CI/CD and more",
                "DevOps and deployment via Docker, GitHub Actions, Vercel, Railway / Render, NGINX, Cloudflare",
                "Monitoring with Sentry, OpenTelemetry, Prometheus, Grafana",
            ],
        },
        {
            id: "knowledge-building",
            title: "Knowledge Building Workflow",
            description: "How Phoenix continuously collects, processes, and synthesizes enterprise knowledge into the living digital brain.",
            steps: [
                "Organization connects workspace and external services such as GitHub, Slack, Notion, Jira, Google Drive, and Confluence",
                "Knowledge Collector Agent fetches enterprise data and metadata across connected systems",
                "Data cleaning removes duplicates and normalizes content while validating sources",
                "Knowledge processing pipeline chunks content, runs OCR, creates embeddings, and extracts entities",
                "Relationship Builder Agent maps links between people, teams, APIs, services, documents, and decisions",
                "Organizational Knowledge Graph stores entities and relationships",
                "Hybrid backend combines PostgreSQL, Neo4j, and vector database storage",
                "Organizational Digital Brain updates continuously with new knowledge",
            ],
        },
        {
            id: "ai-reasoning",
            title: "AI Query & Reasoning Workflow",
            description: "The path from user question to explainable answer through coordinated agents and reasoning layers.",
            steps: [
                "User asks a question in the frontend",
                "Planner Agent breaks the request into tasks",
                "Knowledge Search Agent queries the graph and vector database",
                "Decision Intelligence Agent reconstructs historical reasoning",
                "Risk Analysis Agent evaluates ownership, documentation, dependencies, and technical debt",
                "Reasoning Agent combines evidence and generates the final explanation",
                "AI Mentor formats the answer with confidence, timeline, related decisions, and recommended actions",
                "Frontend displays the response alongside supporting evidence and intelligence signals",
            ],
        },
    ];
}

export function getCrossDomainFindings(): IntelligenceFinding[] {
    return [
        {
            id: "f-1",
            title: "Auth knowledge concentration is elevated",
            summary: "Exit simulation and risk heatmap both flag single-owner dependency on critical auth pathways.",
            priority: "critical",
            sourceFeature: 3,
        },
        {
            id: "f-2",
            title: "Decision confidence is strong but not fully documented",
            summary: "Decision timelines are complete, but supporting docs lag in architecture and onboarding sections.",
            priority: "warning",
            sourceFeature: 2,
        },
        {
            id: "f-3",
            title: "Mentor queries indicate repeated onboarding confusion",
            summary: "AI Mentor conversations show recurring questions around gateway auth ownership and escalation flows.",
            priority: "warning",
            sourceFeature: 5,
        },
        {
            id: "f-4",
            title: "Intelligence orchestrator recommends two immediate actions",
            summary: "Prioritize knowledge transfer for Platform and refresh runbooks linked to incident pathways.",
            priority: "info",
            sourceFeature: 7,
        },
    ];
}

export function getExecutiveActions(): ExecutiveAction[] {
    return [
        {
            id: "a-1",
            action: "Assign co-owner and complete auth service transfer plan",
            owner: "Platform Director",
            eta: "5 business days",
            impact: "critical",
            linkedRoute: "/dashboard/exit-sim",
        },
        {
            id: "a-2",
            action: "Close documentation gaps on runbooks and onboarding",
            owner: "Engineering Enablement",
            eta: "7 business days",
            impact: "high",
            linkedRoute: "/dashboard/docs",
        },
        {
            id: "a-3",
            action: "Revalidate high-impact architectural decisions against current risk graph",
            owner: "Architecture Council",
            eta: "10 business days",
            impact: "medium",
            linkedRoute: "/dashboard/decisions",
        },
    ];
}

export function getExecutiveBrief(): ExecutiveBrief {
    return {
        generatedAt: new Date().toISOString(),
        orgHealth: getOrgHealthScore(),
        decisionEffectiveness: getDecisionEffectiveness(),
        workforceResilience: getWorkforceResilience(),
        documentationHealth: getDocumentationHealth(),
        riskExposure: getRiskExposure(),
        findings: getCrossDomainFindings(),
        actions: getExecutiveActions(),
    };
}

export function getReasoningSnapshot(query: string) {
    return {
        query,
        summary: `Phoenix has linked ${brainNodes.length} organizational nodes and ${decisions.length} decision records to explain this request.`,
        confidence: 91,
        evidenceChain: [
            {
                source: "Meeting: Q2 Architecture Review (Apr 2022)",
                confidence: 95,
                type: "meeting",
                excerpt: "The team agreed that JSONB support was critical for the new events schema.",
            },
            {
                source: "ADR-014: Database Selection",
                confidence: 89,
                type: "adr",
                excerpt: "PostgreSQL was selected for JSONB, full-text search, and advanced indexing.",
            },
            {
                source: "Benchmark: pg_vs_mysql_q2.md",
                confidence: 92,
                type: "commit",
                excerpt: "PostgreSQL delivered a 3.2× advantage on the team-specific read workload.",
            },
            {
                source: "Slack #eng-arch (Sarah Chen)",
                confidence: 78,
                type: "message",
                excerpt: "MySQL's JSON support was a hack. We needed a real JSONB path for the analytics model.",
            },
        ],
        agents: [
            { id: "a1", name: "Knowledge Agent", role: "Searches org knowledge graph", status: "done", confidence: 94, finding: `Found ${brainNodes.length} linked knowledge nodes across ${brainNodes.filter((node) => node.kind === "repository").length} repositories` },
            { id: "a2", name: "Context Agent", role: "Builds situational context", status: "done", confidence: 88, finding: "Decision made in context of the Q2 2022 performance crisis" },
            { id: "a3", name: "Evidence Agent", role: "Gathers supporting evidence", status: "reasoning", confidence: 76, finding: "Analyzing 8 meeting transcripts and 23 ADRs" },
            { id: "a4", name: "Relationship Agent", role: "Maps knowledge dependencies", status: "idle", confidence: 0, finding: "Waiting for evidence synthesis" },
            { id: "a5", name: "Synthesis Agent", role: "Synthesizes final answer", status: "idle", confidence: 0, finding: "Waiting for all agents" },
        ],
    };
}
