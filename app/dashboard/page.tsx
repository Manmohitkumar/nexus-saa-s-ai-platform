"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { fetchExecutiveBrief, fetchFeatureRisk, fetchFeatureSummary } from "@/lib/phoenix/api";
import type { ExecutiveBrief, FeatureFlagSummary, FeatureRiskItem } from "@/lib/phoenix/types";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Brain,
  CalendarClock,
  Flag,
  Network,
  ShieldAlert,
  Users,
} from "lucide-react";

const initialBrief: ExecutiveBrief = {
  generatedAt: "",
  orgHealth: 0,
  decisionEffectiveness: 0,
  workforceResilience: 0,
  documentationHealth: 0,
  riskExposure: 0,
  findings: [],
  actions: [],
};

export default function DashboardHome() {
  const [brief, setBrief] = useState<ExecutiveBrief | null>(null);
  const [featureSummary, setFeatureSummary] = useState<FeatureFlagSummary | null>(null);
  const [featureRisk, setFeatureRisk] = useState<FeatureRiskItem[]>([]);

  useEffect(() => {
    fetchExecutiveBrief()
      .then(setBrief)
      .catch((error) => console.error("Failed to load executive brief", error));
    fetchFeatureSummary()
      .then(setFeatureSummary)
      .catch((error) => console.error("Failed to load feature summary", error));
    fetchFeatureRisk()
      .then(setFeatureRisk)
      .catch((error) => console.error("Failed to load feature risk", error));
  }, []);

  const riskyFlags = featureRisk
    .filter((item) => item.risk === "critical" || item.risk === "high")
    .slice(0, 6);

  const currentBrief = brief ?? initialBrief;
  const loading = brief === null;

  const metricCards = [
    {
      title: "Organization Health",
      value: `${currentBrief.orgHealth}%`,
      subtitle: "Feature 1 + 7 synthesis",
      icon: Activity,
    },
    {
      title: "Decision Effectiveness",
      value: `${currentBrief.decisionEffectiveness}%`,
      subtitle: "Feature 2 output",
      icon: Brain,
    },
    {
      title: "Workforce Resilience",
      value: `${currentBrief.workforceResilience}%`,
      subtitle: "Feature 3 output",
      icon: Users,
    },
    {
      title: "Documentation Health",
      value: `${currentBrief.documentationHealth}%`,
      subtitle: "Feature 6 output",
      icon: BookOpen,
    },
    {
      title: "Risk Exposure",
      value: `${currentBrief.riskExposure}`,
      subtitle: "Feature 4 output",
      icon: ShieldAlert,
    },
  ];

  const featureRoutes = [
    { feature: "Feature 1", label: "Organizational Digital Brain", href: "/dashboard/brain" },
    { feature: "Feature 2", label: "Decision Time Machine", href: "/dashboard/decisions" },
    { feature: "Feature 3", label: "Employee Exit Simulation", href: "/dashboard/exit-sim" },
    { feature: "Feature 4", label: "Knowledge Risk Heatmap", href: "/dashboard/risk" },
    { feature: "Feature 5", label: "AI Mentor", href: "/dashboard/mentor" },
    { feature: "Feature 6", label: "Autonomous Documentation Engine", href: "/dashboard/docs" },
    { feature: "Feature 7", label: "Organizational Intelligence Engine", href: "/dashboard/intelligence" },
    { feature: "Feature 8", label: "Executive Command Center", href: "/dashboard" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#E3F2FD" }}>
      <DashboardTopbar
        title="Executive Command Center"
        subtitle="Strategic intelligence view consuming Features 1 through 7"
      />

      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        <section
          className="rounded-2xl p-6"
          style={{
            background: "linear-gradient(135deg, #E3F2FD 0%, #90CAF9 45%, #2196F3 100%)",
            border: "1px solid #D6EAF8",
            boxShadow: "0 10px 30px rgba(33,150,243,.12)",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "#0D47A1" }}>
            Strategic Situation Room
          </p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold" style={{ color: "#211F20" }}>
                Project Phoenix Executive Intelligence
              </h1>
              <p className="mt-1 text-sm" style={{ color: "#1E3A5F" }}>
                This layer creates zero new intelligence. It aggregates, prioritizes, and explains outputs from the full platform stack.
              </p>
            </div>
            <div
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(13,71,161,0.18)" }}
            >
              <CalendarClock className="h-4 w-4" style={{ color: "#0D47A1" }} />
              <span className="text-sm font-medium" style={{ color: "#0D47A1" }}>
                Refreshed from orchestration bus
              </span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {metricCards.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl p-5"
              style={{
                background: "#FFFFFF",
                border: "1px solid #D6EAF8",
                boxShadow: "0 10px 30px rgba(33,150,243,.12)",
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium" style={{ color: "#5F6B7A" }}>{item.title}</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#EAF3FB" }}>
                  <item.icon className="h-4 w-4" style={{ color: "#2196F3" }} />
                </div>
              </div>
              <p className="mt-3 text-3xl font-semibold" style={{ color: "#211F20" }}>{item.value}</p>
              <p className="mt-1 text-xs" style={{ color: "#0D47A1" }}>{item.subtitle}</p>
            </article>
          ))}
          {loading && (
            <div className="col-span-full rounded-2xl p-5 text-center text-sm" style={{ background: "#FFFFFF", border: "1px solid #D6EAF8" }}>
              Loading executive brief...
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <article
            className="xl:col-span-2 rounded-2xl p-6"
            style={{ background: "#FFFFFF", border: "1px solid #D6EAF8", boxShadow: "0 10px 30px rgba(33,150,243,.12)" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: "#211F20" }}>Cross-Domain Findings</h2>
              <span className="rounded-full px-2 py-1 text-xs" style={{ background: "#EAF3FB", color: "#0D47A1" }}>
                from Features 2-7
              </span>
            </div>

            <div className="space-y-3">
              {currentBrief.findings.map((finding) => (
                <div key={finding.id} className="rounded-xl border p-4" style={{ borderColor: "#EAF3FB" }}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold" style={{ color: "#211F20" }}>{finding.title}</p>
                    <span
                      className="rounded-full px-2 py-1 text-[11px] font-medium"
                      style={{
                        background:
                          finding.priority === "critical"
                            ? "rgba(211, 47, 47, 0.12)"
                            : finding.priority === "warning"
                              ? "rgba(249, 168, 37, 0.16)"
                              : "rgba(33, 150, 243, 0.12)",
                        color:
                          finding.priority === "critical"
                            ? "#D32F2F"
                            : finding.priority === "warning"
                              ? "#F9A825"
                              : "#0D47A1",
                      }}
                    >
                      {finding.priority}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "#5F6B7A" }}>{finding.summary}</p>
                </div>
              ))}
            </div>
          </article>

          <article
            className="rounded-2xl p-6"
            style={{ background: "#FFFFFF", border: "1px solid #D6EAF8", boxShadow: "0 10px 30px rgba(33,150,243,.12)" }}
          >
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" style={{ color: "#0D47A1" }} />
              <h2 className="text-lg font-semibold" style={{ color: "#211F20" }}>Priority Actions</h2>
            </div>
            <div className="space-y-3">
              {currentBrief.actions.map((action) => (
                <div key={action.id} className="rounded-xl border p-3" style={{ borderColor: "#EAF3FB" }}>
                  <p className="text-sm font-medium" style={{ color: "#211F20" }}>{action.action}</p>
                  <p className="mt-1 text-xs" style={{ color: "#5F6B7A" }}>
                    Owner: {action.owner} • ETA: {action.eta}
                  </p>
                  <Link href={action.linkedRoute} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "#2196F3" }}>
                    Open linked workspace
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section
          className="rounded-2xl p-6"
          style={{ background: "#FFFFFF", border: "1px solid #D6EAF8", boxShadow: "0 10px 30px rgba(33,150,243,.12)" }}
        >
          <div className="mb-4 flex items-center gap-2">
            <Network className="h-4 w-4" style={{ color: "#0D47A1" }} />
            <h2 className="text-lg font-semibold" style={{ color: "#211F20" }}>Feature Execution Chain</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {featureRoutes.map((route) => (
              <Link
                key={route.feature}
                href={route.href}
                className="rounded-xl border p-3 transition-colors"
                style={{ borderColor: "#EAF3FB", color: "#211F20", background: "#FFFFFF" }}
              >
                <p className="text-xs font-semibold" style={{ color: "#0D47A1" }}>{route.feature}</p>
                <p className="mt-1 text-sm font-medium">{route.label}</p>
              </Link>
            ))}
          </div>
        </section>

        <section
          className="rounded-2xl p-6"
          style={{ background: "#FFFFFF", border: "1px solid #D6EAF8", boxShadow: "0 10px 30px rgba(33,150,243,.12)" }}
        >
          <div className="mb-4 flex items-center gap-2">
            <Flag className="h-4 w-4" style={{ color: "#0D47A1" }} />
            <h2 className="text-lg font-semibold" style={{ color: "#211F20" }}>Feature Flag Platform</h2>
            <span className="rounded-full px-2 py-1 text-xs" style={{ background: "#EAF3FB", color: "#0D47A1" }}>
              live from company dataset
            </span>
          </div>

          {!featureSummary ? (
            <p className="text-sm" style={{ color: "#5F6B7A" }}>Loading feature flags...</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:col-span-2">
                {[
                  { label: "Total Flags", value: featureSummary.total },
                  { label: "Enabled", value: `${featureSummary.enabledPct}%` },
                  { label: "Releases", value: featureSummary.releases },
                  { label: "Experiments", value: featureSummary.experiments },
                  { label: "Kill Switches", value: featureSummary.killSwitches },
                  { label: "Undocumented", value: featureSummary.undocumented },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border p-4" style={{ borderColor: "#EAF3FB", background: "#F8FBFF" }}>
                    <p className="text-2xl font-semibold" style={{ color: "#0D47A1" }}>{stat.value}</p>
                    <p className="mt-1 text-xs" style={{ color: "#5F6B7A" }}>{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border p-4" style={{ borderColor: "#F5E1E1", background: "#FFF9F9" }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#D32F2F" }}>
                  Highest Risk Flags
                </p>
                <div className="mt-3 space-y-2">
                  {riskyFlags.length === 0 && (
                    <p className="text-xs" style={{ color: "#5F6B7A" }}>No high-risk flags.</p>
                  )}
                  {riskyFlags.map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-mono text-xs" style={{ color: "#211F20" }}>{item.name}</span>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize"
                        style={{
                          background: item.risk === "critical" ? "rgba(211, 47, 47, 0.12)" : "rgba(249, 168, 37, 0.16)",
                          color: item.risk === "critical" ? "#D32F2F" : "#B26A00",
                        }}
                      >
                        {item.risk}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
