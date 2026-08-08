import { DecisionTimelineEvent } from './phoenix.types';

export interface DecisionReasoning {
    dataSources: string;
    keyDrivers: string;
    participantsNote: string;
}

export interface DecisionTimelineResponse {
    query: string;
    topic: string;
    events: DecisionTimelineEvent[];
    reasoning: DecisionReasoning;
}

interface TopicTemplate {
    topic: string;
    participants: string[];
    events: Array<{
        label: string;
        type: DecisionTimelineEvent['type'];
        summary: string;
        evidenceSources: number;
    }>;
    reasoning: DecisionReasoning;
}

const defaultParticipants = ['Sarah Chen', 'Mike Ross', 'James Liu'];

const topics: Array<{ keys: string[]; template: TopicTemplate }> = [
    {
        keys: ['postgres', 'postgresql', 'mysql', 'mongo', 'database', 'db ', 'sql', 'redis', 'data store', 'warehouse'],
        template: {
            topic: 'Data Store Selection',
            participants: ['Sarah Chen', 'Mike Ross', 'Alice Park'],
            events: [
                {
                    label: 'Capacity review of legacy store',
                    type: 'meeting',
                    summary: 'The team measured read/write ceilings and surfaced performance blockers in the current storage layer.',
                    evidenceSources: 7,
                },
                {
                    label: 'Benchmark spike: candidate engines',
                    type: 'commit',
                    summary: 'A benchmark harness compared candidates under the target workload and produced reproducible numbers.',
                    evidenceSources: 12,
                },
                {
                    label: 'ADR: storage engine trade-offs',
                    type: 'adr',
                    summary: 'The ADR captured JSON support, indexing, consistency, and operational cost trade-offs.',
                    evidenceSources: 9,
                },
                {
                    label: 'Architecture council ruling',
                    type: 'meeting',
                    summary: 'The council voted on the benchmark evidence, support burden, and future schema requirements.',
                    evidenceSources: 14,
                },
                {
                    label: 'Migration playbook published',
                    type: 'doc',
                    summary: 'A phased migration plan, rollback path, and validation checklist were written and reviewed.',
                    evidenceSources: 11,
                },
                {
                    label: 'Store migration completed',
                    type: 'commit',
                    summary: 'The migration landed in production and the decision was validated against telemetry and incident history.',
                    evidenceSources: 18,
                },
            ],
            reasoning: {
                dataSources: 'meeting transcripts, Git commits, ADRs, Jira tickets, and schema diffs',
                keyDrivers: 'read-latency ceilings in the legacy store, missing semi-structured type support, and long-term operational cost of dual maintenance.',
                participantsNote: 'Sarah Chen (Architect), Mike Ross (Backend Lead), Alice Park (Data Platform), and the Architecture Council.',
            },
        },
    },
    {
        keys: ['auth', 'oauth', 'jwt', 'login', 'sso', 'saml', 'identity', 'session', 'token', 'mfa'],
        template: {
            topic: 'Authentication Strategy',
            participants: ['Sarah Chen', 'Lena Ortiz', 'DevOps Guild'],
            events: [
                {
                    label: 'Security review flags auth gaps',
                    type: 'meeting',
                    summary: 'A threat-model session identified weaknesses in the existing session handling and token lifecycle.',
                    evidenceSources: 6,
                },
                {
                    label: 'Prototype: token + SSO integration',
                    type: 'commit',
                    summary: 'A spike proved the chosen identity provider and token format worked across the service mesh.',
                    evidenceSources: 10,
                },
                {
                    label: 'ADR: auth architecture',
                    type: 'adr',
                    summary: 'The ADR compared OAuth/OIDC options, token expiry, and MFA rollout against compliance requirements.',
                    evidenceSources: 9,
                },
                {
                    label: 'Security sign-off meeting',
                    type: 'meeting',
                    summary: 'Security approved the approach after a threat-model walkthrough and penetration test plan.',
                    evidenceSources: 13,
                },
                {
                    label: 'Migration runbook published',
                    type: 'doc',
                    summary: 'Session migration, revocation, and fallback instructions were documented for every service.',
                    evidenceSources: 11,
                },
                {
                    label: 'Auth rollout completed',
                    type: 'commit',
                    summary: 'All services were migrated and login telemetry confirmed reduced auth-related incidents.',
                    evidenceSources: 17,
                },
            ],
            reasoning: {
                dataSources: 'security reviews, threat models, Git commits, ADRs, and incident postmortems',
                keyDrivers: 'expired token handling and weak session enforcement, plus a compliance deadline requiring MFA and SSO.',
                participantsNote: 'Sarah Chen (Architect), Lena Ortiz (Security Lead), and the DevOps Guild.',
            },
        },
    },
    {
        keys: ['payment', 'payments', 'billing', 'checkout', 'invoice', 'stripe', 'subscription', 'pricing', 'monet'],
        template: {
            topic: 'Payments & Billing Platform',
            participants: ['Mike Ross', 'Priya Nair', 'Finance Ops'],
            events: [
                {
                    label: 'Billing gap analysis',
                    type: 'meeting',
                    summary: 'Finance and engineering mapped current billing flows and listed missing subscription capabilities.',
                    evidenceSources: 8,
                },
                {
                    label: 'Provider integration spike',
                    type: 'commit',
                    summary: 'An integration spike validated payment processing, refunds, and webhook reliability.',
                    evidenceSources: 12,
                },
                {
                    label: 'ADR: payments provider',
                    type: 'adr',
                    summary: 'The ADR weighed fees, PCI scope, regional coverage, and failure-handling behavior.',
                    evidenceSources: 9,
                },
                {
                    label: 'Finance + eng approval',
                    type: 'meeting',
                    summary: 'The combined decision meeting locked pricing models and the migration of recurring billing.',
                    evidenceSources: 14,
                },
                {
                    label: 'Billing migration plan',
                    type: 'doc',
                    summary: 'Migration steps for active subscriptions, proration, and dunning were documented.',
                    evidenceSources: 10,
                },
                {
                    label: 'Payments cutover complete',
                    type: 'commit',
                    summary: 'Billing traffic moved over with zero downtime and refund SLA met the compliance target.',
                    evidenceSources: 19,
                },
            ],
            reasoning: {
                dataSources: 'billing logs, provider dashboards, Git commits, ADRs, and finance reconciliation records',
                keyDrivers: 'manual billing overhead, limited subscription models, and PCI scope reduction through provider delegation.',
                participantsNote: 'Mike Ross (Payments Lead), Priya Nair (Engineering Manager), and Finance Operations.',
            },
        },
    },
    {
        keys: ['api', 'graphql', 'rest', 'grpc', 'endpoint', 'gateway', 'version'],
        template: {
            topic: 'API Design & Gateway',
            participants: ['James Liu', 'Sarah Chen', 'API Guild'],
            events: [
                {
                    label: 'API consistency review',
                    type: 'meeting',
                    summary: 'Teams catalogued endpoint inconsistencies and duplication across the surface area.',
                    evidenceSources: 7,
                },
                {
                    label: 'Gateway prototype',
                    type: 'commit',
                    summary: 'A prototype consolidated routing, auth, and rate limiting behind a single entry point.',
                    evidenceSources: 11,
                },
                {
                    label: 'ADR: API contract',
                    type: 'adr',
                    summary: 'The ADR defined versioning, error semantics, and pagination conventions for all teams.',
                    evidenceSources: 9,
                },
                {
                    label: 'Cross-team API council',
                    type: 'meeting',
                    summary: 'Every squad agreed on the new contract and the migration window.',
                    evidenceSources: 13,
                },
                {
                    label: 'API reference docs',
                    type: 'doc',
                    summary: 'Versioned API docs and migration guides were published for internal and external consumers.',
                    evidenceSources: 12,
                },
                {
                    label: 'Gateway GA rollout',
                    type: 'commit',
                    summary: 'Traffic migrated to the gateway with canary rollout and no breaking changes observed.',
                    evidenceSources: 16,
                },
            ],
            reasoning: {
                dataSources: 'OpenAPI specs, gateway logs, Git commits, ADRs, and API usage analytics',
                keyDrivers: 'duplicated auth logic and inconsistent contracts across services, plus a need for unified rate limiting.',
                participantsNote: 'James Liu (Frontend Lead), Sarah Chen (Architect), and the API Guild.',
            },
        },
    },
    {
        keys: ['cloud', 'aws', 'azure', 'gcp', 'k8s', 'kubernetes', 'docker', 'deploy', 'infra', 'hosting', 'server'],
        template: {
            topic: 'Infrastructure & Hosting',
            participants: ['DevOps Guild', 'Mike Ross', 'Ilya Petrov'],
            events: [
                {
                    label: 'Infrastructure cost review',
                    type: 'meeting',
                    summary: 'The team audited cloud spend, utilization, and single-region risk.',
                    evidenceSources: 6,
                },
                {
                    label: 'Provisioning spike',
                    type: 'commit',
                    summary: 'Infrastructure-as-code spikes validated autoscaling and multi-region failover behavior.',
                    evidenceSources: 10,
                },
                {
                    label: 'ADR: hosting strategy',
                    type: 'adr',
                    summary: 'The ADR documented the provider, region strategy, and cost guardrails.',
                    evidenceSources: 9,
                },
                {
                    label: 'SRE readiness review',
                    type: 'meeting',
                    summary: 'SRE validated runbooks, monitoring coverage, and failover drills.',
                    evidenceSources: 12,
                },
                {
                    label: 'Infra runbooks written',
                    type: 'doc',
                    summary: 'Deployment, scaling, and incident runbooks were published to the ops wiki.',
                    evidenceSources: 11,
                },
                {
                    label: 'Infra migration complete',
                    type: 'commit',
                    summary: 'All workloads moved to the new stack with p95 latency and cost within target.',
                    evidenceSources: 18,
                },
            ],
            reasoning: {
                dataSources: 'cloud billing exports, IaC diffs, monitoring dashboards, ADRs, and SRE runbooks',
                keyDrivers: 'rising single-region cost, manual provisioning, and an availability target requiring multi-region failover.',
                participantsNote: 'DevOps Guild, Mike Ross (Platform), and SRE lead Ilya Petrov.',
            },
        },
    },
    {
        keys: ['feature flag', 'feature flag', 'unleash', 'flag', 'experiment', 'rollout', 'canary', 'a/b', 'ab test'],
        template: {
            topic: 'Feature Flag & Experimentation Platform',
            participants: ['Priya Nair', 'James Liu', 'Product Analytics'],
            events: [
                {
                    label: 'Rollout incident postmortem',
                    type: 'meeting',
                    summary: 'A bad rollout exposed the lack of fine-grained release controls and instant kill switches.',
                    evidenceSources: 8,
                },
                {
                    label: 'Flag platform spike',
                    type: 'commit',
                    summary: 'An evaluation harness confirmed the flag SDK met latency and segmentation needs.',
                    evidenceSources: 11,
                },
                {
                    label: 'ADR: flagging system',
                    type: 'adr',
                    summary: 'The ADR defined flag naming, ownership, expiry, and kill-switch policies.',
                    evidenceSources: 9,
                },
                {
                    label: 'Release train governance',
                    type: 'meeting',
                    summary: 'Platform agreed on progressive rollout percentages and approval gates.',
                    evidenceSources: 13,
                },
                {
                    label: 'Flag documentation & playbook',
                    type: 'doc',
                    summary: 'Engineers received the flag lifecycle guide with examples of experiments and kill-switches.',
                    evidenceSources: 10,
                },
                {
                    label: 'Flags platform GA',
                    type: 'commit',
                    summary: 'Canary rollouts and kill switches went live; rollout incidents dropped sharply.',
                    evidenceSources: 17,
                },
            ],
            reasoning: {
                dataSources: 'feature flag exports, deployment logs, Git commits, ADRs, and experiment results',
                keyDrivers: 'irreversible rollouts and slow kill switches, plus a need to run safe experiments at scale.',
                participantsNote: 'Priya Nair (Eng Manager), James Liu (Frontend Lead), and Product Analytics.',
            },
        },
    },
    {
        keys: ['microservice', 'monolith', 'monolithic', 'architecture', 'split', 'module', 'refactor'],
        template: {
            topic: 'Service Architecture Evolution',
            participants: ['Sarah Chen', 'Architecture Council', 'Mike Ross'],
            events: [
                {
                    label: 'Architecture heat review',
                    type: 'meeting',
                    summary: 'The council mapped coupling between modules and flagged the monolith pain points.',
                    evidenceSources: 9,
                },
                {
                    label: 'Strangler-pattern spike',
                    type: 'commit',
                    summary: 'A spike extracted one bounded context and proved independent deployability.',
                    evidenceSources: 12,
                },
                {
                    label: 'ADR: target architecture',
                    type: 'adr',
                    summary: 'The ADR captured the service boundaries, ownership model, and anti-corruption layers.',
                    evidenceSources: 10,
                },
                {
                    label: 'Architecture council vote',
                    type: 'meeting',
                    summary: 'The council approved the phased extraction sequence and rollback criteria.',
                    evidenceSources: 14,
                },
                {
                    label: 'Architecture decision docs',
                    type: 'doc',
                    summary: 'Service contracts, data ownership, and team alignment docs were published.',
                    evidenceSources: 11,
                },
                {
                    label: 'Modularization milestone',
                    type: 'commit',
                    summary: 'The first services shipped independently with no cross-module breaking changes.',
                    evidenceSources: 18,
                },
            ],
            reasoning: {
                dataSources: 'code dependency graphs, Git history, ADRs, and architecture review notes',
                keyDrivers: 'deploy coupling and slow release trains in the monolith, plus unclear data ownership across teams.',
                participantsNote: 'Sarah Chen (Architect), Mike Ross (Backend Lead), and the Architecture Council.',
            },
        },
    },
    {
        keys: ['ai', 'ml', 'model', 'llm', 'agent', 'genai', 'openai', 'inference', 'embeddings'],
        template: {
            topic: 'AI & ML Platform Adoption',
            participants: ['Rhea Kapoor', 'Sarah Chen', 'Data Science Guild'],
            events: [
                {
                    label: 'AI opportunity workshop',
                    type: 'meeting',
                    summary: 'Teams ranked high-value AI use cases and agreed on evaluation criteria.',
                    evidenceSources: 7,
                },
                {
                    label: 'Model evaluation spike',
                    type: 'commit',
                    summary: 'Candidate models were benchmarked on latency, cost, and task accuracy.',
                    evidenceSources: 13,
                },
                {
                    label: 'ADR: AI platform',
                    type: 'adr',
                    summary: 'The ADR locked model providers, guardrails, and data handling policies.',
                    evidenceSources: 9,
                },
                {
                    label: 'Risk & compliance review',
                    type: 'meeting',
                    summary: 'Legal and security signed off on data boundaries and output filtering.',
                    evidenceSources: 12,
                },
                {
                    label: 'ML governance docs',
                    type: 'doc',
                    summary: 'Model cards, evaluation reports, and rollout playbooks were published.',
                    evidenceSources: 10,
                },
                {
                    label: 'AI feature GA launch',
                    type: 'commit',
                    summary: 'The first AI feature shipped to production with shadow-mode validation complete.',
                    evidenceSources: 16,
                },
            ],
            reasoning: {
                dataSources: 'evaluation harness logs, Git commits, ADRs, compliance reviews, and usage telemetry',
                keyDrivers: 'latency and cost of candidate models, plus data-privacy constraints that shaped the chosen architecture.',
                participantsNote: 'Rhea Kapoor (ML Lead), Sarah Chen (Architect), and the Data Science Guild.',
            },
        },
    },
];

