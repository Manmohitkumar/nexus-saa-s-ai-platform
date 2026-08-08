import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventBus, PhoenixEvent } from '../events/event-bus';
import { ExecutiveAggregatorService } from './executive-aggregator.service';
import { ExecutiveKpiService } from './executive-kpi.service';
import { ExecutiveSummaryService } from './executive-summary.service';
import { ExecutiveForecastService } from './executive-forecast.service';
import { ExecutiveTrendService } from './executive-trend.service';
import { ExecutivePrioritizationService } from './executive-prioritization.service';
import { ExecutiveReportingService } from './executive-reporting.service';
import { ExecutiveBriefingService } from './executive-briefing.service';
import {
    ExecutiveForecast,
    ExecutiveKpi,
    ExecutiveOverview,
    ExecutiveRawSignals,
    ExecutiveReport,
    ExecutiveReportFormat,
    ExecutiveSnapshotView,
    ExecutiveSummary,
    ExecutiveRecommendation,
    ExecutiveTrend,
} from './executive.types';

const REFRESH_EVENT_TYPES = [
    'decision.reconstructed',
    'documentation.evolved',
    'fleet.completed',
    'agent.completed',
    'mentor.answered',
    'intelligence.sweep',
    'phoenix.boot',
];

const REFRESH_THROTTLE_MS = 5000;

/**
 * Executive Intelligence Service — public facade for Feature 8. It composes the
 * aggregation, KPI, summary, forecast, trend, prioritization, reporting, and
 * briefing engines into one surface, persists historical snapshots, and keeps
 * the dashboard continuously aware by throttling an automatic refresh whenever
 * the organizational brain changes (events from Features 2-7).
 */
@Injectable()
export class ExecutiveService implements OnModuleInit {
    private lastRefreshAt = 0;
    private readonly refreshSeries: Array<{ trigger: string; at: string; snapshotId: string | null }> = [];

    constructor(
        private readonly prisma: PrismaService,
        private readonly aggregator: ExecutiveAggregatorService,
        private readonly kpiService: ExecutiveKpiService,
        private readonly summaryService: ExecutiveSummaryService,
        private readonly forecastService: ExecutiveForecastService,
        private readonly trendService: ExecutiveTrendService,
        private readonly prioritizationService: ExecutivePrioritizationService,
        private readonly reportingService: ExecutiveReportingService,
        private readonly briefingService: ExecutiveBriefingService,
        private readonly eventBus: EventBus,
    ) {}

    onModuleInit(): void {
        this.eventBus.subscribe((event) => this.onBrainEvent(event));
    }

    // ------------------------------------------------------------------
    // Continuous awareness
    // ------------------------------------------------------------------

    private onBrainEvent(event: PhoenixEvent): void {
        if (!REFRESH_EVENT_TYPES.includes(event.type)) return;
        const now = Date.now();
        if (now - this.lastRefreshAt < REFRESH_THROTTLE_MS) return;
        // Fire-and-forget background refresh so views stay current without
        // blocking the emitter.
        void this.refresh(`event:${event.type}`).catch(() => undefined);
    }

    async refresh(trigger = 'manual'): Promise<ExecutiveOverview> {
        const now = Date.now();
        this.lastRefreshAt = now;

        const raw = await this.aggregator.gather();
        const kpis = this.kpiService.build(raw);
        const overview = this.summaryService.overview(raw, kpis, null);

        let snapshotId: string | null = null;
        try {
            const row = await this.prisma.executiveSnapshot.create({
                data: {
                    overallHealth: overview.overallHealth,
                    status: overview.overallStatus,
                    confidence: overview.confidence,
                    kpis: JSON.stringify(Object.fromEntries(kpis.map((k) => [k.key, k.value]))),
                    metrics: JSON.stringify(this.metrics(raw, kpis)),
                    trigger,
                },
            });
            snapshotId = row.id;
            overview.snapshotId = row.id;
        } catch {
            // Snapshot persistence is best-effort; the live overview still serves.
        }

        this.refreshSeries.unshift({ trigger, at: overview.generatedAt, snapshotId });
        if (this.refreshSeries.length > 30) this.refreshSeries.pop();
        this.eventBus.emit('executive.refreshed', 'executive', `Executive dashboard refreshed via ${trigger}`, {
            trigger,
            snapshotId,
        });

        return overview;
    }

