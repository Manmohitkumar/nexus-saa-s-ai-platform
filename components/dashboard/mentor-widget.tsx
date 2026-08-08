"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, X, Minus, Sparkles } from "lucide-react";
import { askMentor } from "@/lib/phoenix/api";
import type { MentorAnswer } from "@/lib/phoenix/types";
import Link from "next/link";

interface WidgetMessage {
  role: "user" | "mentor";
  content: string;
  answer?: MentorAnswer;
}

const welcome: WidgetMessage = {
  role: "mentor",
  content: "Hi, I'm your Phoenix AI Mentor. Ask me anything about your architecture, decisions, risk, or what to learn next.",
};

const quick = [
  "Explain how the authentication system works",
  "Where is our technical debt?",
  "What documentation should I read first?",
];

export function MentorWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<WidgetMessage[]>([welcome]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy, open, minimized]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", content: msg }]);
    try {
      const answer = await askMentor(msg, conversationId ?? undefined);
      setConversationId(answer.conversationId);
      setMessages((m) => [...m, { role: "mentor", content: answer.answer, answer }]);
    } catch {
      setMessages((m) => [...m, { role: "mentor", content: "Something went wrong while consulting the Organizational Digital Brain." }]);
    }
    setBusy(false);
  };

  const last = [...messages].reverse().find((m) => m.answer)?.answer;

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setMinimized(false); }}
          className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-105"
          style={{ background: "linear-gradient(135deg, oklch(0.7 0.18 170), oklch(0.65 0.15 150))", boxShadow: "0 8px 30px oklch(0.7 0.18 170 / 0.35)" }}
          aria-label="Open AI Mentor"
        >
          <Bot className="w-6 h-6" style={{ color: "oklch(0.06 0.015 260)" }} />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          className="fixed z-50 flex flex-col overflow-hidden rounded-2xl"
          style={{
            width: "min(380px, calc(100vw - 24px))",
            height: minimized ? "auto" : "min(560px, calc(100vh - 24px))",
            right: 20,
            bottom: 20,
            background: "oklch(0.10 0.02 260)",
            border: "1px solid oklch(0.25 0.02 260)",
            boxShadow: "0 20px 60px oklch(0 0 0 / 0.5)",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 p-3.5 shrink-0" style={{ borderBottom: "1px solid oklch(0.18 0.02 260)" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "oklch(0.7 0.18 170 / 0.15)", border: "1px solid oklch(0.7 0.18 170 / 0.3)" }}>
              <Bot className="w-4 h-4" style={{ color: "oklch(0.7 0.18 170)" }} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-white">AI Mentor</p>
              <p className="text-[9px]" style={{ color: "oklch(0.5 0.02 240)" }}>
                {last ? `${last.confidence}% confident · ${last.topic}` : "Grounds every answer in the org brain"}
              </p>
            </div>
            <button onClick={() => setMinimized(!minimized)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: "oklch(0.5 0.02 240)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "oklch(0.16 0.025 260)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              {minimized ? <Sparkles className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: "oklch(0.5 0.02 240)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "oklch(0.16 0.025 260)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[85%] rounded-xl px-3 py-2 text-[11px] leading-relaxed"
                      style={{
                        background: m.role === "user" ? "oklch(0.7 0.18 170 / 0.15)" : "oklch(0.14 0.025 260)",
                        border: `1px solid ${m.role === "user" ? "oklch(0.7 0.18 170 / 0.3)" : "oklch(0.22 0.02 260)"}`,
                        color: "oklch(0.8 0.01 240)",
                      }}>
                      <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
                      {m.answer && m.answer.relatedKnowledge.length > 0 && (
                        <div className="mt-2 pt-2 space-y-1" style={{ borderTop: "1px solid oklch(0.2 0.02 260)" }}>
                          {m.answer.relatedKnowledge.slice(0, 2).map((r, j) => (
                            <Link key={j} href={r.route} className="block text-[10px] transition-colors" style={{ color: "oklch(0.7 0.18 170)" }}
                              onClick={() => setOpen(false)}>
                              {r.label}
                            </Link>
                          ))}
                          <Link href="/dashboard/mentor" className="block text-[10px] font-medium transition-colors" style={{ color: "oklch(0.5 0.03 240)" }}
                            onClick={() => setOpen(false)}>
                            Open full conversation →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1 px-3 py-2 rounded-xl" style={{ background: "oklch(0.14 0.025 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                      {[0, 1, 2].map((d) => (
                        <div key={d} className="w-1 h-1 rounded-full animate-bounce" style={{ background: "oklch(0.7 0.18 170)", animationDelay: `${d * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick prompts */}
              <div className="flex gap-1.5 px-3 pb-1.5 flex-wrap">
                {quick.map((q) => (
                  <button key={q} onClick={() => send(q)}
                    className="text-[9px] px-2 py-1 rounded-lg transition-all duration-200"
                    style={{ background: "oklch(0.16 0.025 260)", border: "1px solid oklch(0.25 0.02 260)", color: "oklch(0.6 0.02 240)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "oklch(0.7 0.18 170 / 0.4)"; e.currentTarget.style.color = "oklch(0.7 0.18 170)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "oklch(0.25 0.02 260)"; e.currentTarget.style.color = "oklch(0.6 0.02 240)"; }}>
                    {q}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="p-3" style={{ borderTop: "1px solid oklch(0.18 0.02 260)" }}>
                <div className="flex gap-2">
                  <input value={input} onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder="Ask your mentor..."
                    className="flex-1 px-3 py-2 rounded-xl text-[11px] outline-none transition-all duration-200"
                    style={{ background: "oklch(0.14 0.025 260)", border: "1px solid oklch(0.25 0.02 260)", color: "oklch(0.8 0.01 240)" }}
                    onFocus={(e) => { e.target.style.borderColor = "oklch(0.7 0.18 170 / 0.5)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "oklch(0.25 0.02 260)"; }} />
                  <button onClick={() => send()}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
                    style={{ background: "oklch(0.7 0.18 170)" }}>
                    <Send className="w-3.5 h-3.5" style={{ color: "oklch(0.06 0.015 260)" }} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
