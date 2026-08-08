import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocSection, DocumentationDiff, DocumentationDiffSection, DocumentationVersionView } from './documentation.types';

/**
 * Version Management Services — every documentation mutation produces a new
 * immutable version. History is preserved for comparison, approval, audit, and
 * rollback; the latest version always mirrors the Organizational Digital Brain.
 */
@Injectable()
export class DocumentationVersionService {
    constructor(private readonly prisma: PrismaService) {}

    async list(docId: string): Promise<DocumentationVersionView[]> {
        const versions = await this.prisma.documentationVersion.findMany({
            where: { documentationId: docId },
            orderBy: { version: 'desc' },
        });
        return versions.map((v) => this.toView(v));
    }

    async get(docId: string, version: number) {
        const v = await this.prisma.documentationVersion.findUnique({
            where: { documentationId_version: { documentationId: docId, version } },
        });
        if (!v) throw new NotFoundException(`Documentation version ${version} not found`);
        return { ...this.toView(v), content: safeJson<DocSection[]>(v.content) };
    }

    async createVersion(
        docId: string,
        content: DocSection[],
        change: string,
        quality: number,
        confidence: number,
        author = 'Documentation Intelligence Agent',
    ): Promise<number> {
        const doc = await this.prisma.documentation.findUnique({ where: { id: docId } });
        if (!doc) throw new NotFoundException(`Documentation not found: ${docId}`);

        const nextVersion = doc.version + 1;
        await this.prisma.$transaction([
            this.prisma.documentationVersion.updateMany({
                where: { documentationId: docId, status: 'current' },
                data: { status: 'superseded' },
            }),
            this.prisma.documentationVersion.create({
                data: {
                    documentationId: docId,
                    version: nextVersion,
                    change,
                    author,
                    status: 'current',
                    content: JSON.stringify(content),
                    quality,
                    confidence,
                },
            }),
            this.prisma.documentation.update({
                where: { id: docId },
                data: {
                    version: nextVersion,
                    quality,
                    confidence,
                    lastVerifiedAt: new Date(),
                    updatedAt: new Date(),
                },
            }),
        ]);
        return nextVersion;
    }

    async diff(docId: string, from: number, to: number): Promise<DocumentationDiff> {
        const doc = await this.prisma.documentation.findUnique({ where: { id: docId } });
        if (!doc) throw new NotFoundException(`Documentation not found: ${docId}`);
        const a = await this.get(docId, from);
        const b = await this.get(docId, to);

        const byHeading = new Map<string, { a?: DocSection; b?: DocSection }>();
        for (const s of a.content) byHeading.set(s.heading, { a: s });
        for (const s of b.content) {
            const entry = byHeading.get(s.heading) ?? { a: undefined };
            entry.b = s;
            byHeading.set(s.heading, entry);
        }

        const sections: DocumentationDiffSection[] = [];
        for (const [heading, pair] of byHeading.entries()) {
            if (!pair.a) sections.push({ heading, change: 'added', summary: `New section "${heading}".` });
            else if (!pair.b) sections.push({ heading, change: 'removed', summary: `Section "${heading}" removed.` });
            else if (JSON.stringify(pair.a) !== JSON.stringify(pair.b)) {
                const aLen = contentLength(pair.a);
                const bLen = contentLength(pair.b);
                sections.push({ heading, change: 'changed', summary: `Section "${heading}" changed (${aLen} → ${bLen} content items).` });
            } else {
                sections.push({ heading, change: 'unchanged', summary: `Section "${heading}" unchanged.` });
            }
        }

        return {
            id: docId,
            title: doc.title,
            fromVersion: from,
            toVersion: to,
            added: sections.filter((s) => s.change === 'added').length,
            removed: sections.filter((s) => s.change === 'removed').length,
            changed: sections.filter((s) => s.change === 'changed').length,
            sections,
        };
    }

    async rollback(docId: string, to: number): Promise<number> {
        const target = await this.get(docId, to);
        return this.createVersion(
            docId,
            target.content,
            `Rollback to version ${to}`,
            target.quality,
            target.confidence,
            'Documentation Intelligence Agent',
        );
    }

    private toView(v: {
        id: string;
        version: number;
        change: string;
        author: string;
        status: string;
        quality: number;
        confidence: number;
        createdAt: Date;
    }): DocumentationVersionView {
        return {
            id: v.id,
            version: v.version,
            change: v.change,
            author: v.author,
            status: v.status,
            quality: v.quality,
            confidence: v.confidence,
            createdAt: v.createdAt.toISOString(),
        };
    }
}

function safeJson<T>(raw: string): T {
    try {
        return JSON.parse(raw || '[]');
    } catch {
        return [] as T;
    }
}

function contentLength(s: DocSection | undefined): number {
    if (!s) return 0;
    return (s.body ? 1 : 0) + (s.code ? 1 : 0) + (s.bullets?.length ?? 0) + (s.table ? 1 + s.table.rows.length : 0) + (s.evidence?.length ?? 0);
}
