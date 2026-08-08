import { Injectable, NotFoundException } from '@nestjs/common';
import { getAgentDefinitions, runAgent, runAllAgents } from '../phoenix/phoenix.agents';
import { AgentMemoryService } from './agent-memory.service';
import { EventBus } from '../events/event-bus';

@Injectable()
export class AgentsService {
    constructor(
        private readonly memory: AgentMemoryService,
        private readonly eventBus: EventBus,
    ) {}

    getAgents() {
        return getAgentDefinitions();
    }

    async runAgent(agentId: string, query: string) {
        try {
            const result = await runAgent(agentId, query, this.memory);
            this.eventBus.emit('agent.completed', `agent:${agentId}`, `Agent ${agentId} completed for "${query}"`);
            return result;
        } catch (error) {
            throw new NotFoundException(`Unknown agent: ${agentId}`);
        }
    }

    async runAllAgents(query: string) {
        const report = await runAllAgents(query, this.memory);
        this.eventBus.emit('fleet.completed', `query:${query}`, 'All agents completed for query');
        return report;
    }

    async getMemory() {
        return this.memory.recent(50);
    }
}
