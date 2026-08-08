import { Injectable } from '@nestjs/common';
import { MentorCapability, MentorPersona, MentorSuggestion, MentorUserContext } from './mentor.types';

/**
 * Guidance Services — mentoring capability catalog, capability detection, and
 * persona-aware suggested questions. Pure orchestration over existing brain
 * outputs; no independent recommendation system.
 */
@Injectable()
export class MentorGuidanceService {
    private readonly catalog: MentorCapability[] = [
        { id: 'architecture', name: 'Architecture Explanation', description: 'Explain how systems fit together and why they were designed this way.', prompts: ['Explain how the authentication system works', 'Why was this architecture selected?'] },
        { id: 'repository', name: 'Repository Walkthrough', description: 'Walk through repositories, modules, and ownership.', prompts: ['Which engineer owns this repository?', 'Walk me through the API gateway repo'] },
        { id: 'dependency', name: 'Service Dependency Explanation', description: 'Map which services depend on which and why.', prompts: ['Which services depend on Redis?', 'Show the dependency chain for payments'] },
        { id: 'api', name: 'API Understanding', description: 'Explain APIs, contracts, and call paths.', prompts: ['Which architectural decisions affect this API?', 'How does the payments API work?'] },
        { id: 'database', name: 'Database Relationship Explanation', description: 'Explain data stores and their relationships.', prompts: ['Explain the database schema', 'Why PostgreSQL for the events store?'] },
        { id: 'decision', name: 'Decision Explanation', description: 'Reconstruct and explain historical decisions with evidence.', prompts: ['Why was this decision made?', 'What alternatives were rejected?'] },
        { id: 'history', name: 'Historical Context Exploration', description: 'Explore how systems and decisions evolved over time.', prompts: ['Show the evolution of the Payment Service', 'What changed around authentication last year?'] },
        { id: 'documentation', name: 'Documentation Guidance', description: 'Point to the right docs and what to read first.', prompts: ['What documentation should I read first?', 'Where is the onboarding runbook?'] },
        { id: 'onboarding', name: 'Onboarding Assistance', description: 'Get a personalized onboarding sequence for this project.', prompts: ['Teach me the onboarding process for this project', 'Where do I start as a new engineer?'] },
        { id: 'discovery', name: 'Knowledge Discovery', description: 'Discover relevant knowledge across the organizational brain.', prompts: ['What do I need to know about payments?', 'Find knowledge around the API gateway'] },
        { id: 'incident', name: 'Incident Learning', description: 'Learn from incidents and outage root causes.', prompts: ['What caused the Q3 outage?', 'Teach me from past incidents'] },
        { id: 'debt', name: 'Technical Debt Explanation', description: 'Surface technical debt, undocumented flags, and exposure.', prompts: ['Where is our technical debt?', 'Why is this service considered high risk?'] },
        { id: 'best-practice', name: 'Best Practice Recommendation', description: 'Recommend best practices grounded in your org context.', prompts: ['Best practices for rate limiting', 'How should we handle secrets?'] },
        { id: 'navigation', name: 'Organizational Navigation', description: 'Navigate the organization, teams, and ownership.', prompts: ['Who owns what in the organization?', 'Which teams touch payments?'] },
        { id: 'business', name: 'Business Process Understanding', description: 'Understand how technical systems serve business processes.', prompts: ['How does the billing flow work end to end?', 'Explain the subscription lifecycle'] },
        { id: 'general', name: 'General Mentoring', description: 'Open-ended guidance across the organizational brain.', prompts: ['Help me understand our architecture', 'Teach me something about this org'] },
    ];

    capabilities(): MentorCapability[] {
        return this.catalog;
    }

