"use client";

import { DashboardTopbar } from "@/components/dashboard/topbar";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  GitFork,
  Loader2,
  Radio,
  Shield,
  TrendingUp,
  X,
} from "lucide-react";
import {
  fetchBrainGraphView,
  fetchRiskHealth,
  fetchRiskIntelligence,
  fetchRiskNodeDetail,
  fetchRiskPredictions,
  fetchRiskRecommendations,
  fetchRiskTimeline,
  runAgent,
} from "@/lib/phoenix/api";
import type {
  AgentRunResult,
  BrainGraphView,
  RiskHealthSnapshot,
  RiskIntelligenceView,
  RiskNode,
  RiskNodeDetail,
  RiskPrediction,
  RiskRecommendation,
  RiskTimelinePoint,
} from "@/lib/phoenix/types";

type RiskLevel = "critical" | "high" | "medium" | "low" | "safe";

const riskStyles: Record<RiskLevel, { bg: string; text: string; border: string; solid: string }> = {
  critical: { bg: "oklch(0.65 0.25 25 / 0.35)", text: "oklch(0.8 0.2 25)", border: "oklch(0.65 0.25 25 / 0.5)", solid: "oklch(0.65 0.25 25)" },
  high: { bg: "oklch(0.7 0.2 40 / 0.3)", text: "oklch(0.8 0.18 40)", border: "oklch(0.7 0.2 40 / 0.5)", solid: "oklch(0.7 0.2 40)" },
  medium: { bg: "oklch(0.75 0.18 60 / 0.25)", text: "oklch(0.82 0.16 60)", border: "oklch(0.75 0.18 60 / 0.4)", solid: "oklch(0.75 0.18 60)" },
  low: { bg: "oklch(0.65 0.15 150 / 0.2)", text: "oklch(0.75 0.15 150)", border: "oklch(0.65 0.15 150 / 0.35)", solid: "oklch(0.65 0.15 150)" },
  safe: { bg: "oklch(0.7 0.18 170 / 0.2)", text: "oklch(0.75 0.18 170)", border: "oklch(0.7 0.18 170 / 0.35)", solid: "oklch(0.7 0.18 170)" },
};

const MODES = [
  { id: "organization", label: "Organization" },
  { id: "team", label: "Teams" },
  { id: "ownership", label: "Ownership" },
  { id: "documentation", label: "Docs" },
  { id: "decision", label: "Decisions" },
  { id: "service", label: "Services" },
];

interface Propagation {
  centerId: string;
  neighbors: string[];
}

const trendIcon: Record<RiskPrediction["trend"], { icon: string; color: string }> = {
  increasing: { icon: "▲", color: "oklch(0.8 0.2 25)" },
  stable: { icon: "▶", color: "oklch(0.82 0.16 60)" },
  decreasing: { icon: "▼", color: "oklch(0.75 0.15 150)" },
};

const severityStyle: Record<RiskPrediction["severity"], string> = {
  critical: "oklch(0.65 0.25 25)",
  warning: "oklch(0.7 0.2 40)",
  info: "oklch(0.65 0.15 150)",
};

