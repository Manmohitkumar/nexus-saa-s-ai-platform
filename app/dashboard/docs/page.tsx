"use client";

import { DashboardTopbar } from "@/components/dashboard/topbar";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  BookOpenCheck,
  Boxes,
  CheckCircle2,
  Database,
  ExternalLink,
  FileText,
  Flag,
  Handshake,
  Landmark,
  Layers,
  Loader2,
  Plug,
  RefreshCw,
  Rocket,
  Search,
  Server,
  Sparkles,
  BarChart3,
  Container,
  ShieldCheck,
  GitCommitVertical,
  ArrowLeft,
  RotateCcw,
  History,
  Bot,
  Zap,
} from "lucide-react";
import {
  fetchArchitectureWorkflows,
  fetchDocumentationDetail,
  fetchDocumentationDiff,
  fetchDocumentationHealth,
  fetchDocumentationHealthTimeline,
  fetchDocumentationList,
  fetchDocumentationRecommendations,
  fetchDocumentationVersions,
  fetchEvolutionHistory,
  fetchFeatureDocs,
  regenerateDocument,
  runAgent,
  rollbackDocument,
  triggerDocumentationEvolution,
} from "@/lib/phoenix/api";
import type {
  AgentRunResult,
  ArchitectureWorkflow,
  DocumentationDetail,
  DocumentationHealth,
  DocumentationRecommendation,
  DocumentationView,
  EvolutionRun,
  FeatureDocsState,
  HealthTimelinePoint,
  DocKind,
  DocStatus,
  DocSection,
  DocumentationVersionView,
  DocumentationDiff,
} from "@/lib/phoenix/types";

const statusConfig: Record<DocStatus, { label: string; color: string; bg: string }> = {
  current: { label: "Current", color: "oklch(0.75 0.15 150)", bg: "oklch(0.65 0.15 150 / 0.12)" },
  draft: { label: "Draft", color: "oklch(0.75 0.13 250)", bg: "oklch(0.7 0.15 250 / 0.12)" },
  stale: { label: "Stale", color: "oklch(0.8 0.16 60)", bg: "oklch(0.75 0.18 60 / 0.12)" },
  missing: { label: "Missing", color: "oklch(0.75 0.2 25)", bg: "oklch(0.65 0.25 25 / 0.14)" },
};

const kindIcon: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  service: Server,
  api: Plug,
  database: Database,
  infrastructure: Container,
  runbook: BookOpenCheck,
  adr: Landmark,
  onboarding: Handshake,
  repository: Boxes,
  "knowledge-transfer": Handshake,
  "release-notes": Rocket,
  "executive-summary": BarChart3,
};

const kindColor: Record<string, string> = {
  service: "oklch(0.7 0.18 170)",
  api: "oklch(0.7 0.15 250)",
  database: "oklch(0.75 0.18 60)",
  infrastructure: "oklch(0.8 0.15 40)",
  runbook: "oklch(0.7 0.18 170)",
  adr: "oklch(0.7 0.15 250)",
  onboarding: "oklch(0.75 0.15 150)",
  repository: "oklch(0.7 0.18 170)",
  "knowledge-transfer": "oklch(0.75 0.15 150)",
  "release-notes": "oklch(0.8 0.16 60)",
  "executive-summary": "oklch(0.75 0.15 150)",
};

function kindLabel(kind: string): string {
  return kind.replace(/-/g, " ");
}

function HealthRing({ value }: { value: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="oklch(0.18 0.02 260)" strokeWidth="5" />
        <circle cx="28" cy="28" r={r} fill="none" stroke="oklch(0.7 0.18 170)" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)}
          style={{ filter: "drop-shadow(0 0 4px oklch(0.7 0.18 170 / 0.5))" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{Math.round(value)}</span>
      </div>
    </div>
  );
}

function Sparkline({ points }: { points: HealthTimelinePoint[] }) {
  const W = 300;
  const H = 64;
  if (points.length < 2) {
    return <p className="text-[10px]" style={{ color: "oklch(0.5 0.03 240)" }}>No history yet</p>;
  }
  const data = [...points].reverse().map((p) => p.health);
  const x = (i: number) => (i * (W - 8)) / (data.length - 1) + 4;
  const y = (v: number) => H - 6 - (v / 100) * (H - 12);
  const d = data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 64 }}>
      <path d={d} fill="none" stroke="oklch(0.7 0.18 170)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={2.5} fill="oklch(0.7 0.18 170)" />
      ))}
    </svg>
  );
}

