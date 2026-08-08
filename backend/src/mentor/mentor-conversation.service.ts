import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MentorAnswer, MentorConversationSummary, MentorMessageView } from './mentor.types';

/**
 * Conversation Services — persists long-running contextual mentor threads in
 * the Organizational Digital Brain (no isolated chat store), keyed by user.
 */
@Injectable()
export class MentorConversationService {
    constructor(private readonly prisma: PrismaService) {}

    async create(userId: string | null, title: string, topic: string, capability: string) {
        return this.prisma.mentorConversation.create({
            data: { userId, title, topic, capability },
        });
    }

    async list(userId: string | null): Promise<MentorConversationSummary[]> {
        if (!userId) return [];
        const rows = await this.prisma.mentorConversation.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            take: 50,
            include: { _count: { select: { messages: true } } },
        });
        return rows.map((r) => ({
            id: r.id,
            title: r.title,
            topic: r.topic,
            capability: r.capability,
            messageCount: r._count.messages,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
        }));
    }

    async get(conversationId: string): Promise<{ conversation: MentorConversationSummary; messages: MentorMessageView[] } | null> {
        const row = await this.prisma.mentorConversation.findUnique({
            where: { id: conversationId },
            include: {
                messages: { orderBy: { createdAt: 'asc' } },
                _count: { select: { messages: true } },
            },
        });
        if (!row) return null;
        return {
            conversation: {
                id: row.id,
                title: row.title,
                topic: row.topic,
                capability: row.capability,
                messageCount: row._count.messages,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            },
            messages: row.messages.map((m) => this.toView(m)),
        };
    }

    async addUserMessage(conversationId: string, content: string) {
        return this.prisma.mentorMessage.create({
            data: { conversationId, role: 'user', content, confidence: 1 },
        });
    }

    async addMentorMessage(conversationId: string, answer: Omit<MentorAnswer, 'conversationId' | 'messageId'>) {
        const row = await this.prisma.mentorMessage.create({
            data: {
                conversationId,
                role: 'mentor',
                content: answer.answer,
                confidence: answer.confidence,
                payload: JSON.stringify(answer),
            },
        });
        await this.prisma.mentorConversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date(), topic: answer.topic, capability: answer.capability },
        });
        return row;
    }

    async touch(conversationId: string) {
        await this.prisma.mentorConversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });
    }

    private toView(m: {
        id: string;
        role: string;
        content: string;
        confidence: number;
        payload: string;
        createdAt: Date;
    }): MentorMessageView {
        let payload: MentorAnswer | null = null;
        if (m.payload && m.role === 'mentor') {
            try {
                payload = JSON.parse(m.payload) as MentorAnswer;
            } catch {
                payload = null;
            }
        }
        return {
            id: m.id,
            role: m.role === 'user' ? 'user' : 'mentor',
            content: m.content,
            confidence: m.confidence,
            payload,
            createdAt: m.createdAt.toISOString(),
        };
    }
}
