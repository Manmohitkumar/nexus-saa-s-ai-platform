"use client";

import { DashboardTopbar } from "@/components/dashboard/topbar";
import { useEffect, useState } from "react";
import { Cpu, Network, Brain, Sparkles } from "lucide-react";
import { fetchReasoningSnapshot } from "@/lib/phoenix/api";
import type { IntelligenceReasoningSnapshot } from "@/lib/phoenix/types";

interface Agent {
  id: string;
  name: string;
  role: string;
  status: "reasoning" | "idle" | "done";
  confidence: number;
  finding: string;
}

const typeColors: Record<string, string> = {
  meeting: "oklch(0.7 0.18 170)",
  adr: "oklch(0.65 0.15 150)",
  commit: "oklch(0.7 0.15 200)",
  message: "oklch(0.75 0.18 60)",
};

const initialReasoning: IntelligenceReasoningSnapshot = {
  query: "",
  summary: "Loading reasoning snapshot...",
  confidence: 0,
  evidenceChain: [],
  agents: [],
};

export default function IntelligencePage() {
  const [activeQuery, setActiveQuery] = useState("Why did we migrate to PostgreSQL?");
  const [inputVal, setInputVal] = useState("");
  const [reasoning, setReasoning] = useState<IntelligenceReasoningSnapshot>(initialReasoning);

  useEffect(() => {
    fetchReasoningSnapshot(activeQuery)
      .then(setReasoning)
      .catch((error) => console.error("Failed to load reasoning snapshot", error));
  }, [activeQuery]);

  return (
    <div style={{ background: "oklch(0.07 0.015 260)", minHeight: "100vh" }}>
      <DashboardTopbar title="Organizational Intelligence Engine" subtitle="Multi-agent AI reasoning across your entire organization" />

      <div className="p-6 space-y-5">
        {/* Query input */}
        <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
          <p className="text-xs font-medium mb-2" style={{ color: "oklch(0.5 0.03 240)" }}>ASK THE INTELLIGENCE ENGINE</p>
          <div className="flex gap-3">
            <input value={inputVal} onChange={e => setInputVal(e.target.value)}
              placeholder="Ask anything about your organization..."
              className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ background: "oklch(0.14 0.025 260)", border: "1px solid oklch(0.25 0.02 260)", color: "oklch(0.8 0.01 240)" }}
              onFocus={e => { e.target.style.borderColor = "oklch(0.7 0.18 170 / 0.5)"; }}
              onBlur={e => { e.target.style.borderColor = "oklch(0.25 0.02 260)"; }} />
            <button
              onClick={() => { if (inputVal.trim()) setActiveQuery(inputVal.trim()); }}
              className="px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"
              style={{ background: "oklch(0.7 0.18 170)", color: "oklch(0.06 0.015 260)", boxShadow: "0 0 16px oklch(0.7 0.18 170 / 0.35)" }}>
              <Brain className="w-4 h-4" /> Reason
            </button>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {["Why did we choose Kubernetes?", "What caused the Q3 outage?", "Who owns the payments domain?"].map((q) => (
              <button key={q} onClick={() => setActiveQuery(q)}
                className="px-3 py-1.5 rounded-xl text-xs transition-colors"
                style={{ background: "oklch(0.16 0.025 260)", border: "1px solid oklch(0.25 0.02 260)", color: "oklch(0.6 0.02 240)" }}
                onMouseEnter={e => { (e.currentTarget).style.borderColor = "oklch(0.7 0.18 170 / 0.4)"; }}
                onMouseLeave={e => { (e.currentTarget).style.borderColor = "oklch(0.25 0.02 260)"; }}>
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Active query banner */}
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl"
          style={{ background: "oklch(0.7 0.18 170 / 0.08)", border: "1px solid oklch(0.7 0.18 170 / 0.2)" }}>
          <Sparkles className="w-4 h-4 shrink-0" style={{ color: "oklch(0.7 0.18 170)" }} />
          <p className="text-sm text-white">Reasoning: <span style={{ color: "oklch(0.7 0.18 170)" }}>&ldquo;{activeQuery}&rdquo;</span></p>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "oklch(0.65 0.15 150)" }} />
            <span className="text-xs" style={{ color: "oklch(0.65 0.15 150)" }}>Processing</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Multi-agent panel */}
          <div className="rounded-2xl p-6" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <div className="flex items-center gap-2 mb-5">
              <Network className="w-4 h-4" style={{ color: "oklch(0.7 0.18 170)" }} />
              <h3 className="text-sm font-semibold text-white">Multi-Agent Reasoning</h3>
            </div>
            <div className="space-y-3">
              {reasoning.agents.map((agent, i) => (
                <div key={agent.id} className="rounded-xl p-4 transition-all duration-200"
                  style={{
                    background: agent.status === "reasoning" ? "oklch(0.7 0.18 170 / 0.06)" : "oklch(0.09 0.018 260)",
                    border: `1px solid ${agent.status === "reasoning" ? "oklch(0.7 0.18 170 / 0.3)" : "oklch(0.18 0.02 260)"}`,
                  }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                        style={{ background: "oklch(0.7 0.18 170 / 0.15)", color: "oklch(0.7 0.18 170)" }}>
                        {i + 1}
                      </div>
                      <span className="text-xs font-semibold text-white">{agent.name}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                      style={{
                        background: agent.status === "done" ? "oklch(0.65 0.15 150 / 0.15)" : agent.status === "reasoning" ? "oklch(0.7 0.18 170 / 0.15)" : "oklch(0.18 0.02 260)",
                        color: agent.status === "done" ? "oklch(0.65 0.15 150)" : agent.status === "reasoning" ? "oklch(0.7 0.18 170)" : "oklch(0.4 0.02 240)",
                      }}>
                      {agent.status === "reasoning" ? "⚡ Reasoning..." : agent.status === "done" ? "✓ Done" : "⏸ Waiting"}
                    </span>
                  </div>
                  <p className="text-[10px] mb-2" style={{ color: "oklch(0.45 0.02 240)" }}>{agent.role}</p>
                  <p className="text-xs" style={{ color: agent.status === "idle" ? "oklch(0.35 0.02 240)" : "oklch(0.65 0.02 240)" }}>
                    {agent.finding}
                  </p>
                  {agent.confidence > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 260)" }}>
                        <div className="h-full rounded-full"
                          style={{ width: `${agent.confidence}%`, background: agent.status === "reasoning" ? "oklch(0.7 0.18 170)" : "oklch(0.65 0.15 150)" }} />
                      </div>
                      <span className="text-[10px]" style={{ color: "oklch(0.45 0.02 240)" }}>{agent.confidence}% conf.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Evidence chain + answer */}
          <div className="space-y-4">
            {/* Evidence Chain */}
            <div className="rounded-2xl p-6" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-4 h-4" style={{ color: "oklch(0.7 0.18 170)" }} />
                <h3 className="text-sm font-semibold text-white">Evidence Chain</h3>
              </div>
              <div className="space-y-3">
                {reasoning.evidenceChain.map((e, i) => (
                  <div key={i} className="relative pl-5">
                    {i < reasoning.evidenceChain.length - 1 && (
                      <div className="absolute left-1.5 top-5 bottom-0 w-0.5" style={{ background: "oklch(0.22 0.02 260)" }} />
                    )}
                    <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full border-2"
                      style={{ background: "oklch(0.09 0.018 260)", borderColor: typeColors[e.type] }} />
                    <div className="rounded-xl p-3" style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.18 0.02 260)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-medium" style={{ color: typeColors[e.type] }}>{e.source}</p>
                        <span className="text-[10px] font-bold" style={{ color: "oklch(0.65 0.15 150)" }}>{e.confidence}%</span>
                      </div>
                      <p className="text-[11px]" style={{ color: "oklch(0.6 0.02 240)" }}>&ldquo;{e.excerpt}&rdquo;</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Final Answer */}
            <div className="rounded-2xl p-6" style={{ background: "oklch(0.7 0.18 170 / 0.08)", border: "1px solid oklch(0.7 0.18 170 / 0.25)" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-lg flex items-center justify-center"
                  style={{ background: "oklch(0.7 0.18 170 / 0.2)" }}>
                  <Brain className="w-3 h-3" style={{ color: "oklch(0.7 0.18 170)" }} />
                </div>
                <span className="text-sm font-semibold text-white">Synthesized Answer</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto"
                  style={{ background: "oklch(0.65 0.15 150 / 0.15)", color: "oklch(0.65 0.15 150)" }}>
                  {reasoning.confidence}% confidence
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "oklch(0.72 0.01 240)" }}>
                {reasoning.summary}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