function SectionRenderer({ section, accent }: { section: DocSection; accent: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "oklch(0.08 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
      <h4 className="text-sm font-semibold text-white mb-2">{section.heading}</h4>
      {section.body && <p className="text-xs leading-relaxed mb-3" style={{ color: "oklch(0.7 0.02 240)" }}>{section.body}</p>}
      {section.code && (
        <pre className="text-[11px] leading-relaxed p-3 rounded-xl overflow-x-auto mb-3"
          style={{ background: "oklch(0.05 0.015 260)", color: accent, border: "1px solid oklch(0.22 0.02 260)" }}>{section.code}</pre>
      )}
      {section.bullets && (
        <ul className="space-y-1.5 mb-3">
          {section.bullets.map((b, bi) => (
            <li key={bi} className="flex items-start gap-2 text-xs" style={{ color: "oklch(0.65 0.02 240)" }}>
              <span className="mt-0.5 text-sm shrink-0" style={{ color: accent }}>•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
      {section.table && (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "oklch(0.22 0.02 260)" }}>
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr style={{ background: "oklch(0.14 0.02 260)" }}>
                {section.table.headers.map((h, hi) => (
                  <th key={hi} className="px-3 py-2 font-medium text-white">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row, ri) => (
                <tr key={ri} style={{ borderTop: "1px solid oklch(0.22 0.02 260)" }}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2" style={{ color: ci === 0 ? accent : "oklch(0.65 0.02 240)" }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {section.evidence && section.evidence.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {section.evidence.slice(0, 6).map((e, ei) => (
            <span key={ei} className="px-1.5 py-0.5 rounded font-mono text-[9px]"
              style={{ background: "oklch(0.16 0.025 260)", color: "oklch(0.55 0.02 240)", border: "1px solid oklch(0.22 0.02 260)" }}>
              {e}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DocsPage() {
  const [docs, setDocs] = useState<DocumentationView[]>([]);
  const [health, setHealth] = useState<DocumentationHealth | null>(null);
  const [timeline, setTimeline] = useState<HealthTimelinePoint[]>([]);
  const [recommendations, setRecommendations] = useState<DocumentationRecommendation[]>([]);
  const [evolution, setEvolution] = useState<EvolutionRun[]>([]);
  const [architectureWorkflows, setArchitectureWorkflows] = useState<ArchitectureWorkflow[]>([]);
  const [featureDocs, setFeatureDocs] = useState<FeatureDocsState | null>(null);
  const [evidenceInsight, setEvidenceInsight] = useState<AgentRunResult | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<DocStatus | "all">("all");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);

  const [detail, setDetail] = useState<DocumentationDetail | null>(null);
  const [versions, setVersions] = useState<DocumentationVersionView[]>([]);
  const [diff, setDiff] = useState<DocumentationDiff | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busyDoc, setBusyDoc] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const load = () => {
    return Promise.all([
      fetchDocumentationList(),
      fetchDocumentationHealth(),
      fetchDocumentationHealthTimeline(),
      fetchDocumentationRecommendations(),
      fetchEvolutionHistory(),
      fetchArchitectureWorkflows(),
    ]).then(([d, h, t, r, e, w]) => {
      setDocs(d);
      setHealth(h);
      setTimeline(t);
      setRecommendations(r);
      setEvolution(e);
      setArchitectureWorkflows(w);
    });
  };

  useEffect(() => {
    load()
      .catch((error) => console.error("Failed to load documentation engine", error))
      .finally(() => setIsLoading(false));
    fetchFeatureDocs()
      .then(setFeatureDocs)
      .catch((error) => console.error("Failed to load feature docs", error));
    runAgent("a3", "Audit the documentation ecosystem for missing or stale knowledge")
      .then(setEvidenceInsight)
      .catch((error) => console.error("Failed to run evidence agent", error));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.07 0.015 260)" }}>
        <div className="rounded-2xl p-6 bg-white shadow-lg">Loading Autonomous Documentation Engine...</div>
      </div>
    );
  }

  const kindCounts = new Map<string, number>();
  docs.forEach((d) => kindCounts.set(d.kind, (kindCounts.get(d.kind) ?? 0) + 1));

  const kinds = [...kindCounts.keys()].sort();
  const q = search.trim().toLowerCase();
  const filtered = docs.filter((d) => {
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (kindFilter !== "all" && d.kind !== kindFilter) return false;
    if (q && !`${d.title} ${d.summary} ${d.owner} ${d.team}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const openDetail = async (doc: DocumentationView) => {
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    setDiff(null);
    try {
      const [d, v] = await Promise.all([
        fetchDocumentationDetail(doc.id),
        fetchDocumentationVersions(doc.id),
      ]);
      setDetail(d);
      setVersions(v);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Failed to load document detail");
    } finally {
      setDetailLoading(false);
    }
  };

  const regenerate = async (doc: DocumentationView) => {
    setBusyDoc(doc.id);
    try {
      await regenerateDocument(doc.id);
      await load();
      if (detail?.id === doc.id) {
        setDetail(null);
        await openDetail(doc);
      }
    } catch (error) {
      console.error("Regenerate failed", error);
    } finally {
      setBusyDoc(null);
    }
  };

  const rollback = async (to: number) => {
    if (!detail) return;
    setBusyDoc(detail.id);
    try {
      await rollbackDocument(detail.id, to);
      await load();
      await openDetail(detail);
    } catch (error) {
      console.error("Rollback failed", error);
    } finally {
      setBusyDoc(null);
    }
  };

  const showDiff = async (from: number, to: number) => {
    if (!detail) return;
    try {
      setDiff(await fetchDocumentationDiff(detail.id, from, to));
    } catch (error) {
      console.error("Diff failed", error);
    }
  };

  const syncAll = async () => {
    setSyncing(true);
    try {
      await triggerDocumentationEvolution("manual", "ui", "Synchronization triggered from the Documentation Workspace");
      await load();
    } catch (error) {
      console.error("Synchronization failed", error);
    } finally {
      setSyncing(false);
    }
  };

  const accent = detail ? (kindColor[detail.kind] ?? "oklch(0.7 0.18 170)") : "oklch(0.7 0.18 170)";

  return (
    <div style={{ background: "oklch(0.07 0.015 260)", minHeight: "100vh" }}>
      <DashboardTopbar title="Autonomous Documentation Engine" subtitle="Documentation that continuously synchronizes itself with the Organizational Digital Brain" />

      <div className="p-6 space-y-5">
        {/* Health hero */}
        <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
          <div className="flex items-center gap-5 flex-wrap">
            <HealthRing value={health?.health ?? 0} />
            <div className="flex-1 min-w-[220px]">
              <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "oklch(0.55 0.02 240)" }}>Documentation Health</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs" style={{ color: "oklch(0.65 0.02 240)" }}>
                <span>Coverage <b style={{ color: "oklch(0.75 0.15 150)" }}>{health?.coverage ?? 0}%</b></span>
                <span>Freshness <b style={{ color: "oklch(0.75 0.15 150)" }}>{health?.freshness ?? 0}%</b></span>
                <span>Current <b style={{ color: "oklch(0.75 0.15 150)" }}>{health?.currentDocs ?? 0}</b></span>
                <span>Stale <b style={{ color: "oklch(0.8 0.16 60)" }}>{health?.staleDocs ?? 0}</b></span>
                <span>Draft <b style={{ color: "oklch(0.75 0.13 250)" }}>{health?.draftDocs ?? 0}</b></span>
                <span>Missing <b style={{ color: "oklch(0.75 0.2 25)" }}>{health?.missingDocs ?? 0}</b></span>
                <span>Undocumented flags <b style={{ color: "oklch(0.8 0.16 60)" }}>{health?.undocumentedFlags ?? 0}</b></span>
              </div>
            </div>
            <div className="w-56">
              <div className="flex items-center gap-1.5 mb-1">
                <History className="w-3 h-3" style={{ color: "oklch(0.55 0.02 240)" }} />
                <span className="text-[10px]" style={{ color: "oklch(0.55 0.02 240)" }}>Health trend</span>
              </div>
              <Sparkline points={timeline} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {(health?.byKind ?? []).map((k) => (
              <div key={k.kind} className="rounded-xl p-3" style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                <div className="flex items-center gap-1.5">
                  <span className="capitalize text-[11px]" style={{ color: kindColor[k.kind] ?? "oklch(0.7 0.18 170)" }}>{k.kind}</span>
                  <span className="text-[10px]" style={{ color: "oklch(0.5 0.03 240)" }}>×{k.count}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 260)" }}>
                    <div className="h-full rounded-full" style={{ width: `${k.avgQuality}%`, background: kindColor[k.kind] ?? "oklch(0.7 0.18 170)" }} />
                  </div>
                  <span className="text-[10px]" style={{ color: "oklch(0.65 0.02 240)" }}>{k.avgQuality}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions + filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={syncAll} disabled={syncing}
            className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-200"
            style={{
              background: "oklch(0.7 0.18 170 / 0.15)",
              border: "1px solid oklch(0.7 0.18 170 / 0.4)",
              color: "oklch(0.7 0.18 170)",
            }}>
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {syncing ? "Synchronizing..." : "Run Synchronization"}
          </button>
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "oklch(0.5 0.03 240)" }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs outline-none"
              style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)", color: "white" }} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "current", "draft", "stale", "missing"] as const).map((f) => {
              const count = f === "all" ? docs.length : docs.filter((d) => d.status === f).length;
              const active = statusFilter === f;
              return (
                <button key={f} onClick={() => setStatusFilter(f)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all duration-200"
                  style={{
                    background: active ? "oklch(0.7 0.18 170 / 0.15)" : "oklch(0.14 0.02 260)",
                    border: `1px solid ${active ? "oklch(0.7 0.18 170 / 0.4)" : "oklch(0.22 0.02 260)"}`,
                    color: active ? "oklch(0.7 0.18 170)" : "oklch(0.55 0.02 240)",
                  }}>
                  {f} ({count})
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {["all", ...kinds].map((k) => {
            const active = kindFilter === k;
            return (
              <button key={k} onClick={() => setKindFilter(k)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all duration-200"
                style={{
                  background: active ? "oklch(0.7 0.15 250 / 0.15)" : "oklch(0.14 0.02 260)",
                  border: `1px solid ${active ? "oklch(0.7 0.15 250 / 0.4)" : "oklch(0.22 0.02 260)"}`,
                  color: active ? "oklch(0.75 0.13 250)" : "oklch(0.55 0.02 240)",
                }}>
                {k === "all" ? "All kinds" : kindLabel(k)}
              </button>
            );
          })}
        </div>

        {/* Docs list */}
        <div className="grid grid-cols-1 gap-3">
          {filtered.length === 0 && (
            <div className="rounded-2xl p-6 text-center" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
              <p className="text-xs" style={{ color: "oklch(0.5 0.03 240)" }}>No documents match the current filters.</p>
            </div>
          )}
          {filtered.map((doc) => {
            const cfg = statusConfig[doc.status];
            const Icon = kindIcon[doc.kind] ?? FileText;
            const color = kindColor[doc.kind] ?? "oklch(0.7 0.18 170)";
            const busy = busyDoc === doc.id;
            return (
              <div key={doc.id} className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-200"
                style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                <span className="w-11 h-11 rounded-2xl grid place-items-center shrink-0"
                  style={{ background: `${color} / 0.12`, border: `1px solid ${color} / 0.3` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-white">{doc.title}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full uppercase"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color} / 0.35` }}>
                      {cfg.label}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: "oklch(0.16 0.025 260)", color, border: "1px solid oklch(0.22 0.02 260)" }}>
                      v{doc.version}
                    </span>
                  </div>
                  <p className="text-xs mt-1 truncate" style={{ color: "oklch(0.55 0.02 240)" }}>{doc.summary}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-[10px]" style={{ color: "oklch(0.5 0.03 240)" }}>Owner: {doc.owner}</span>
                    <span className="text-[10px]" style={{ color: "oklch(0.5 0.03 240)" }}>Team: {doc.team || "—"}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 260)" }}>
                        <div className="h-full rounded-full" style={{ width: `${doc.quality}%`, background: color }} />
                      </div>
                      <span className="text-[10px]" style={{ color: "oklch(0.4 0.02 240)" }}>quality {doc.quality}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 260)" }}>
                        <div className="h-full rounded-full" style={{ width: `${doc.freshness}%`, background: cfg.color }} />
                      </div>
                      <span className="text-[10px]" style={{ color: "oklch(0.4 0.02 240)" }}>fresh {doc.freshness}</span>
                    </div>
                    <span className="text-[10px]" style={{ color: "oklch(0.4 0.02 240)" }}>verified {new Date(doc.lastVerifiedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openDetail(doc)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all duration-200 cursor-pointer"
                    style={{ background: "oklch(0.7 0.18 170 / 0.12)", border: "1px solid oklch(0.7 0.18 170 / 0.3)", color: "oklch(0.7 0.18 170)" }}>
                    <ExternalLink className="w-3 h-3" /> View
                  </button>
                  <button onClick={() => regenerate(doc)} disabled={!!busy}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all duration-200"
                    style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)", color: "oklch(0.55 0.02 240)" }}>
                    {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    Regenerate
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recommendations */}
        <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4" style={{ color: "oklch(0.7 0.18 170)" }} />
            <span className="text-sm font-semibold text-white">Documentation Recommendations</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto" style={{ background: "oklch(0.16 0.025 260)", color: "oklch(0.55 0.02 240)", border: "1px solid oklch(0.22 0.02 260)" }}>
              derived from risk + workforce intelligence
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.length === 0 && (
              <p className="text-xs" style={{ color: "oklch(0.5 0.03 240)" }}>No recommendations at the moment.</p>
            )}
            {recommendations.map((rec) => {
              const pr = rec.priority;
              const color = pr === "critical" ? "oklch(0.75 0.2 25)" : pr === "high" ? "oklch(0.8 0.16 60)" : "oklch(0.75 0.13 250)";
              return (
                <div key={rec.id} className="rounded-2xl p-4" style={{ background: "oklch(0.08 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-full uppercase" style={{ background: `${color} / 0.12`, color, border: `1px solid ${color} / 0.35` }}>{rec.priority}</span>
                    <span className="text-[10px]" style={{ color: "oklch(0.5 0.03 240)" }}>{rec.type}</span>
                    <span className="text-[10px] ml-auto" style={{ color: "oklch(0.5 0.03 240)" }}>ETA {rec.eta}</span>
                  </div>
                  <p className="text-sm font-medium text-white mt-2">{rec.title}</p>
                  <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.02 240)" }}>{rec.detail}</p>
                  {rec.action && (
                    <p className="text-xs mt-2" style={{ color }}>
                      <ShieldCheck className="w-3 h-3 inline mr-1" />{rec.action}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Evolution activity */}
        <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
          <div className="flex items-center gap-2 mb-4">
            <GitCommitVertical className="w-4 h-4" style={{ color: "oklch(0.7 0.15 250)" }} />
            <span className="text-sm font-semibold text-white">Evolution Pipeline Activity</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto" style={{ background: "oklch(0.16 0.025 260)", color: "oklch(0.55 0.02 240)", border: "1px solid oklch(0.22 0.02 260)" }}>
              reacting to event bus triggers
            </span>
          </div>
          <div className="space-y-2">
            {evolution.length === 0 && <p className="text-xs" style={{ color: "oklch(0.5 0.03 240)" }}>No evolution runs yet.</p>}
            {evolution.slice(0, 12).map((run) => (
              <div key={run.id} className="flex items-start gap-3 rounded-xl p-3" style={{ background: "oklch(0.08 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                <span className="w-7 h-7 rounded-lg grid place-items-center shrink-0" style={{ background: "oklch(0.7 0.15 250 / 0.12)" }}>
                  {run.action === "regenerated" ? <RefreshCw className="w-3.5 h-3.5" style={{ color: "oklch(0.7 0.15 250)" }} /> : <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "oklch(0.75 0.15 150)" }} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-medium text-white">{run.trigger}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full uppercase"
                      style={{ background: run.action === "regenerated" ? "oklch(0.7 0.15 250 / 0.12)" : "oklch(0.65 0.15 150 / 0.12)", color: run.action === "regenerated" ? "oklch(0.7 0.15 250)" : "oklch(0.75 0.15 150)" }}>
                      {run.action}
                    </span>
                    <span className="text-[10px] ml-auto" style={{ color: "oklch(0.4 0.02 240)" }}>{new Date(run.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: "oklch(0.55 0.02 240)" }}>{run.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Evidence Agent audit */}
        <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.7 0.15 200 / 0.3)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-4 h-4" style={{ color: "oklch(0.7 0.15 200)" }} />
            <span className="text-sm font-semibold text-white">Documentation Intelligence Agent · Fleet Audit</span>
            {evidenceInsight ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto" style={{ background: "oklch(0.7 0.15 200 / 0.15)", color: "oklch(0.7 0.15 200)" }}>
                {evidenceInsight.confidence}% conf
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto flex items-center gap-1" style={{ background: "oklch(0.7 0.15 200 / 0.12)", color: "oklch(0.7 0.15 200)" }}>
                <Loader2 className="w-3 h-3 animate-spin" /> running
              </span>
            )}
          </div>
          {evidenceInsight ? (
            <>
              <p className="text-xs text-white mb-2">{evidenceInsight.finding}</p>
              <ul className="space-y-1">
                {evidenceInsight.details.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px]" style={{ color: "oklch(0.55 0.02 240)" }}>
                    <FileText className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "oklch(0.7 0.15 200)" }} />
                    {d}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-1 mt-2">
                {evidenceInsight.sources.slice(0, 4).map((s) => (
                  <span key={s} className="px-1.5 py-0.5 rounded font-mono text-[9px]" style={{ background: "oklch(0.16 0.025 260)", color: "oklch(0.5 0.03 240)", border: "1px solid oklch(0.22 0.02 260)" }}>{s}</span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs" style={{ color: "oklch(0.5 0.03 240)" }}>
              <Loader2 className="w-3 h-3 inline animate-spin mr-1" /> Documentation Intelligence Agent auditing the documentation set against the brain...
            </p>
          )}
        </div>

        {/* Architecture workflows (legacy) */}
        <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "oklch(0.55 0.02 240)" }}>Platform Intelligence</p>
              <h2 className="text-lg font-semibold text-white">Architecture & Workflow</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-5">
            {architectureWorkflows.map((item) => (
              <div key={item.id} className="rounded-2xl p-5" style={{ background: "oklch(0.08 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                <div className="flex items-start gap-3">
                  <span className="w-11 h-11 rounded-2xl grid place-items-center text-xl" style={{ background: "oklch(0.7 0.18 170 / 0.12)", color: "oklch(0.7 0.18 170)" }}>
                    {item.id === "platform-architecture" ? <Layers className="w-5 h-5" /> : item.id === "knowledge-building" ? <Database className="w-5 h-5" /> : <Container className="w-5 h-5" />}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.02 240)" }}>{item.description}</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-2 text-sm" style={{ color: "oklch(0.65 0.15 150)" }}>
                  {item.steps.map((step, idx) => (
                    <li key={idx} className="flex gap-2 items-start">
                      <span className="mt-1 text-base" style={{ color: "oklch(0.7 0.18 170)" }}>•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Feature flag documentation (legacy) */}
        <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Flag className="w-4 h-4" style={{ color: "oklch(0.7 0.18 170)" }} />
            <span className="text-sm font-semibold text-white">Feature Flag Documentation</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto" style={{ background: "oklch(0.16 0.025 260)", color: "oklch(0.55 0.02 240)", border: "1px solid oklch(0.22 0.02 260)" }}>
              live from company dataset
            </span>
          </div>
          {!featureDocs ? (
            <p className="text-xs" style={{ color: "oklch(0.5 0.03 240)" }}>Loading feature flag documentation...</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Total Flags", value: featureDocs.total, color: "oklch(0.7 0.18 170)" },
                  { label: "Documented", value: featureDocs.documented, color: "oklch(0.65 0.15 150)" },
                  { label: "Undocumented", value: featureDocs.missing, color: "oklch(0.65 0.25 25)" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl p-3" style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                    <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[10px]" style={{ color: "oklch(0.5 0.03 240)" }}>{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {featureDocs.items.filter((item) => item.status === "missing").slice(0, 9).map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-2 p-2.5 rounded-xl"
                    style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                    <span className="min-w-0 truncate font-mono text-[11px] text-white" title={item.name}>{item.name}</span>
                    <button onClick={() => { setFeatureDocs((prev) => prev && { ...prev, documented: prev.documented + 1, missing: prev.missing - 1, items: prev.items.filter((i) => i.name !== item.name) }); }}
                      className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1 transition-all duration-200"
                      style={{ background: "oklch(0.7 0.18 170 / 0.12)", border: "1px solid oklch(0.7 0.18 170 / 0.3)", color: "oklch(0.7 0.18 170)" }}>
                      <Zap className="w-3 h-3" /> Generate
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {(detailLoading || detail || detailError) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "oklch(0 0 0 / 0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => { setDetail(null); setDetailError(null); setDiff(null); }}>
          <div className="w-full max-w-4xl max-h-[88vh] overflow-y-auto rounded-2xl"
            style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}
            onClick={(e) => e.stopPropagation()}>
            {detailLoading && (
              <div className="flex items-center justify-center gap-2 p-10">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: accent }} />
                <span className="text-sm" style={{ color: "oklch(0.55 0.02 240)" }}>Loading document...</span>
              </div>
            )}
            {detailError && (
              <div className="p-8 text-center">
                <AlertCircle className="w-6 h-6 mx-auto mb-2" style={{ color: "oklch(0.65 0.25 25)" }} />
                <p className="text-sm font-medium text-white mb-4">{detailError}</p>
                <button onClick={() => setDetailError(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium"
                  style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)", color: "oklch(0.55 0.02 240)" }}>
                  Close
                </button>
              </div>
            )}
            {detail && (
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-semibold text-white">{detail.title}</h2>
                      <span className="text-[10px] px-2 py-0.5 rounded-full uppercase" style={{ background: statusConfig[detail.status].bg, color: statusConfig[detail.status].color }}>
                        {detail.status}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full uppercase" style={{ background: `${accent} / 0.12`, color: accent }}>
                        {kindLabel(detail.kind)}
                      </span>
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: "oklch(0.55 0.02 240)" }}>{detail.summary}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap text-[10px]" style={{ color: "oklch(0.4 0.02 240)" }}>
                      <span>v{detail.version} · {detail.versions} version(s)</span>
                      <span>Owner: {detail.owner}</span>
                      <span>Team: {detail.team || "—"}</span>
                      <span>Verified {new Date(detail.lastVerifiedAt).toLocaleString()}</span>
                      <span>Created {new Date(detail.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => regenerate(detail)} disabled={!!busyDoc}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5"
                      style={{ background: "oklch(0.7 0.18 170 / 0.12)", border: "1px solid oklch(0.7 0.18 170 / 0.3)", color: "oklch(0.7 0.18 170)" }}>
                      {busyDoc === detail.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} Regenerate
                    </button>
                    {versions.length > 1 && (
                      <button onClick={() => rollback(versions[1].version)} disabled={!!busyDoc}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5"
                        style={{ background: "oklch(0.75 0.18 60 / 0.12)", border: "1px solid oklch(0.75 0.18 60 / 0.3)", color: "oklch(0.8 0.16 60)" }}>
                        <ArrowLeft className="w-3 h-3" /> Rollback
                      </button>
                    )}
                    <button onClick={() => { setDetail(null); setDiff(null); }}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer"
                      style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)", color: "oklch(0.55 0.02 240)" }}>
                      Close
                    </button>
                  </div>
                </div>

                {/* Quality + related */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
                  <div className="rounded-2xl p-4 lg:col-span-2" style={{ background: "oklch(0.08 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                    <p className="text-xs font-semibold text-white mb-3">Quality Report · {detail.qualityReport.overall}/100</p>
                    <div className="space-y-2">
                      {detail.qualityReport.dimensions.map((dim) => (
                        <div key={dim.key} className="flex items-center gap-3">
                          <span className="w-36 text-[10px] capitalize shrink-0" style={{ color: "oklch(0.55 0.02 240)" }}>{dim.label}</span>
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 260)" }}>
                            <div className="h-full rounded-full" style={{ width: `${dim.score}%`, background: accent }} />
                          </div>
                          <span className="text-[10px] w-7 text-right" style={{ color: "oklch(0.65 0.02 240)" }}>{dim.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-2xl p-4" style={{ background: "oklch(0.08 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                      <p className="text-xs font-semibold text-white mb-2">Related Systems</p>
                      {detail.impactedSystems.length === 0 && <p className="text-[10px]" style={{ color: "oklch(0.5 0.03 240)" }}>None</p>}
                      <div className="flex flex-wrap gap-1.5">
                        {detail.impactedSystems.slice(0, 6).map((s) => (
                          <span key={s} className="px-2 py-0.5 rounded-lg text-[10px] font-mono" style={{ background: `${accent} / 0.1`, color: accent, border: `1px solid ${accent} / 0.25` }}>{s}</span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl p-4" style={{ background: "oklch(0.08 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                      <p className="text-xs font-semibold text-white mb-2">Related Decisions</p>
                      {detail.relatedDecisions.length === 0 && <p className="text-[10px]" style={{ color: "oklch(0.5 0.03 240)" }}>None</p>}
                      <ul className="space-y-1.5">
                        {detail.relatedDecisions.slice(0, 5).map((d) => (
                          <li key={d.id} className="flex items-center gap-1.5 text-[10px]" style={{ color: "oklch(0.6 0.02 240)" }}>
                            <Landmark className="w-3 h-3 shrink-0" style={{ color: accent }} />
                            <span className="truncate">{d.title}</span>
                            <span className="ml-auto shrink-0" style={{ color: "oklch(0.4 0.02 240)" }}>{d.role} · {d.status}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Version history + diff */}
                <div className="rounded-2xl p-4 mb-5" style={{ background: "oklch(0.08 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <GitCommitVertical className="w-4 h-4" style={{ color: accent }} />
                    <p className="text-xs font-semibold text-white">Version History</p>
                    {versions.length > 1 && (
                      <button onClick={() => showDiff(versions[1].version, versions[0].version)}
                        className="text-[10px] px-2 py-1 rounded-lg ml-auto"
                        style={{ background: diff ? `${accent} / 0.15` : "oklch(0.14 0.02 260)", border: `1px solid ${diff ? `${accent} / 0.4` : "oklch(0.22 0.02 260)"}`, color: diff ? accent : "oklch(0.55 0.02 240)" }}>
                        {diff ? "Hide diff" : "Show diff"}
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {versions.map((v) => (
                      <div key={v.id} className="rounded-xl p-3 min-w-[180px]" style={{ background: v.status === "current" ? `${accent} / 0.08` : "oklch(0.14 0.02 260)", border: `1px solid ${v.status === "current" ? `${accent} / 0.35` : "oklch(0.22 0.02 260)"}` }}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold" style={{ color: v.status === "current" ? accent : "oklch(0.7 0.02 240)" }}>v{v.version}</span>
                          <span className="text-[9px] uppercase" style={{ color: v.status === "current" ? accent : "oklch(0.5 0.03 240)" }}>{v.status}</span>
                        </div>
                        <p className="text-[10px] mt-1 line-clamp-2" style={{ color: "oklch(0.55 0.02 240)" }}>{v.change}</p>
                        <p className="text-[9px] mt-1" style={{ color: "oklch(0.4 0.02 240)" }}>{v.author} · {new Date(v.createdAt).toLocaleString()} · q{v.quality}</p>
                      </div>
                    ))}
                  </div>
                  {diff && (
                    <div className="mt-4 space-y-1.5">
                      <div className="flex gap-4 text-[10px]" style={{ color: "oklch(0.55 0.02 240)" }}>
                        <span style={{ color: "oklch(0.75 0.15 150)" }}>+{diff.added} added</span>
                        <span style={{ color: "oklch(0.75 0.2 25)" }}>-{diff.removed} removed</span>
                        <span style={{ color: "oklch(0.8 0.16 60)" }}>~{diff.changed} changed</span>
                        <span>v{diff.fromVersion} → v{diff.toVersion}</span>
                      </div>
                      {diff.sections.filter((s) => s.change !== "unchanged").map((s, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px]"
                          style={{ background: s.change === "added" ? "oklch(0.65 0.15 150 / 0.1)" : s.change === "removed" ? "oklch(0.65 0.25 25 / 0.1)" : "oklch(0.75 0.18 60 / 0.1)", color: s.change === "added" ? "oklch(0.75 0.15 150)" : s.change === "removed" ? "oklch(0.75 0.2 25)" : "oklch(0.8 0.16 60)" }}>
                          <span>{s.change === "added" ? "+" : s.change === "removed" ? "−" : "~"}</span>
                          <span className="font-medium">{s.heading}</span>
                          <span className="ml-auto text-[10px]" style={{ color: "oklch(0.5 0.03 240)" }}>{s.summary}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-3">
                  {detail.content.map((section, idx) => (
                    <SectionRenderer key={idx} section={section} accent={accent} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