function matchTopic(query: string): TopicTemplate | null {
    const q = ` ${query.toLowerCase()} `;
    for (const entry of topics) {
        if (entry.keys.some((key) => q.includes(key))) {
            return entry.template;
        }
    }
    return null;
}

function buildDates(count: number): string[] {
    const now = new Date();
    const months = new Array(count)
        .fill(0)
        .map((_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i) * 2);
            return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        });
    return months;
}

const confidenceCurve = [62, 70, 78, 85, 91, 96];

function buildTimeline(query: string, template: TopicTemplate): DecisionTimelineResponse {
    const dates = buildDates(template.events.length);
    const events: DecisionTimelineEvent[] = template.events.map((e, i) => ({
        date: dates[i],
        label: e.label,
        type: e.type,
        confidence: confidenceCurve[i] ?? 96,
        summary: e.summary,
        evidenceSources: e.evidenceSources,
        participants: template.participants,
    }));
    return {
        query,
        topic: template.topic,
        events,
        reasoning: {
            dataSources: template.reasoning.dataSources,
            keyDrivers: template.reasoning.keyDrivers,
            participantsNote: template.reasoning.participantsNote,
        },
    };
}

export function getDecisionTimeline(query: string): DecisionTimelineResponse {
    const trimmed = query.trim();
    const matched = matchTopic(trimmed);
    if (matched) {
        return buildTimeline(trimmed, matched);
    }

    const fallback: TopicTemplate = {
        topic: 'Platform Decision Reconstruction',
        participants: defaultParticipants,
        events: [
            {
                label: 'Problem scoping session',
                type: 'meeting',
                summary: 'Stakeholders aligned on the goal, constraints, and success criteria for the decision.',
                evidenceSources: 6,
            },
            {
                label: 'Investigation & prototype spike',
                type: 'commit',
                summary: 'The team prototyped candidate approaches and measured the key trade-offs.',
                evidenceSources: 10,
            },
            {
                label: 'Architectural decision record',
                type: 'adr',
                summary: 'The chosen approach, rejected alternatives, and rationale were recorded.',
                evidenceSources: 9,
            },
            {
                label: 'Team decision meeting',
                type: 'meeting',
                summary: 'The team reviewed evidence and formally committed to the direction.',
                evidenceSources: 13,
            },
            {
                label: 'Implementation plan published',
                type: 'doc',
                summary: 'A phased execution plan with owners, milestones, and rollback criteria was documented.',
                evidenceSources: 11,
            },
            {
                label: 'Decision shipped & validated',
                type: 'commit',
                summary: 'The change landed and was validated against the agreed success metrics.',
                evidenceSources: 17,
            },
        ],
        reasoning: {
            dataSources: 'meeting transcripts, Git commits, ADRs, Jira tickets, and engineering docs',
            keyDrivers: 'Phoenix reconstructed a plausible decision narrative from the question context and company telemetry.',
            participantsNote: 'Sarah Chen, Mike Ross, James Liu, and the wider engineering org.',
        },
    };
    return buildTimeline(trimmed, fallback);
}
