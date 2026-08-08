"use client";

import { DashboardTopbar } from "@/components/dashboard/topbar";
import { useEffect, useRef, useState } from "react";
import { Send, Bot, User, Layers, Code, BookOpen, Cpu, Sparkles, Link2, GitBranch, Target, CheckCircle2, ChevronRight, Plus, History } from "lucide-react";
import { askMentor, fetchMentorCapabilities, fetchMentorConversations, fetchMentorLearningPaths, fetchMentorPrompts } from "@/lib/phoenix/api";
import type { LearningPath, MentorAnswer, MentorCapability, MentorConversationSummary, MentorMessageView, MentorPrompt } from "@/lib/phoenix/types";
import Link from "next/link";

interface ChatMessage {
  id: string;
  role: "user" | "mentor";
  content: string;
  answer?: MentorAnswer;
  pending?: boolean;
}

const capabilityLabels: Record<string, string> = {
  architecture: "Architecture Explanation",
  repository: "Repository Walkthrough",
  dependency: "Service Dependency",
  api: "API Understanding",
  database: "Database Relationships",
  decision: "Decision Explanation",
  history: "Historical Context",
  documentation: "Documentation Guidance",
  onboarding: "Onboarding",
  discovery: "Knowledge Discovery",
  incident: "Incident Learning",
  debt: "Technical Debt",
  "best-practice": "Best Practice",
  navigation: "Org Navigation",
  business: "Business Process",
  general: "General Mentoring",
};

