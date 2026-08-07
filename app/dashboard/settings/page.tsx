"use client";

import { useState } from "react";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import {
    Bell,
    Check,
    Plug,
    ShieldCheck,
    SlidersHorizontal,
    Sparkles,
    Zap,
} from "lucide-react";

const preferenceCards = [
    {
        title: "Auto-documentation",
        description: "Let Phoenix draft ADRs, runbooks, and release notes from live signals.",
        icon: Sparkles,
        accent: "#2196F3",
    },
    {
        title: "Risk alerts",
        description: "Notify the exec team when documentation coverage or ownership drops.",
        icon: ShieldCheck,
        accent: "#D32F2F",
    },
    {
        title: "Live sync",
        description: "Keep dashboards connected to the latest org context in near real time.",
        icon: Zap,
        accent: "#0D47A1",
    },
];

const integrations = [
    { name: "Slack", status: "Connected", details: "Daily exec summaries", tone: "connected" },
    { name: "GitHub", status: "Connected", details: "PR and ADR sync", tone: "connected" },
    { name: "Notion", status: "Pending", details: "Knowledge base import", tone: "pending" },
];

export default function SettingsPage() {
    const [enabled, setEnabled] = useState(true);

    return (
        <div style={{ background: "#E3F2FD", minHeight: "100vh" }}>
            <DashboardTopbar title="Workspace Settings" subtitle="Tune the platform behavior and connected systems" />

            <div className="space-y-5 p-4 md:p-6 lg:p-8">
                <section
                    className="rounded-2xl p-6"
                    style={{
                        background: "linear-gradient(135deg, #FFFFFF 0%, #EAF3FB 100%)",
                        border: "1px solid #D6EAF8",
                        boxShadow: "0 10px 30px rgba(33,150,243,.12)",
                    }}
                >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "#0D47A1" }}>
                                Platform Controls
                            </p>
                            <h1 className="mt-2 text-2xl font-semibold text-[#211F20]">Configure your operating layer</h1>
                            <p className="mt-1 text-sm" style={{ color: "#5F6B7A" }}>
                                Toggle intelligence services, alerting rules, and shared integrations from one place.
                            </p>
                        </div>
                        <button
                            onClick={() => setEnabled((value) => !value)}
                            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
                            style={{
                                background: enabled ? "#2196F3" : "#EAF3FB",
                                color: enabled ? "#FFFFFF" : "#0D47A1",
                                border: "1px solid rgba(33,150,243,0.24)",
                            }}
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            {enabled ? "Active" : "Paused"}
                        </button>
                    </div>
                </section>

                <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-4">
                        {preferenceCards.map((item) => {
                            const Icon = item.icon;
                            return (
                                <article
                                    key={item.title}
                                    className="rounded-2xl p-5"
                                    style={{ background: "#FFFFFF", border: "1px solid #D6EAF8" }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${item.accent}14` }}>
                                            <Icon className="h-5 w-5" style={{ color: item.accent }} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <h2 className="text-sm font-semibold text-[#211F20]">{item.title}</h2>
                                                <span className="rounded-full px-2 py-1 text-[10px] font-semibold" style={{ background: `${item.accent}14`, color: item.accent }}>
                                                    Enabled
                                                </span>
                                            </div>
                                            <p className="mt-1 text-sm" style={{ color: "#5F6B7A" }}>{item.description}</p>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <div className="space-y-4">
                        <article className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "1px solid #D6EAF8" }}>
                            <div className="flex items-center gap-2">
                                <Plug className="h-4 w-4" style={{ color: "#2196F3" }} />
                                <h2 className="text-sm font-semibold text-[#211F20]">Connected integrations</h2>
                            </div>
                            <div className="mt-4 space-y-3">
                                {integrations.map((integration) => (
                                    <div key={integration.name} className="flex items-center justify-between rounded-xl border p-3" style={{ borderColor: "#EAF3FB" }}>
                                        <div>
                                            <p className="text-sm font-medium text-[#211F20]">{integration.name}</p>
                                            <p className="text-xs" style={{ color: "#5F6B7A" }}>{integration.details}</p>
                                        </div>
                                        <span
                                            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold"
                                            style={{
                                                background: integration.tone === "connected" ? "rgba(33,150,243,0.12)" : "rgba(249,168,37,0.14)",
                                                color: integration.tone === "connected" ? "#0D47A1" : "#A16207",
                                            }}
                                        >
                                            {integration.tone === "connected" ? <Check className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
                                            {integration.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </article>

                        <article className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "1px solid #D6EAF8" }}>
                            <p className="text-sm font-semibold text-[#211F20]">Operational summary</p>
                            <ul className="mt-3 space-y-2 text-sm" style={{ color: "#5F6B7A" }}>
                                <li>• 7 feature modules are active and available in the workspace.</li>
                                <li>• Documentation signals are refreshed every 15 minutes.</li>
                                <li>• Executive alerts are routed to the leadership channel.</li>
                            </ul>
                        </article>
                    </div>
                </section>
            </div>
        </div>
    );
}
