"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import {
  fetchExecutiveBriefing,
  fetchExecutiveEvents,
  fetchExecutiveForecast,
  fetchExecutiveOverview,
  fetchExecutiveRecommendations,
  fetchExecutiveReports,
  fetchExecutiveSnapshots,
  fetchExecutiveSummary,
  fetchExecutiveTrends,
  generateExecutiveReport,
  refreshExecutive,
} from "@/lib/phoenix/api";
import type {
  BusEvent,
  ExecutiveBriefing,
  ExecutiveForecast,
  ExecutiveForecastPoint,
  ExecutiveHighlight,
  ExecutiveKpi,
  ExecutiveKpiCategory,
  ExecutiveOverview,
  ExecutivePillar,
  ExecutiveRecommendation,
  ExecutiveReport,
  ExecutiveSnapshotView,
  ExecutiveStatus,
  ExecutiveSummary,
  ExecutiveTier,
  ExecutiveTrend,
  ExecutiveTrendDelta,
} from "@/lib/phoenix/types";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  CalendarClock,
  FileText,
  HeartPulse,
  Lightbulb,
  Network,
  Newspaper,
  RefreshCw,
  Scale,
  ShieldAlert,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens & helpers (Feature 8 follows the Project Phoenix light theme)
// ---------------------------------------------------------------------------

const statusStyles: Record<ExecutiveStatus, { bg: string; fg: string; label: string }> = {
  healthy: { bg: "rgba(46, 125, 50, 0.12)", fg: "#2E7D32", label: "healthy" },
  watch: { bg: "rgba(249, 168, 37, 0.16)", fg: "#B26A00", label: "watch" },
  critical: { bg: "rgba(211, 47, 47, 0.12)", fg: "#D32F2F", label: "critical" },
};

const tierStyles: Record<ExecutiveTier, { bg: string; fg: string }> = {
  "executive-critical": { bg: "rgba(123, 31, 162, 0.12)", fg: "#7B1FA2" },
  urgent: { bg: "rgba(211, 47, 47, 0.12)", fg: "#D32F2F" },
  strategic: { bg: "rgba(249, 168, 37, 0.16)", fg: "#B26A00" },
  operational: { bg: "rgba(33, 150, 243, 0.12)", fg: "#0D47A1" },
  informational: { bg: "rgba(95, 107, 122, 0.12)", fg: "#5F6B7A" },
};

const categoryIcons: Record<ExecutiveKpiCategory, typeof Activity> = {
  health: HeartPulse,
  risk: ShieldAlert,
  workforce: Users,
  knowledge: BookOpen,
  decisions: Scale,
  architecture: Network,
  innovation: Lightbulb,
  productivity: Zap,
};

const highlightIcons: Record<ExecutiveHighlight["type"], typeof Activity> = {
  achievement: Sparkles,
  risk: AlertTriangle,
  opportunity: Lightbulb,
  notice: Newspaper,
};

const periods = ["daily", "weekly", "monthly", "quarterly", "annual"] as const;

function StatusPill({ status }: { status: ExecutiveStatus }) {
  const s = statusStyles[status];
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

function TrendBadge({ direction, change }: { direction: ExecutiveTrend["deltas"][number]["direction"]; change?: number }) {
  const improving = direction === "improving";
  const declining = direction === "declining";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize"
      style={{
        background: improving ? "rgba(46, 125, 50, 0.12)" : declining ? "rgba(211, 47, 47, 0.12)" : "rgba(95, 107, 122, 0.12)",
        color: improving ? "#2E7D32" : declining ? "#D32F2F" : "#5F6B7A",
      }}
    >
      {improving ? <ArrowUp className="h-3 w-3" /> : declining ? <ArrowDown className="h-3 w-3" /> : null}
      {direction}
      {change !== undefined && change !== 0 && <span>{change > 0 ? `+${change}` : change}</span>}
    </span>
  );
}

function Card({
  children,
  className = "",
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: string;
}) {
  return (
    <section
      className={`rounded-2xl p-6 ${className}`}
      style={{
        background: "#FFFFFF",
        border: `1px solid ${accent ?? "#D6EAF8"}`,
        boxShadow: "0 10px 30px rgba(33,150,243,.12)",
      }}
    >
      {children}
    </section>
  );
}

