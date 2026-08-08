"use client";

import { DashboardTopbar } from "@/components/dashboard/topbar";
import { useEffect, useMemo, useState } from "react";
import {
  Cpu,
  Sparkles,
  Search,
  Loader2,
  GitCommit,
  MessageSquare,
  FileText,
  Network,
  History,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Layers,
  ArrowLeftRight,
  Share2,
  Zap,
  BookOpen,
} from "lucide-react";
import {
  fetchDecisionAnalytics,
  fetchDecisionAnswer,
  fetchDecisionCorrelations,
  fetchDecisionDetail,
  fetchDecisionList,
  fetchDecisionReplay,
  fetchDecisionTimeline2,
  reconstructDecision,
} from "@/lib/phoenix/api";
import type {
  DecisionAnalytics,
  DecisionAnswer,
  DecisionCorrelation,
  DecisionDetail,
  DecisionListItem,
  DecisionReplay,
  TimelineMode,
  TimelineView,
} from "@/lib/phoenix/types";

const MODES: { id: TimelineMode; label: string; icon: typeof Cpu }[] = [
  { id: "chronological", label: "Chronological", icon: History },
  { id: "dependency", label: "Dependencies", icon: Network },
  { id: "architecture", label: "Architecture", icon: Layers },
  { id: "organization", label: "Organization", icon: Users },
  { id: "repository", label: "Repository", icon: GitCommit },
  { id: "service", label: "Service Lifecycle", icon: Zap },
];

const STATUS_COLORS: Record<string, string> = {
  identified: "oklch(0.75 0.18 60)",
  discussed: "oklch(0.7 0.15 200)",
  approved: "oklch(0.7 0.18 170)",
  implemented: "oklch(0.65 0.15 150)",
  validated: "oklch(0.6 0.15 140)",
  superseded: "oklch(0.55 0.05 260)",
};

const TYPE_ICONS: Record<string, typeof Cpu> = {
  milestone: GitCommit,
  relation: Network,
  evidence: FileText,
  meeting: MessageSquare,
  commit: GitCommit,
  adr: FileText,
  doc: FileText,
};

const PHASE_COLORS: Record<string, string> = {
  problem: "oklch(0.7 0.18 30)",
  discussion: "oklch(0.7 0.15 200)",
  evaluation: "oklch(0.7 0.18 60)",
  approval: "oklch(0.7 0.18 170)",
  implementation: "oklch(0.65 0.15 150)",
  deployment: "oklch(0.6 0.15 140)",
  outcome: "oklch(0.75 0.18 280)",
};

const DOMAIN_OPTIONS = ["database", "api", "auth", "infrastructure", "ai", "flags"];
const STATUS_OPTIONS = ["identified", "discussed", "approved", "implemented", "validated"];

