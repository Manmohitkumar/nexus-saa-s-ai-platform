"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ArrowRight, Zap } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);
    // Simulate auth delay
    await new Promise((r) => setTimeout(r, 1200));
    if (remember) localStorage.setItem("phoenix_auth", "true");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[oklch(0.06_0.015_260)]">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20 animate-pulse"
          style={{ background: "radial-gradient(circle, oklch(0.7 0.18 170) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-60 -right-60 w-[700px] h-[700px] rounded-full opacity-15 animate-pulse"
          style={{ animationDelay: "1s", background: "radial-gradient(circle, oklch(0.65 0.15 200) 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, oklch(0.7 0.18 170) 0%, transparent 70%)" }} />
        {/* Grid pattern */}
        <div className="absolute inset-0"
          style={{ backgroundImage: "linear-gradient(oklch(0.7 0.18 170 / 0.03) 1px, transparent 1px), linear-gradient(90deg, oklch(0.7 0.18 170 / 0.03) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden"
              style={{ background: "oklch(0.15 0.03 260)", border: "1px solid oklch(0.7 0.18 170 / 0.3)" }}>
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, oklch(0.7 0.18 170 / 0.2) 0%, oklch(0.65 0.15 150 / 0.1) 100%)" }} />
              <span className="font-mono text-2xl font-bold relative z-10" style={{ color: "oklch(0.7 0.18 170)" }}>P</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">Project Phoenix</span>
          </Link>
          <p className="mt-3 text-sm" style={{ color: "oklch(0.5 0.03 240)" }}>The Digital Brain for Modern Organizations</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8"
          style={{
            background: "oklch(0.11 0.02 260 / 0.8)",
            backdropFilter: "blur(24px)",
            border: "1px solid oklch(0.25 0.02 260)",
            boxShadow: "0 0 0 1px oklch(0.7 0.18 170 / 0.05), 0 32px 64px oklch(0 0 0 / 0.4)"
          }}>
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-sm mb-6" style={{ color: "oklch(0.5 0.03 240)" }}>Sign in to your Phoenix workspace</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm"
              style={{ background: "oklch(0.396 0.141 25.723 / 0.2)", border: "1px solid oklch(0.396 0.141 25.723 / 0.4)", color: "oklch(0.7 0.18 25)" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "oklch(0.6 0.03 240)" }}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-[oklch(0.35_0.02_240)] outline-none transition-all duration-200"
                style={{
                  background: "oklch(0.16 0.025 260)",
                  border: "1px solid oklch(0.28 0.025 260)",
                }}
                onFocus={e => { e.target.style.borderColor = "oklch(0.7 0.18 170 / 0.6)"; e.target.style.boxShadow = "0 0 0 3px oklch(0.7 0.18 170 / 0.1)"; }}
                onBlur={e => { e.target.style.borderColor = "oklch(0.28 0.025 260)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "oklch(0.6 0.03 240)" }}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-xl text-sm text-white placeholder-[oklch(0.35_0.02_240)] outline-none transition-all duration-200"
                  style={{
                    background: "oklch(0.16 0.025 260)",
                    border: "1px solid oklch(0.28 0.025 260)",
                  }}
                  onFocus={e => { e.target.style.borderColor = "oklch(0.7 0.18 170 / 0.6)"; e.target.style.boxShadow = "0 0 0 3px oklch(0.7 0.18 170 / 0.1)"; }}
                  onBlur={e => { e.target.style.borderColor = "oklch(0.28 0.025 260)"; e.target.style.boxShadow = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                  style={{ color: "oklch(0.45 0.02 240)" }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div
                  onClick={() => setRemember(!remember)}
                  className="w-4 h-4 rounded flex items-center justify-center transition-all duration-200 cursor-pointer"
                  style={{
                    background: remember ? "oklch(0.7 0.18 170)" : "oklch(0.16 0.025 260)",
                    border: `1px solid ${remember ? "oklch(0.7 0.18 170)" : "oklch(0.28 0.025 260)"}`,
                  }}>
                  {remember && <span className="text-[10px] text-black font-bold">✓</span>}
                </div>
                <span className="text-xs" style={{ color: "oklch(0.5 0.03 240)" }}>Remember me</span>
              </label>
              <a href="#" className="text-xs transition-colors" style={{ color: "oklch(0.7 0.18 170)" }}>Forgot password?</a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 mt-2"
              style={{
                background: loading ? "oklch(0.5 0.12 170)" : "oklch(0.7 0.18 170)",
                color: "oklch(0.06 0.015 260)",
                boxShadow: loading ? "none" : "0 0 24px oklch(0.7 0.18 170 / 0.4)",
              }}
              onMouseEnter={e => { if (!loading) (e.target as HTMLElement).style.background = "oklch(0.75 0.18 170)"; }}
              onMouseLeave={e => { if (!loading) (e.target as HTMLElement).style.background = "oklch(0.7 0.18 170)"; }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating...</>
              ) : (
                <><Zap className="w-4 h-4" /> Sign in to Phoenix <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: "oklch(0.22 0.02 260)" }} />
            <span className="text-xs" style={{ color: "oklch(0.4 0.02 240)" }}>or continue with</span>
            <div className="flex-1 h-px" style={{ background: "oklch(0.22 0.02 260)" }} />
          </div>

          {/* OAuth buttons */}
          <div className="grid grid-cols-2 gap-3">
            {["Google", "GitHub"].map((provider) => (
              <button
                key={provider}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  background: "oklch(0.16 0.025 260)",
                  border: "1px solid oklch(0.28 0.025 260)",
                  color: "oklch(0.75 0.02 240)",
                }}
                onMouseEnter={e => { (e.currentTarget).style.borderColor = "oklch(0.7 0.18 170 / 0.4)"; }}
                onMouseLeave={e => { (e.currentTarget).style.borderColor = "oklch(0.28 0.025 260)"; }}>
                {provider}
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: "oklch(0.45 0.02 240)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium transition-colors" style={{ color: "oklch(0.7 0.18 170)" }}>
            Start for free
          </Link>
        </p>
      </div>
    </div>
  );
}
