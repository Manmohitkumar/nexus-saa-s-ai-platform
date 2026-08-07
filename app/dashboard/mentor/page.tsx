"use client";

import { DashboardTopbar } from "@/components/dashboard/topbar";
import { useEffect, useRef, useState } from "react";
import { Send, Bot, User, Cpu, Code, BookOpen, Layers } from "lucide-react";
import { fetchMentorLearningPaths, fetchMentorPrompts } from "@/lib/phoenix/api";
import type { LearningPath, MentorPrompt } from "@/lib/phoenix/types";

interface Message {
  role: "user" | "ai";
  content: string;
  type?: "text" | "code" | "architecture";
}

const initialMessages: Message[] = [
  {
    role: "ai",
    content: "👋 I'm Phoenix AI Mentor — your company's senior AI engineer. Ask me anything about your architecture, APIs, codebase, or best practices. I have full context of your organization.",
  },
];

const defaultResponse: Message = {
  role: "ai",
  content: "Based on your organization's codebase and documentation, here's what I found:\n\nYour **auth-service** uses JWT tokens with a 24-hour expiry, backed by Redis for session invalidation. The OAuth 2.0 flow connects through the API Gateway before hitting the auth service.\n\n**Key files:**\n- `auth-service/src/jwt/validator.ts` — Token validation logic\n- `auth-service/src/oauth/google.ts` — Google OAuth handler\n- `api-gateway/middleware/auth.ts` — Auth middleware\n\n**⚠️ Knowledge gap detected:** The session invalidation logic has no documentation. Sarah Chen is the sole owner.",
  type: "architecture",
};

const buildAIResponse = (query: string): Message => {
  const q = query.toLowerCase();
  if (q.includes("postgres") || q.includes("sql") || q.includes("database") || q.includes("migrat")) {
    return {
      role: "ai",
      content: "The decision to migrate to **PostgreSQL** was made in Q2 2022 and is fully reconstructed in the Decision Time Machine.\n\n**Key drivers:**\n- MySQL lacked first-class JSONB support — blocking the new events schema\n- PostgreSQL delivered a **3.2× advantage** on the team's read benchmark\n- 8 meetings referenced MySQL's JSONB gap as a critical blocker\n\n**Timeline:** Initial evaluation (Jan 2022) → ADR-014 (May 2022) → team vote 7-2 (Jun 2022) → migration completed (Oct 2022).\n\n**Open the Decision Time Machine** (`/dashboard/decisions`) to replay the full evidence chain.",
      type: "architecture",
    };
  }
  if (q.includes("auth") || q.includes("oauth") || q.includes("jwt") || q.includes("session") || q.includes("login")) {
    return {
      role: "ai",
      content: "Here's how authentication flows through your organization:\n\n1. Client request hits the **API Gateway** → `api-gateway/middleware/auth.ts`\n2. JWT is validated with a 24-hour expiry by `auth-service/src/jwt/validator.ts`\n3. Session invalidation is backed by **Redis**\n4. Google OAuth 2.0 is handled by `auth-service/src/oauth/google.ts`\n\n**⚠️ Risk:** The exit simulation rates auth ownership as a **94% risk** — Sarah Chen is the sole owner of the critical auth pathways. Assign a co-owner and document the flows.",
      type: "architecture",
    };
  }
  if (q.includes("payment") || q.includes("stripe") || q.includes("checkout") || q.includes("billing")) {
    return {
      role: "ai",
      content: "The **payments domain** is owned by Mike Ross and is flagged as **critical risk** on the heatmap (12% doc coverage).\n\n**Critical systems:** payments core, api-gateway routing, monitoring.\n\n**Top concern:** the Stripe webhook has **no owner** and 29% documentation coverage — missing error handling is one of the team's recurring mistakes.\n\n**Recommended:** run a knowledge-transfer deep dive and add backup engineers (see exit simulation action plan).",
      type: "architecture",
    };
  }
  if (q.includes("rate limit") || q.includes("scal") || q.includes("performance") || q.includes("load")) {
    return {
      role: "ai",
      content: "**Scaling & rate limiting guidance:**\n\n- The gateway enforces rate limits per client, but the rate limiter module has only 34% documentation coverage\n- Analytics queries were historically N+1 heavy — a known team-wide mistake\n- PostgreSQL outperforms the legacy stack on the read-heavy workload (3.2×)\n\n**Recommended actions:**\n1. Document the rate limiter rules and thresholds (Sarah owns this)\n2. Add an index review for the analytics module\n3. Refresh runbooks linked to the load balancer (38% coverage, no owner)",
      type: "architecture",
    };
  }
  if (q.includes("doc") || q.includes("runbook") || q.includes("onboard") || q.includes("knowledge")) {
    return {
      role: "ai",
      content: "**Documentation health summary:**\n\n- Overall coverage: **61%** (7 of 8 tracked docs stale or missing coverage)\n- `Data Pipeline Runbook` and `Onboarding Guide` are **stale**\n- `Stripe Webhook` and `K8s Infrastructure Overview` are **missing** entirely\n\nUse the **Autonomous Documentation Engine** (`/dashboard/docs`) to regenerate any stale or missing doc — generation is triggered with one click.",
      type: "architecture",
    };
  }
  if (q.includes("k8s") || q.includes("kubernetes") || q.includes("infra") || q.includes("cloud") || q.includes("deploy")) {
    return {
      role: "ai",
      content: "**Infrastructure & deployment:**\n\n- Stack: Docker, GitHub Actions, Vercel, Railway/Render, NGINX, Cloudflare\n- K8s config coverage sits at **58%** — the `K8s Infrastructure Overview` doc is missing\n- CI/CD pipeline is owned by Alice Park at 61% coverage\n- Monitoring: Sentry, OpenTelemetry, Prometheus, Grafana\n\n**⚠️ Alert:** `Load Balancer` (38% coverage) and `Security Certs` (5% coverage) have **no owner** — these are SPOF candidates on the risk heatmap.",
      type: "architecture",
    };
  }
  if (q.includes("outage") || q.includes("incident") || q.includes("q3") || q.includes("downtime")) {
    return {
      role: "ai",
      content: "The Q3 outage traces back to the **API Gateway** and **payments orchestration** — both flagged as critical knowledge domains in the exit simulation.\n\n**Root causes identified:**\n- Rate limiter config gaps (34% coverage, unowned edge cases)\n- Stripe webhook error handling missing\n- Recovery runbooks were stale\n\n**Prevention plan:** formalize incident runbooks, add shadow on-call rotations, and document the gateway auth path within 5 business days.",
      type: "architecture",
    };
  }
  return defaultResponse;
};