function CardHeader({ icon: Icon, title, badge, action }: { icon: typeof Activity; title: string; badge?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon className="h-4 w-4" style={{ color: "#0D47A1" }} />
      <h2 className="text-lg font-semibold" style={{ color: "#211F20" }}>{title}</h2>
      {badge}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

function Sparkline({ values, width = 200, height = 48 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) {
    return <p className="text-xs" style={{ color: "#5F6B7A" }}>Not enough history yet.</p>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(height - 4 - ((v - min) / range) * (height - 8)).toFixed(1)}`)
    .join(" ");
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="#2196F3" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={width} cy={height - 4 - ((values[values.length - 1] - min) / range) * (height - 8)} r="3" fill="#0D47A1" />
    </svg>
  );
}

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "#0D47A1" }}>{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-semibold" style={{ color: "#211F20" }}>{title}</h1>
      {description && <p className="mt-1 text-sm" style={{ color: "#1E3A5F" }}>{description}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Executive Command Center
// ---------------------------------------------------------------------------

export default function ExecutiveCommandCenter() {
  const [overview, setOverview] = useState<ExecutiveOverview | null>(null);
  const [execSummary, setExecSummary] = useState<ExecutiveSummary | null>(null);
  const [forecast, setForecast] = useState<ExecutiveForecast | null>(null);
  const [recommendations, setRecommendations] = useState<ExecutiveRecommendation[]>([]);
  const [trends, setTrends] = useState<ExecutiveTrend | null>(null);
  const [briefing, setBriefing] = useState<ExecutiveBriefing | null>(null);
  const [briefingPeriod, setBriefingPeriod] = useState<(typeof periods)[number]>("weekly");
  const [reports, setReports] = useState<ExecutiveReport[]>([]);
  const [reportDetail, setReportDetail] = useState<ExecutiveReport | null>(null);
  const [events, setEvents] = useState<BusEvent[]>([]);
  const [snapshots, setSnapshots] = useState<ExecutiveSnapshotView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [ov, sum, fc, rec, tr] = await Promise.all([
        fetchExecutiveOverview(),
        fetchExecutiveSummary(),
        fetchExecutiveForecast(),
        fetchExecutiveRecommendations(),
        fetchExecutiveTrends(),
      ]);
      setOverview(ov);
      setExecSummary(sum);
      setForecast(fc);
      setRecommendations(rec);
      setTrends(tr);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load executive data");
    }
  }, []);

  const loadBriefing = useCallback(async (period: (typeof periods)[number]) => {
    try {
      setBriefing(await fetchExecutiveBriefing(period));
    } catch (e) {
      console.error("Failed to load briefing", e);
    }
  }, []);

  useEffect(() => {
    loadAll();
    loadBriefing(briefingPeriod);
    fetchExecutiveReports().then(setReports).catch((e) => console.error("Failed to load reports", e));
    fetchExecutiveEvents().then(setEvents).catch((e) => console.error("Failed to load events", e));
    fetchExecutiveSnapshots(30).then(setSnapshots).catch((e) => console.error("Failed to load snapshots", e));
    setLoading(false);
  }, [loadAll, loadBriefing, briefingPeriod]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const ov = await refreshExecutive("manual");
      setOverview(ov);
      setLastRefreshedAt(ov.generatedAt);
      const [snaps, evs] = await Promise.all([fetchExecutiveSnapshots(30), fetchExecutiveEvents()]);
      setSnapshots(snaps);
      setEvents(evs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerateReport = async (period: (typeof periods)[number]) => {
    setGenerating(true);
    try {
      const report = await generateExecutiveReport(period, "markdown");
      setReports((prev) => [report, ...prev]);
      setReportDetail(report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const executiveCritical = recommendations.filter((r) => r.tier === "executive-critical" || r.tier === "urgent").length;
  const seriesValues = (trends?.series ?? []).map((p) => p.kpis["org-health"] ?? 0);
  const topFindings = execSummary?.topFindings ?? [];
  const criticalFindings = topFindings.filter((f) => f.priority === "critical").length;

  return (
    <div className="min-h-screen" style={{ background: "#E3F2FD" }}>
      <DashboardTopbar
        title="Executive Command Center"
        subtitle="Strategic presentation layer consuming Features 1 through 7"
      />

      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        {/* Situation banner */}
        <section
          className="rounded-2xl p-6"
          style={{
            background: "linear-gradient(135deg, #E3F2FD 0%, #90CAF9 45%, #2196F3 100%)",
            border: "1px solid #D6EAF8",
            boxShadow: "0 10px 30px rgba(33,150,243,.12)",
          }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "#0D47A1" }}>
                Strategic Situation Room
              </p>
              <h1 className="mt-2 text-2xl font-semibold" style={{ color: "#211F20" }}>
                Project Phoenix Executive Intelligence
              </h1>
              <p className="mt-1 max-w-2xl text-sm" style={{ color: "#1E3A5F" }}>
                This layer creates zero new intelligence. It aggregates, prioritizes, predicts, and explains outputs
                from the full platform stack — with evidence, confidence, and drill-downs into every workspace.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-60"
                style={{ background: "#0D47A1", color: "#FFFFFF" }}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh snapshot"}
              </button>
              <div className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs" style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(13,71,161,0.18)" }}>
                <CalendarClock className="h-4 w-4" style={{ color: "#0D47A1" }} />
                <span style={{ color: "#0D47A1" }}>
                  {lastRefreshedAt
                    ? `Refreshed ${new Date(lastRefreshedAt).toLocaleTimeString()}`
                    : overview?.generatedAt
                      ? `Live · ${new Date(overview.generatedAt).toLocaleTimeString()}`
                      : "Continuous event-driven refresh"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <section className="rounded-2xl border p-4 text-sm" style={{ background: "#FFF9F9", borderColor: "#F5C6C6", color: "#D32F2F" }}>
            {error}
          </section>
        )}

        {/* Executive summary strip */}
        {overview && (
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Overall Health", value: `${overview.overallHealth}`, icon: HeartPulse, status: overview.overallStatus },
              { label: "Confidence", value: `${overview.confidence}%`, icon: Brain, status: "healthy" as ExecutiveStatus },
              { label: "Exec-Critical Recs", value: `${executiveCritical}`, icon: ShieldAlert, status: (executiveCritical > 0 ? "critical" : "healthy") as ExecutiveStatus },
              { label: "Top Findings", value: `${topFindings.length}`, icon: Newspaper, status: (criticalFindings > 0 ? "watch" : "healthy") as ExecutiveStatus },
            ].map((card) => (
              <Card key={card.label} className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium" style={{ color: "#5F6B7A" }}>{card.label}</p>
                  <card.icon className="h-4 w-4" style={{ color: "#2196F3" }} />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-3xl font-semibold" style={{ color: "#211F20" }}>{card.value}</p>
                  <StatusPill status={card.status} />
                </div>
              </Card>
            ))}
          </section>
        )}

        {/* Narrative */}
        {overview && (
          <Card accent="#90CAF9">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "#0D47A1" }} />
              <div>
                <p className="text-sm leading-relaxed" style={{ color: "#211F20" }}>{overview.narrative.opening}</p>
                {overview.narrative.focus.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {overview.narrative.focus.map((f) => (
                      <span key={f} className="rounded-full px-3 py-1 text-xs" style={{ background: "#EAF3FB", color: "#0D47A1" }}>{f}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Organizational Health Map */}
        <Card>
          <CardHeader icon={HeartPulse} title="Organizational Health Map" badge={<span className="rounded-full px-2 py-1 text-xs" style={{ background: "#EAF3FB", color: "#0D47A1" }}>4+ pillars</span>} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(overview?.pillars ?? []).map((pillar: ExecutivePillar) => (
              <Link key={pillar.key} href={pillar.drillDown} className="rounded-xl border p-4 transition-colors" style={{ borderColor: "#EAF3FB", background: "#F8FBFF" }}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold" style={{ color: "#211F20" }}>{pillar.label}</p>
                  <StatusPill status={pillar.status} />
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: "#EAF3FB" }}>
                  <div className="h-full rounded-full" style={{ width: `${pillar.score}%`, background: pillar.score >= 75 ? "#43A047" : pillar.score >= 50 ? "#F9A825" : "#E53935" }} />
                </div>
                <p className="mt-2 text-xs" style={{ color: "#5F6B7A" }}>
                  {pillar.drivers.slice(0, 2).join(" · ") || "No drivers reported"}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "#2196F3" }}>
                  Drill down <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
            {(overview?.pillars?.length ?? 0) === 0 && (
              <p className="text-sm" style={{ color: "#5F6B7A" }}>Loading pillars...</p>
            )}
          </div>
        </Card>

        {/* Strategic KPI grid */}
        <Card>
          <CardHeader icon={Activity} title="Strategic KPI Grid" badge={<span className="rounded-full px-2 py-1 text-xs" style={{ background: "#EAF3FB", color: "#0D47A1" }}>{overview?.kpis.length ?? 0} KPIs</span>} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(overview?.kpis ?? []).map((kpi: ExecutiveKpi) => {
              const Icon = categoryIcons[kpi.category] ?? Activity;
              return (
                <Link key={kpi.key} href={kpi.drillDown} className="rounded-xl border p-4 transition-colors" style={{ borderColor: "#EAF3FB", background: "#F8FBFF" }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "#EAF3FB" }}>
                        <Icon className="h-3.5 w-3.5" style={{ color: "#2196F3" }} />
                      </div>
                      <p className="text-xs font-medium" style={{ color: "#5F6B7A" }}>{kpi.label}</p>
                    </div>
                    <StatusPill status={kpi.status} />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <p className="text-2xl font-semibold" style={{ color: "#211F20" }}>{kpi.value}</p>
                    <TrendBadge direction={kpi.trend} change={kpi.change} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed" style={{ color: "#5F6B7A" }}>{kpi.summary}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: "#90A4AE" }}>confidence {kpi.confidence}%</span>
                    <ArrowRight className="h-3 w-3" style={{ color: "#90CAF9" }} />
                  </div>
                </Link>
              );
            })}
            {(overview?.kpis?.length ?? 0) === 0 && <p className="text-sm" style={{ color: "#5F6B7A" }}>Loading KPIs...</p>}
          </div>
        </Card>

        {/* Highlights */}
        <Card>
          <CardHeader icon={Sparkles} title="Executive Highlights" badge={<span className="rounded-full px-2 py-1 text-xs" style={{ background: "#EAF3FB", color: "#0D47A1" }}>{overview?.highlights.length ?? 0} items</span>} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {(overview?.highlights ?? []).map((h: ExecutiveHighlight) => {
              const Icon = highlightIcons[h.type] ?? Newspaper;
              const isRisk = h.type === "risk" || h.type === "notice";
              return (
                <Link key={h.id} href={h.linkedRoute} className="rounded-xl border p-4 transition-colors" style={{ borderColor: "#EAF3FB", background: isRisk ? "#FFF9F9" : "#F8FBFF" }}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: isRisk ? "rgba(211,47,47,0.1)" : "#EAF3FB" }}>
                      <Icon className="h-3.5 w-3.5" style={{ color: isRisk ? "#D32F2F" : "#2196F3" }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold" style={{ color: "#211F20" }}>{h.title}</p>
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase" style={{ background: isRisk ? "rgba(211,47,47,0.1)" : "rgba(33,150,243,0.1)", color: isRisk ? "#D32F2F" : "#0D47A1" }}>{h.type}</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed" style={{ color: "#5F6B7A" }}>{h.detail}</p>
                      <p className="mt-1 text-[10px]" style={{ color: "#90A4AE" }}>Feature {h.sourceFeature} · confidence {h.confidence}%</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Forecast */}
          <Card>
            <CardHeader
              icon={Brain}
              title="Organizational Forecast"
              badge={<span className="rounded-full px-2 py-1 text-xs" style={{ background: "#EAF3FB", color: "#0D47A1" }}>stability {forecast?.overallStability ?? "—"}</span>}
              action={<Link href="/dashboard/intelligence" className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "#2196F3" }}>Open Intelligence Workspace <ArrowRight className="h-3 w-3" /></Link>}
            />
            <div className="space-y-3">
              {(forecast?.points ?? []).slice(0, 8).map((point: ExecutiveForecastPoint) => (
                <div key={point.id} className="rounded-xl border p-4" style={{ borderColor: "#EAF3FB" }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold" style={{ color: "#211F20" }}>{point.title}</p>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background: point.impact === "high" ? "rgba(211,47,47,0.1)" : point.impact === "medium" ? "rgba(249,168,37,0.16)" : "rgba(33,150,243,0.1)", color: point.impact === "high" ? "#D32F2F" : point.impact === "medium" ? "#B26A00" : "#0D47A1" }}>
                      {point.horizon} · {point.impact} impact
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: "#5F6B7A" }}>{point.summary}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "#EAF3FB" }}>
                      <div className="h-full rounded-full" style={{ width: `${point.likelihood}%`, background: point.likelihood >= 60 ? "#E53935" : point.likelihood >= 35 ? "#F9A825" : "#43A047" }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: "#211F20" }}>{point.likelihood}%</span>
                    <TrendBadge direction={point.trend} />
                  </div>
                </div>
              ))}
              {(forecast?.points?.length ?? 0) === 0 && <p className="text-sm" style={{ color: "#5F6B7A" }}>Loading forecast...</p>}
            </div>
          </Card>

          {/* Recommendation Prioritization */}
          <Card>
            <CardHeader
              icon={ShieldAlert}
              title="AI Recommendation Center"
              badge={<span className="rounded-full px-2 py-1 text-xs" style={{ background: "#EAF3FB", color: "#0D47A1" }}>{recommendations.length} prioritized</span>}
              action={<Link href="/dashboard/intelligence" className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "#2196F3" }}>All recommendations <ArrowRight className="h-3 w-3" /></Link>}
            />
            <div className="space-y-3">
              {recommendations.slice(0, 8).map((rec: ExecutiveRecommendation) => {
                const t = tierStyles[rec.tier];
                return (
                  <div key={rec.id} className="rounded-xl border p-4" style={{ borderColor: "#EAF3FB" }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: t.bg, color: t.fg }}>{rec.tier}</span>
                      <span className="text-[10px]" style={{ color: "#90A4AE" }}>confidence {rec.confidence}% · effort {rec.effort}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold" style={{ color: "#211F20" }}>{rec.title}</p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: "#5F6B7A" }}>{rec.justification}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]" style={{ color: "#0D47A1" }}>
                      <span className="rounded-full px-2 py-0.5" style={{ background: "#EAF3FB" }}>Owner: {rec.owner}</span>
                      <span className="rounded-full px-2 py-0.5" style={{ background: "#EAF3FB" }}>ETA: {rec.eta}</span>
                      <span className="rounded-full px-2 py-0.5" style={{ background: "#EAF3FB" }}>{rec.expectedBenefit}</span>
                      <Link href={rec.drillDown} className="ml-auto inline-flex items-center gap-1 font-semibold" style={{ color: "#2196F3" }}>
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
              {recommendations.length === 0 && <p className="text-sm" style={{ color: "#5F6B7A" }}>Loading recommendations...</p>}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Cross-domain findings */}
          <Card className="xl:col-span-2">
            <CardHeader icon={Newspaper} title="Cross-Domain Insight Explorer" badge={<span className="rounded-full px-2 py-1 text-xs" style={{ background: "#EAF3FB", color: "#0D47A1" }}>from Features 2-7</span>} />
            <div className="space-y-3">
              {topFindings.map((finding) => (
                <Link key={finding.id} href={finding.linkedRoute} className="block rounded-xl border p-4 transition-colors" style={{ borderColor: "#EAF3FB" }}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold" style={{ color: "#211F20" }}>{finding.title}</p>
                    <span className="rounded-full px-2 py-1 text-[10px] font-semibold capitalize" style={{ background: finding.priority === "critical" ? "rgba(211,47,47,0.12)" : finding.priority === "high" ? "rgba(249,168,37,0.16)" : "rgba(33,150,243,0.12)", color: finding.priority === "critical" ? "#D32F2F" : finding.priority === "high" ? "#B26A00" : "#0D47A1" }}>
                      {finding.priority} · {finding.kind}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "#5F6B7A" }}>{finding.summary}</p>
                  <p className="mt-2 text-[10px]" style={{ color: "#90A4AE" }}>
                    Feature {finding.sourceFeature} · confidence {finding.confidence}% · {finding.evidence.length} evidence items
                  </p>
                </Link>
              ))}
              {topFindings.length === 0 && <p className="text-sm" style={{ color: "#5F6B7A" }}>Loading findings...</p>}
            </div>
          </Card>

          {/* Trend watch */}
          <Card>
            <CardHeader icon={Activity} title="Trend Watch" badge={<span className="rounded-full px-2 py-1 text-xs" style={{ background: "#EAF3FB", color: "#0D47A1" }}>{snapshots.length} snapshots</span>} />
            <div className="rounded-xl border p-3" style={{ borderColor: "#EAF3FB", background: "#F8FBFF" }}>
              <p className="mb-1 text-[10px] font-semibold uppercase" style={{ color: "#90A4AE" }}>Organizational Health History</p>
              <Sparkline values={seriesValues} />
            </div>
            <div className="mt-4 space-y-2">
              {(trends?.deltas ?? []).slice(0, 8).map((delta: ExecutiveTrendDelta) => (
                <div key={delta.key} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2" style={{ borderColor: "#EAF3FB" }}>
                  <span className="min-w-0 truncate text-xs" style={{ color: "#211F20" }}>{delta.label}</span>
                  <TrendBadge direction={delta.direction} change={delta.change} />
                </div>
              ))}
              {(trends?.deltas?.length ?? 0) === 0 && <p className="text-xs" style={{ color: "#5F6B7A" }}>No trend history yet — run a refresh to seed snapshots.</p>}
            </div>
          </Card>
        </div>

        {/* Briefing + Reports */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader
              icon={BriefcaseBusiness}
              title="Executive Briefing Center"
              badge={<span className="rounded-full px-2 py-1 text-xs" style={{ background: "#EAF3FB", color: "#0D47A1" }}>{briefing?.period ?? "—"}</span>}
            />
            <div className="mb-4 flex flex-wrap gap-2">
              {periods.map((p) => (
                <button
                  key={p}
                  onClick={() => setBriefingPeriod(p)}
                  className="rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors"
                  style={briefingPeriod === p ? { background: "#0D47A1", color: "#FFFFFF" } : { background: "#EAF3FB", color: "#0D47A1" }}
                >
                  {p}
                </button>
              ))}
            </div>
            {briefing && (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed" style={{ color: "#211F20" }}>{briefing.summary}</p>
                <div className="space-y-2">
                  {briefing.sections.slice(0, 6).map((section) => (
                    <details key={section.id} className="rounded-xl border p-3" style={{ borderColor: "#EAF3FB" }}>
                      <summary className="cursor-pointer text-sm font-semibold" style={{ color: "#0D47A1" }}>{section.title}</summary>
                      <div className="mt-2 space-y-1.5">
                        {section.items.slice(0, 4).map((item, idx) => (
                          <div key={idx} className="rounded-lg p-2" style={{ background: "#F8FBFF" }}>
                            <p className="text-xs font-medium" style={{ color: "#211F20" }}>{item.title}</p>
                            <p className="text-[11px]" style={{ color: "#5F6B7A" }}>{item.detail}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
                {briefing.prioritizedPlan.length > 0 && (
                  <div className="rounded-xl border p-3" style={{ borderColor: "#D6EAF8", background: "#F8FBFF" }}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "#0D47A1" }}>Prioritized Plan</p>
                    <ol className="space-y-1.5">
                      {briefing.prioritizedPlan.map((plan) => (
                        <li key={plan.rank} className="flex items-center gap-2 text-xs" style={{ color: "#211F20" }}>
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: "#0D47A1", color: "#FFFFFF" }}>{plan.rank}</span>
                          <span className="min-w-0 flex-1 truncate">{plan.title}</span>
                          <span className="shrink-0 text-[10px]" style={{ color: "#90A4AE" }}>{plan.owner} · {plan.eta}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader icon={FileText} title="Reporting & Export" badge={<span className="rounded-full px-2 py-1 text-xs" style={{ background: "#EAF3FB", color: "#0D47A1" }}>Documentation Engine backed</span>} />
            <div className="mb-4 flex flex-wrap gap-2">
              {["daily", "weekly", "monthly"].map((p) => (
                <button
                  key={p}
                  onClick={() => handleGenerateReport(p as (typeof periods)[number])}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-opacity disabled:opacity-60"
                  style={{ background: "#0D47A1", color: "#FFFFFF" }}
                >
                  <FileText className="h-3.5 w-3.5" />
                  {generating ? "Generating..." : `Generate ${p} report`}
                </button>
              ))}
            </div>
            {reportDetail && (
              <div className="mb-4 rounded-xl border p-4" style={{ borderColor: "#C8E6C9", background: "#F4FBF4" }}>
                <p className="text-sm font-semibold" style={{ color: "#2E7D32" }}>{reportDetail.title}</p>
                <p className="mt-1 text-xs" style={{ color: "#5F6B7A" }}>{reportDetail.summary}</p>
                <pre className="mt-3 max-h-64 overflow-auto rounded-lg p-3 text-[11px] leading-relaxed" style={{ background: "#0D1B2A", color: "#C8E6F5" }}>
                  {reportDetail.markdown}
                </pre>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#0D47A1" }}>Recent Reports</p>
              {reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setReportDetail(report)}
                  className="flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors"
                  style={{ borderColor: "#EAF3FB" }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium" style={{ color: "#211F20" }}>{report.title}</p>
                    <p className="text-[10px]" style={{ color: "#90A4AE" }}>{report.period} · {report.format} · {new Date(report.generatedAt).toLocaleDateString()}</p>
                  </div>
                  <ArrowRight className="h-3 w-3 shrink-0" style={{ color: "#90CAF9" }} />
                </button>
              ))}
              {reports.length === 0 && <p className="text-xs" style={{ color: "#5F6B7A" }}>No reports generated yet.</p>}
            </div>
          </Card>
        </div>

        {/* Continuous awareness feed */}
        <Card>
          <CardHeader icon={Newspaper} title="Continuous Awareness Feed" badge={<span className="rounded-full px-2 py-1 text-xs" style={{ background: "#EAF3FB", color: "#0D47A1" }}>event-driven refresh</span>} />
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {events.slice(0, 12).map((event, idx) => (
              <div key={`${event.type}-${idx}`} className="flex items-start gap-2 rounded-xl border px-3 py-2" style={{ borderColor: "#EAF3FB", background: "#F8FBFF" }}>
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ background: event.type === "executive.refreshed" ? "#43A047" : "#2196F3" }} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold" style={{ color: "#211F20" }}>{event.type}</p>
                  <p className="truncate text-[11px]" style={{ color: "#5F6B7A" }}>{event.detail}</p>
                  <p className="text-[10px]" style={{ color: "#90A4AE" }}>{new Date(event.at).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {events.length === 0 && <p className="text-xs" style={{ color: "#5F6B7A" }}>Awaiting brain events...</p>}
          </div>
        </Card>

        {/* Feature execution chain */}
        <Card>
          <CardHeader icon={Network} title="Feature Execution Chain" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { feature: "Feature 1", label: "Organizational Digital Brain", href: "/dashboard/brain" },
              { feature: "Feature 2", label: "Decision Time Machine", href: "/dashboard/decisions" },
              { feature: "Feature 3", label: "Employee Exit Simulation", href: "/dashboard/exit-sim" },
              { feature: "Feature 4", label: "Knowledge Risk Heatmap", href: "/dashboard/risk" },
              { feature: "Feature 5", label: "AI Mentor", href: "/dashboard/mentor" },
              { feature: "Feature 6", label: "Autonomous Documentation Engine", href: "/dashboard/docs" },
              { feature: "Feature 7", label: "Organizational Intelligence Engine", href: "/dashboard/intelligence" },
              { feature: "Feature 8", label: "Executive Command Center", href: "/dashboard" },
            ].map((route) => (
              <Link key={route.feature} href={route.href} className="rounded-xl border p-3 transition-colors" style={{ borderColor: "#EAF3FB", color: "#211F20", background: "#FFFFFF" }}>
                <p className="text-xs font-semibold" style={{ color: "#0D47A1" }}>{route.feature}</p>
                <p className="mt-1 text-sm font-medium">{route.label}</p>
              </Link>
            ))}
          </div>
        </Card>

        {loading && (
          <div className="rounded-2xl p-5 text-center text-sm" style={{ background: "#FFFFFF", border: "1px solid #D6EAF8" }}>
            Assembling the Executive Command Center...
          </div>
        )}
      </div>
    </div>
  );
}
