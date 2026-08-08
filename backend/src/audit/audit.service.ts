import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventBus, PhoenixEvent } from '../events/event-bus';

@Injectable()
export class AuditService implements OnModuleInit {
    constructor(
        private readonly prisma: PrismaService,
        private readonly eventBus: EventBus,
    ) {}

    onModuleInit() {
        // Persist every bus event to the audit log.
        this.eventBus.subscribe((event: PhoenixEvent) => {
            this.prisma.auditEvent
                .create({
                    data: {
                        actor: event.resource,
                        action: event.type,
                        resource: event.resource,
                        detail: event.detail,
                        ip: String(event.payload?.ip ?? ''),
                    },
                })
                .catch(() => {
                    // audit writes must never crash the bus
                });
        });
    }

    recent(limit = 100) {
        return this.prisma.auditEvent.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    count() {
        return this.prisma.auditEvent.count();
    }
}
