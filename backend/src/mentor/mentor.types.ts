export type MentorPersona =
    | 'developer'
    | 'engineering-manager'
    | 'architect'
    | 'devops'
    | 'product-manager'
    | 'executive'
    | 'new-hire'
    | 'guest';

export interface MentorUserContext {
    userId: string | null;
    name: string | null;
    role: string | null;
    team: string | null;
    persona: MentorPersona;
    expertise: string[];
    ownedSystems: string[];
    permissions: string[];
}

export interface MentorCapability {
    id: string;
    name: string;
    description: string;
    prompts: string[];
}

export interface MentorEvidenceItem {
    source: string;
    excerpt: string;
    type: string;
    confidence: number;
}

export interface MentorRelatedKnowledge {
    id: string;
    label: string;
    kind: string;
    route: string;
    reason: string;
}

export interface MentorDependencyPath {
    source: string;
    target: string;
    type: string;
}

export interface MentorNavigationLink {
    label: string;
    route: string;
    description: string;
}

export interface MentorLearningModule {
    id: string;
    title: string;
    kind: 'onboarding' | 'architecture' | 'documentation' | 'decisions' | 'risk' | 'skill';
    objective: string;
    progress: number;
    route: string;
    evidence: string[];
}

export interface MentorLearningPath {
    userId: string | null;
    persona: MentorPersona;
    summary: string;
    modules: MentorLearningModule[];
    generatedAt: string;
}

export interface MentorSuggestion {
    id: string;
    text: string;
    capability: string;
    context: string;
}

export interface MentorAnswer {
    conversationId: string | null;
    messageId: string;
    capability: string;
    topic: string;
    answer: string;
    reasoning: string[];
    confidence: number;
    evidence: MentorEvidenceItem[];
    relatedKnowledge: MentorRelatedKnowledge[];
    dependencies: MentorDependencyPath[];
    impactedSystems: string[];
    followUps: string[];
    navigation: MentorNavigationLink[];
    learningModules: MentorLearningModule[];
    context: MentorUserContext;
    createdAt: string;
}

export interface MentorConversationSummary {
    id: string;
    title: string;
    topic: string;
    capability: string;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface MentorMessageView {
    id: string;
    role: 'user' | 'mentor';
    content: string;
    confidence: number;
    payload: MentorAnswer | null;
    createdAt: string;
}
