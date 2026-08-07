"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Brain, Clock, UserMinus, Flame, Bot, BookOpen, Cpu, BarChart3,
  ChevronLeft, ChevronRight, LogOut, Settings
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: BarChart3, label: "Overview", badge: null },
  { href: "/dashboard/brain", icon: Brain, label: "Org Brain", badge: "Live" },
  { href: "/dashboard/decisions", icon: Clock, label: "Decisions", badge: null },
  { href: "/dashboard/exit-sim", icon: UserMinus, label: "Exit Simulation", badge: "New" },
  { href: "/dashboard/risk", icon: Flame, label: "Risk", badge: null },
  { href: "/dashboard/mentor", icon: Bot, label: "Mentor", badge: null },
  { href: "/dashboard/docs", icon: BookOpen, label: "Docs", badge: "Auto" },
  { href: "/dashboard/intelligence", icon: Cpu, label: "Intelligence", badge: null },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("phoenix_auth");
    router.push("/");
  };

  return (
    <aside
      className="flex flex-col h-screen sticky top-0 transition-all duration-300 shrink-0"
      style={{
        width: collapsed ? "80px" : "272px",
        background: "#211F20",
        borderRight: "1px solid rgba(255, 255, 255, 0.1)",
      }}>
      {/* Logo area */}
      <div className="flex items-center justify-between px-4 h-16 shrink-0"
        style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "#2196F3", border: "1px solid #90CAF9" }}>
              <span className="font-mono font-bold text-sm text-white">P</span>
            </div>
            <span className="text-sm font-semibold text-white truncate">Phoenix</span>
          </Link>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto"
            style={{ background: "#2196F3", border: "1px solid #90CAF9" }}>
            <span className="font-mono font-bold text-sm text-white">P</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg transition-colors ml-auto"
          style={{ color: "#90CAF9" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#FFFFFF")}
          onMouseLeave={e => (e.currentTarget.style.color = "#90CAF9")}>
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255, 255, 255, 0.62)" }}>
            Workspace
          </p>
        )}
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative"
              style={{
                background: isActive ? "#2196F3" : "transparent",
                border: `1px solid ${isActive ? "#2196F3" : "transparent"}`,
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(144, 202, 249, 0.18)"; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              <item.icon className="w-4 h-4 shrink-0 transition-colors"
                style={{ color: isActive ? "#FFFFFF" : "#90CAF9" }} />
              {!collapsed && (
                <>
                  <span className="text-sm font-medium flex-1 truncate transition-colors"
                    style={{ color: isActive ? "#FFFFFF" : "#E3F2FD" }}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                      style={{
                        background: "rgba(255, 255, 255, 0.16)",
                        color: "#FFFFFF",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                      }}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 space-y-1" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
        <Link href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
          style={{ color: "#90CAF9" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(144, 202, 249, 0.18)"; (e.currentTarget as HTMLElement).style.color = "#FFFFFF"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#90CAF9"; }}>
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="text-sm">Settings</span>}
        </Link>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
          style={{ color: "#90CAF9" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(144, 202, 249, 0.18)"; (e.currentTarget as HTMLElement).style.color = "#FFFFFF"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#90CAF9"; }}>
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="text-sm">Log out</span>}
        </button>
      </div>
    </aside>
  );
}