export default function MentorPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [promptTemplates, setPromptTemplates] = useState<MentorPrompt[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMentorPrompts()
      .then(setPromptTemplates)
      .catch((error) => console.error("Failed to load mentor prompts", error));
    fetchMentorLearningPaths()
      .then(setLearningPaths)
      .catch((error) => console.error("Failed to load mentor learning paths", error));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setTyping(true);
    await new Promise((r) => setTimeout(r, 1200));
    setTyping(false);
    setMessages((m) => [...m, buildAIResponse(msg)]);
  };

  const quickPrompts = promptTemplates.length >= 4 ? [
    { icon: Layers, text: promptTemplates[0].title },
    { icon: Code, text: promptTemplates[1].title },
    { icon: BookOpen, text: promptTemplates[2].title },
    { icon: Cpu, text: promptTemplates[3].title },
  ] : [
    { icon: Layers, text: "Architecture guidance" },
    { icon: Code, text: "Code quality review" },
    { icon: BookOpen, text: "Documentation health" },
    { icon: Cpu, text: "System performance" },
  ];

  return (
    <div style={{ background: "oklch(0.07 0.015 260)", minHeight: "100vh" }}>
      <DashboardTopbar title="AI Mentor" subtitle="Your organization's AI Senior Engineer" />

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-[calc(100vh-140px)]">
          {/* Chat */}
          <div className="lg:col-span-2 rounded-2xl flex flex-col overflow-hidden"
            style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            {/* Chat header */}
            <div className="flex items-center gap-3 p-4" style={{ borderBottom: "1px solid oklch(0.18 0.02 260)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "oklch(0.7 0.18 170 / 0.15)", border: "1px solid oklch(0.7 0.18 170 / 0.3)" }}>
                <Bot className="w-5 h-5" style={{ color: "oklch(0.7 0.18 170)" }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Phoenix AI Mentor</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "oklch(0.65 0.15 150)" }} />
                  <p className="text-[10px]" style={{ color: "oklch(0.65 0.15 150)" }}>Online · Full org context loaded</p>
                </div>
              </div>
            </div>

            {/* Quick prompts */}
            <div className="flex gap-2 p-3 flex-wrap" style={{ borderBottom: "1px solid oklch(0.18 0.02 260)" }}>
              {quickPrompts.map((q) => (
                <button key={q.text} onClick={() => sendMessage(q.text)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all duration-200"
                  style={{ background: "oklch(0.16 0.025 260)", border: "1px solid oklch(0.25 0.02 260)", color: "oklch(0.65 0.02 240)" }}
                  onMouseEnter={e => { (e.currentTarget).style.borderColor = "oklch(0.7 0.18 170 / 0.4)"; (e.currentTarget).style.color = "oklch(0.7 0.18 170)"; }}
                  onMouseLeave={e => { (e.currentTarget).style.borderColor = "oklch(0.25 0.02 260)"; (e.currentTarget).style.color = "oklch(0.65 0.02 240)"; }}>
                  <q.icon className="w-3 h-3" />
                  {q.text}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: msg.role === "ai" ? "oklch(0.7 0.18 170 / 0.15)" : "oklch(0.18 0.025 260)",
                      border: `1px solid ${msg.role === "ai" ? "oklch(0.7 0.18 170 / 0.3)" : "oklch(0.28 0.025 260)"}`,
                    }}>
                    {msg.role === "ai" ? <Bot className="w-4 h-4" style={{ color: "oklch(0.7 0.18 170)" }} /> : <User className="w-4 h-4" style={{ color: "oklch(0.6 0.02 240)" }} />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed`}
                    style={{
                      background: msg.role === "ai" ? "oklch(0.14 0.025 260)" : "oklch(0.7 0.18 170 / 0.15)",
                      border: `1px solid ${msg.role === "ai" ? "oklch(0.22 0.02 260)" : "oklch(0.7 0.18 170 / 0.3)"}`,
                      color: "oklch(0.8 0.01 240)",
                    }}>
                    <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "oklch(0.7 0.18 170 / 0.15)", border: "1px solid oklch(0.7 0.18 170 / 0.3)" }}>
                    <Bot className="w-4 h-4" style={{ color: "oklch(0.7 0.18 170)" }} />
                  </div>
                  <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl"
                    style={{ background: "oklch(0.14 0.025 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                    {[0, 1, 2].map((d) => (
                      <div key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: "oklch(0.7 0.18 170)", animationDelay: `${d * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4" style={{ borderTop: "1px solid oklch(0.18 0.02 260)" }}>
              <div className="flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Ask about any system, API, decision, or best practice..."
                  className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{ background: "oklch(0.14 0.025 260)", border: "1px solid oklch(0.25 0.02 260)", color: "oklch(0.8 0.01 240)" }}
                  onFocus={e => { e.target.style.borderColor = "oklch(0.7 0.18 170 / 0.5)"; }}
                  onBlur={e => { e.target.style.borderColor = "oklch(0.25 0.02 260)"; }} />
                <button onClick={() => sendMessage()}
                  className="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
                  style={{ background: "oklch(0.7 0.18 170)", boxShadow: "0 0 12px oklch(0.7 0.18 170 / 0.3)" }}>
                  <Send className="w-4 h-4" style={{ color: "oklch(0.06 0.015 260)" }} />
                </button>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4 overflow-y-auto">
            {/* Learning paths */}
            <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
              <p className="text-sm font-semibold text-white mb-4">Your Learning Path</p>
              <div className="space-y-4">
                {learningPaths.map((lp) => (
                  <div key={lp.topic}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs font-medium text-white">{lp.topic}</span>
                      <span className="text-xs" style={{ color: "oklch(0.5 0.03 240)" }}>{lp.completed}/{lp.modules}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 260)" }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${lp.progress}%`, background: "linear-gradient(90deg, oklch(0.7 0.18 170), oklch(0.65 0.15 150))" }} />
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: "oklch(0.4 0.02 240)" }}>{lp.progress}% complete</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Common mistakes */}
            <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
              <p className="text-sm font-semibold text-white mb-3">Team Common Mistakes</p>
              <div className="space-y-2.5">
                {[
                  { issue: "N+1 queries in analytics module", severity: "high" },
                  { issue: "Missing error handling in Stripe webhooks", severity: "critical" },
                  { issue: "Hardcoded timeouts in auth-service", severity: "medium" },
                ].map((m, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg"
                    style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.18 0.02 260)" }}>
                    <span className="text-sm shrink-0">{m.severity === "critical" ? "🔴" : m.severity === "high" ? "🟠" : "🟡"}</span>
                    <p className="text-[11px]" style={{ color: "oklch(0.6 0.02 240)" }}>{m.issue}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
