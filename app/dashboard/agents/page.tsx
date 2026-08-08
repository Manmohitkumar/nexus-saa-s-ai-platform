"use client";

import { DashboardTopbar } from "@/components/dashboard/topbar";
import { useEffect, useState } from "react";
import {
  Workflow, Search, Loader2, CheckCircle2, Clock, GitBranch, FileSearch,
  Boxes, GitFork, Sparkles, Terminal,
} from "lucide-react";
import { fetchAgents, runAllAgents, fetchAgentMemory, type AgentMemoryEntry } from "@/lib/phoenix/api";
import type { AgentDefinition, AgentRunReport, AgentRunResult } from "@/lib/phoenix/types";

const AGENT_META: Record<string, { icon: typeof Workflow; color: string }> = {
  a1: { icon: FileSearch, color: "oklch(0.7 0.18 170)" },
  a2: { icon: Boxes, color: "oklch(0.65 0.15 150)" },
  a3: { icon: Search, color: "oklch(0.7 0.15 200)" },
  a4: { icon: GitFork, color: "oklch(0.75 0.18 60)" },
  a5: { icon: Sparkles, color: "oklch(0.7 0.18 170)" },
};

const DEFAULT_QUERY = "Why did we migrate to PostgreSQL?";

export default function AgentsPage() {
  const [defs, setDefs] = useState<AgentDefinition[]>([]);
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<AgentRunReport | null>(null);
  const [liveResults, setLiveResults] = useState<Record<string, AgentRunResult | "running">>({});
  const [memory, setMemory] = useState<AgentMemoryEntry[]>([]);

  const loadMemory = () => {
    fetchAgentMemory()
      .then(setMemory)
      .catch((error) => console.error("Failed to load shared memory", error));
  };

  useEffect(() => {
    fetchAgents()
      .then(setDefs)
      .catch((error) => console.error("Failed to load agent definitions", error));
    loadMemory();
  }, []);

  const run = () => {
    const q = query.trim() || DEFAULT_QUERY;
    setRunning(true);
    setReport(null);
    setLiveResults({});
    defs.forEach((d) => setLiveResults((prev) => ({ ...prev, [d.id]: "running" })));

    runAllAgents(q)
      .then((res) => {
        setReport(res);
        const map: Record<string, AgentRunResult> = {};
        res.results.forEach((r) => { map[r.agentId] = r; });
        setLiveResults(map);
        loadMemory();
      })
      .catch((error) => console.error("Failed to run agents", error))
      .finally(() => setRunning(false));
  };

  useEffect(() => {
    if (defs.length > 0) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defs.length]);

  const doneCount = report ? report.results.length : 0;
  const totalMs = report ? report.totalDurationMs : 0;
  const avgConf = report
    ? Math.round(report.results.reduce((a, r) => a + r.confidence, 0) / (report.results.length || 1))
    : 0;

  return (
    <div style={{ background: "oklch(0.07 0.015 260)", minHeight: "100vh" }}>
      <DashboardTopbar title="Agent Control Plane" subtitle="Five specialized agents reason concurrently across your organization" />

      <div className="p-6 space-y-5">
        {/* Query input */}
        <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
          <p className="text-xs font-medium mb-2" style={{ color: "oklch(0.5 0.03 240)" }}>DISPATCH ALL AGENTS</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
              <Workflow className="w-4 h-4 shrink-0" style={{ color: "oklch(0.7 0.18 170)" }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && run()}
                placeholder='Dispatch all agents with a question...'
                className="flex-1 bg-transparent text-sm text-white outline-none"
                style={{ color: "oklch(0.9 0.01 240)" }}
              />
            </div>
            <button
              onClick={run}
              disabled={running}
              className="px-5 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
              style={{ background: "oklch(0.7 0.18 170)", color: "oklch(0.06 0.015 260)", boxShadow: "0 0 16px oklch(0.7 0.18 170 / 0.4)", opacity: running ? 0.6 : 1 }}>
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
              {running ? "Agents running..." : "Dispatch agents"}
            </button>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {["What caused the Q3 outage?", "Who owns the payments domain?", "How did we choose Kubernetes?", "How did we pick our payments provider?"].map((q) => (
              <button key={q} onClick={() => { setQuery(q); }}
                className="px-3 py-1.5 rounded-xl text-xs transition-colors"
                style={{ background: "oklch(0.16 0.025 260)", border: "1px solid oklch(0.25 0.02 260)", color: "oklch(0.6 0.02 240)" }}>
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Agents Dispatched", value: `${doneCount}/${defs.length || 5}`, icon: "🤖" },
            { label: "Run Duration", value: running ? "in progress" : `${(totalMs / 1000).toFixed(1)}s`, icon: "⏱️" },
            { label: "Avg Confidence", value: running ? "—" : `${avgConf}%`, icon: "🎯" },
            { label: "Topic", value: report ? report.topic : "—", icon: "🧭" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
              <p className="text-xl mb-1">{s.icon}</p>
              <p className="text-sm font-bold text-white truncate">{s.value}</p>
              <p className="text-[10px]" style={{ color: "oklch(0.5 0.03 240)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Shared memory */}
        {memory.length > 0 && (
          <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "oklch(0.7 0.18 170)" }} />
              <span className="text-xs font-semibold text-white">Shared Memory</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "oklch(0.7 0.18 170 / 0.15)", color: "oklch(0.7 0.18 170)" }}>
                {memory.length} entries · DB-backed
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {memory.slice(0, 6).map((m, i) => (
                <div key={`${m.key}-${m.agentId}`} className="rounded-xl p-3" style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.18 0.02 260)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "oklch(0.7 0.18 170)" }}>{m.role}</span>
                    <span className="text-[9px]" style={{ color: "oklch(0.4 0.02 240)" }}>
                      {new Date(m.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-white line-clamp-2">{m.content}</p>
                  <p className="text-[9px] mt-1 truncate font-mono" style={{ color: "oklch(0.45 0.02 240)" }}>{m.key.replace("query:", "")}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agent cards */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {defs.map((def, i) => {
            const meta = AGENT_META[def.id] ?? { icon: Workflow, color: "oklch(0.7 0.18 170)" };
            const AgentIcon = meta.icon;
            const live = liveResults[def.id];
            const result = live && live !== "running" ? live : null;
            const isRunning = live === "running";
            return (
              <div key={def.id} className="rounded-2xl p-5 transition-all duration-300"
                style={{
                  background: result ? "oklch(0.65 0.15 150 / 0.05)" : isRunning ? "oklch(0.7 0.18 170 / 0.06)" : "oklch(0.11 0.02 260)",
                  border: `1px solid ${result ? "oklch(0.65 0.15 150 / 0.3)" : isRunning ? "oklch(0.7 0.18 170 / 0.35)" : "oklch(0.22 0.02 260)"}`,
                }}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${meta.color} / 0.15`, border: `1px solid ${meta.color} / 0.3` }}>
                    <AgentIcon className="w-5 h-5" style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold w-5 h-5 rounded flex items-center justify-center" style={{ background: `${meta.color} / 0.2`, color: meta.color }}>{i + 1}</span>
                      <h3 className="text-sm font-semibold text-white">{def.name}</h3>
                      {isRunning && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{ background: "oklch(0.7 0.18 170 / 0.15)", color: "oklch(0.7 0.18 170)" }}>
                          <Loader2 className="w-3 h-3 animate-spin" /> Running
                        </span>
                      )}
                      {result && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{ background: "oklch(0.65 0.15 150 / 0.15)", color: "oklch(0.65 0.15 150)" }}>
                          <CheckCircle2 className="w-3 h-3" /> Done · {(result.durationMs / 1000).toFixed(2)}s
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: "oklch(0.45 0.02 240)" }}>{def.role} · {def.scope}</p>
                  </div>
                </div>

                <p className="text-xs leading-relaxed mb-3" style={{ color: "oklch(0.6 0.02 240)" }}>{def.capability}</p>

                {result ? (
                  <>
                    <div className="rounded-xl p-3 mb-2" style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.18 0.02 260)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-medium" style={{ color: "oklch(0.65 0.15 150)" }}>FINDING</span>
                        <span className="text-[10px] font-bold" style={{ color: "oklch(0.65 0.15 150)" }}>{result.confidence}% conf</span>
                      </div>
                      <p className="text-xs text-white">{result.finding}</p>
                    </div>
                    <ul className="space-y-1 mb-2">
                      {result.details.map((d, j) => (
                        <li key={j} className="flex items-start gap-2 text-[11px]" style={{ color: "oklch(0.55 0.02 240)" }}>
                          <GitBranch className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "oklch(0.4 0.02 240)" }} />
                          {d}
                        </li>
                      ))}
                    </ul>
                    <p className="text-[10px] flex flex-wrap gap-1">
                      {result.sources.map((s) => (
                        <span key={s} className="px-1.5 py-0.5 rounded font-mono" style={{ background: "oklch(0.16 0.025 260)", color: "oklch(0.5 0.03 240)", border: "1px solid oklch(0.22 0.02 260)" }}>{s}</span>
                      ))}
                    </p>
                  </>
                ) : (
                  <div className="rounded-xl p-3" style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.18 0.02 260)" }}>
                    {isRunning ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: meta.color, borderTopColor: "transparent" }} />
                          <p className="text-xs animate-pulse" style={{ color: meta.color }}>Agent dispatched — querying {def.scope}...</p>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 260)" }}>
                          <div className="h-full rounded-full animate-pulse" style={{ width: "60%", background: meta.color }} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs" style={{ color: "oklch(0.4 0.02 240)" }}>
                        <Clock className="w-3 h-3 inline mr-1" /> Idle — awaiting dispatch.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 mt-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: "oklch(0.4 0.02 240)" }}>Inputs</p>
                    <p className="text-[10px]" style={{ color: "oklch(0.55 0.02 240)" }}>{def.inputs.join(", ")}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: "oklch(0.4 0.02 240)" }}>Outputs</p>
                    <p className="text-[10px]" style={{ color: "oklch(0.55 0.02 240)" }}>{def.outputs.join(", ")}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
