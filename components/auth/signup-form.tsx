"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ArrowRight, Check } from "lucide-react";

const plans = [
  { id: "starter", label: "Starter", desc: "Up to 10 users", price: "Free" },
  { id: "pro", label: "Pro", desc: "Up to 100 users", price: "$49/mo" },
  { id: "enterprise", label: "Enterprise", desc: "Unlimited", price: "Custom" },
];

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", company: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [plan, setPlan] = useState("pro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.company) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1400));
    localStorage.setItem("phoenix_auth", "true");
    router.push("/dashboard");
  };

  const inputBase: React.CSSProperties = {
    background: "oklch(0.16 0.025 260)",
    border: "1px solid oklch(0.28 0.025 260)",
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-12 bg-[oklch(0.06_0.015_260)]">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-20 animate-pulse"
          style={{ background: "radial-gradient(circle, oklch(0.65 0.15 150) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-60 -left-60 w-[700px] h-[700px] rounded-full opacity-15 animate-pulse"
          style={{ animationDelay: "0.8s", background: "radial-gradient(circle, oklch(0.7 0.18 170) 0%, transparent 70%)" }} />
        <div className="absolute inset-0"
          style={{ backgroundImage: "linear-gradient(oklch(0.7 0.18 170 / 0.03) 1px, transparent 1px), linear-gradient(90deg, oklch(0.7 0.18 170 / 0.03) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      <div className="relative z-10 w-full max-w-lg px-4">
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
          <p className="mt-3 text-sm" style={{ color: "oklch(0.5 0.03 240)" }}>Start your 14-day free trial — no credit card required</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8"
          style={{
            background: "oklch(0.11 0.02 260 / 0.8)",
            backdropFilter: "blur(24px)",
            border: "1px solid oklch(0.25 0.02 260)",
            boxShadow: "0 0 0 1px oklch(0.7 0.18 170 / 0.05), 0 32px 64px oklch(0 0 0 / 0.4)"
          }}>
          <h1 className="text-2xl font-bold text-white mb-1">Create your workspace</h1>
          <p className="text-sm mb-6" style={{ color: "oklch(0.5 0.03 240)" }}>Deploy Phoenix across your organization in minutes</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm"
              style={{ background: "oklch(0.396 0.141 25.723 / 0.2)", border: "1px solid oklch(0.396 0.141 25.723 / 0.4)", color: "oklch(0.7 0.18 25)" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "oklch(0.6 0.03 240)" }}>Full name</label>
                <input type="text" value={form.name} onChange={handleChange("name")} placeholder="Jane Smith"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-[oklch(0.35_0.02_240)] outline-none transition-all duration-200"
                  style={inputBase}
                  onFocus={e => { e.target.style.borderColor = "oklch(0.7 0.18 170 / 0.6)"; e.target.style.boxShadow = "0 0 0 3px oklch(0.7 0.18 170 / 0.1)"; }}
                  onBlur={e => { e.target.style.borderColor = "oklch(0.28 0.025 260)"; e.target.style.boxShadow = "none"; }} />
              </div>
              {/* Company */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "oklch(0.6 0.03 240)" }}>Company</label>
                <input type="text" value={form.company} onChange={handleChange("company")} placeholder="Acme Corp"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-[oklch(0.35_0.02_240)] outline-none transition-all duration-200"
                  style={inputBase}
                  onFocus={e => { e.target.style.borderColor = "oklch(0.7 0.18 170 / 0.6)"; e.target.style.boxShadow = "0 0 0 3px oklch(0.7 0.18 170 / 0.1)"; }}
                  onBlur={e => { e.target.style.borderColor = "oklch(0.28 0.025 260)"; e.target.style.boxShadow = "none"; }} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "oklch(0.6 0.03 240)" }}>Work email</label>
              <input type="email" value={form.email} onChange={handleChange("email")} placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-[oklch(0.35_0.02_240)] outline-none transition-all duration-200"
                style={inputBase}
                onFocus={e => { e.target.style.borderColor = "oklch(0.7 0.18 170 / 0.6)"; e.target.style.boxShadow = "0 0 0 3px oklch(0.7 0.18 170 / 0.1)"; }}
                onBlur={e => { e.target.style.borderColor = "oklch(0.28 0.025 260)"; e.target.style.boxShadow = "none"; }} />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "oklch(0.6 0.03 240)" }}>Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={form.password} onChange={handleChange("password")} placeholder="Min. 8 characters"
                  className="w-full px-4 py-3 pr-12 rounded-xl text-sm text-white placeholder-[oklch(0.35_0.02_240)] outline-none transition-all duration-200"
                  style={inputBase}
                  onFocus={e => { e.target.style.borderColor = "oklch(0.7 0.18 170 / 0.6)"; e.target.style.boxShadow = "0 0 0 3px oklch(0.7 0.18 170 / 0.1)"; }}
                  onBlur={e => { e.target.style.borderColor = "oklch(0.28 0.025 260)"; e.target.style.boxShadow = "none"; }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg" style={{ color: "oklch(0.45 0.02 240)" }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Plan Selector */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "oklch(0.6 0.03 240)" }}>Choose your plan</label>
              <div className="grid grid-cols-3 gap-2">
                {plans.map((p) => (
                  <button key={p.id} type="button" onClick={() => setPlan(p.id)}
                    className="relative p-3 rounded-xl text-left transition-all duration-200"
                    style={{
                      background: plan === p.id ? "oklch(0.7 0.18 170 / 0.15)" : "oklch(0.16 0.025 260)",
                      border: `1px solid ${plan === p.id ? "oklch(0.7 0.18 170 / 0.6)" : "oklch(0.28 0.025 260)"}`,
                      boxShadow: plan === p.id ? "0 0 12px oklch(0.7 0.18 170 / 0.2)" : "none",
                    }}>
                    {plan === p.id && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: "oklch(0.7 0.18 170)" }}>
                        <Check className="w-2.5 h-2.5 text-black" />
                      </div>
                    )}
                    <div className="text-xs font-semibold text-white">{p.label}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "oklch(0.5 0.03 240)" }}>{p.desc}</div>
                    <div className="text-xs font-bold mt-1" style={{ color: "oklch(0.7 0.18 170)" }}>{p.price}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-3 px-6 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 mt-2"
              style={{
                background: loading ? "oklch(0.5 0.12 170)" : "oklch(0.7 0.18 170)",
                color: "oklch(0.06 0.015 260)",
                boxShadow: loading ? "none" : "0 0 24px oklch(0.7 0.18 170 / 0.4)",
              }}>
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating your workspace...</>
              ) : (
                <>Launch Phoenix <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <p className="text-[11px] text-center" style={{ color: "oklch(0.4 0.02 240)" }}>
              By signing up, you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: "oklch(0.45 0.02 240)" }}>
          Already have an account?{" "}
          <Link href="/login" className="font-medium" style={{ color: "oklch(0.7 0.18 170)" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
