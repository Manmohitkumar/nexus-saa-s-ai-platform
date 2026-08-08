import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventBus } from '../events/event-bus';
import { DocumentationIntelligenceService } from './documentation-intelligence.service';
import { DocumentationVersionService } from './documentation-version.service';
import { DocumentationQualityService } from './documentation-quality.service';
import { DocSection, EvolutionRun } from './documentation.types';

/**
 * Documentation Evolution Pipeline — continuously reacts to organizational
 * events already published on the Project Phoenix event bus. Whenever a
 * decision is reconstructed, the mentor answers, or the agent fleet completes,
 * the pipeline determines which documentation is impacted, re-derives the
 * affected sections from the brain, preserves the previous version, validates
 * consistency, and synchronizes the change back into the Organizational Brain.
 */
@Injectable()
export class DocumentationEvolutionService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger('DocumentationEvolution');
    private unsubscribe?: () => void;

    constructor(
        private readonly prisma: PrismaService,
        private readonly eventBus: EventBus,
        private readonly intelligence: DocumentationIntelligenceService,
        private readonly versions: DocumentationVersionService,
        private readonly quality: DocumentationQualityService,
    ) {}

    onModuleInit(): void {
        this.unsubscribe = this.eventBus.subscribe((event) => {
            if (['decision.reconstructed', 'mentor.answered', 'fleet.completed', 'agent.completed', 'phoenix.boot'].includes(event.type)) {
                this.runEvolution(event.type, event.resource, event.detail).catch((err) =>
                    this.logger.error(`Evolution run failed for ${event.type}: ${err instanceof Error ? err.message : String(err)}`),
                );
            }
        });
    }

    onModuleDestroy(): void {
        this.unsubscribe?.();
    }

    async history(limit = 20): Promise<EvolutionRun[]> {
        const rows = await this.prisma.documentationEvolutionEvent.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return rows.map((r) => ({
            id: r.id,
            trigger: r.trigger,
            resource: r.resource,
            detail: r.detail,
            action: r.action,
            documentsAffected: safeJson<string[]>(r.documentsAffected),
            summary: r.summary,
            createdAt: r.createdAt.toISOString(),
        }));
    }

    async runEvolution(trigger: string, resource = '', detail = ''): Promise<EvolutionRun> {
        const started = Date.now();
        const docs = await this.prisma.documentation.findMany();
        const affected: string[] = [];
        const changed: string[] = [];

        const scope = this.scopeFor(trigger, docs);
        for (const doc of scope.slice(0, 10)) {
            const candidate = await this.intelligence.candidateForDoc(doc);
            if (!candidate) continue;

            const latest = await this.prisma.documentationVersion.findUnique({
                where: { documentationId_version: { documentationId: doc.id, version: doc.version } },
            });
            const currentContent = latest ? safeJson<DocSection[]>(latest.content) : [];
            const candidateJson = JSON.stringify(candidate.content);

            if (JSON.stringify(currentContent) === candidateJson) continue;

            const qualityCtx = await this.quality.context();
            const row = {
                id: doc.id,
                title: doc.title,
                kind: doc.kind,
                status: doc.status,
                quality: doc.quality,
                confidence: doc.confidence,
                owner: doc.owner,
                team: doc.team,
                sourceType: doc.sourceType,
                sourceRef: doc.sourceRef,
                relatedNode: doc.relatedNode,
                version: doc.version,
                lastVerifiedAt: doc.lastVerifiedAt,
            };
            const freshness = this.quality.freshnessFor(row, qualityCtx);
            const report = this.quality.assess(row, candidate.content, freshness);
            const newStatus = freshness < 55 ? 'stale' : 'current';

            const nextVersion = await this.versions.createVersion(
                doc.id,
                candidate.content,
                `Synchronized after "${trigger}"${resource ? ` (${resource})` : ''}`,
                report.overall,
                candidate.confidence,
            );

            await this.prisma.documentation.update({
                where: { id: doc.id },
                data: { status: newStatus, summary: candidate.summary },
            });

            changed.push(doc.title);
            affected.push(doc.id);
            this.logger.log(`Regenerated "${doc.title}" → v${nextVersion}`);
        }

        const action = changed.length ? 'regenerated' : 'evaluated';
        const summary =
            changed.length > 0
                ? `Synchronized ${changed.length} document(s): ${changed.slice(0, 3).join(', ')}${changed.length > 3 ? ` +${changed.length - 3} more` : ''}`
                : `Evaluated ${scope.length} document(s) against the brain after "${trigger}" — no drift detected`;

        await this.quality.snapshot();

        const run = await this.prisma.documentationEvolutionEvent.create({
            data: {
                trigger,
                resource,
                detail,
                action,
                documentsAffected: JSON.stringify(affected),
                summary,
            },
        });

        this.eventBus.emit('documentation.evolved', `run:${run.id}`, `${summary} (${Date.now() - started}ms)`, {
            trigger,
            action,
            affected: affected.length,
        });

        return {
            id: run.id,
            trigger,
            resource,
            detail,
            action,
            documentsAffected: affected,
            summary,
            createdAt: run.createdAt.toISOString(),
        };
    }

    private scopeFor<T extends { kind: string; status: string }>(trigger: string, docs: T[]): T[] {
        switch (trigger) {
            case 'decision.reconstructed':
                return docs.filter((d) => d.kind === 'adr');
            case 'mentor.answered':
                return docs.filter((d) => ['onboarding', 'executive-summary', 'knowledge-transfer'].includes(d.kind));
            case 'fleet.completed':
            case 'agent.completed':
                return docs.filter((d) => d.status === 'stale' || d.kind === 'release-notes');
            default:
                return docs;
        }
    }
}

function safeJson<T>(raw: string): T {
    try {
        return JSON.parse(raw || '[]');
    } catch {
        return [] as T;
    }
}
