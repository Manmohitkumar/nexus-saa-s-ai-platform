import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MemoryEntry {
    agentId: string;
    role: string;
    content: string;
    sources: string[];
    confidence: number;
}

/**
 * Shared organizational memory for the agent fleet.
 * Agents persist findings under a query key so downstream agents
 * (e.g. Synthesis) can read what upstream agents concluded, rather
 * than each agent living in an isolated conversation.
 */
@Injectable()
export class AgentMemoryService {
    constructor(private readonly prisma: PrismaService) {}

    private static keyFor(query: string): string {
        return `query:${query.trim().toLowerCase().slice(0, 120)}`;
    }

    async remember(query: string, entry: MemoryEntry): Promise<void> {
        const key = AgentMemoryService.keyFor(query);
        await this.prisma.agentMemory.upsert({
            where: { key_agentId: { key, agentId: entry.agentId } },
            update: {
                role: entry.role,
                content: entry.content,
                sources: JSON.stringify(entry.sources),
                confidence: entry.confidence,
            },
            create: {
                key,
                agentId: entry.agentId,
                role: entry.role,
                content: entry.content,
                sources: JSON.stringify(entry.sources),
                confidence: entry.confidence,
            },
        });
    }

    async recall(query: string): Promise<MemoryEntry[]> {
        const key = AgentMemoryService.keyFor(query);
        const rows = await this.prisma.agentMemory.findMany({
            where: { key },
            orderBy: { createdAt: 'asc' },
        });
        return rows.map((r) => ({
            agentId: r.agentId,
            role: r.role,
            content: r.content,
            sources: JSON.parse(r.sources) as string[],
            confidence: r.confidence,
        }));
    }

    async recent(limit = 30): Promise<Array<MemoryEntry & { key: string; createdAt: Date }>> {
        const rows = await this.prisma.agentMemory.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return rows.map((r) => ({
            agentId: r.agentId,
            role: r.role,
            content: r.content,
            sources: JSON.parse(r.sources) as string[],
            confidence: r.confidence,
            key: r.key,
            createdAt: r.createdAt,
        }));
    }
}