    private metrics(raw: ExecutiveRawSignals, kpis: ExecutiveKpi[]): Record<string, unknown> {
        return {
            agentCount: raw.agentCount,
            insights: raw.insights.length,
            predictions: raw.predictions.length,
            riskPredictions: raw.riskPredictions.length,
            riskRecommendations: raw.riskRecommendations.length,
            docRecommendations: raw.docRecommendations.length,
            kpiCount: kpis.length,
            criticalKpis: kpis.filter((k) => k.status === 'critical').length,
            watchKpis: kpis.filter((k) => k.status === 'watch').length,
        };
    }

    // ------------------------------------------------------------------
    // Live executive views (recomputed on demand — no new intelligence)
    // ------------------------------------------------------------------

    async overview(): Promise<ExecutiveOverview> {
        const raw = await this.aggregator.gather();
        const kpis = this.kpiService.build(raw);
        return this.summaryService.overview(raw, kpis, null);
    }

    async kpis(): Promise<ExecutiveKpi[]> {
        const raw = await this.aggregator.gather();
        return this.kpiService.build(raw);
    }

    async summary(): Promise<ExecutiveSummary> {
        const raw = await this.aggregator.gather();
        return this.summaryService.summary(raw);
    }

    async forecast(): Promise<ExecutiveForecast> {
        const raw = await this.aggregator.gather();
        const kpis = this.kpiService.build(raw);
        return this.forecastService.forecast(raw, kpis);
    }

    async trends(): Promise<ExecutiveTrend> {
        const raw = await this.aggregator.gather();
        return this.trendService.trend(raw);
    }

    async recommendations(): Promise<ExecutiveRecommendation[]> {
        const raw = await this.aggregator.gather();
        return this.prioritizationService.recommendations(raw);
    }

    async briefing(period = 'weekly'): Promise<ReturnType<ExecutiveBriefingService['briefing']>> {
        const [raw, kpis, execSummary, forecast, recommendations, previous] = await Promise.all([
            this.aggregator.gather(),
            this.aggregator.gather().then((r) => this.kpiService.build(r)),
            this.summary(),
            this.forecast(),
            this.recommendations(),
            this.latestSnapshotKpis(),
        ]);
        return this.briefingService.briefing(raw, kpis, execSummary, forecast, recommendations, period, previous);
    }

    // ------------------------------------------------------------------
    // Snapshots & events
    // ------------------------------------------------------------------

    async snapshots(limit = 30): Promise<ExecutiveSnapshotView[]> {
        const rows = await this.prisma.executiveSnapshot.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return rows.map((r) => ({
            id: r.id,
            overallHealth: r.overallHealth,
            status: r.status,
            confidence: r.confidence,
            kpis: this.safeJson<Record<string, number>>(r.kpis, {}),
            trigger: r.trigger,
            createdAt: r.createdAt.toISOString(),
        }));
    }

    async events(limit = 40): Promise<PhoenixEvent[]> {
        return this.eventBus.recent(limit).filter((e) => e.type === 'executive.refreshed' || REFRESH_EVENT_TYPES.includes(e.type));
    }

    async refreshHistory(): Promise<Array<{ trigger: string; at: string; snapshotId: string | null }>> {
        return this.refreshSeries;
    }

    private async latestSnapshotKpis(): Promise<Record<string, number>> {
        try {
            const row = await this.prisma.executiveSnapshot.findFirst({ orderBy: { createdAt: 'desc' } });
            return row ? this.safeJson<Record<string, number>>(row.kpis, {}) : {};
        } catch {
            return {};
        }
    }

    // ------------------------------------------------------------------
    // Reporting & export (reuses the Documentation Engine signals)
    // ------------------------------------------------------------------

    async generateReport(period = 'weekly', format: ExecutiveReportFormat = 'markdown'): Promise<ExecutiveReport> {
        const [overview, summary, forecast, recommendations, trends] = await Promise.all([
            this.overview(),
            this.summary(),
            this.forecast(),
            this.recommendations(),
            this.trends(),
        ]);
        return this.reportingService.generate({ period, overview, summary, forecast, recommendations, trends }, format);
    }

    listReports(): Promise<ExecutiveReport[]> {
        return this.reportingService.list();
    }

    reportDetail(id: string): Promise<ExecutiveReport | null> {
        return this.reportingService.detail(id);
    }

    private safeJson<T>(value: string, fallback: T): T {
        try {
            return JSON.parse(value) as T;
        } catch {
            return fallback;
        }
    }
}
