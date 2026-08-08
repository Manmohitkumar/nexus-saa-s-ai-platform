"use client";

import { DashboardTopbar } from "@/components/dashboard/topbar";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BookOpen,
  Bot,
  BrainCircuit,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Compass,
  Cpu,
  Eye,
  FlaskConical,
  HeartPulse,
  Landmark,
  Lightbulb,
  Loader2,
  Network,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import {
  askIntelligence,
  fetchIntelligenceCatalog,
  fetchIntelligenceEvents,
  fetchIntelligenceInsight,
  fetchIntelligencePredictions,
  fetchIntelligenceRecommendations,
  fetchIntelligenceTimeline,
  fetchOrganizationHealth,
  planIntelligence,
  runIntelligenceSweep,
} from "@/lib/phoenix/api";
import type {
  EventAssessment,
  InsightDetailResponse,
  IntelligenceInsight,
  IntelligenceRecommendation,
  IntelligenceTimelinePoint,
  IntelligenceWorkflow,
  IntelligenceWorkflowStep,
  OrganizationHealth,
  OrganizationHealthPillar,
  OrchestratedResponse,
  PredictiveInsight,
  ReasoningTraceStep,
} from "@/lib/phoenix/types";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));

const kindColor: Record<string, string> = {
  "cross-domain": "oklch(0.7 0.18 170)",
  health: "oklch(0.75 0.13 250)",
  architecture: "oklch(0.7 0.15 250)",
  workforce: "oklch(0.8 0.15 40)",
  knowledge: "oklch(0.75 0.15 150)",
  decision: "oklch(0.7 0.18 170)",
  operational: "oklch(0.8 0.16 60)",
  strategic: "oklch(0.75 0.18 190)",
  executive: "oklch(0.75 0.15 150)",
  predictive: "oklch(0.7 0.13 300)",
  recommendation: "oklch(0.8 0.16 60)",
  event: "oklch(0.7 0.18 170)",
};

const kindIcon: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  "cross-domain": Network,
  health: HeartPulse,
  architecture: Building2,
  workforce: Users,
  knowledge: BookOpen,
  decision: Landmark,
  operational: Activity,
  strategic: Compass,
  executive: Briefcase,
  predictive: TrendingUp,
  recommendation: Lightbulb,
  event: Zap,
};

const priorityColor: Record<string, string> = {
  critical: "oklch(0.75 0.2 25)",
  high: "oklch(0.8 0.16 60)",
  medium: "oklch(0.7 0.15 250)",
  info: "oklch(0.6 0.03 240)",
};

function statusTone(status: string): { label: string; color: string } {
  if (status === "healthy") return { label: "Healthy", color: "oklch(0.75 0.15 150)" };
  if (status === "watch") return { label: "Watch", color: "oklch(0.8 0.16 60)" };
  return { label: "Critical", color: "oklch(0.75 0.2 25)" };
}

function HealthRing({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const color = value >= 75 ? "oklch(0.75 0.15 150)" : value >= 50 ? "oklch(0.8 0.16 60)" : "oklch(0.75 0.2 25)";
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="oklch(0.18 0.02 260)" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)}
          style={{ filter: `drop-shadow(0 0 5px ${color} / 0.5)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white">{Math.round(value)}</span>
        <span className="text-[9px]" style={{ color: "oklch(0.55 0.02 240)" }}>/100</span>
      </div>
    </div>
  );
}

function PillarBar({ pillar }: { pillar: OrganizationHealthPillar }) {
  const color = pillar.score >= 75 ? "oklch(0.75 0.15 150)" : pillar.score >= 50 ? "oklch(0.8 0.16 60)" : "oklch(0.75 0.2 25)";
  return (
    <div className="rounded-xl p-3" style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-white">{pillar.label}</span>
        <span className="text-[11px] font-bold" style={{ color }}>{pillar.score}</span>
      </div>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden mt-2" style={{ background: "oklch(0.18 0.02 260)" }}>
        <div className="h-full rounded-full" style={{ width: `${clamp(pillar.score)}%`, background: color }} />
      </div>
      <p className="text-[9px] mt-1.5 leading-snug" style={{ color: "oklch(0.5 0.03 240)" }}>{pillar.drivers.join(" · ")}</p>
    </div>
  );
}

function SectionTitle({ icon, label, accent }: { icon: React.ReactNode; label: string; accent: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${accent} / 0.15`, color: accent }}>
        {icon}
      </span>
      <h3 className="text-sm font-semibold text-white tracking-wide">{label}</h3>
    </div>
  );
}

