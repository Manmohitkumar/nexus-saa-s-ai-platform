"use client";

import { DashboardTopbar } from "@/components/dashboard/topbar";
import { useEffect, useState, type ComponentType } from "react";
import { Play, Pause, SkipBack, SkipForward, GitCommit, MessageSquare, FileText, Cpu } from "lucide-react";
import { fetchDecisionTimeline } from "@/lib/phoenix/api";
import type { DecisionTimelineEvent } from "@/lib/phoenix/types";

export default function DecisionsPage() {
  const [timeline, setTimeline] = useState<DecisionTimelineEvent[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    fetchDecisionTimeline()
      .then(setTimeline)
      .catch((error) => console.error("Failed to load decision timeline", error));
  }, []);

  useEffect(() => {
    if (!playing) return;
    if (activeStep >= timeline.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setActiveStep((s) => Math.min(s + 1, timeline.length - 1)), 1500);
    return () => clearTimeout(timer);
  }, [playing, activeStep, timeline.length]);

  if (timeline.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.07 0.015 260)" }}>
        <div className="rounded-2xl p-6 bg-white shadow-lg">Loading decision timeline...</div>
      </div>
    );
  }

  const step = timeline[activeStep];
  const typeColors: Record<string, string> = {
    meeting: "oklch(0.7 0.18 170)",
    commit: "oklch(0.65 0.15 150)",
    adr: "oklch(0.7 0.15 200)",
    doc: "oklch(0.75 0.18 60)",
  };

  const typeIcons: Record<string, ComponentType<{ className?: string }>> = {
    meeting: MessageSquare,
    commit: GitCommit,
    adr: FileText,
    doc: FileText,
  };
  const Icon = typeIcons[step.type];

  return (
      <div style={{ background: "oklch(0.07 0.015 260)", minHeight: "100vh" }}>
        <DashboardTopbar title="Decision Time Machine" subtitle="Replay the complete history of any technical decision" />

        <div className="p-6 space-y-5">
          {/* Decision query */}
          <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <p className="text-xs font-medium mb-2" style={{ color: "oklch(0.5 0.03 240)" }}>REPLAYING DECISION</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "oklch(0.7 0.18 170 / 0.15)", border: "1px solid oklch(0.7 0.18 170 / 0.3)" }}>
                <Cpu className="w-4 h-4" style={{ color: "oklch(0.7 0.18 170)" }} />
              </div>
              <p className="text-lg font-semibold text-white">&quot;Why did we migrate to PostgreSQL?&quot;</p>
            </div>
          </div>

          {/* Timeline player */}
          <div className="rounded-2xl p-6" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <h3 className="text-sm font-semibold text-white mb-5">Decision Timeline</h3>

            {/* Timeline track */}
            <div className="relative">
              <div className="absolute top-4 left-0 right-0 h-0.5" style={{ background: "oklch(0.22 0.02 260)" }} />
              <div className="absolute top-4 left-0 h-0.5 transition-all duration-500"
                style={{ width: `${(activeStep / (timeline.length - 1)) * 100}%`, background: "oklch(0.7 0.18 170)", boxShadow: "0 0 8px oklch(0.7 0.18 170 / 0.5)" }} />
              <div className="flex justify-between relative">
                {timeline.map((t, i) => {
                  const past = i <= activeStep;
                  const TIcon = typeIcons[t.type];
                  return (
                    <button key={i} onClick={() => setActiveStep(i)} className="flex flex-col items-center gap-2 group">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 z-10"
                        style={{
                          background: past ? typeColors[t.type] : "oklch(0.18 0.02 260)",
                          border: `2px solid ${i === activeStep ? "oklch(0.7 0.18 170)" : past ? typeColors[t.type] : "oklch(0.28 0.025 260)"}`,
                          boxShadow: i === activeStep ? "0 0 16px oklch(0.7 0.18 170 / 0.5)" : "none",
                          transform: i === activeStep ? "scale(1.2)" : "scale(1)",
                        }}>
                        <div style={{ color: past ? "oklch(0.06 0.015 260)" : "oklch(0.4 0.02 240)" }}>
                          <TIcon className="w-3 h-3" />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-medium" style={{ color: i === activeStep ? "oklch(0.7 0.18 170)" : "oklch(0.5 0.03 240)" }}>{t.date}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Player controls */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <button onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                className="p-2 rounded-xl transition-colors"
                style={{ background: "oklch(0.16 0.025 260)", color: "oklch(0.65 0.02 240)" }}>
                <SkipBack className="w-4 h-4" />
              </button>
              <button onClick={() => setPlaying(!playing)}
                className="p-3 rounded-xl transition-all"
                style={{ background: "oklch(0.7 0.18 170)", color: "oklch(0.06 0.015 260)", boxShadow: "0 0 16px oklch(0.7 0.18 170 / 0.4)" }}>
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button onClick={() => setActiveStep(Math.min(timeline.length - 1, activeStep + 1))}
                className="p-2 rounded-xl transition-colors"
                style={{ background: "oklch(0.16 0.025 260)", color: "oklch(0.65 0.02 240)" }}>
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Current event */}
            <div className="rounded-2xl p-6" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.7 0.18 170 / 0.25)" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "oklch(0.7 0.18 170)" }} />
                <span className="text-xs font-medium" style={{ color: "oklch(0.7 0.18 170)" }}>Current Event · {step.date}</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${typeColors[step.type]} / 0.15`, border: `1px solid ${typeColors[step.type]} / 0.3` }}>
                  <div style={{ color: typeColors[step.type] }}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{step.label}</p>
                  <p className="text-xs mt-1 capitalize" style={{ color: "oklch(0.5 0.03 240)" }}>Type: {step.type}</p>
                </div>
              </div>

              {/* Confidence meter */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: "oklch(0.5 0.03 240)" }}>Decision Confidence</span>
                  <span className="text-sm font-bold text-white">{step.confidence}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 260)" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${step.confidence}%`, background: "linear-gradient(90deg, oklch(0.7 0.18 170), oklch(0.65 0.15 150))", boxShadow: "0 0 8px oklch(0.7 0.18 170 / 0.4)" }} />
                </div>
              </div>
            </div>

            {/* AI Reconstruction */}
            <div className="rounded-2xl p-6" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-4 h-4" style={{ color: "oklch(0.7 0.18 170)" }} />
                <span className="text-sm font-semibold text-white">AI Reasoning</span>
              </div>
              <div className="space-y-3 text-xs leading-relaxed" style={{ color: "oklch(0.6 0.02 240)" }}>
                <p>Phoenix AI has reconstructed this decision from <strong className="text-white">47 data sources</strong> including meeting transcripts, Git commits, Jira tickets, and architectural decision records.</p>
                <p><strong className="text-white">Key drivers identified:</strong> MySQL's lack of JSONB support was a critical blocker (mentioned in 8 meetings). PostgreSQL outperformed MySQL by 3.2× in read benchmarks on the team's specific workload.</p>
                <p><strong className="text-white">Participants:</strong> Sarah Chen (Architect), Mike Ross (Backend Lead), 5 other engineers.</p>
              </div>
            </div>
          </div>

          {/* Decision history list */}
          <div className="rounded-2xl p-6" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <h3 className="text-sm font-semibold text-white mb-4">All Decision Events</h3>
            <div className="space-y-2">
              {timeline.map((t, i) => {
                const TIcon = typeIcons[t.type];
                const isActive = i === activeStep;
                return (
                  <button key={i} onClick={() => setActiveStep(i)}
                    className="w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 text-left"
                    style={{
                      background: isActive ? "oklch(0.7 0.18 170 / 0.1)" : "oklch(0.09 0.018 260)",
                      border: `1px solid ${isActive ? "oklch(0.7 0.18 170 / 0.3)" : "oklch(0.18 0.02 260)"}`,
                    }}>
                    <span className="text-xs w-20 shrink-0" style={{ color: "oklch(0.5 0.03 240)" }}>{t.date}</span>
                    <div className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                      style={{ background: `${typeColors[t.type]}20` }}>
                      <div style={{ color: typeColors[t.type] }}>
                        <TIcon className="w-3 h-3" />
                      </div>
                    </div>
                    <span className="text-sm flex-1" style={{ color: isActive ? "oklch(0.9 0.01 240)" : "oklch(0.65 0.02 240)" }}>{t.label}</span>
                    <span className="text-xs" style={{ color: isActive ? "oklch(0.7 0.18 170)" : "oklch(0.4 0.02 240)" }}>{t.confidence}%</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }
