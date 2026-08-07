# PROJECT PHOENIX - FEATURE 05

## AI Mentor

### Project Phoenix Prompt Protocol (P3) v3.0

## Foundation Dependency Rule

Assume Features 1 through 4 are fully implemented and serve as the core architecture.

Feature 5 must reuse and extend existing modules only, including:

- Organizational Knowledge Graph
- Decision Intelligence Engine
- Workforce Intelligence Services
- Risk Intelligence Engine
- Existing AI Agents
- Shared memory architecture
- Event bus
- Existing APIs
- Reusable frontend components
- Authentication system
- Logging and monitoring
- Design system and coding standards

Feature 5 must not introduce parallel knowledge stores, ingestion pipelines, memory systems, search engines, recommendation engines, or orchestration frameworks.

## Master Prompt

```text
Assume that Feature #1 (Organizational Digital Brain), Feature #2 (Decision Time Machine), Feature #3 (Employee Exit Simulation), and Feature #4 (Knowledge Risk Heatmap) have already been fully implemented and serve as the core architecture of Project Phoenix. Reuse every existing module including the Organizational Knowledge Graph, Decision Intelligence Engine, Workforce Intelligence Services, Risk Intelligence Engine, AI Agents, shared memory architecture, event bus, APIs, reusable frontend components, authentication system, logging framework, monitoring, design system, and coding standards. Never recreate functionality that already exists. Extend only the capabilities required for AI Mentor while remaining fully compatible with the existing Project Phoenix ecosystem.

You are an elite engineering organization composed of Principal AI Engineers, Distinguished Software Architects, Enterprise Solution Architects, Senior Full-Stack Engineers, Product Managers, UX Researchers, Organizational Intelligence Specialists, Knowledge Engineers, Security Architects, and DevOps Engineers.

Your mission is to architect and implement AI Mentor, the primary conversational and contextual intelligence interface of Project Phoenix. AI Mentor is not a chatbot, virtual assistant, or generic AI search tool. It is the organization's Senior Engineer, Solution Architect, Technical Mentor, Business Advisor, and Organizational Guide, capable of understanding organizational context, reasoning over historical knowledge, teaching employees, explaining complex systems, guiding decisions, and recommending best practices using the intelligence already stored inside the Organizational Digital Brain.

AI Mentor must never build its own knowledge base, perform independent document ingestion, create separate embeddings, duplicate memory, or maintain isolated reasoning pipelines. Every response must originate from the Organizational Digital Brain, Decision Time Machine, Workforce Intelligence Engine, Knowledge Risk Engine, Organizational Memory, and the existing Organizational Knowledge Graph. AI Mentor functions as the intelligent interaction layer that orchestrates and explains organizational intelligence rather than generating isolated responses.

Extend the existing multi-agent architecture by introducing a reusable Mentor Agent responsible only for contextual guidance, educational reasoning, organizational explanation, onboarding assistance, architecture walkthroughs, decision clarification, troubleshooting guidance, and personalized recommendations. The Mentor Agent must collaborate with the Planner Agent, Memory Agent, Search Agent, Graph Intelligence Agent, Decision Intelligence Agent, Workforce Intelligence Agent, Risk Intelligence Agent, Recommendation Agent, Explainability Agent, and Event Processing Agent using the existing LangGraph orchestration and Model Context Protocol (MCP). No duplicate orchestration or memory systems should be introduced.

Implement Context-Aware Organizational Reasoning capable of understanding the user's role, department, permissions, project assignments, technical expertise, previous conversations, organizational responsibilities, and learning progress. AI Mentor should personalize explanations based on whether the user is a developer, engineering manager, architect, DevOps engineer, product manager, executive, or new employee while respecting RBAC permissions already implemented in Project Phoenix.

Design AI Mentor to support multiple enterprise mentoring capabilities including Architecture Explanation Mode, Repository Walkthrough Mode, Service Dependency Explanation, API Understanding, Database Relationship Explanation, Decision Explanation, Historical Context Exploration, Documentation Guidance, Onboarding Assistance, Knowledge Discovery, Incident Learning, Technical Debt Explanation, Best Practice Recommendation, Organizational Navigation, and Business Process Understanding. Every capability should consume existing Organizational Brain services rather than introducing independent implementations.

Develop intelligent conversation workflows capable of answering complex enterprise questions such as: Explain how the authentication system works. Why was this architecture selected? Which services depend on Redis? Show the evolution of the Payment Service. Teach me the onboarding process for this project. What documentation should I read first? Which engineer owns this repository? Which architectural decisions affect this API? Why is this service considered high risk? Every response must include reasoning traces, confidence scores, evidence references, dependency paths, historical context, architectural diagrams where applicable, related documentation, impacted systems, and recommended learning paths.

Implement a Personalized Learning Engine extending the Organizational Memory established in Feature #1. AI Mentor should automatically generate customized onboarding plans, architecture learning paths, technology roadmaps, project familiarization sequences, documentation priorities, mentorship recommendations, and skill development suggestions based on the user's current responsibilities and organizational context. This engine must reuse existing Workforce Intelligence and Organizational Resilience services rather than creating new personnel models.

Design a premium conversational interface integrated directly into the existing Project Phoenix experience. AI Mentor should be accessible from every page without interrupting workflow. Users should be able to ask natural language questions while simultaneously navigating the Organizational Brain, Decision Time Machine, Knowledge Risk Heatmap, and Employee Exit Simulation. Responses should include interactive links that automatically navigate to graph nodes, repositories, architectural decisions, timelines, documentation, risk visualizations, and related organizational intelligence already available inside Project Phoenix.

Extend the frontend by introducing reusable Mentor components including AI Conversation Workspace, Context Panel, Evidence Viewer, Learning Path Explorer, Suggested Questions Panel, Related Knowledge Viewer, Architecture Explanation Panel, Decision Explorer, Interactive Response Cards, Follow-Up Recommendation Panel, and Conversation Timeline. Every UI component must follow the Project Phoenix design system and remain reusable for future AI-driven features.

Implement advanced explainability and transparency. AI Mentor must never hallucinate organizational knowledge. Every statement should reference supporting evidence already available within the Organizational Digital Brain. Whenever uncertainty exists, AI Mentor should clearly communicate confidence levels, identify missing organizational knowledge, recommend additional sources, and explain how conclusions were reached.

Extend the backend using reusable Mentor Services, Learning Services, Context Services, Conversation Services, Guidance Services, and Recommendation APIs while consuming existing graph services, reasoning services, memory services, authentication, logging, monitoring, and event infrastructure. Do not introduce parallel search engines, duplicate memory architectures, or independent recommendation systems.

Support continuous learning. As organizational knowledge evolves through commits, documentation updates, architectural changes, meetings, incidents, onboarding activities, and historical decisions, AI Mentor should automatically improve its explanations and recommendations without requiring separate retraining pipelines. All improvements should originate from updates already performed by the Organizational Digital Brain.

Engineer AI Mentor as a production-grade enterprise intelligence interface capable of supporting thousands of concurrent users, long-running contextual conversations, role-based personalization, multilingual responses, low-latency reasoning, cloud-native scalability, comprehensive observability, enterprise security, fault tolerance, and future extensibility.

The final implementation should not feel like asking questions to an AI chatbot. It should feel like having a conversation with an experienced Principal Engineer who possesses complete organizational knowledge, understands historical context, explains complex technical systems, teaches new employees, assists experienced engineers, guides organizational decision-making, and continuously learns alongside the organization. AI Mentor should become the primary human interaction layer of Project Phoenix while seamlessly extending the capabilities established by Features #1 through #4 without introducing architectural duplication or conflicts.
```

## Updated Architecture

Feature 1 Organizational Digital Brain

- Knowledge Graph
- Memory
- Agents
- Foundation

Feature 2 Decision Time Machine

- Historical Intelligence
- Timeline Engine
- Decision Graph extension

Feature 3 Employee Exit Simulation

- Workforce Intelligence
- Knowledge Dependency
- Organizational Resilience

Feature 4 Knowledge Risk Heatmap

- Risk Intelligence
- Predictive Analytics
- Organizational Health

Feature 5 AI Mentor

- Context-Aware Guidance
- Personalized Learning
- Organizational Navigation
- Architecture Explanation
- Interactive Mentoring
- Human Interaction Layer

## Why This Design Fits

Feature 5 does not introduce a new intelligence engine.

It is the interaction layer that exposes intelligence already produced by Features 1 through 4:

- Feature 1 provides organizational knowledge
- Feature 2 provides historical reasoning
- Feature 3 provides workforce and dependency insights
- Feature 4 provides organizational risk analysis
- Feature 5 explains, teaches, and guides users through all existing intelligence
