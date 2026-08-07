"use client";

import { DashboardTopbar } from "@/components/dashboard/topbar";
import { useEffect, useState } from "react";
import { AlertTriangle, Flag, Shield } from "lucide-react";
import { fetchFeatureRisk, fetchRiskHeatmap } from "@/lib/phoenix/api";
import type { FeatureRiskItem, HeatmapCell } from "@/lib/phoenix/types";

type RiskLevel = "critical" | "high" | "medium" | "low" | "safe";

interface HeatCell {
  name: string;
  risk: RiskLevel;
  coverage: number;
  owner: string | null;
}

export default function RiskPage() {
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[][]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<HeatCell | null>(null);
  const [featureRisk, setFeatureRisk] = useState<FeatureRiskItem[]>([]);

  useEffect(() => {
    fetchRiskHeatmap()
      .then(setHeatmapData)
      .catch((error) => console.error("Failed to load risk heatmap", error))
      .finally(() => setLoading(false));
    fetchFeatureRisk()
      .then(setFeatureRisk)
      .catch((error) => console.error("Failed to load feature risk", error));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.07 0.015 260)" }}>
        <div className="rounded-2xl p-6 bg-white shadow-lg">Loading risk heatmap...</div>
      </div>
    );
  }

  const allCells = heatmapData.flat();
  const criticalCount = allCells.filter((c) => c.risk === "critical").length;
  const noOwner = allCells.filter((c) => !c.owner).length;
  const avgCoverage = Math.round(allCells.reduce((a, c) => a + c.coverage, 0) / (allCells.length || 1));

  const riskStyles: Record<RiskLevel, { bg: string; text: string; border: string }> = {
    critical: { bg: "oklch(0.65 0.25 25 / 0.35)", text: "oklch(0.8 0.2 25)", border: "oklch(0.65 0.25 25 / 0.5)" },
    high: { bg: "oklch(0.7 0.2 40 / 0.3)", text: "oklch(0.8 0.18 40)", border: "oklch(0.7 0.2 40 / 0.5)" },
    medium: { bg: "oklch(0.75 0.18 60 / 0.25)", text: "oklch(0.82 0.16 60)", border: "oklch(0.75 0.18 60 / 0.4)" },
    low: { bg: "oklch(0.65 0.15 150 / 0.2)", text: "oklch(0.75 0.15 150)", border: "oklch(0.65 0.15 150 / 0.35)" },
    safe: { bg: "oklch(0.7 0.18 170 / 0.2)", text: "oklch(0.75 0.18 170)", border: "oklch(0.7 0.18 170 / 0.35)" },
  };

  return (
      <div style={{ background: "oklch(0.07 0.015 260)", minHeight: "100vh" }}>
        <DashboardTopbar title="Knowledge Risk Heatmap" subtitle="Where your organizational knowledge is at risk" />

        <div className="p-6 space-y-5">
          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Critical Gaps", value: criticalCount, color: "oklch(0.65 0.25 25)", icon: "🔴" },
              { label: "No Owner", value: noOwner, color: "oklch(0.7 0.2 40)", icon: "⚠️" },
              { label: "Avg Coverage", value: `${avgCoverage}%`, color: "oklch(0.7 0.18 170)", icon: "📊" },
              { label: "SPOFs Detected", value: 3, color: "oklch(0.65 0.25 25)", icon: "🎯" },
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Risk Heatmap</h3>
                <div className="flex items-center gap-2">
                  {(["critical", "high", "medium", "low", "safe"] as RiskLevel[]).map((r) => (
                    <div key={r} className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: riskStyles[r].bg, border: `1px solid ${riskStyles[r].border}` }} />
                      <span className="text-[9px] capitalize" style={{ color: "oklch(0.45 0.02 240)" }}>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {heatmapData.flat().map((cell, i) => {
                  const style = riskStyles[cell.risk];
                  return (
                    <div key={i}
                      className="relative rounded-xl p-3 cursor-pointer transition-all duration-200"
                      style={{
                        background: style.bg,
                        border: `1px solid ${style.border}`,
                        transform: hovered?.name === cell.name ? "scale(1.05)" : "scale(1)",
                        boxShadow: hovered?.name === cell.name ? `0 0 16px ${style.border}` : "none",
                      }}
                      onMouseEnter={() => setHovered(cell)}
                      onMouseLeave={() => setHovered(null)}>
                      {!cell.owner && (
                        <div className="absolute top-1.5 right-1.5">
                          <AlertTriangle className="w-2.5 h-2.5" style={{ color: style.text }} />
                        </div>
                      )}
                      <p className="text-[10px] font-semibold leading-tight" style={{ color: style.text }}>{cell.name}</p>
                      <p className="text-xs font-bold mt-1 text-white">{cell.coverage}%</p>
                      <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: "oklch(0 0 0 / 0.3)" }}>
                        <div className="h-full rounded-full" style={{ width: `${cell.coverage}%`, background: style.text }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Details panel */}
            <div className="space-y-4">
              {/* Hovered cell detail */}
              {hovered ? (
                <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: `1px solid ${riskStyles[hovered.risk].border}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: riskStyles[hovered.risk].text }} />
                    <span className="text-xs font-semibold capitalize" style={{ color: riskStyles[hovered.risk].text }}>{hovered.risk} Risk</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-4">{hovered.name}</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs" style={{ color: "oklch(0.5 0.03 240)" }}>Doc Coverage</span>
                        <span className="text-xs font-bold text-white">{hovered.coverage}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 260)" }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${hovered.coverage}%`, background: riskStyles[hovered.risk].text }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2" style={{ borderTop: "1px solid oklch(0.18 0.02 260)" }}>
                      <span className="text-xs" style={{ color: "oklch(0.5 0.03 240)" }}>Owner</span>
                      {hovered.owner ? (
                        <span className="text-xs font-medium text-white">{hovered.owner}</span>
                      ) : (
                        <span className="text-xs font-medium" style={{ color: "oklch(0.65 0.25 25)" }}>⚠ No owner</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl p-5 text-center" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                  <span className="text-3xl">🔥</span>
                  <p className="text-sm text-white mt-2">Hover a cell</p>
                  <p className="text-xs mt-1" style={{ color: "oklch(0.5 0.03 240)" }}>See detailed risk info</p>
                </div>
              )}

              {/* SPOF alerts */}
              <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4" style={{ color: "oklch(0.65 0.25 25)" }} />
                  <span className="text-sm font-semibold text-white">Single Points of Failure</span>
                </div>
                {allCells.filter((c) => c.risk === "critical" && !c.owner).map((c, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl mb-2"
                    style={{ background: "oklch(0.65 0.25 25 / 0.08)", border: "1px solid oklch(0.65 0.25 25 / 0.2)" }}>
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: "oklch(0.65 0.25 25)" }} />
                    <span className="text-xs text-white">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature flag risk */}
          <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Flag className="w-4 h-4" style={{ color: "oklch(0.8 0.2 40)" }} />
              <span className="text-sm font-semibold text-white">Feature Flag Risk</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto" style={{ background: "oklch(0.16 0.025 260)", color: "oklch(0.55 0.02 240)", border: "1px solid oklch(0.22 0.02 260)" }}>
                live from company dataset
              </span>
            </div>

            {featureRisk.length === 0 ? (
              <p className="text-xs" style={{ color: "oklch(0.5 0.03 240)" }}>Loading feature flag risk...</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {(["critical", "high", "medium"] as const).map((level) => {
                    const count = featureRisk.filter((f) => f.risk === level).length;
                    const color = level === "critical" ? "oklch(0.65 0.25 25)" : level === "high" ? "oklch(0.7 0.2 40)" : "oklch(0.75 0.18 60)";
                    return (
                      <div key={level} className="rounded-xl p-3" style={{ background: `${color} / 0.08`, border: `1px solid ${color} / 0.25` }}>
                        <p className="text-lg font-bold capitalize" style={{ color }}>{count}</p>
                        <p className="text-[10px]" style={{ color: "oklch(0.5 0.03 240)" }}>{level} flags</p>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {featureRisk.filter((f) => f.risk === "critical" || f.risk === "high").slice(0, 12).map((f) => (
                    <div key={f.name} className="flex items-center justify-between gap-2 p-2.5 rounded-xl"
                      style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                      <span className="min-w-0 truncate font-mono text-[11px] text-white" title={f.name}>{f.name}</span>
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize"
                        style={{
                          background: f.risk === "critical" ? "oklch(0.65 0.25 25 / 0.15)" : "oklch(0.7 0.2 40 / 0.15)",
                          color: f.risk === "critical" ? "oklch(0.8 0.2 25)" : "oklch(0.8 0.18 40)",
                        }}>
                        {f.risk}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