function WorkflowStepRow({ step, index }: { step: IntelligenceWorkflowStep; index: number }) {
  const done = step.status === "done";
  const color = done ? "oklch(0.75 0.15 150)" : "oklch(0.7 0.15 250)";
  return (
    <div className="rounded-xl p-3" style={{ background: "oklch(0.12 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold rounded-md px-1.5 py-0.5 font-mono" style={{ background: `${color} / 0.15`, color }}>
          {step.agentId.toUpperCase()}
        </span>
        <span className="text-xs font-medium text-white">{step.agentName}</span>
        <span className="ml-auto text-[10px]" style={{ color: "oklch(0.5 0.03 240)" }}>
          step {index + 1}
        </span>
      </div>
      <p className="text-[10px] mt-1" style={{ color: "oklch(0.55 0.02 240)" }}>reads {step.service}</p>
      {step.finding && (
        <p className="text-[11px] mt-1.5 leading-snug" style={{ color: "oklch(0.7 0.02 240)" }}>{step.finding}</p>
      )}
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-[9px] px-1.5 py-0.5 rounded-full capitalize" style={{ background: `${color} / 0.12`, color }}>
          {step.status}
        </span>
        <span className="text-[9px]" style={{ color: "oklch(0.5 0.03 240)" }}>confidence {step.confidence ?? 0}%</span>
        {typeof step.durationMs === "number" && (
          <span className="text-[9px]" style={{ color: "oklch(0.5 0.03 240)" }}>{step.durationMs}ms</span>
        )}
      </div>
    </div>
  );
}

export default function IntelligencePage() {
  const [query, setQuery] = useState("Which undocumented services present the greatest operational risk?");
  const [asking, setAsking] = useState(false);
  const [response, setResponse] = useState<OrchestratedResponse | null>(null);
  const [plan, setPlan] = useState<IntelligenceWorkflow | null>(null);

  const [health, setHealth] = useState<OrganizationHealth | null>(null);
  const [predictions, setPredictions] = useState<PredictiveInsight[]>([]);
  const [catalog, setCatalog] = useState<IntelligenceInsight[]>([]);
  const [timeline, setTimeline] = useState<IntelligenceTimelinePoint[]>([]);
  const [recommendations, setRecommendations] = useState<IntelligenceRecommendation[]>([]);
  const [events, setEvents] = useState<EventAssessment[]>([]);

  const [kindFilter, setKindFilter] = useState<string>("all");
  const [detail, setDetail] = useState<InsightDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedTrace, setExpandedTrace] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const load = () => {
    return Promise.all([
      fetchOrganizationHealth(),
      fetchIntelligencePredictions(),
      fetchIntelligenceCatalog(),
      fetchIntelligenceRecommendations(),
      fetchIntelligenceEvents(),
    ]).then(([h, p, c, r, e]) => {
      setHealth(h);
      setPredictions(p);
      setCatalog(c);
      setRecommendations(r);
      setEvents(e);
      fetchIntelligenceTimeline().then(setTimeline).catch(() => setTimeline([]));
    });
  };

  useEffect(() => {
    load()
      .catch((error) => console.error("Failed to load intelligence workspace", error))
      .finally(() => setIsLoading(false));
  }, []);

  const kinds = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach((i) => set.add(i.kind));
    return ["all", ...set];
  }, [catalog]);

  const filteredCatalog = kindFilter === "all" ? catalog : catalog.filter((i) => i.kind === kindFilter);

  const ask = async () => {
    if (!query.trim() || asking) return;
    setAsking(true);
    setResponse(null);
    try {
      const [r, p] = await Promise.all([
        askIntelligence(query.trim()),
        planIntelligence(query.trim()),
      ]);
      setResponse(r);
      setPlan(p);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Orchestration failed");
    } finally {
      setAsking(false);
    }
  };

  const openInsight = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const d = await fetchIntelligenceInsight(id);
      setDetail(d);
      setExpandedTrace(false);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Failed to load insight");
    } finally {
      setDetailLoading(false);
    }
  };

  const runSweep = async () => {
    setSweeping(true);
    try {
      const result = await runIntelligenceSweep();
      setToast(`Sweep complete — generated ${result.generated}, skipped ${result.skipped}, ${result.total} total insights.`);
      await load();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Sweep failed");
    } finally {
      setSweeping(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.07 0.015 260)" }}>
        <div className="rounded-2xl p-6 bg-white shadow-lg">Loading Organizational Intelligence Engine...</div>
      </div>
    );
  }

  const healthTone = statusTone(health?.status ?? "watch");
  const executedSteps = response?.workflow ?? [];

  return (
    <div style={{ background: "oklch(0.07 0.015 260)", minHeight: "100vh" }}>
      <DashboardTopbar title="Organizational Intelligence Engine" subtitle="Central orchestrator for cross-domain reasoning across the Organizational Digital Brain" />

      <div className="p-6 space-y-5">
        {/* Hero — organizational health + sweep */}
        <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
          <div className="flex items-center gap-5 flex-wrap">
            <HealthRing value={health?.overall ?? 0} />
            <div className="flex-1 min-w-[240px]">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "oklch(0.55 0.02 240)" }}>
                  Organizational Health
                </p>
                <span className="text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold" style={{ background: `${healthTone.color} / 0.15`, color: healthTone.color }}>
                  {healthTone.label}
                </span>
              </div>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: "oklch(0.65 0.02 240)" }}>
                Composite across workforce resilience, knowledge & documentation, decision effectiveness, and risk exposure. The
                orchestrator re-uses these signals to answer cross-domain questions without building its own knowledge base.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={runSweep}
                  disabled={sweeping}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
                  style={{ background: "oklch(0.65 0.18 170)" }}
                >
                  {sweeping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Run Intelligence Sweep
                </button>
                <button
                  onClick={() => load().catch(() => setToast("Refresh failed"))}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold"
                  style={{ background: "oklch(0.16 0.025 260)", color: "oklch(0.7 0.02 240)", border: "1px solid oklch(0.22 0.02 260)" }}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full lg:w-72">
              {(health?.pillars ?? []).map((p) => (
                <div key={p.key} className="rounded-xl p-2.5 text-center" style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                  <div className="text-base font-bold text-white">{p.score}</div>
                  <div className="text-[9px] mt-0.5 leading-tight" style={{ color: "oklch(0.55 0.02 240)" }}>{p.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-4">
            {(health?.pillars ?? []).map((p) => <PillarBar key={p.key} pillar={p} />)}
          </div>
        </div>

        {/* Intelligence Explorer */}
        <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
          <SectionTitle icon={<BrainCircuit className="w-3.5 h-3.5" />} label="Intelligence Explorer" accent="oklch(0.7 0.15 250)" />
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "oklch(0.5 0.03 240)" }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask()}
                placeholder="Ask the organizational brain... e.g. Which decisions created the highest long-term value?"
                className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm text-white outline-none"
                style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}
              />
            </div>
            <button
              onClick={ask}
              disabled={asking || !query.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: "oklch(0.6 0.18 250)" }}
            >
              {asking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {asking ? "Reasoning..." : "Reason"}
            </button>
          </div>

          {plan && !response && (
            <p className="text-[11px] mt-3" style={{ color: "oklch(0.55 0.02 240)" }}>
              Planned a {plan.topic} pipeline: {plan.steps.length} steps, {plan.parallelBranches} parallel branches, ~{plan.estimatedMs}ms.
            </p>
          )}

          {response && (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl p-4" style={{ background: "oklch(0.08 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "oklch(0.7 0.15 250 / 0.15)", color: "oklch(0.7 0.15 250)" }}>
                    {response.topic}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full capitalize" style={{ background: `${priorityColor[response.priority] ?? "oklch(0.6 0.03 240)"} / 0.15`, color: priorityColor[response.priority] ?? "oklch(0.6 0.03 240)" }}>
                    {response.priority} priority
                  </span>
                  <span className="ml-auto text-xs font-semibold" style={{ color: "oklch(0.7 0.18 170)" }}>confidence {response.confidence}%</span>
                </div>
                <p className="text-sm leading-relaxed mt-3 text-white whitespace-pre-line">{response.answer}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* AI Workflow Visualizer / Multi-Agent Activity Monitor */}
                <div className="rounded-2xl p-4" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                  <SectionTitle icon={<Workflow className="w-3.5 h-3.5" />} label="AI Workflow Visualizer · Multi-Agent Activity" accent="oklch(0.75 0.15 150)" />
                  <div className="space-y-2">
                    {executedSteps.map((s, i) => <WorkflowStepRow key={`${s.agentId}-${i}`} step={s} index={i} />)}
                  </div>
                </div>

                {/* Reasoning Trace + Evidence Inspector */}
                <div className="rounded-2xl p-4" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                  <SectionTitle icon={<Eye className="w-3.5 h-3.5" />} label="Reasoning Trace & Evidence Inspector" accent="oklch(0.8 0.16 60)" />
                  <div className="space-y-1.5">
                    {response.reasoning.map((line, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "oklch(0.7 0.15 250)" }} />
                        <p className="text-[11px] leading-relaxed" style={{ color: "oklch(0.65 0.02 240)" }}>{line}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-2">
                    {response.evidence.map((e, i) => (
                      <div key={i} className="rounded-xl p-2.5" style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded" style={{ background: "oklch(0.7 0.15 250 / 0.15)", color: "oklch(0.7 0.15 250)" }}>{e.type}</span>
                          <span className="text-[10px] font-medium text-white truncate">{e.source}</span>
                          <span className="ml-auto text-[9px]" style={{ color: "oklch(0.5 0.03 240)" }}>{e.confidence}%</span>
                        </div>
                        <p className="text-[10px] mt-1 leading-relaxed" style={{ color: "oklch(0.6 0.02 240)" }}>{e.excerpt}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => setExpandedTrace(!expandedTrace)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium"
                      style={{ color: "oklch(0.7 0.15 250)" }}
                    >
                      {expandedTrace ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      Conflict resolution & cross-links
                    </button>
                    {expandedTrace && (
                      <div className="mt-2 space-y-2">
                        {response.conflictResolution.map((c, i) => (
                          <p key={i} className="text-[10px] leading-relaxed" style={{ color: "oklch(0.6 0.02 240)" }}>• {c}</p>
                        ))}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {response.affectedSystems.length > 0 && (
                            <div className="rounded-xl p-2" style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                              <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "oklch(0.5 0.03 240)" }}>Affected systems</p>
                              <div className="flex flex-wrap gap-1">
                                {response.affectedSystems.map((s) => (
                                  <span key={s} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "oklch(0.75 0.2 25 / 0.15)", color: "oklch(0.8 0.16 60)" }}>{s}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {response.recommendedActions.length > 0 && (
                            <div className="rounded-xl p-2" style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                              <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "oklch(0.5 0.03 240)" }}>Recommended actions</p>
                              <ul className="space-y-1">
                                {response.recommendedActions.map((a, i) => (
                                  <li key={i} className="text-[10px] leading-snug" style={{ color: "oklch(0.65 0.02 240)" }}>• {a}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cross-Domain Analysis Dashboard */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Predictive Insight Cards */}
          <div className="rounded-2xl p-4 xl:col-span-1" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <SectionTitle icon={<TrendingUp className="w-3.5 h-3.5" />} label="Predictive Insight Cards" accent="oklch(0.7 0.13 300)" />
            <div className="space-y-3">
              {predictions.map((p) => (
                <div key={p.id} className="rounded-xl p-3" style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-white">{p.title}</span>
                    <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: `${p.impact === "high" ? "oklch(0.75 0.2 25)" : "oklch(0.7 0.15 250)"} / 0.15`, color: p.impact === "high" ? "oklch(0.75 0.2 25)" : "oklch(0.7 0.15 250)" }}>
                      {p.impact} impact
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 260)" }}>
                      <div className="h-full rounded-full" style={{ width: `${clamp(p.likelihood)}%`, background: "oklch(0.7 0.13 300)" }} />
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: "oklch(0.7 0.13 300)" }}>{p.likelihood}%</span>
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: "oklch(0.5 0.03 240)" }}>horizon: {p.horizon}</p>
                  <p className="text-[11px] mt-1 leading-snug" style={{ color: "oklch(0.65 0.02 240)" }}>{p.summary}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.indicators.map((ind, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: "oklch(0.16 0.025 260)", color: "oklch(0.55 0.02 240)", border: "1px solid oklch(0.22 0.02 260)" }}>{ind}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Architecture intelligence + Insight Timeline */}
          <div className="rounded-2xl p-4 xl:col-span-2" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <SectionTitle icon={<Network className="w-3.5 h-3.5" />} label="Insight Timeline & Catalog" accent="oklch(0.7 0.18 170)" />
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              {kinds.map((k) => (
                <button
                  key={k}
                  onClick={() => setKindFilter(k)}
                  className="text-[10px] px-2 py-1 rounded-full capitalize transition-colors"
                  style={kindFilter === k
                    ? { background: (kindColor[k] ?? "oklch(0.7 0.18 170)") + " / 0.2", color: kindColor[k] ?? "oklch(0.7 0.18 170)", border: `1px solid ${(kindColor[k] ?? "oklch(0.7 0.18 170)") + " / 0.5"}` }
                    : { background: "oklch(0.14 0.02 260)", color: "oklch(0.6 0.02 240)", border: "1px solid oklch(0.22 0.02 260)" }}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {filteredCatalog.length === 0 && (
                <p className="text-xs" style={{ color: "oklch(0.5 0.03 240)" }}>No insights yet — run an intelligence sweep or ask a question.</p>
              )}
              {filteredCatalog.map((i) => {
                const Icon = kindIcon[i.kind] ?? FlaskConical;
                const accent = kindColor[i.kind] ?? "oklch(0.7 0.18 170)";
                return (
                  <button
                    key={i.id}
                    onClick={() => openInsight(i.id)}
                    className="w-full text-left rounded-xl p-3 transition-colors"
                    style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accent} / 0.15`, color: accent }}>
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-xs font-semibold text-white truncate">{i.title}</span>
                      <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full capitalize shrink-0" style={{ background: `${priorityColor[i.priority] ?? "oklch(0.6 0.03 240)"} / 0.15`, color: priorityColor[i.priority] ?? "oklch(0.6 0.03 240)" }}>
                        {i.priority}
                      </span>
                    </div>
                    <p className="text-[11px] mt-1.5 leading-snug" style={{ color: "oklch(0.65 0.02 240)" }}>{i.summary}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[9px]" style={{ color: "oklch(0.5 0.03 240)" }}>
                      <span>confidence {i.confidence}%</span>
                      <span>{i.evidence.length} evidence</span>
                      <span className="ml-auto">{new Date(i.createdAt).toLocaleString()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recommendation Center */}
        <div className="rounded-2xl p-4" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
          <SectionTitle icon={<Lightbulb className="w-3.5 h-3.5" />} label="Recommendation Center" accent="oklch(0.8 0.16 60)" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {recommendations.slice(0, 9).map((r) => (
              <div key={r.id} className="rounded-xl p-3" style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-semibold" style={{ background: `${priorityColor[r.priority] ?? "oklch(0.6 0.03 240)"} / 0.15`, color: priorityColor[r.priority] ?? "oklch(0.6 0.03 240)" }}>
                    {r.priority}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "oklch(0.16 0.025 260)", color: "oklch(0.55 0.02 240)" }}>{r.sourceKind}</span>
                </div>
                <p className="text-xs font-semibold text-white mt-2 leading-snug">{r.title}</p>
                <p className="text-[10px] mt-1 leading-snug" style={{ color: "oklch(0.6 0.02 240)" }}>{r.detail}</p>
                <div className="flex items-center gap-3 mt-2 text-[9px]" style={{ color: "oklch(0.5 0.03 240)" }}>
                  <span>owner: <b style={{ color: "oklch(0.7 0.15 250)" }}>{r.owner}</b></span>
                  <span>eta: {r.eta}</span>
                  <span>impact: {r.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Event Intelligence Layer */}
        <div className="rounded-2xl p-4" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
          <SectionTitle icon={<Zap className="w-3.5 h-3.5" />} label="Event Intelligence Layer" accent="oklch(0.7 0.18 170)" />
          <div className="space-y-2">
            {events.length === 0 && <p className="text-xs" style={{ color: "oklch(0.5 0.03 240)" }}>No events assessed yet.</p>}
            {events.map((e, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-semibold shrink-0 mt-0.5" style={{ background: `${e.severity === "high" ? "oklch(0.75 0.2 25)" : e.severity === "medium" ? "oklch(0.8 0.16 60)" : "oklch(0.7 0.15 250)"} / 0.15`, color: e.severity === "high" ? "oklch(0.75 0.2 25)" : e.severity === "medium" ? "oklch(0.8 0.16 60)" : "oklch(0.7 0.15 250)" }}>
                  {e.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-semibold" style={{ color: "oklch(0.7 0.18 170)" }}>{e.eventType}</span>
                    <span className="text-[9px]" style={{ color: "oklch(0.5 0.03 240)" }}>{e.resource} · {new Date(e.at).toLocaleString()}</span>
                    {e.insightGenerated && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: "oklch(0.75 0.15 150 / 0.15)", color: "oklch(0.75 0.15 150)" }}>
                        <CheckCircle2 className="w-2.5 h-2.5" /> insight generated
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] mt-1 leading-snug" style={{ color: "oklch(0.6 0.02 240)" }}>{e.intelligence}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insight detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "oklch(0.05 0.015 260 / 0.8)" }} onClick={() => setDetail(null)}>
          <div className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }} onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center gap-2 p-5 pb-3" style={{ background: "oklch(0.11 0.02 260)" }}>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${(kindColor[detail.insight.kind] ?? "oklch(0.7 0.18 170)")} / 0.15`, color: kindColor[detail.insight.kind] ?? "oklch(0.7 0.18 170)" }}>
                {detail.insight.kind}
              </span>
              <h3 className="text-sm font-semibold text-white flex-1">{detail.insight.title}</h3>
              <button onClick={() => setDetail(null)} className="rounded-lg p-1.5" style={{ background: "oklch(0.16 0.025 260)" }}>
                <X className="w-4 h-4" style={{ color: "oklch(0.6 0.02 240)" }} />
              </button>
            </div>
            <div className="p-5 pt-2 space-y-4">
              <div className="flex items-center gap-3 text-xs">
                <span style={{ color: "oklch(0.7 0.18 170)" }}>confidence {detail.insight.confidence}%</span>
                <span style={{ color: "oklch(0.5 0.03 240)" }}>{detail.insight.evidence.length} evidence items</span>
                <span style={{ color: "oklch(0.5 0.03 240)" }}>{new Date(detail.insight.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm leading-relaxed text-white whitespace-pre-line">{detail.insight.detail}</p>
              {detail.insight.affectedSystems.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "oklch(0.5 0.03 240)" }}>Affected systems</p>
                  <div className="flex flex-wrap gap-1">
                    {detail.insight.affectedSystems.map((s) => (
                      <span key={s} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "oklch(0.75 0.2 25 / 0.15)", color: "oklch(0.8 0.16 60)" }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-2xl p-4" style={{ background: "oklch(0.08 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "oklch(0.5 0.03 240)" }}>Reasoning trace</p>
                <div className="space-y-1.5">
                  {detail.trace.steps.map((s: ReasoningTraceStep) => (
                    <div key={s.order} className="flex items-start gap-2">
                      <span className="text-[9px] font-mono font-bold mt-0.5" style={{ color: "oklch(0.7 0.15 250)" }}>{s.order}</span>
                      <div className="flex-1">
                        <p className="text-[11px] font-medium text-white">{s.label}</p>
                        <p className="text-[10px] mt-0.5 leading-snug" style={{ color: "oklch(0.6 0.02 240)" }}>{s.excerpt}</p>
                      </div>
                      <span className="text-[9px] shrink-0" style={{ color: "oklch(0.7 0.18 170)" }}>{s.confidence}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "oklch(0.05 0.015 260 / 0.8)" }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "oklch(0.7 0.15 250)" }} />
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl p-4 max-w-sm shadow-xl" style={{ background: "oklch(0.2 0.03 260)", border: "1px solid oklch(0.3 0.03 260)" }}>
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "oklch(0.8 0.16 60)" }} />
            <p className="text-xs leading-relaxed text-white">{toast}</p>
            <button onClick={() => setToast(null)} className="ml-1"><X className="w-3.5 h-3.5" style={{ color: "oklch(0.6 0.02 240)" }} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
