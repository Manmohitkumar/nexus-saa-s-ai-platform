import {
    BrainNode,
    DecisionRecord,
    DocumentationSignal,
    WorkforceSignal,
} from "./types";

export const brainNodes: BrainNode[] = [
    { id: "svc-auth", label: "Auth Service", kind: "service", owner: "Sarah Chen", risk: "high" },
    { id: "svc-payments", label: "Payments Service", kind: "service", owner: "Mike Ross", risk: "critical" },
    { id: "repo-frontend", label: "Web Frontend", kind: "repository", owner: "James Liu", risk: "low" },
    { id: "db-analytics", label: "Analytics DB", kind: "database", owner: "Platform Team", risk: "medium" },
    { id: "team-platform", label: "Platform Team", kind: "team", risk: "medium" },
    { id: "person-sarah", label: "Sarah Chen", kind: "person", risk: "high" },
];

export const decisions: DecisionRecord[] = [
    {
        id: "dec-014",
        title: "Adopt PostgreSQL for event platform",
        confidence: 91,
        impact: "high",
        timestamp: "2026-07-12",
    },
    {
        id: "dec-020",
        title: "Consolidate API auth on gateway middleware",
        confidence: 88,
        impact: "medium",
        timestamp: "2026-07-21",
    },
    {
        id: "dec-025",
        title: "Standardize deployment pipeline ownership",
        confidence: 84,
        impact: "high",
        timestamp: "2026-08-01",
    },
];

export const workforceSignals: WorkforceSignal[] = [
    { person: "Sarah Chen", team: "Platform", concentrationRisk: 94, replacementWeeks: 10 },
    { person: "Alice Park", team: "DevOps", concentrationRisk: 82, replacementWeeks: 7 },
    { person: "Mike Ross", team: "Backend", concentrationRisk: 70, replacementWeeks: 5 },
];

export const documentationSignals: DocumentationSignal[] = [
    { asset: "Auth Service Runbook", coverage: 58, freshnessDays: 8 },
    { asset: "Payments ADR Trail", coverage: 81, freshnessDays: 3 },
    { asset: "API Gateway Specs", coverage: 74, freshnessDays: 6 },
    { asset: "Onboarding Playbook", coverage: 63, freshnessDays: 10 },
];