export default function DecisionsPage() {
  const [registry, setRegistry] = useState<DecisionListItem[]>([]);
  const [analytics, setAnalytics] = useState<DecisionAnalytics | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<DecisionDetail | null>(null);
  const [replay, setReplay] = useState<DecisionReplay | null>(null);
  const [correlations, setCorrelations] = useState<DecisionCorrelation | null>(null);
  const [timeline, setTimeline] = useState<TimelineView | null>(null);
  const [mode, setMode] = useState<TimelineMode>("chronological");
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<DecisionAnswer | null>(null);
  const [answerLoading, setAnswerLoading] = useState(false);
  const [reconstructLoading, setReconstructLoading] = useState(false);
  const [replayStep, setReplayStep] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [error, setError] = useState("");

  const loadRegistry = () => {
    fetchDecisionList({ domain: domain || undefined, status: status || undefined })
      .then((rows) => setRegistry(rows))
      .catch(() => setRegistry([]));
  };

  const loadTimeline = (m: TimelineMode) => {
    setTimelineLoading(true);
    fetchDecisionTimeline2(m, { domain: domain || undefined, status: status || undefined, query: query || undefined })
      .then(setTimeline)
      .catch(() => setTimeline(null))
      .finally(() => setTimelineLoading(false));
  };

  const loadDetail = (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setDetail(null);
    setReplay(null);
    setCorrelations(null);
    setReplayStep(0);
    setReplayPlaying(false);
    Promise.all([
      fetchDecisionDetail(id),
      fetchDecisionReplay(id),
      fetchDecisionCorrelations(id),
    ])
      .then(([d, r, c]) => {
        setDetail(d);
        setReplay(r);
        setCorrelations(c);
      })
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setDetailLoading(false));
  };

  useEffect(() => {
    loadRegistry();
    fetchDecisionAnalytics().then(setAnalytics).catch(() => setAnalytics(null));
  }, []);

  useEffect(() => {
    loadTimeline(mode);
  }, [mode, domain, status, query]);

  useEffect(() => {
    if (!replay || replay.steps.length === 0) return;
    if (replayStep >= replay.steps.length - 1) {
      setReplayPlaying(false);
      return;
    }
    if (!replayPlaying) return;
    const timer = setTimeout(() => setReplayStep((s) => s + 1), 900);
    return () => clearTimeout(timer);
  }, [replayPlaying, replayStep, replay]);

  const runAnswer = (q: string) => {
    if (!q.trim()) return;
    setAnswerLoading(true);
    setError("");
    fetchDecisionAnswer(q)
      .then(setAnswer)
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setAnswerLoading(false));
  };

  const runReconstruct = (q: string) => {
    if (!q.trim()) return;
    setReconstructLoading(true);
    setError("");
    reconstructDecision(q)
      .then((d) => {
        setSelectedId(d.id);
        setDetail(d);
        loadRegistry();
      })
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setReconstructLoading(false));
  };

  const maxDomain = useMemo(() => {
    if (!analytics) return 1;
    return Math.max(1, ...Object.values(analytics.byDomain));
  }, [analytics]);

  return (
    <div style={{ background: "oklch(0.07 0.015 260)", minHeight: "100vh" }}>
      <DashboardTopbar
        title="Decision Time Machine"
        subtitle="Reconstruct the full lifecycle of every organizational decision"
      />

      <div className="p-6 space-y-5">
        {error && (
          <div className="rounded-2xl p-4 flex items-center gap-2 text-xs"
            style={{ background: "oklch(0.2 0.08 25 / 0.5)", border: "1px solid oklch(0.5 0.15 25)", color: "oklch(0.8 0.1 40)" }}>
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Ask / Reconstruct */}
        <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
          <p className="text-xs font-medium mb-2" style={{ color: "oklch(0.5 0.03 240)" }}>ASK THE DECISION ENGINE</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
              <Cpu className="w-4 h-4 shrink-0" style={{ color: "oklch(0.7 0.18 170)" }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runAnswer(query)}
                placeholder='Try "Why did we move to PostgreSQL?"'
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-xs"
                style={{ color: "oklch(0.9 0.01 240)" }}
              />
            </div>
            <button
              onClick={() => runAnswer(query)}
              disabled={answerLoading}
              className="px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
              style={{ background: "oklch(0.7 0.15 200)", color: "oklch(0.06 0.015 260)", boxShadow: "0 0 16px oklch(0.7 0.15 200 / 0.35)" }}>
              {answerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {answerLoading ? "Reasoning..." : "Answer"}
            </button>
            <button
              onClick={() => runReconstruct(query)}
              disabled={reconstructLoading}
              className="px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
              style={{ background: "oklch(0.7 0.18 170)", color: "oklch(0.06 0.015 260)", boxShadow: "0 0 16px oklch(0.7 0.18 170 / 0.4)" }}>
              {reconstructLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {reconstructLoading ? "Reconstructing..." : "Reconstruct"}
            </button>
          </div>

          {answer && (
            <div className="mt-4 rounded-xl p-4" style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "oklch(0.7 0.18 170 / 0.15)", color: "oklch(0.7 0.18 170)" }}>
                  {answer.confidence}% confidence
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "oklch(0.7 0.15 200 / 0.15)", color: "oklch(0.7 0.15 200)" }}>
                  {answer.evidence.length} evidence sources
                </span>
              </div>
              <p className="text-sm text-white leading-relaxed">{answer.answer}</p>
              {answer.evidence.length > 0 && (
                <div className="mt-3 space-y-1">
                  {answer.evidence.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px]" style={{ color: "oklch(0.55 0.02 240)" }}>
                      <FileText className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "oklch(0.7 0.15 200)" }} />
                      <span><strong className="text-white">{e.source}</strong> · {e.excerpt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Analytics strip */}
        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Decisions", value: analytics.total, color: "oklch(0.7 0.18 170)" },
              { label: "Avg Confidence", value: `${analytics.averageConfidence}%`, color: "oklch(0.7 0.15 200)" },
              { label: "Implemented", value: `${analytics.implementedRate}%`, color: "oklch(0.65 0.15 150)" },
              { label: "Validated", value: analytics.validatedCount, color: "oklch(0.6 0.15 140)" },
              { label: "Improved Outcomes", value: analytics.improvedOutcomes, color: "oklch(0.75 0.18 60)" },
              { label: "Top Contributor", value: analytics.topParticipants[0]?.name ?? "—", color: "oklch(0.75 0.18 280)" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-2xl p-4" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                <p className="text-[10px] font-medium" style={{ color: "oklch(0.5 0.03 240)" }}>{kpi.label}</p>
                <p className="text-xl font-bold mt-1 truncate" style={{ color: kpi.color }}>{kpi.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Registry */}
          <div className="rounded-2xl p-5 lg:col-span-1" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" style={{ color: "oklch(0.7 0.18 170)" }} /> Decision Registry
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <select
                value={domain}
                onChange={(e) => { setDomain(e.target.value); }}
                className="flex-1 min-w-[100px] rounded-lg px-2 py-1.5 text-xs bg-transparent outline-none"
                style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.22 0.02 260)", color: "oklch(0.7 0.02 240)" }}>
                <option value="">All domains</option>
                {DOMAIN_OPTIONS.map((d) => <option key={d} value={d} style={{ background: "oklch(0.11 0.02 260)" }}>{d}</option>)}
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex-1 min-w-[100px] rounded-lg px-2 py-1.5 text-xs bg-transparent outline-none"
                style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.22 0.02 260)", color: "oklch(0.7 0.02 240)" }}>
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s} style={{ background: "oklch(0.11 0.02 260)" }}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {registry.map((r) => {
                const active = r.id === selectedId;
                return (
                  <button
                    key={r.id}
                    onClick={() => loadDetail(r.id)}
                    className="w-full text-left p-3 rounded-xl transition-all duration-200"
                    style={{
                      background: active ? "oklch(0.7 0.18 170 / 0.1)" : "oklch(0.09 0.018 260)",
                      border: `1px solid ${active ? "oklch(0.7 0.18 170 / 0.35)" : "oklch(0.18 0.02 260)"}`,
                    }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full capitalize" style={{ background: `${STATUS_COLORS[r.status] ?? "oklch(0.55 0.05 260)"}22`, color: STATUS_COLORS[r.status] ?? "oklch(0.7 0.02 240)" }}>
                        {r.status}
                      </span>
                      <span className="text-[10px]" style={{ color: "oklch(0.45 0.02 240)" }}>{r.startedAt}</span>
                    </div>
                    <p className="text-sm font-semibold mt-1.5" style={{ color: active ? "oklch(0.9 0.01 240)" : "oklch(0.7 0.02 240)" }}>{r.title}</p>
                    <p className="text-[10px] mt-1 line-clamp-2" style={{ color: "oklch(0.5 0.03 240)" }}>{r.summary}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px]" style={{ color: "oklch(0.45 0.02 240)" }}>
                      <span>{r.confidence}% conf</span>
                      <span>{r.alternativeCount} alt</span>
                      <span>{r.outcomeCount} outcomes</span>
                      {r.dependencies > 0 && <span>{r.dependencies} deps</span>}
                    </div>
                  </button>
                );
              })}
              {registry.length === 0 && (
                <p className="text-xs text-center py-6" style={{ color: "oklch(0.45 0.02 240)" }}>No decisions match the filters.</p>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-2xl p-5 lg:col-span-2" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Network className="w-4 h-4" style={{ color: "oklch(0.7 0.15 200)" }} /> Decision Timeline
              </h3>
              {MODES.map((m) => {
                const MIcon = m.icon;
                const active = m.id === mode;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium flex items-center gap-1.5 transition-all"
                    style={{
                      background: active ? "oklch(0.7 0.18 170 / 0.15)" : "oklch(0.09 0.018 260)",
                      border: `1px solid ${active ? "oklch(0.7 0.18 170 / 0.4)" : "oklch(0.18 0.02 260)"}`,
                      color: active ? "oklch(0.7 0.18 170)" : "oklch(0.55 0.02 240)",
                    }}>
                    <MIcon className="w-3 h-3" /> {m.label}
                  </button>
                );
              })}
              <div className="flex items-center gap-2 ml-auto">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter timeline..."
                  className="rounded-lg px-2.5 py-1.5 text-xs bg-transparent outline-none w-40"
                  style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.22 0.02 260)", color: "oklch(0.7 0.02 240)" }}
                />
                <Search className="w-3.5 h-3.5" style={{ color: "oklch(0.45 0.02 240)" }} />
              </div>
            </div>

            {timelineLoading ? (
              <div className="py-16 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "oklch(0.7 0.18 170)" }} />
              </div>
            ) : (
              <div className="relative">
                <div className="absolute top-4 left-2 right-2 h-0.5" style={{ background: "oklch(0.22 0.02 260)" }} />
                <div className="flex justify-between relative">
                  {(timeline?.items ?? []).map((t, i) => {
                    const Icon = TYPE_ICONS[t.type] ?? GitCommit;
                    const color = t.phase && PHASE_COLORS[t.phase] ? PHASE_COLORS[t.phase] : "oklch(0.7 0.15 200)";
                    const clickable = t.decisionId;
                    return (
                      <button
                        key={`${t.id}-${i}`}
                        onClick={() => clickable && loadDetail(t.decisionId)}
                        disabled={!clickable}
                        className="flex flex-col items-center gap-2 group flex-1 min-w-0"
                        title={t.decisionTitle ?? t.label}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all duration-300"
                          style={{
                            background: `${color}22`,
                            border: `2px solid ${color}`,
                            boxShadow: `0 0 12px ${color} / 0.25`,
                          }}>
                          <Icon className="w-3 h-3" style={{ color }} />
                        </div>
                        <p className="text-[10px] font-medium truncate w-full text-center" style={{ color: "oklch(0.5 0.03 240)" }}>{t.date}</p>
                      </button>
                    );
                  })}
                  {(timeline?.items ?? []).length === 0 && (
                    <p className="py-12 text-xs w-full text-center" style={{ color: "oklch(0.45 0.02 240)" }}>
                      No timeline events for this view.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {(timeline?.items ?? []).slice(0, 60).map((t, i) => {
                const Icon = TYPE_ICONS[t.type] ?? GitCommit;
                const color = t.phase && PHASE_COLORS[t.phase] ? PHASE_COLORS[t.phase] : "oklch(0.7 0.15 200)";
                return (
                  <button
                    key={`${t.id}-${i}`}
                    onClick={() => t.decisionId && loadDetail(t.decisionId)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors"
                    style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.18 0.02 260)" }}>
                    <span className="text-[10px] w-16 shrink-0" style={{ color: "oklch(0.45 0.02 240)" }}>{t.date}</span>
                    <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: `${color}22` }}>
                      <Icon className="w-3 h-3" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "oklch(0.75 0.02 240)" }}>{t.label}</p>
                      {t.decisionTitle && (
                        <p className="text-[10px] truncate" style={{ color: "oklch(0.45 0.02 240)" }}>{t.decisionTitle}</p>
                      )}
                    </div>
                    {t.phase && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full capitalize shrink-0" style={{ background: `${color}22`, color }}>{t.phase}</span>
                    )}
                    <span className="text-[10px] shrink-0" style={{ color: "oklch(0.45 0.02 240)" }}>{t.confidence}%</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detail + Replay */}
        {detail && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Decision detail card */}
            <div className="rounded-2xl p-6" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.7 0.18 170 / 0.3)" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{ background: `${STATUS_COLORS[detail.status] ?? "oklch(0.55 0.05 260)"}22`, color: STATUS_COLORS[detail.status] ?? "oklch(0.7 0.02 240)" }}>
                      {detail.status}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "oklch(0.16 0.025 260)", color: "oklch(0.55 0.02 240)" }}>
                      {detail.domain} · {detail.team ?? "Platform"}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-2">{detail.title}</h2>
                  <p className="text-xs mt-1" style={{ color: "oklch(0.5 0.03 240)" }}>
                    {detail.startedAt} → {detail.decidedAt ?? "pending"} · Confidence {detail.confidence}%
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "oklch(0.7 0.18 170 / 0.15)", border: "1px solid oklch(0.7 0.18 170 / 0.3)" }}>
                  <Cpu className="w-5 h-5" style={{ color: "oklch(0.7 0.18 170)" }} />
                </div>
              </div>

              <p className="text-xs leading-relaxed mt-4" style={{ color: "oklch(0.6 0.02 240)" }}>{detail.summary}</p>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl p-3" style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.18 0.02 260)" }}>
                  <p className="text-[10px] font-medium mb-1" style={{ color: "oklch(0.5 0.03 240)" }}>Business Context</p>
                  <p className="text-[11px] leading-relaxed" style={{ color: "oklch(0.65 0.02 240)" }}>{detail.businessContext}</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.18 0.02 260)" }}>
                  <p className="text-[10px] font-medium mb-1" style={{ color: "oklch(0.5 0.03 240)" }}>Technical Context</p>
                  <p className="text-[11px] leading-relaxed" style={{ color: "oklch(0.65 0.02 240)" }}>{detail.technicalContext}</p>
                </div>
              </div>

              {/* Participants */}
              {detail.participants.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] font-medium mb-2" style={{ color: "oklch(0.5 0.03 240)" }}>PARTICIPANTS</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.participants.map((p) => (
                      <span key={p} className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1"
                        style={{ background: "oklch(0.7 0.15 200 / 0.12)", color: "oklch(0.7 0.15 200)" }}>
                        <Users className="w-3 h-3" /> {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Outcomes */}
              {detail.outcomes.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] font-medium mb-2" style={{ color: "oklch(0.5 0.03 240)" }}>MEASURED OUTCOMES</p>
                  <div className="grid grid-cols-1 gap-2">
                    {detail.outcomes.map((o, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2 text-[11px]"
                        style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.18 0.02 260)" }}>
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" style={{ color: o.direction === "improved" ? "oklch(0.65 0.15 150)" : "oklch(0.7 0.15 25)" }} />
                        <span className="flex-1 text-white">{o.metric}</span>
                        <span style={{ color: "oklch(0.5 0.03 240)" }}>{o.before} → <span className="text-white">{o.after}</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {detail.recommendations.length > 0 && (
                <div className="mt-4 rounded-xl p-3" style={{ background: "oklch(0.7 0.18 170 / 0.07)", border: "1px solid oklch(0.7 0.18 170 / 0.25)" }}>
                  <p className="text-[10px] font-medium mb-2 flex items-center gap-1" style={{ color: "oklch(0.7 0.18 170)" }}>
                    <Sparkles className="w-3 h-3" /> RECOMMENDED NEXT STEPS
                  </p>
                  <ul className="space-y-1.5">
                    {detail.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px]" style={{ color: "oklch(0.6 0.02 240)" }}>
                        <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "oklch(0.7 0.18 170)" }} /> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Replay + Alternatives + Correlations */}
            <div className="space-y-5">
              {/* Replay */}
              {replay && replay.steps.length > 0 && (
                <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.7 0.15 200 / 0.3)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <History className="w-4 h-4" style={{ color: "oklch(0.7 0.15 200)" }} /> Decision Replay
                    </h3>
                    <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: "oklch(0.16 0.025 260)", color: "oklch(0.55 0.02 240)" }}>
                      {replayStep + 1} / {replay.steps.length}
                    </span>
                  </div>

                  <div className="relative mb-4">
                    <div className="absolute top-2 left-1 right-1 h-0.5" style={{ background: "oklch(0.22 0.02 260)" }} />
                    <div className="absolute top-2 left-1 h-0.5 transition-all duration-500"
                      style={{ width: `${(replayStep / (replay.steps.length - 1)) * 100}%`, background: "oklch(0.7 0.15 200)", boxShadow: "0 0 8px oklch(0.7 0.15 200 / 0.5)" }} />
                    <div className="flex justify-between relative">
                      {replay.steps.map((s, i) => {
                        const color = PHASE_COLORS[s.phase] ?? "oklch(0.7 0.15 200)";
                        const past = i <= replayStep;
                        return (
                          <button key={`${s.phase}-${i}`} onClick={() => setReplayStep(i)}
                            className="w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all duration-300"
                            style={{
                              background: past ? color : "oklch(0.18 0.02 260)",
                              border: `2px solid ${i === replayStep ? color : "oklch(0.28 0.025 260)"}`,
                              transform: i === replayStep ? "scale(1.25)" : "scale(1)",
                              boxShadow: i === replayStep ? `0 0 12px ${color} / 0.5` : "none",
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl p-4" style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.18 0.02 260)" }}>
                    {replay.steps[replayStep] && (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{ background: `${PHASE_COLORS[replay.steps[replayStep].phase] ?? "oklch(0.7 0.15 200)"}22`, color: PHASE_COLORS[replay.steps[replayStep].phase] ?? "oklch(0.7 0.15 200)" }}>
                            {replay.steps[replayStep].phase}
                          </span>
                          <span className="text-[10px]" style={{ color: "oklch(0.5 0.03 240)" }}>{replay.steps[replayStep].date}</span>
                          <span className="ml-auto text-[10px] font-bold text-white">{replay.steps[replayStep].confidence}%</span>
                        </div>
                        <p className="text-sm font-semibold text-white">{replay.steps[replayStep].label}</p>
                        <p className="text-[11px] leading-relaxed mt-1.5" style={{ color: "oklch(0.6 0.02 240)" }}>{replay.steps[replayStep].summary}</p>
                        <p className="text-[10px] mt-2" style={{ color: "oklch(0.45 0.02 240)" }}>
                          Evidence: {replay.steps[replayStep].evidenceSources} sources
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-3 mt-4">
                    <button
                      onClick={() => setReplayStep(Math.max(0, replayStep - 1))}
                      className="p-2 rounded-xl transition-colors"
                      style={{ background: "oklch(0.16 0.025 260)", color: "oklch(0.65 0.02 240)" }}>
                      <TrendingUp className="w-4 h-4 rotate-180" />
                    </button>
                    <button
                      onClick={() => setReplayPlaying(!replayPlaying)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                      style={{ background: "oklch(0.7 0.15 200)", color: "oklch(0.06 0.015 260)", boxShadow: "0 0 16px oklch(0.7 0.15 200 / 0.4)" }}>
                      {replayPlaying ? "Pause" : "Play"} replay
                    </button>
                    <button
                      onClick={() => setReplayStep(Math.min(replay.steps.length - 1, replayStep + 1))}
                      className="p-2 rounded-xl transition-colors"
                      style={{ background: "oklch(0.16 0.025 260)", color: "oklch(0.65 0.02 240)" }}>
                      <TrendingUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Alternatives comparison */}
              {detail.alternatives.length > 0 && (
                <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.75 0.18 60 / 0.3)" }}>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                    <ArrowLeftRight className="w-4 h-4" style={{ color: "oklch(0.75 0.18 60)" }} /> Alternatives Considered
                  </h3>
                  <div className="space-y-2">
                    {detail.alternatives.map((a) => (
                      <div key={a.id} className="rounded-xl p-3"
                        style={{
                          background: "oklch(0.09 0.018 260)",
                          border: `1px solid ${a.status === "accepted" ? "oklch(0.65 0.15 150 / 0.4)" : a.status === "rejected" ? "oklch(0.7 0.15 25 / 0.4)" : "oklch(0.18 0.02 260)"}`,
                        }}>
                        <div className="flex items-center gap-2">
                          {a.status === "accepted" ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "oklch(0.65 0.15 150)" }} />
                          ) : a.status === "rejected" ? (
                            <XCircle className="w-4 h-4 shrink-0" style={{ color: "oklch(0.7 0.15 25)" }} />
                          ) : (
                            <Sparkles className="w-4 h-4 shrink-0" style={{ color: "oklch(0.75 0.18 60)" }} />
                          )}
                          <span className="text-sm font-semibold flex-1" style={{ color: "oklch(0.85 0.01 240)" }}>{a.label}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
                            style={{ background: `${a.status === "accepted" ? "oklch(0.65 0.15 150)" : a.status === "rejected" ? "oklch(0.7 0.15 25)" : "oklch(0.75 0.18 60)"}22`, color: a.status === "accepted" ? "oklch(0.65 0.15 150)" : a.status === "rejected" ? "oklch(0.7 0.15 25)" : "oklch(0.75 0.18 60)" }}>
                            {a.status}
                          </span>
                        </div>
                        <p className="text-[11px] mt-1.5" style={{ color: "oklch(0.6 0.02 240)" }}>{a.rationale}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px]" style={{ color: "oklch(0.45 0.02 240)" }}>
                          <span>{a.votes} votes</span>
                          <span>{a.confidence}% conf</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correlations */}
              {correlations && (
                <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.7 0.15 200 / 0.3)" }}>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                    <Share2 className="w-4 h-4" style={{ color: "oklch(0.7 0.15 200)" }} /> Decision Graph
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl p-3" style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.18 0.02 260)" }}>
                      <p className="text-[10px] font-medium mb-2" style={{ color: "oklch(0.5 0.03 240)" }}>DEPENDS ON</p>
                      {correlations.dependencies.length === 0 && <p className="text-[11px]" style={{ color: "oklch(0.45 0.02 240)" }}>No upstream dependencies.</p>}
                      {correlations.dependencies.map((d) => (
                        <button key={d.id} onClick={() => loadDetail(d.id)}
                          className="w-full text-left text-[11px] py-1.5 hover:opacity-80" style={{ color: "oklch(0.7 0.15 200)" }}>
                          ← {d.title} <span className="text-[10px]" style={{ color: "oklch(0.45 0.02 240)" }}>({d.relation})</span>
                        </button>
                      ))}
                    </div>
                    <div className="rounded-xl p-3" style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.18 0.02 260)" }}>
                      <p className="text-[10px] font-medium mb-2" style={{ color: "oklch(0.5 0.03 240)" }}>CAUSE &amp; EFFECT</p>
                      {correlations.causeEffect.length === 0 && <p className="text-[11px]" style={{ color: "oklch(0.45 0.02 240)" }}>No causal links recorded.</p>}
                      {correlations.causeEffect.map((c, i) => (
                        <button key={i} onClick={() => loadDetail(c.to)}
                          className="w-full text-left text-[11px] py-1.5 hover:opacity-80" style={{ color: "oklch(0.75 0.18 60)" }}>
                          {c.from} → {c.to} <span className="text-[10px]" style={{ color: "oklch(0.45 0.02 240)" }}>({c.type})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {correlations.related.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] font-medium mb-2" style={{ color: "oklch(0.5 0.03 240)" }}>RELATED DECISIONS</p>
                      <div className="flex flex-wrap gap-1.5">
                        {correlations.related.map((r) => (
                          <button key={r.id} onClick={() => loadDetail(r.id)}
                            className="text-[10px] px-2 py-1 rounded-full transition-colors"
                            style={{ background: "oklch(0.7 0.15 200 / 0.12)", color: "oklch(0.7 0.15 200)" }}>
                            {r.title} · {r.confidence}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {detailLoading && (
          <div className="rounded-2xl p-8 flex items-center justify-center gap-2" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "oklch(0.7 0.18 170)" }} />
            <span className="text-xs" style={{ color: "oklch(0.55 0.02 240)" }}>Loading decision intelligence...</span>
          </div>
        )}
      </div>
    </div>
  );
}
