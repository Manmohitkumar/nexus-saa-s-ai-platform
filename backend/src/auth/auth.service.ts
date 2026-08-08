import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EventBus } from '../events/event-bus';

export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
}

export interface AuthResponse {
    accessToken: string;
    user: { id: string; email: string; name: string; role: string };
}

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
        private readonly eventBus: EventBus,
    ) {}

    async register(email: string, name: string, password: string): Promise<AuthResponse> {
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new ConflictException('Email already registered');
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await this.prisma.user.create({
            data: { email, name, passwordHash, role: 'member' },
        });
        this.eventBus.emit('auth.register', `user:${user.email}`, 'New user registered');
        return this.sign(user);
    }

    async login(email: string, password: string): Promise<AuthResponse> {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            this.eventBus.emit('auth.login.failed', `user:${email}`, 'Failed login attempt');
            throw new UnauthorizedException('Invalid credentials');
        }
        this.eventBus.emit('auth.login', `user:${email}`, 'User logged in');
        return this.sign(user);
    }

    async verify(token: string): Promise<JwtPayload> {
        try {
            return await this.jwt.verifyAsync<JwtPayload>(token);
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }

    private sign(user: { id: string; email: string; name: string; role: string }): AuthResponse {
        const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
        return {
            accessToken: this.jwt.sign(payload),
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
        };
    }
}