    detectCapability(query: string): string {
        const q = ` ${query.toLowerCase()} `;
        const rules: Array<[string, RegExp]> = [
            ['database', /postgres|sql|database|db |schema|redis|mongo|mysql|data store|events store/],
            ['incident', /outage|incident|downtime|q3|root cause|blameless/],
            ['dependency', /depend|dependency|depends on|downstream|coupled|propagat/],
            ['decision', /decision|alternative|approved|rejected|chosen|why was|why is .* (selected|adopted)/],
            ['history', /evolution|evolv|history|timeline|changed|before|previous|histor/],
            ['repository', /repo|repository|codebase|module|walkthrough|code walk/],
            ['api', /api|endpoint|contract|request|http|rest|graphql/],
            ['onboarding', /onboard|new hire|new employee|where do i start|first week|start as/],
            ['documentation', /document|doc |runbook|readme|what should i read|coverage/],
            ['debt', /debt|undocumented|high risk|risk|exposure|kill.?switch|spof/],
            ['navigation', /who owns|which team|who knows|organization|ownership|navigate/],
            ['business', /business|billing|subscription|checkout|process|flow end|lifecycle|revenue/],
            ['architecture', /architect|explain|how does|how do|system|service |gateway|flows?/],
            ['best-practice', /best practice|recommend|should we|how should|guideline|scal|rate limit|security|secret/],
            ['discovery', /know|find|discover|learn|teach|understand|relevant/],
        ];
        for (const [id, re] of rules) {
            if (re.test(q)) return id;
        }
        return 'general';
    }

    async suggestions(ctx: MentorUserContext): Promise<MentorSuggestion[]> {
        const owned = ctx.ownedSystems.length ? ctx.ownedSystems[0] : null;
        const base: MentorSuggestion[] = [
            { id: 's1', text: 'Explain how the authentication system works', capability: 'architecture', context: 'org-wide' },
            { id: 's2', text: 'Which services depend on the API gateway?', capability: 'dependency', context: 'org-wide' },
            { id: 's3', text: 'Why was PostgreSQL selected for the data store?', capability: 'decision', context: 'decision history' },
            { id: 's4', text: 'What documentation should I read first?', capability: 'documentation', context: 'personalized' },
            { id: 's5', text: 'Why is this service considered high risk?', capability: 'debt', context: 'risk heatmap' },
            { id: 's6', text: 'Teach me the onboarding process for this project', capability: 'onboarding', context: 'personalized' },
        ];
        if (owned) {
            base.unshift({
                id: 's0',
                text: `Walk me through ${owned}`,
                capability: 'architecture',
                context: `you own ${owned}`,
            });
        }
        const byPersona: Record<MentorPersona, string[]> = {
            developer: ['Explain the payments API call path', 'Where is our technical debt concentrated?'],
            'engineering-manager': ['Which teams own the highest-risk systems?', 'What is our knowledge-loss exposure?'],
            architect: ['Replay the API Gateway decision', 'Show the dependency graph around payments'],
            devops: ['Walk me through the deployment pipeline', 'What operational exposure do we have?'],
            'product-manager': ['How does billing work end to end?', 'What capabilities is our platform missing?'],
            executive: ['Summarize our organizational health', 'What are the top risks this quarter?'],
            'new-hire': ['Teach me the onboarding process for this project', 'What should I read first?'],
            guest: ['Teach me the onboarding process for this project', 'Explain the organizational brain'],
        };
        const persona: string[] = byPersona[ctx.persona] ?? [];
        return [...base.slice(0, 4), ...persona.slice(0, 2)].map((s, i) =>
            typeof s === 'string' ? { id: `p${i}`, text: s, capability: 'general', context: ctx.persona } : s,
        );
    }

    followUps(answer: string, capability: string): string[] {
        const byCap: Record<string, string[]> = {
            architecture: ['Walk me through the most critical dependency', 'Why is one service higher risk than the others?'],
            dependency: ['Which decisions affected this dependency?', 'What happens if this service goes down?'],
            decision: ['What alternatives were rejected and why?', 'How was this decision implemented?'],
            debt: ['What mitigation actions should we prioritize?', 'Which single owner has the highest bus factor risk?'],
            onboarding: ['What documentation should I read first?', 'Give me a personalized learning path'],
            documentation: ['Which documentation is missing?', 'What should we document next?'],
            database: ['Explain the database schema relationships', 'Why PostgreSQL for the events store?'],
            history: ['Show the evolution of the Payment Service', 'What decisions shaped this system?'],
            general: ['Teach me the onboarding process for this project', 'What are the top risks this quarter?'],
        };
        return byCap[capability] ?? byCap.general;
    }
}
