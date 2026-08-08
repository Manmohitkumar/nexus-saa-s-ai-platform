import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    ExecutiveForecast,
    ExecutiveOverview,
    ExecutiveRawSignals,
    ExecutiveRecommendation,
    ExecutiveReport,
    ExecutiveReportFormat,
    ExecutiveSummary,
    ExecutiveTrend,
} from './executive.types';

export interface ExecutiveReportData {
    period: string;
    overview: ExecutiveOverview;
    summary: ExecutiveSummary;
    forecast: ExecutiveForecast;
    recommendations: ExecutiveRecommendation[];
    trends: ExecutiveTrend;
}

/**
 * Executive Reporting Service — composes daily/weekly/monthly/quarterly/annual
 * executive reports (Markdown / JSON / email-ready text) purely from the
 * existing documentation and intelligence signals, then persists them as
 * ExecutiveReport rows for later retrieval and export.
 */
@Injectable()
export class ExecutiveReportingService {
    constructor(private readonly prisma: PrismaService) {}

    async generate(data: ExecutiveReportData, format: ExecutiveReportFormat = 'markdown'): Promise<ExecutiveReport> {
        const title = this.titleFor(data.period, data.overview);
        const summary = this.summaryFor(data.overview, data.recommendations);
        const markdown = this.toMarkdown(data, title, summary);
        const json = this.toJson(data, title, summary);

        const row = await this.prisma.executiveReport.create({
            data: {
                period: data.period,
                title,
                format,
                summary,
                markdown,
                json: JSON.stringify(json),
            },
        });

        return {
            id: row.id,
            period: row.period,
            title: row.title,
            generatedAt: row.createdAt.toISOString(),
            format: format,
            summary: row.summary,
            markdown: row.markdown,
            json: this.safeJson(row.json, {}),
        };
    }

    async list(): Promise<ExecutiveReport[]> {
        const rows = await this.prisma.executiveReport.findMany({ orderBy: { createdAt: 'desc' }, take: 30 });
        return rows.map((r) => ({
            id: r.id,
            period: r.period,
            title: r.title,
            generatedAt: r.createdAt.toISOString(),
            format: r.format as ExecutiveReportFormat,
            summary: r.summary,
            markdown: r.markdown,
            json: this.safeJson(r.json, {}),
        }));
    }

    async detail(id: string): Promise<ExecutiveReport | null> {
        const row = await this.prisma.executiveReport.findUnique({ where: { id } });
        if (!row) return null;
        return {
            id: row.id,
            period: row.period,
            title: row.title,
            generatedAt: row.createdAt.toISOString(),
            format: row.format as ExecutiveReportFormat,
            summary: row.summary,
            markdown: row.markdown,
            json: this.safeJson(row.json, {}),
        };
    }

    private titleFor(period: string, overview: ExecutiveOverview): string {
        const periodLabel = period.charAt(0).toUpperCase() + period.slice(1);
        return `${periodLabel} Executive Report — ${overview.overallStatus === 'healthy' ? 'Stable' : overview.overallStatus === 'watch' ? 'Watch' : 'Action Required'} (${overview.overallHealth}/100)`;
    }

    private summaryFor(overview: ExecutiveOverview, recommendations: ExecutiveRecommendation[]): string {
        const critical = recommendations.filter((r) => r.tier === 'executive-critical' || r.tier === 'urgent').length;
        return `${overview.narrative.opening} Organizational health is ${overview.overallHealth}/100 with ${overview.highlights.filter((h) => h.type === 'achievement').length} notable achievements and ${critical} executive-critical recommendations to review.`;
    }

    private toMarkdown(data: ExecutiveReportData, title: string, summary: string): string {
        const { overview, summary: execSummary, forecast, recommendations, trends } = data;
        const lines: string[] = [
            `# ${title}`,
            `**Generated:** ${overview.generatedAt} · **Period:** ${data.period}`,
            ``,
            `## Executive Summary`,
            summary,
            ``,
            `## Organizational Health`,
            `Overall: **${overview.overallHealth}/100** (${overview.overallStatus})`,
            ``,
            `| Pillar | Score | Status |`,
            `| --- | --- | --- |`,
            ...overview.pillars.map((p) => `| ${p.label} | ${p.score} | ${p.status} |`),
            ``,
            `## Strategic KPIs`,
            `| KPI | Value | Trend | Status |`,
            `| --- | --- | --- | --- |`,
            ...overview.kpis.map((k) => `| ${k.label} | ${k.value} | ${k.trend} | ${k.status} |`),
            ``,
            `## Highlights`,
            ...overview.highlights.map((h) => `- **[${h.type}]** ${h.title} — ${h.detail}`),
            ``,
            `## Forecast`,
            ...forecast.points.slice(0, 8).map(
                (p) => `- **${p.title}** (${p.horizon}) — ${p.summary} · likelihood ${p.likelihood}% · impact ${p.impact}`,
            ),
            ``,
            `## Prioritized Recommendations`,
            ...recommendations.slice(0, 10).map(
                (r) =>
                    `- **[${r.tier}]** ${r.title} — ${r.justification} Owner: ${r.owner} · ETA: ${r.eta} · Benefit: ${r.expectedBenefit}`,
            ),
            ``,
            `## Trend Watch`,
            ...trends.deltas.slice(0, 8).map((d) => `- ${d.label}: ${d.change > 0 ? '+' : ''}${d.change} points (${d.direction})`),
            ``,
            `## Top Findings`,
            ...execSummary.topFindings.slice(0, 6).map((f) => `- **[${f.priority}]** ${f.title} — ${f.summary}`),
            ``,
            `---`,
            `_This report aggregates signals from Features 1-7 of the Organizational Digital Brain with evidence-backed confidence scoring. It contains no new intelligence — it is a prioritization and presentation layer._`,
        ];
        return lines.join('\n');
    }

    private toJson(data: ExecutiveReportData, title: string, summary: string): Record<string, unknown> {
        return {
            title,
            summary,
            period: data.period,
            generatedAt: data.overview.generatedAt,
            overallHealth: data.overview.overallHealth,
            overallStatus: data.overview.overallStatus,
            pillars: data.overview.pillars,
            kpis: data.overview.kpis,
            highlights: data.overview.highlights,
            narrative: data.overview.narrative,
            forecast: data.forecast,
            recommendations: data.recommendations,
            trends: data.trends,
            topFindings: data.summary.topFindings,
        };
    }

    private safeJson<T>(value: string, fallback: T): T {
        try {
            return JSON.parse(value) as T;
        } catch {
            return fallback;
        }
    }
}
