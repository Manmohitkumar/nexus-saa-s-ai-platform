import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkforceIntelligenceService } from '../workforce/workforce-intelligence.service';
import { MentorPersona, MentorUserContext } from './mentor.types';

/**
 * Context Services — resolves the current user (auth + workforce + owned
 * systems) into a mentor persona so every answer is personalized by role,
 * team, expertise, and ownership while respecting existing RBAC.
 */
@Injectable()
export class MentorContextService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly workforce: WorkforceIntelligenceService,
    ) {}

    private guest(): MentorUserContext {
        return {
            userId: null,
            name: null,
            role: null,
            team: null,
            persona: 'guest',
            expertise: [],
            ownedSystems: [],
            permissions: ['org:read'],
        };
    }

    async getUserContext(userId: string | null): Promise<MentorUserContext> {
        if (!userId) return this.guest();
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) return this.guest();

        const employees = await this.workforce.listEmployees();
        const employee = employees.find((e) => e.name.toLowerCase() === user.name.toLowerCase());

        return {
            userId: user.id,
            name: user.name,
            role: user.role,
            team: employee?.team ?? null,
            persona: this.personaFor(user.role, employee?.role ?? null),
            expertise: employee?.expertise ?? [],
            ownedSystems: employee?.systems ?? [],
            permissions: user.role === 'admin' ? ['org:read', 'org:write', 'admin'] : ['org:read'],
        };
    }

    private personaFor(authRole: string | null, employeeRole: string | null): MentorPersona {
        const a = `${authRole ?? ''}`.toLowerCase();
        const e = `${employeeRole ?? ''}`.toLowerCase();
        if (a === 'admin' && /architect|principal|staff/.test(e)) return 'architect';
        if (a === 'admin') return 'engineering-manager';
        if (/devops|sre|platform|infrastructure/.test(e)) return 'devops';
        if (/lead|manager|head/.test(e)) return 'engineering-manager';
        if (/architect|principal|staff|senior/.test(e)) return 'architect';
        if (/product/.test(e)) return 'product-manager';
        if (/exec|vp|cto|chief/.test(e)) return 'executive';
        if (/junior|intern|new|graduate/.test(e)) return 'new-hire';
        if (e || a) return 'developer';
        return 'guest';
    }
}