export default function MentorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [promptTemplates, setPromptTemplates] = useState<MentorPrompt[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [capabilities, setCapabilities] = useState<MentorCapability[]>([]);
  const [conversations, setConversations] = useState<MentorConversationSummary[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMentorPrompts().then(setPromptTemplates).catch(() => {});
    fetchMentorLearningPaths().then(setLearningPaths).catch(() => {});
    fetchMentorCapabilities().then(setCapabilities).catch(() => {});
    refreshConversations();
  }, []);

  const refreshConversations = () => {
    fetchMentorConversations().then(setConversations).catch(() => {});
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || busy) return;
    setInput("");
    setBusy(true);

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: msg };
    const pendingMsg: ChatMessage = { id: `p-${Date.now()}`, role: "mentor", content: "", pending: true };
    setMessages((m) => [...m, userMsg, pendingMsg]);

    try {
      const answer = await askMentor(msg, activeConversation ?? undefined);
      setMessages((m) =>
        m.map((x) =>
          x.id === pendingMsg.id
            ? { id: `a-${Date.now()}`, role: "mentor", content: answer.answer, answer }
            : x,
        ),
      );
      if (answer.conversationId) setActiveConversation(answer.conversationId);
      refreshConversations();
    } catch (error) {
      setMessages((m) =>
        m.map((x) =>
          x.id === pendingMsg.id
            ? { id: `e-${Date.now()}`, role: "mentor", content: `Something went wrong while consulting the Organizational Digital Brain: ${error instanceof Error ? error.message : "unknown error"}` }
            : x,
        ),
      );
    }
    setBusy(false);
  };

  const openConversation = async (id: string) => {
    if (loadingConversation || id === activeConversation) return;
    setLoadingConversation(true);
    try {
      const detail = await (await import("@/lib/phoenix/api")).fetchMentorConversation(id);
      setActiveConversation(id);
      setMessages(
        detail.messages.map((m: MentorMessageView, i: number) => ({
          id: `${m.id}-${i}`,
          role: m.role,
          content: m.content,
          answer: m.payload ?? undefined,
        })),
      );
    } catch {
      // keep current thread
    }
    setLoadingConversation(false);
  };

  const newConversation = () => {
    setActiveConversation(null);
    setMessages([]);
  };

  const quickPrompts =
    promptTemplates.length >= 4
      ? [
          { icon: Layers, text: promptTemplates[0].title },
          { icon: Code, text: promptTemplates[1].title },
          { icon: BookOpen, text: promptTemplates[2].title },
          { icon: Cpu, text: promptTemplates[3].title },
        ]
      : [
          { icon: Layers, text: "Explain how the authentication system works" },
          { icon: Code, text: "Which services depend on the API gateway?" },
          { icon: BookOpen, text: "What documentation should I read first?" },
          { icon: Cpu, text: "Where is our technical debt?" },
        ];

  const latestAnswer = [...messages].reverse().find((m) => m.answer)?.answer;

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
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">Phoenix AI Mentor</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "oklch(0.65 0.15 150)" }} />
                  <p className="text-[10px]" style={{ color: "oklch(0.65 0.15 150)" }}>
                    {latestAnswer ? `Latest answer ${latestAnswer.confidence}% confident` : "Online · Full org context loaded"}
                  </p>
                </div>
              </div>
              <button onClick={newConversation}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all duration-200"
                style={{ background: "oklch(0.16 0.025 260)", border: "1px solid oklch(0.25 0.02 260)", color: "oklch(0.65 0.02 240)" }}>
                <Plus className="w-3 h-3" /> New conversation
              </button>
            </div>

            {/* Quick prompts */}
            <div className="flex gap-2 p-3 flex-wrap" style={{ borderBottom: "1px solid oklch(0.18 0.02 260)" }}>
              {quickPrompts.map((q) => (
                <button key={q.text} onClick={() => sendMessage(q.text)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all duration-200"
                  style={{ background: "oklch(0.16 0.025 260)", border: "1px solid oklch(0.25 0.02 260)", color: "oklch(0.65 0.02 240)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "oklch(0.7 0.18 170 / 0.4)"; e.currentTarget.style.color = "oklch(0.7 0.18 170)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "oklch(0.25 0.02 260)"; e.currentTarget.style.color = "oklch(0.65 0.02 240)"; }}>
                  <q.icon className="w-3 h-3" />
                  {q.text}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && !busy && (
                <div className="text-center py-14">
                  <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "oklch(0.7 0.18 170 / 0.12)", border: "1px solid oklch(0.7 0.18 170 / 0.25)" }}>
                    <Sparkles className="w-7 h-7" style={{ color: "oklch(0.7 0.18 170)" }} />
                  </div>
                  <p className="text-white font-semibold text-lg">Ask your organizational brain anything</p>
                  <p className="text-sm mt-1" style={{ color: "oklch(0.5 0.02 240)" }}>
                    Architecture, decisions, dependencies, risk, onboarding — grounded in evidence, never invented.
                  </p>
                </div>
              )}
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} onFollowUp={sendMessage} />
              ))}
              {busy && (
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
                <input value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Ask about any system, API, decision, or best practice..."
                  className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{ background: "oklch(0.14 0.025 260)", border: "1px solid oklch(0.25 0.02 260)", color: "oklch(0.8 0.01 240)" }}
                  onFocus={(e) => { e.target.style.borderColor = "oklch(0.7 0.18 170 / 0.5)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "oklch(0.25 0.02 260)"; }} />
                <button onClick={() => sendMessage()}
                  className="w-11 h-11 rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
                  style={{ background: "oklch(0.7 0.18 170)", boxShadow: "0 0 12px oklch(0.7 0.18 170 / 0.3)" }}>
                  <Send className="w-4 h-4" style={{ color: "oklch(0.06 0.015 260)" }} />
                </button>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4 overflow-y-auto">
            {/* Conversation history */}
            {conversations.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <History className="w-4 h-4" style={{ color: "oklch(0.7 0.18 170)" }} /> Conversation History
                </p>
                <div className="space-y-1.5">
                  {conversations.map((c) => (
                    <button key={c.id} onClick={() => openConversation(c.id)}
                      className="w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-all duration-200"
                      style={{
                        background: c.id === activeConversation ? "oklch(0.16 0.03 170 / 0.15)" : "oklch(0.09 0.018 260)",
                        border: `1px solid ${c.id === activeConversation ? "oklch(0.7 0.18 170 / 0.3)" : "oklch(0.18 0.02 260)"}`,
                      }}>
                      <span className="text-[11px] truncate" style={{ color: c.id === activeConversation ? "oklch(0.85 0.01 240)" : "oklch(0.55 0.02 240)" }}>
                        {c.title}
                      </span>
                      <span className="text-[10px] shrink-0" style={{ color: "oklch(0.4 0.02 240)" }}>{c.messageCount}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Capabilities */}
            {capabilities.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                <p className="text-sm font-semibold text-white mb-3">Mentoring Capabilities</p>
                <div className="space-y-1.5">
                  {capabilities.map((c) => (
                    <button key={c.id} onClick={() => sendMessage(c.prompts[0] ?? c.name)}
                      className="w-full text-left px-3 py-2 rounded-lg transition-all duration-200"
                      style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.18 0.02 260)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "oklch(0.7 0.18 170 / 0.4)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "oklch(0.18 0.02 260)"; }}>
                      <p className="text-[11px] font-medium text-white">{c.name}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "oklch(0.45 0.02 240)" }}>{c.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Learning paths */}
            <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
              <p className="text-sm font-semibold text-white mb-4">Learning Paths</p>
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
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg, onFollowUp }: { msg: ChatMessage; onFollowUp: (text: string) => void }) {
  const isUser = msg.role === "user";
  if (isUser) {
    return (
      <div className="flex gap-3 flex-row-reverse">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "oklch(0.18 0.025 260)", border: "1px solid oklch(0.28 0.025 260)" }}>
          <User className="w-4 h-4" style={{ color: "oklch(0.6 0.02 240)" }} />
        </div>
        <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
          style={{ background: "oklch(0.7 0.18 170 / 0.15)", border: "1px solid oklch(0.7 0.18 170 / 0.3)", color: "oklch(0.8 0.01 240)" }}>
          <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
        </div>
      </div>
    );
  }

  if (!msg.answer) {
    return (
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "oklch(0.7 0.18 170 / 0.15)", border: "1px solid oklch(0.7 0.18 170 / 0.3)" }}>
          <Bot className="w-4 h-4" style={{ color: "oklch(0.7 0.18 170)" }} />
        </div>
        <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
          style={{ background: "oklch(0.14 0.025 260)", border: "1px solid oklch(0.22 0.02 260)", color: "oklch(0.8 0.01 240)" }}>
          <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
        </div>
      </div>
    );
  }

  const a = msg.answer;
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "oklch(0.7 0.18 170 / 0.15)", border: "1px solid oklch(0.7 0.18 170 / 0.3)" }}>
        <Bot className="w-4 h-4" style={{ color: "oklch(0.7 0.18 170)" }} />
      </div>
      <div className="max-w-[85%] space-y-3">
        {/* Answer card */}
        <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
          style={{ background: "oklch(0.14 0.025 260)", border: "1px solid oklch(0.22 0.02 260)", color: "oklch(0.8 0.01 240)" }}>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: "oklch(0.7 0.18 170 / 0.12)", border: "1px solid oklch(0.7 0.18 170 / 0.3)", color: "oklch(0.7 0.18 170)" }}>
              {capabilityLabels[a.capability] ?? a.capability}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: "oklch(0.16 0.03 260)", border: "1px solid oklch(0.28 0.02 260)", color: "oklch(0.6 0.02 240)" }}>
              {a.confidence}% confident
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: "oklch(0.16 0.03 260)", border: "1px solid oklch(0.28 0.02 260)", color: "oklch(0.6 0.02 240)" }}>
              {a.topic}
            </span>
          </div>
          <pre className="whitespace-pre-wrap font-sans">{a.answer}</pre>
        </div>

        {/* Evidence */}
        {a.evidence.length > 0 && (
          <div className="rounded-2xl px-4 py-3" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <p className="text-[11px] font-semibold text-white mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "oklch(0.7 0.18 170)" }} /> Evidence ({a.evidence.length})
            </p>
            <div className="space-y-1.5">
              {a.evidence.map((e, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0 mt-0.5 font-medium"
                    style={{ background: "oklch(0.16 0.03 260)", border: "1px solid oklch(0.28 0.02 260)", color: "oklch(0.55 0.02 240)" }}>
                    {e.type}
                  </span>
                  <div>
                    <p className="text-[11px] font-medium" style={{ color: "oklch(0.7 0.02 240)" }}>{e.source}</p>
                    <p className="text-[10px]" style={{ color: "oklch(0.45 0.02 240)" }}>{e.excerpt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reasoning trace */}
        {a.reasoning.length > 0 && (
          <div className="rounded-2xl px-4 py-3" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <p className="text-[11px] font-semibold text-white mb-2">How I reached this</p>
            <ul className="space-y-1">
              {a.reasoning.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[10px]" style={{ color: "oklch(0.5 0.02 240)" }}>
                  <ChevronRight className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "oklch(0.7 0.18 170)" }} />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Dependencies */}
        {a.dependencies.length > 0 && (
          <div className="rounded-2xl px-4 py-3" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <p className="text-[11px] font-semibold text-white mb-2 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" style={{ color: "oklch(0.7 0.18 170)" }} /> Dependency Paths
            </p>
            <div className="space-y-1">
              {a.dependencies.map((d, i) => (
                <p key={i} className="text-[10px]" style={{ color: "oklch(0.55 0.02 240)" }}>
                  <span className="text-white">{d.source}</span> → <span className="text-white">{d.target}</span> <span style={{ color: "oklch(0.4 0.02 240)" }}>({d.type})</span>
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Related knowledge */}
        {a.relatedKnowledge.length > 0 && (
          <div className="rounded-2xl px-4 py-3" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <p className="text-[11px] font-semibold text-white mb-2 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" style={{ color: "oklch(0.7 0.18 170)" }} /> Related Knowledge
            </p>
            <div className="space-y-1">
              {a.relatedKnowledge.map((r, i) => (
                <Link key={i} href={r.route} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-200"
                  style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.18 0.02 260)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "oklch(0.7 0.18 170 / 0.4)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "oklch(0.18 0.02 260)"; }}>
                  <span className="text-[11px] truncate" style={{ color: "oklch(0.6 0.02 240)" }}>{r.label}</span>
                  <span className="text-[9px] shrink-0" style={{ color: "oklch(0.4 0.02 240)" }}>{r.kind} · {r.reason}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Impacted systems */}
        {a.impactedSystems.length > 0 && (
          <div className="rounded-2xl px-4 py-3" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <p className="text-[11px] font-semibold text-white mb-2 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" style={{ color: "oklch(0.7 0.18 170)" }} /> Impacted Systems
            </p>
            <div className="flex flex-wrap gap-1.5">
              {a.impactedSystems.map((s, i) => (
                <Link key={i} href="/dashboard/risk"
                  className="text-[10px] px-2 py-1 rounded-lg"
                  style={{ background: "oklch(0.16 0.03 260)", border: "1px solid oklch(0.28 0.02 260)", color: "oklch(0.6 0.02 240)" }}>
                  {s}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Learning modules */}
        {a.learningModules.length > 0 && (
          <div className="rounded-2xl px-4 py-3" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <p className="text-[11px] font-semibold text-white mb-2">Your Learning Path</p>
            <div className="space-y-2">
              {a.learningModules.map((mod) => (
                <Link key={mod.id} href={mod.route} className="block rounded-lg px-2.5 py-2 transition-all duration-200"
                  style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.18 0.02 260)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "oklch(0.7 0.18 170 / 0.4)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "oklch(0.18 0.02 260)"; }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-medium text-white">{mod.title}</span>
                    <span className="text-[9px]" style={{ color: "oklch(0.4 0.02 240)" }}>{mod.progress}%</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden mb-1" style={{ background: "oklch(0.18 0.02 260)" }}>
                    <div className="h-full rounded-full" style={{ width: `${mod.progress}%`, background: "linear-gradient(90deg, oklch(0.7 0.18 170), oklch(0.65 0.15 150))" }} />
                  </div>
                  <p className="text-[9px]" style={{ color: "oklch(0.45 0.02 240)" }}>{mod.objective}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Follow-ups */}
        {a.followUps.length > 0 && (
          <div className="rounded-2xl px-4 py-3" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <p className="text-[11px] font-semibold text-white mb-2">Follow up</p>
            <div className="flex flex-wrap gap-1.5">
              {a.followUps.map((f, i) => (
                <button key={i} onClick={() => onFollowUp(f)}
                  className="text-[10px] px-2.5 py-1.5 rounded-lg transition-all duration-200"
                  style={{ background: "oklch(0.16 0.03 260)", border: "1px solid oklch(0.28 0.02 260)", color: "oklch(0.6 0.02 240)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "oklch(0.7 0.18 170 / 0.4)"; e.currentTarget.style.color = "oklch(0.7 0.18 170)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "oklch(0.28 0.02 260)"; e.currentTarget.style.color = "oklch(0.6 0.02 240)"; }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        {a.navigation.length > 0 && (
          <div className="rounded-2xl px-4 py-3" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
            <p className="text-[11px] font-semibold text-white mb-2">Explore</p>
            <div className="flex flex-wrap gap-1.5">
              {a.navigation.map((n, i) => (
                <Link key={i} href={n.route}
                  className="text-[10px] px-2.5 py-1.5 rounded-lg transition-all duration-200"
                  style={{ background: "oklch(0.16 0.03 260)", border: "1px solid oklch(0.28 0.02 260)", color: "oklch(0.6 0.02 240)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "oklch(0.7 0.18 170 / 0.4)"; e.currentTarget.style.color = "oklch(0.7 0.18 170)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "oklch(0.28 0.02 260)"; e.currentTarget.style.color = "oklch(0.6 0.02 240)"; }}>
                  {n.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
