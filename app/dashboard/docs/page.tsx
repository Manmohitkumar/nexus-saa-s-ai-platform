"use client";

import { DashboardTopbar } from "@/components/dashboard/topbar";
import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle, Clock, AlertCircle, Zap, FileText, BookOpen, GitPullRequest, Mic, Layers, Code2, Database, Cpu, ShieldCheck, GitBranch, ExternalLink, Flag } from "lucide-react";
import { fetchArchitectureWorkflows, fetchDocumentationState, fetchFeatureDocs } from "@/lib/phoenix/api";
import type { ArchitectureWorkflow, DocumentationItem, FeatureDocsState } from "@/lib/phoenix/types";

type DocStatus = "generated" | "generating" | "stale" | "missing";

interface DocItem {
  name: string;
  type: string;
  status: DocStatus;
  lastGen: string;
  coverage: number;
  icon: string;
}

export default function DocsPage() {
  const [docs, setDocs] = useState<DocumentationItem[]>([]);
  const [architectureWorkflows, setArchitectureWorkflows] = useState<ArchitectureWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [filter, setFilter] = useState<DocStatus | "all">("all");
  const [archFilter, setArchFilter] = useState<string | null>(null);
  const [featureDocs, setFeatureDocs] = useState<FeatureDocsState | null>(null);
  const [featureGenerating, setFeatureGenerating] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchDocumentationState(), fetchArchitectureWorkflows()])
      .then(([docState, workflows]) => {
        setDocs(docState);
        setArchitectureWorkflows(workflows);
      })
      .catch((error) => console.error("Failed to load documentation data", error))
      .finally(() => setIsLoading(false));
    fetchFeatureDocs()
      .then(setFeatureDocs)
      .catch((error) => console.error("Failed to load feature docs", error));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.07 0.015 260)" }}>
        <div className="rounded-2xl p-6 bg-white shadow-lg">Loading documentation engine...</div>
      </div>
    );
  }

  const filtered = filter === "all" ? docs : docs.filter((d) => d.status === filter);
  const healthScore = Math.round((docs.filter((d) => d.status === "generated").length / docs.length) * 100);
  const genTypes = [
    { icon: FileText, label: "API Docs", count: 12 },
    { icon: BookOpen, label: "ADRs", count: 34 },
    { icon: GitPullRequest, label: "PR Summaries", count: 482 },
    { icon: Mic, label: "Meeting Summaries", count: 28 },
  ];
  const statusConfig: Record<DocStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
    generated: { label: "Generated", color: "oklch(0.65 0.15 150)", icon: CheckCircle },
    generating: { label: "Generating...", color: "oklch(0.7 0.18 170)", icon: RefreshCw },
    stale: { label: "Stale", color: "oklch(0.75 0.18 60)", icon: Clock },
    missing: { label: "Missing", color: "oklch(0.65 0.25 25)", icon: AlertCircle },
  };

  const triggerGen = async (name: string) => {
    setGenerating(name);
    setDocs((prev) =>
      prev.map((d) => (d.name === name ? { ...d, status: "generating", lastGen: "Live" } : d)),
    );
    await new Promise((r) => setTimeout(r, 2500));
    setDocs((prev) =>
      prev.map((d) => (d.name === name ? { ...d, status: "generated", coverage: 100, lastGen: "just now" } : d)),
    );
    setGenerating(null);
  };

  return (
    <div style={{ background: "oklch(0.07 0.015 260)", minHeight: "100vh" }}>
      <DashboardTopbar title="Autonomous Documentation Engine" subtitle="Documentation that writes and updates itself" />

      <div className="p-6 space-y-5">
        {/* Doc Health + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Health score */}
          <div className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <div className="relative w-14 h-14 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="oklch(0.18 0.02 260)" strokeWidth="5" />
                <circle cx="28" cy="28" r="22" fill="none" stroke="oklch(0.7 0.18 170)" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - healthScore / 100)}`}
                  style={{ filter: "drop-shadow(0 0 4px oklch(0.7 0.18 170 / 0.5))" }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-white">{healthScore}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs" style={{ color: "oklch(0.5 0.03 240)" }}>Doc Health</p>
              <p className="text-sm font-semibold text-white">Moderate</p>
              <p className="text-[10px] mt-0.5" style={{ color: "oklch(0.7 0.18 170)" }}>+12% this week</p>
            </div>
          </div>

          {/* Gen type stats */}
          {genTypes.map((g) => (
            <div key={g.label} className="rounded-2xl p-5 flex items-center gap-3"
              style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "oklch(0.7 0.18 170 / 0.12)", border: "1px solid oklch(0.7 0.18 170 / 0.25)" }}>
                <g.icon className="w-4 h-4" style={{ color: "oklch(0.7 0.18 170)" }} />
              </div>
              <div>
                <p className="text-xl font-bold text-white">{g.count}</p>
                <p className="text-xs" style={{ color: "oklch(0.5 0.03 240)" }}>{g.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Live generation animation */}
        <div className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: "oklch(0.7 0.18 170 / 0.07)", border: "1px solid oklch(0.7 0.18 170 / 0.2)" }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "oklch(0.7 0.18 170 / 0.15)" }}>
            <Zap className="w-4 h-4" style={{ color: "oklch(0.7 0.18 170)" }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">AI is auto-generating: <span style={{ color: "oklch(0.7 0.18 170)" }}>Payments Architecture ADR</span></p>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 260)" }}>
                <div className="h-full rounded-full animate-pulse" style={{ width: "45%", background: "oklch(0.7 0.18 170)" }} />
              </div>
              <span className="text-xs" style={{ color: "oklch(0.5 0.03 240)" }}>45%</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "oklch(0.65 0.15 150)" }} />
            <span className="text-xs" style={{ color: "oklch(0.65 0.15 150)" }}>Live</span>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "generated", "generating", "stale", "missing"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all duration-200"
              style={{
                background: filter === f ? "oklch(0.7 0.18 170 / 0.15)" : "oklch(0.14 0.02 260)",
                border: `1px solid ${filter === f ? "oklch(0.7 0.18 170 / 0.4)" : "oklch(0.22 0.02 260)"}`,
                color: filter === f ? "oklch(0.7 0.18 170)" : "oklch(0.55 0.02 240)",
              }}>
              {f} {f !== "all" && `(${docs.filter((d) => d.status === f).length})`}
            </button>
          ))}
        </div>

        {/* Architecture workflows */}
        <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "oklch(0.55 0.02 240)" }}>Platform Intelligence</p>
              <h2 className="text-lg font-semibold text-white">Architecture & Workflow</h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {["platform-architecture", "knowledge-building", "ai-reasoning"].map((id) => {
                const active = archFilter === id || (archFilter === null && id === "platform-architecture");
                return (
                  <button key={id} onClick={() => setArchFilter(active ? null : id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200"
                    style={{
                      background: active ? "oklch(0.7 0.18 170 / 0.15)" : "oklch(0.14 0.02 260)",
                      border: `1px solid ${active ? "oklch(0.7 0.18 170 / 0.4)" : "oklch(0.22 0.02 260)"}`,
                      color: active ? "oklch(0.7 0.18 170)" : "oklch(0.55 0.02 240)",
                    }}>
                    {id.replace(/-/g, " ")}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-5">
            {(archFilter ? architectureWorkflows.filter((item) => item.id === archFilter) : architectureWorkflows).map((item) => (
              <div key={item.id} className="rounded-2xl p-5" style={{ background: "oklch(0.08 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                <div className="flex items-start gap-3">
                  <span className="w-11 h-11 rounded-2xl grid place-items-center text-xl" style={{ background: "oklch(0.7 0.18 170 / 0.12)", color: "oklch(0.7 0.18 170)" }}>
                    {item.id === "platform-architecture" ? <Layers className="w-5 h-5" /> : item.id === "knowledge-building" ? <Database className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}
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

        {/* Docs list */}
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((doc, i) => {
            const cfg = statusConfig[doc.status];
            const StatusIcon = cfg.icon;
            const isGenerating = generating === doc.name || doc.status === "generating";
            return (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-200"
                style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                <span className="text-2xl shrink-0">{doc.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-white">{doc.name}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: "oklch(0.16 0.025 260)", color: "oklch(0.55 0.02 240)", border: "1px solid oklch(0.22 0.02 260)" }}>
                      {doc.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1">
                      <StatusIcon className={`w-3 h-3 ${isGenerating ? "animate-spin" : ""}`} style={{ color: cfg.color }} />
                      <span className="text-[10px]" style={{ color: cfg.color }}>{isGenerating && doc.status !== "generating" ? "Generating..." : cfg.label}</span>
                    </div>
                    <span className="text-[10px]" style={{ color: "oklch(0.4 0.02 240)" }}>Last: {doc.lastGen}</span>
                    {doc.coverage > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 260)" }}>
                          <div className="h-full rounded-full" style={{ width: `${doc.coverage}%`, background: cfg.color }} />
                        </div>
                        <span className="text-[10px]" style={{ color: "oklch(0.4 0.02 240)" }}>{doc.coverage}%</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(doc.status === "stale" || doc.status === "missing") && (
                    <button onClick={() => triggerGen(doc.name)}
                      disabled={!!generating}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-1.5"
                      style={{
                        background: "oklch(0.7 0.18 170 / 0.12)",
                        border: "1px solid oklch(0.7 0.18 170 / 0.3)",
                        color: "oklch(0.7 0.18 170)",
                      }}>
                      <Zap className="w-3 h-3" /> Generate
                    </button>
                  )}
                  {doc.status === "generated" && (
                    <button className="px-3 py-1.5 rounded-xl text-xs font-medium"
                      style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)", color: "oklch(0.55 0.02 240)" }}>
                      View
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature flag documentation */}
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
                {featureDocs.items.filter((item) => item.status === "missing").slice(0, 9).map((item) => {
                  const isGenerating = featureGenerating === item.name;
                  return (
                    <div key={item.name} className="flex items-center justify-between gap-2 p-2.5 rounded-xl"
                      style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                      <span className="min-w-0 truncate font-mono text-[11px] text-white" title={item.name}>{item.name}</span>
                      <button
                        onClick={() => {
                          setFeatureGenerating(item.name);
                          setTimeout(() => {
                            setFeatureDocs((prev) => prev && {
                              ...prev,
                              documented: prev.documented + 1,
                              missing: prev.missing - 1,
                              items: prev.items.filter((i) => i.name !== item.name),
                            });
                            setFeatureGenerating(null);
                          }, 2500);
                        }}
                        disabled={!!featureGenerating}
                        className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1 transition-all duration-200"
                        style={{
                          background: "oklch(0.7 0.18 170 / 0.12)",
                          border: "1px solid oklch(0.7 0.18 170 / 0.3)",
                          color: "oklch(0.7 0.18 170)",
                        }}>
                        {isGenerating ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Zap className="w-3 h-3" />
                        )}
                        {isGenerating ? "Generating..." : "Generate"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