function TimelineChart({ points }: { points: RiskTimelinePoint[] }) {
  const W = 600;
  const H = 180;
  const PAD = 28;

  if (points.length < 2) {
    return <p className="text-xs py-8 text-center" style={{ color: "oklch(0.5 0.03 240)" }}>Insufficient history to render trend.</p>;
  }

  const series: Array<{ label: string; key: keyof RiskTimelinePoint; color: string }> = [
    { label: "Org Resilience", key: "orgResilience", color: "oklch(0.65 0.15 150)" },
    { label: "Avg Risk", key: "averageRisk", color: "oklch(0.65 0.25 25)" },
    { label: "Doc Coverage", key: "documentationCoverage", color: "oklch(0.7 0.2 40)" },
    { label: "Concentration", key: "knowledgeConcentration", color: "oklch(0.75 0.18 60)" },
    { label: "Tech Debt", key: "technicalDebt", color: "oklch(0.8 0.2 25)" },
  ];

  const x = (i: number) => PAD + (i * (W - PAD * 2)) / (points.length - 1);
  const y = (v: number) => H - PAD - (v / 100) * (H - PAD * 2);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={PAD} x2={W - PAD} y1={y(v)} y2={y(v)} stroke="oklch(0.22 0.02 260)" strokeWidth={1} strokeDasharray="3 3" />
            <text x={PAD - 6} y={y(v) + 3} fontSize={8} textAnchor="end" fill="oklch(0.5 0.03 240)">{v}</text>
          </g>
        ))}
        {series.map((s) => {
          const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(Number(p[s.key]))}`).join(" ");
          return <path key={s.key} d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />;
        })}
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.orgResilience)} r={3} fill="oklch(0.65 0.15 150)" />
        ))}
      </svg>
      <div className="flex flex-wrap gap-3 mt-2">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-0.5" style={{ background: s.color }} />
            <span className="text-[10px]" style={{ color: "oklch(0.55 0.02 240)" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RiskPage() {
  const [view, setView] = useState<RiskIntelligenceView | null>(null);
  const [mode, setMode] = useState("organization");
  const [health, setHealth] = useState<RiskHealthSnapshot | null>(null);
  const [predictions, setPredictions] = useState<RiskPrediction[]>([]);
  const [timeline, setTimeline] = useState<RiskTimelinePoint[]>([]);
  const [recommendations, setRecommendations] = useState<RiskRecommendation[]>([]);
  const [graph, setGraph] = useState<BrainGraphView | null>(null);
  const [selected, setSelected] = useState<RiskNodeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [propagation, setPropagation] = useState<Propagation | null>(null);
  const [insight, setInsight] = useState<AgentRunResult | null>(null);
  const [agentLoading, setAgentLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const reload = (m: string) => {
    setView(null);
    fetchRiskIntelligence(m)
      .then(setView)
      .catch((error) => console.error("Failed to load risk nodes", error))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRiskIntelligence(mode)
      .then(setView)
      .catch((error) => console.error("Failed to load risk nodes", error))
      .finally(() => setLoading(false));
    fetchRiskHealth().then(setHealth).catch((error) => console.error("Failed to load risk health", error));
    fetchRiskPredictions().then(setPredictions).catch((error) => console.error("Failed to load predictions", error));
    fetchRiskTimeline().then(setTimeline).catch((error) => console.error("Failed to load timeline", error));
    fetchRiskRecommendations().then(setRecommendations).catch((error) => console.error("Failed to load recommendations", error));
    fetchBrainGraphView().then(setGraph).catch((error) => console.error("Failed to load graph for propagation", error));
    runAgent("a8", "What does the organizational risk heatmap say and where will risk propagate?")
      .then(setInsight)
      .catch((error) => console.error("Failed to run risk agent", error))
      .finally(() => setAgentLoading(false));
  }, []);

  const modeClick = (m: string) => {
    setMode(m);
    setSelected(null);
    setPropagation(null);
    reload(m);
  };

  const riskById = useMemo(() => {
    if (!view) return new Map<string, RiskNode>();
    return new Map(view.nodes.map((n) => [n.id, n]));
  }, [view]);

  const selectNode = async (n: RiskNode) => {
    setSelected(null);
    setPropagation(null);
    if (n.kind === "team") {
      setSelected({ ...n, relatedDecisions: [], relatedEmployees: [], mitigation: n.contributingFactors });
      return;
    }
    if (!n.nodeId && n.kind === "decision") {
      setSelected({ ...n, relatedDecisions: [], relatedEmployees: [], mitigation: n.contributingFactors });
      return;
    }
    setDetailLoading(true);
    try {
      const detail = await fetchRiskNodeDetail(n.id);
      setSelected(detail);
      setPropagation(computePropagation(view, graph, n.id));
    } catch (error) {
      console.error("Failed to load node detail", error);
      setSelected({ ...n, relatedDecisions: [], relatedEmployees: [], mitigation: n.contributingFactors });
    } finally {
      setDetailLoading(false);
    }
  };

  const neighborsSet = useMemo(() => {
    if (!propagation) return new Set<string>();
    return new Set(propagation.neighbors);
  }, [propagation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.07 0.015 260)" }}>
        <div className="rounded-2xl p-6 bg-white shadow-lg">Loading organizational risk heatmap...</div>
      </div>
    );
  }

  const nodes = view?.nodes ?? [];
  const criticalCount = health?.criticalNodes ?? nodes.filter((n) => n.band === "critical").length;
  const hotspots = [...nodes].sort((a, b) => b.overallRisk - a.overallRisk).slice(0, 6);

  return (
    <div style={{ background: "oklch(0.07 0.015 260)", minHeight: "100vh" }}>
      <style>{`
        @keyframes riskPulse {
          0% { box-shadow: 0 0 0 0 oklch(0.65 0.25 25 / 0.55); border-color: oklch(0.65 0.25 25); }
          70% { box-shadow: 0 0 0 12px oklch(0.65 0.25 25 / 0); }
          100% { box-shadow: 0 0 0 0 oklch(0.65 0.25 25 / 0); }
        }
        @keyframes centerGlow {
          0% { box-shadow: 0 0 8px 2px oklch(0.8 0.2 25 / 0.8); }
          50% { box-shadow: 0 0 22px 6px oklch(0.8 0.2 25 / 0.6); }
          100% { box-shadow: 0 0 8px 2px oklch(0.8 0.2 25 / 0.8); }
        }
      `}</style>
      <DashboardTopbar title="Knowledge Risk Heatmap" subtitle="Where your organizational knowledge is at risk" />

      <div className="p-6 space-y-5">
        {/* Health summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Org Resilience", value: health ? `${health.orgResilience}%` : "—", color: "oklch(0.65 0.15 150)", icon: "🛡️" },
            { label: "Critical / High Nodes", value: health ? String(health.criticalNodes) : "—", color: "oklch(0.65 0.25 25)", icon: "🔴" },
            { label: "Undocumented Flags", value: health ? String(health.undocumentedFlags) : "—", color: "oklch(0.7 0.2 40)", icon: "⚠️" },
            { label: "Avg Knowledge-Criticality", value: health ? `${health.averageRisk}` : "—", color: "oklch(0.7 0.18 170)", icon: "🎯" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4 flex items-center gap-3"
              style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
              <span className="text-xl">{s.icon}</span>
              <div>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px]" style={{ color: "oklch(0.5 0.03 240)" }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Heatmap */}
          <div className="lg:col-span-2 rounded-2xl p-6" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <h3 className="text-sm font-semibold text-white mr-2">Risk Heatmap</h3>
              <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: "oklch(0.16 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                {MODES.map((m) => (
                  <button key={m.id} onClick={() => modeClick(m.id)}
                    className="px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors"
                    style={mode === m.id
                      ? { background: "oklch(0.65 0.15 150 / 0.25)", color: "oklch(0.75 0.15 150)", border: "1px solid oklch(0.65 0.15 150 / 0.4)" }
                      : { color: "oklch(0.55 0.02 240)", border: "1px solid transparent" }}>
                    {m.label}
                  </button>
                ))}
              </div>
              {propagation && (
                <span className="ml-auto text-[10px] px-2 py-1 rounded-full flex items-center gap-1"
                  style={{ background: "oklch(0.65 0.25 25 / 0.15)", color: "oklch(0.8 0.2 25)" }}>
                  <Radio className="w-3 h-3 animate-pulse" />
                  {propagation.neighbors.length} downstream nodes pressured
                </span>
              )}
            </div>

            {nodes.length === 0 ? (
              <p className="text-xs" style={{ color: "oklch(0.5 0.03 240)" }}>No nodes available in this mode.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                {nodes.map((n, i) => {
                  const style = riskStyles[n.band];
                  const isCenter = propagation?.centerId === n.id;
                  const isNeighbor = neighborsSet.has(n.id);
                  return (
                    <div key={n.id}
                      onClick={() => selectNode(n)}
                      className="relative rounded-xl p-3 cursor-pointer transition-all duration-200"
                      style={{
                        background: style.bg,
                        border: `1px solid ${style.border}`,
                        transform: isCenter ? "scale(1.03)" : "scale(1)",
                        animation: isCenter ? "centerGlow 1.6s ease-in-out infinite" : isNeighbor ? `riskPulse 1.4s ease-in-out ${i * 0.12}s infinite` : "none",
                      }}
                      title={`${n.label} · ${n.band} · ${n.contributingFactors.join(" · ")}`}>
                      {!n.owner && n.kind !== "team" && (
                        <div className="absolute top-1.5 right-1.5">
                          <AlertTriangle className="w-2.5 h-2.5" style={{ color: style.text }} />
                        </div>
                      )}
                      <p className="text-[10px] font-semibold leading-tight truncate" style={{ color: style.text }}>{n.label}</p>
                      <p className="text-xs font-bold mt-1 text-white">{n.overallRisk}</p>
                      <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: "oklch(0 0 0 / 0.3)" }}>
                        <div className="h-full rounded-full" style={{ width: `${n.overallRisk}%`, background: style.text }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {propagation && (
              <p className="text-[10px] mt-3" style={{ color: "oklch(0.5 0.03 240)" }}>
                <Activity className="w-3 h-3 inline mr-1" />
                Propagation simulated along knowledge-graph edges: risk pressure radiates from the selected node to its direct and second-order dependents.
              </p>
            )}
          </div>

          {/* Details panel */}
          <div className="space-y-4">
            {detailLoading ? (
              <div className="rounded-2xl p-5 text-center" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "oklch(0.65 0.15 150)" }} />
                <p className="text-xs mt-2 text-white">Resolving risk profile...</p>
              </div>
            ) : selected ? (
              <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: `1px solid ${riskStyles[selected.band].border}` }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: riskStyles[selected.band].text }} />
                  <span className="text-xs font-semibold capitalize" style={{ color: riskStyles[selected.band].text }}>{selected.band} · {selected.overallRisk} risk</span>
                  <button className="ml-auto" onClick={() => { setSelected(null); setPropagation(null); }}>
                    <X className="w-3.5 h-3.5" style={{ color: "oklch(0.5 0.03 240)" }} />
                  </button>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{selected.label}</h3>
                <p className="text-[10px] mb-4 capitalize" style={{ color: "oklch(0.55 0.02 240)" }}>{selected.kind}{selected.owner ? ` · ${selected.owner}` : ""}{selected.team ? ` · ${selected.team}` : ""}</p>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: "Docs", value: selected.documentationCoverage, color: "oklch(0.7 0.2 40)" },
                    { label: "Concentration", value: selected.knowledgeConcentration, color: "oklch(0.65 0.25 25)" },
                    { label: "Bus Factor", value: selected.busFactor, color: "oklch(0.75 0.18 60)" },
                    { label: "Critical Dep", value: selected.criticalDependency, color: "oklch(0.65 0.25 25)" },
                  ].map((m) => (
                    <div key={m.label} className="rounded-xl p-2.5" style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                      <div className="flex justify-between mb-1">
                        <span className="text-[9px]" style={{ color: "oklch(0.5 0.03 240)" }}>{m.label}</span>
                        <span className="text-[10px] font-bold text-white">{m.value}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 260)" }}>
                        <div className="h-full rounded-full" style={{ width: `${m.value}%`, background: m.color }} />
                      </div>
                    </div>
                  ))}
                </div>

                {selected.contributingFactors.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold mb-1" style={{ color: "oklch(0.55 0.02 240)" }}>CONTRIBUTING FACTORS</p>
                    {selected.contributingFactors.map((f, i) => (
                      <p key={i} className="text-[11px] flex items-start gap-1.5 mb-1 text-white">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" style={{ color: riskStyles[selected.band].text }} />
                        {f}
                      </p>
                    ))}
                  </div>
                )}

                {selected.relatedDecisions.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold mb-1" style={{ color: "oklch(0.55 0.02 240)" }}>RELATED DECISIONS</p>
                    {selected.relatedDecisions.slice(0, 3).map((d) => (
                      <p key={d.decisionId} className="text-[11px] text-white truncate mb-1">→ {d.title}</p>
                    ))}
                  </div>
                )}

                <div className="rounded-xl p-3" style={{ background: "oklch(0.65 0.15 150 / 0.08)", border: "1px solid oklch(0.65 0.15 150 / 0.25)" }}>
                  <p className="text-[10px] font-semibold mb-1 flex items-center gap-1" style={{ color: "oklch(0.65 0.15 150)" }}>
                    <Shield className="w-3 h-3" /> MITIGATION
                  </p>
                  {selected.mitigation.map((m, i) => (
                    <p key={i} className="text-[11px] text-white mb-1">• {m}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-5 text-center" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                <span className="text-3xl">🔥</span>
                <p className="text-sm text-white mt-2">Select a node</p>
                <p className="text-xs mt-1" style={{ color: "oklch(0.5 0.03 240)" }}>Inspect 13 risk attributes and watch risk propagate downstream</p>
              </div>
            )}

            {/* Top hotspots */}
            <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" style={{ color: "oklch(0.65 0.25 25)" }} />
                <span className="text-sm font-semibold text-white">Top Hotspots</span>
              </div>
              {hotspots.slice(0, 5).map((h) => {
                const style = riskStyles[h.band];
                return (
                  <button key={h.id} onClick={() => selectNode(h)}
                    className="flex items-center gap-2 w-full text-left p-2.5 rounded-xl mb-2 hover:opacity-90 transition-opacity"
                    style={{ background: style.bg, border: `1px solid ${style.border}` }}>
                    <span className="text-xs font-bold" style={{ color: style.text }}>{h.overallRisk}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-white">{h.label}</span>
                    <span className="text-[10px] capitalize" style={{ color: style.text }}>{h.band}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Predictions + Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4" style={{ color: "oklch(0.75 0.18 60)" }} />
              <span className="text-sm font-semibold text-white">Predictive Analytics</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto" style={{ background: "oklch(0.75 0.18 60 / 0.12)", color: "oklch(0.82 0.16 60)" }}>
                4-week forecast
              </span>
            </div>
            <div className="space-y-3">
              {predictions.map((p) => {
                const tc = trendIcon[p.trend];
                const sc = severityStyle[p.severity];
                return (
                  <div key={p.id} className="rounded-xl p-3.5" style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)", borderLeft: `3px solid ${sc}` }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-white">{p.title}</span>
                      <span className="text-[10px] ml-auto flex items-center gap-1" style={{ color: tc.color }}>{tc.icon} {p.trend}</span>
                    </div>
                    <p className="text-[11px] mb-2" style={{ color: "oklch(0.75 0.02 240)" }}>{p.detail}</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {p.evidence.map((e, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "oklch(0.18 0.02 260)", color: "oklch(0.55 0.02 240)" }}>{e}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-semibold" style={{ color: sc }}>{p.confidence}% confidence</span>
                      {p.contributingFactors.slice(0, 2).map((f, i) => (
                        <span key={i} className="text-[9px] truncate" style={{ color: "oklch(0.5 0.03 240)" }}>{f}</span>
                      ))}
                    </div>
                    {p.mitigation.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {p.mitigation.map((m, i) => (
                          <span key={i} className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: "oklch(0.65 0.15 150 / 0.12)", color: "oklch(0.65 0.15 150)" }}>✓ {m}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4" style={{ color: "oklch(0.65 0.15 150)" }} />
              <span className="text-sm font-semibold text-white">Risk Timeline</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto" style={{ background: "oklch(0.65 0.15 150 / 0.12)", color: "oklch(0.65 0.15 150)" }}>
                {timeline.length} snapshots
              </span>
            </div>
            <TimelineChart points={timeline} />
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[
                { label: "Single-Owner Systems", value: health?.singleOwnerSystems ?? "—" },
                { label: "SPOF Count", value: health?.spofCount ?? "—" },
                { label: "Bus-Factor Coverage", value: health ? `${health.busFactorCoverage}%` : "—" },
                { label: "Total Employees", value: health?.totalEmployees ?? "—" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-2.5 text-center" style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                  <p className="text-sm font-bold text-white">{s.value}</p>
                  <p className="text-[9px]" style={{ color: "oklch(0.5 0.03 240)" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4" style={{ color: "oklch(0.7 0.2 40)" }} />
            <span className="text-sm font-semibold text-white">Recommended Actions</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto" style={{ background: "oklch(0.7 0.2 40 / 0.12)", color: "oklch(0.8 0.18 40)" }}>
              ownership-assigned
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {recommendations.map((r) => {
              const color = r.priority === "critical" ? "oklch(0.65 0.25 25)" : r.priority === "high" ? "oklch(0.7 0.2 40)" : "oklch(0.75 0.18 60)";
              return (
                <div key={r.id} className="rounded-xl p-3.5" style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)", borderLeft: `3px solid ${color}` }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-white">{r.action}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full ml-auto capitalize" style={{ background: `${color} / 0.15`, color }}>{r.priority}</span>
                  </div>
                  <p className="text-[11px] mb-2" style={{ color: "oklch(0.75 0.02 240)" }}>{r.detail}</p>
                  <div className="flex items-center gap-2 text-[10px]" style={{ color: "oklch(0.55 0.02 240)" }}>
                    <BrainCircuit className="w-3 h-3" />
                    <span>Owner: {r.owner}</span>
                    <span>·</span>
                    <span>{r.eta}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Risk Intelligence Agent insight */}
        <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.65 0.15 150 / 0.3)" }}>
          <div className="flex items-center gap-2 mb-3">
            <GitFork className="w-4 h-4" style={{ color: "oklch(0.65 0.15 150)" }} />
            <span className="text-sm font-semibold text-white">Risk Intelligence Agent · a8</span>
            {agentLoading ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto flex items-center gap-1" style={{ background: "oklch(0.65 0.15 150 / 0.12)", color: "oklch(0.65 0.15 150)" }}>
                <Loader2 className="w-3 h-3 animate-spin" /> scoring the heatmap
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto" style={{ background: "oklch(0.65 0.15 150 / 0.15)", color: "oklch(0.65 0.15 150)" }}>
                {insight?.confidence}% conf
              </span>
            )}
          </div>
          {insight ? (
            <>
              <p className="text-xs text-white mb-2">{insight.finding}</p>
              <ul className="space-y-1">
                {insight.details.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px]" style={{ color: "oklch(0.55 0.02 240)" }}>
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "oklch(0.65 0.15 150)" }} />
                    {d}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-xs" style={{ color: "oklch(0.5 0.03 240)" }}>
              <Loader2 className="w-3 h-3 inline animate-spin mr-1" /> Risk agent scoring every node across 13 attributes and projecting trajectories...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function computePropagation(
  view: RiskIntelligenceView | null,
  graph: BrainGraphView | null,
  nodeId: string,
): Propagation | null {
  if (!view || !graph) return null;
  const riskNode = view.nodes.find((n) => n.id === nodeId);
  if (!riskNode?.nodeId) return null;
  const start = graph.nodes.find((g) => g.id === riskNode.nodeId);
  if (!start?.connections?.length) return null;

  const riskIdByGraphId = new Map<string, string>();
  for (const n of view.nodes) {
    if (n.nodeId) riskIdByGraphId.set(n.nodeId, n.id);
  }

  const direct = start.connections
    .map((gid) => riskIdByGraphId.get(gid))
    .filter((id): id is string => Boolean(id) && id !== riskNode.id);

  const directGraphIds = start.connections;
  const second: string[] = [];
  for (const gid of directGraphIds) {
    const node = graph.nodes.find((g) => g.id === gid);
    for (const conn of node?.connections ?? []) {
      const rid = riskIdByGraphId.get(conn);
      if (rid && rid !== riskNode.id && !direct.includes(rid)) second.push(rid);
    }
  }

  const neighbors = [...new Set([...direct, ...second])];
  return neighbors.length ? { centerId: riskNode.id, neighbors } : null;
}
