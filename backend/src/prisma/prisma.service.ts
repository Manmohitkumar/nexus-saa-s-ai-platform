import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../../generated/prisma/client';
import { join } from 'path';
import { SCHEMA_DDL } from '../db/schema-ddl.generated';
import { hashSync } from 'bcrypt';

// Overridable via PHX_DB_PATH (e.g. "/tmp/phoenix.db" on Vercel serverless where
// the project filesystem is read-only). Defaults to the local dev DB.
const DB_PATH = process.env.PHX_DB_PATH ?? join(process.cwd(), 'phoenix.db');

const DEMO_USER = {
    email: 'demo@phoenix.dev',
    name: 'Demo User',
    password: 'DemoPass2026!',
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        super({
            adapter: new PrismaBetterSqlite3({ url: DB_PATH }),
        });
    }

    async onModuleInit() {
        await this.ensureSchema();
        await this.$connect();
        await this.ensureDemoUser();
    }

    /**
     * Creates the SQLite file (if needed) and applies the Prisma DDL when the
     * database is empty. On Vercel serverless each cold start gets a fresh
     * /tmp, so this must be idempotent and run before any query.
     */
    private async ensureSchema(): Promise<void> {
        const Database = await import('better-sqlite3');
        const db = new Database.default(DB_PATH);
        try {
            const hasUserTable = db
                .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='User'`)
                .get();
            if (!hasUserTable) {
                db.exec(SCHEMA_DDL);
                this.logger.log(`Created schema at ${DB_PATH}`);
            }
        } finally {
            db.close();
        }
    }

    private async ensureDemoUser(): Promise<void> {
        const existing = await this.user.findUnique({ where: { email: DEMO_USER.email } });
        if (existing) {
            return;
        }
        await this.user.create({
            data: {
                email: DEMO_USER.email,
                name: DEMO_USER.name,
                passwordHash: hashSync(DEMO_USER.password, 10),
                role: 'member',
            },
        });
        this.logger.log(`Seeded demo user ${DEMO_USER.email}`);
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
