"use client";

import { DashboardTopbar } from "@/components/dashboard/topbar";
import { useEffect, useState } from "react";
import { AlertTriangle, TrendingDown, ShieldCheck, Loader2 } from "lucide-react";
import { fetchExitSimulationProfiles, fetchExitSimulationScenario, fetchExitSimulationRecommendations } from "@/lib/phoenix/api";
import type { ExitSimulationProfile, ExitSimulationScenario, ExitSimulationRecommendation } from "@/lib/phoenix/types";

export default function ExitSimPage() {
  const [profiles, setProfiles] = useState<ExitSimulationProfile[]>([]);
  const [selected, setSelected] = useState<ExitSimulationProfile | null>(null);
  const [simRunning, setSimRunning] = useState(false);
  const [simDone, setSimDone] = useState(true);
  const [scenario, setScenario] = useState<ExitSimulationScenario | null>(null);
  const [recommendations, setRecommendations] = useState<ExitSimulationRecommendation[]>([]);

  useEffect(() => {
    fetchExitSimulationProfiles()
      .then((profiles) => {
        setProfiles(profiles);
        setSelected(profiles[0] ?? null);
      })
      .catch((error) => console.error("Failed to load exit simulation profiles", error));
  }, []);

  if (profiles.length === 0 || !selected) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.07 0.015 260)" }}>
        <div className="rounded-2xl p-6 bg-white shadow-lg">Loading exit simulation profiles...</div>
      </div>
    );
  }

  const activeProfile = selected;

  const runSim = () => {
    setSimRunning(true);
    setSimDone(false);
    setScenario(null);
    setRecommendations([]);
    Promise.all([fetchExitSimulationScenario(), fetchExitSimulationRecommendations()])
      .then(([sc, recs]) => {
        setScenario(sc);
        setRecommendations(recs);
      })
      .catch((error) => console.error("Failed to run exit simulation", error))
      .finally(() => {
        setSimRunning(false);
        setSimDone(true);
      });
  };

  const riskColor = (r: number) =>
    r >= 85 ? "oklch(0.65 0.25 25)" : r >= 70 ? "oklch(0.7 0.2 40)" : r >= 50 ? "oklch(0.75 0.18 60)" : "oklch(0.65 0.15 150)";

  return (
    <div style={{ background: "oklch(0.07 0.015 260)", minHeight: "100vh" }}>
      <DashboardTopbar title="Employee Exit Simulation" subtitle="Predict organizational knowledge loss before it happens" />

      <div className="p-6 space-y-5">
        {/* Employee selector */}
        <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
          <p className="text-xs font-medium mb-3" style={{ color: "oklch(0.5 0.03 240)" }}>SELECT EMPLOYEE TO SIMULATE EXIT</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {profiles.map((profile) => (
              <button key={profile.id} onClick={() => setSelected(profile)}
                className="p-4 rounded-xl text-left transition-all duration-200"
                style={{
                  background: activeProfile.id === profile.id ? "oklch(0.7 0.18 170 / 0.12)" : "oklch(0.09 0.018 260)",
                  border: `1px solid ${activeProfile.id === profile.id ? "oklch(0.7 0.18 170 / 0.4)" : "oklch(0.18 0.02 260)"}`,
                }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold mb-2"
                  style={{ background: `${riskColor(profile.risk)} / 0.2`, color: riskColor(profile.risk) }}>
                  {profile.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                </div>
                <p className="text-xs font-semibold text-white truncate">{profile.name}</p>
                <p className="text-[10px] mt-0.5 truncate" style={{ color: "oklch(0.5 0.03 240)" }}>{profile.role}</p>
                <div className="flex items-center gap-1 mt-2">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 260)" }}>
                    <div className="h-full rounded-full" style={{ width: `${profile.risk}%`, background: riskColor(profile.risk) }} />
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: riskColor(profile.risk) }}>{profile.risk}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Simulation results */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main risk display */}
          <div className="rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden"
            style={{ background: "oklch(0.11 0.02 260)", border: `2px solid ${riskColor(selected.risk)} / 0.4` }}>
            <div className="absolute inset-0 opacity-10"
              style={{ background: `radial-gradient(circle at 50% 50%, ${riskColor(activeProfile.risk)}, transparent 70%)` }} />
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold mb-4 relative z-10"
              style={{ background: `${riskColor(activeProfile.risk)} / 0.2`, border: `1px solid ${riskColor(activeProfile.risk)} / 0.4`, color: riskColor(activeProfile.risk) }}>
              {activeProfile.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
            </div>
            <h3 className="text-lg font-bold text-white relative z-10">{activeProfile.name}</h3>
            <p className="text-xs mb-4 relative z-10" style={{ color: "oklch(0.5 0.03 240)" }}>{activeProfile.role}</p>
            <div className="text-center relative z-10">
              <p className="text-5xl font-bold" style={{ color: riskColor(activeProfile.risk) }}>{activeProfile.risk}%</p>
              <p className="text-xs mt-1" style={{ color: "oklch(0.5 0.03 240)" }}>Knowledge Risk Score</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 w-full relative z-10">
              <div className="rounded-xl p-3 text-center" style={{ background: "oklch(0.09 0.018 260)" }}>
                <p className="text-lg font-bold text-white">{activeProfile.systems.length}</p>
                <p className="text-[10px]" style={{ color: "oklch(0.5 0.03 240)" }}>Critical Systems</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: "oklch(0.09 0.018 260)" }}>
                <p className="text-sm font-bold text-white">{activeProfile.onboarding}</p>
                <p className="text-[10px]" style={{ color: "oklch(0.5 0.03 240)" }}>To Replace</p>
              </div>
            </div>
            <button onClick={runSim}
              className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-all relative z-10 flex items-center justify-center gap-2"
              style={{
                background: "oklch(0.7 0.18 170)",
                color: "oklch(0.06 0.015 260)",
                boxShadow: "0 0 16px oklch(0.7 0.18 170 / 0.3)",
              }}>
              {simRunning ? "Running simulation..." : "▶ Run Exit Simulation"}
            </button>
          </div>

          {/* Impact details */}
          <div className="space-y-4">
            <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
              <p className="text-xs font-medium mb-3" style={{ color: "oklch(0.5 0.03 240)" }}>CRITICAL SYSTEMS OWNED</p>
              <div className="space-y-2">
                {activeProfile.systems.map((s) => (
                  <div key={s} className="flex items-center gap-2 p-2.5 rounded-xl"
                    style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.18 0.02 260)" }}>
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: "oklch(0.7 0.2 40)" }} />
                    <span className="text-xs text-white font-mono">{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
              <p className="text-xs font-medium mb-3" style={{ color: "oklch(0.5 0.03 240)" }}>BUSINESS IMPACT</p>
              <div className="space-y-2">
                {[
                  { label: "Team Velocity", impact: "-45%", icon: TrendingDown },
                  { label: "Onboarding Cost", impact: "+$24K", icon: TrendingDown },
                  { label: "Risk to Deadline", impact: "High", icon: AlertTriangle },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2"
                    style={{ borderBottom: "1px solid oklch(0.18 0.02 260)" }}>
                    <span className="text-xs" style={{ color: "oklch(0.6 0.02 240)" }}>{item.label}</span>
                    <span className="text-xs font-bold" style={{ color: "oklch(0.7 0.2 40)" }}>{item.impact}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mitigation */}
          <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <p className="text-sm font-semibold text-white mb-4">AI Mitigation Plan</p>
            <div className="space-y-2.5">
              {activeProfile.mitigation.map((m, i) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.18 0.02 260)" }}>
                  <div className="flex items-start gap-2">
                    <span className="text-base shrink-0">{m.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white">{m.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            background: m.priority === "Critical" ? "oklch(0.65 0.25 25 / 0.15)" : m.priority === "High" ? "oklch(0.7 0.2 40 / 0.15)" : "oklch(0.65 0.15 150 / 0.15)",
                            color: m.priority === "Critical" ? "oklch(0.65 0.25 25)" : m.priority === "High" ? "oklch(0.7 0.2 40)" : "oklch(0.65 0.15 150)",
                          }}>
                          {m.priority}
                        </span>
                        <span className="text-[10px]" style={{ color: "oklch(0.4 0.02 240)" }}>{m.est}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Simulation results */}
        {(simRunning || scenario) && (
          <div className="rounded-2xl p-6" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.7 0.18 170 / 0.3)" }}>
            <div className="flex items-center gap-2 mb-5">
              {simRunning ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "oklch(0.7 0.18 170)" }} /> : <ShieldCheck className="w-4 h-4" style={{ color: "oklch(0.7 0.18 170)" }} />}
              <h3 className="text-sm font-semibold text-white">{simRunning ? "Simulating exit..." : "Simulation Results"}</h3>
            </div>
            {scenario && !simRunning && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
                  <div className="rounded-xl p-4 text-center" style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.18 0.02 260)" }}>
                    <p className="text-3xl font-bold" style={{ color: "oklch(0.65 0.25 25)" }}>{scenario.projectedKnowledgeLoss}%</p>
                    <p className="text-[10px] mt-1" style={{ color: "oklch(0.5 0.03 240)" }}>Projected Knowledge Loss</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.18 0.02 260)" }}>
                    <p className="text-[10px] font-medium mb-2" style={{ color: "oklch(0.5 0.03 240)" }}>CRITICAL SYSTEMS AT RISK</p>
                    <div className="space-y-1.5">
                      {scenario.criticalSystems.map((s) => (
                        <div key={s} className="flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3 shrink-0" style={{ color: "oklch(0.7 0.2 40)" }} />
                          <span className="text-xs text-white font-mono">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.18 0.02 260)" }}>
                    <p className="text-[10px] font-medium mb-2" style={{ color: "oklch(0.5 0.03 240)" }}>PRIMARY RISK OWNERS</p>
                    <div className="space-y-1.5">
                      {scenario.primaryRiskOwners.map((o) => (
                        <div key={o} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "oklch(0.7 0.18 170)" }} />
                          <span className="text-xs text-white">{o}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-xs mb-5 leading-relaxed" style={{ color: "oklch(0.6 0.02 240)" }}>{scenario.summary}</p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: "oklch(0.5 0.03 240)" }}>Action Plan</p>
                    <div className="space-y-2">
                      {scenario.actionPlan.map((a, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.18 0.02 260)" }}>
                          <span className="text-xs text-white">{a.title}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ background: a.impact === "critical" ? "oklch(0.65 0.25 25 / 0.15)" : "oklch(0.7 0.2 40 / 0.15)", color: a.impact === "critical" ? "oklch(0.65 0.25 25)" : "oklch(0.7 0.2 40)" }}>{a.impact}</span>
                            <span className="text-[10px]" style={{ color: "oklch(0.4 0.02 240)" }}>{a.eta}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: "oklch(0.5 0.03 240)" }}>Recommended Actions</p>
                    <div className="space-y-2">
                      {recommendations.map((r) => (
                        <div key={r.id} className="p-3 rounded-xl" style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.18 0.02 260)" }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-white">{r.title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ background: "oklch(0.7 0.18 170 / 0.15)", color: "oklch(0.7 0.18 170)" }}>{r.priority}</span>
                          </div>
                          <p className="text-[11px]" style={{ color: "oklch(0.55 0.02 240)" }}>{r.detail}</p>
                          <p className="text-[10px] mt-1" style={{ color: "oklch(0.4 0.02 240)" }}>Due: {r.due}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
