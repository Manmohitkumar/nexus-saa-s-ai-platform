"use client";

import { useState } from "react";
import { Bell, Search, ChevronDown } from "lucide-react";

export function DashboardTopbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="flex items-center justify-between h-16 px-6 shrink-0"
      style={{
        background: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid #D6EAF8",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}>
      {/* Left: Title */}
      <div>
        <h2 className="text-sm font-semibold font-sans leading-none" style={{ color: "#211F20" }}>{title}</h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: "#5F6B7A" }}>{subtitle}</p>}
      </div>

      {/* Right: Search + Actions + User */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#5F6B7A" }} />
          <input
            type="text"
            placeholder="Search dashboard"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="pl-9 pr-4 py-2 text-xs rounded-xl outline-none transition-all duration-200 w-48"
            style={{
              background: "#FFFFFF",
              border: `1px solid ${searchFocused ? "#2196F3" : "#D6EAF8"}`,
              color: "#211F20",
              boxShadow: searchFocused ? "0 0 0 3px rgba(33, 150, 243, 0.16)" : "none",
            }}
          />
        </div>

        {/* AI Status pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
          style={{ background: "rgba(33, 150, 243, 0.08)", border: "1px solid rgba(33, 150, 243, 0.25)" }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#2196F3" }} />
          <span className="text-xs font-medium" style={{ color: "#0D47A1" }}>AI Active</span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl transition-colors"
          style={{ color: "#5F6B7A" }}
          onMouseEnter={e => { (e.currentTarget).style.background = "rgba(144, 202, 249, 0.25)"; (e.currentTarget).style.color = "#211F20"; }}
          onMouseLeave={e => { (e.currentTarget).style.background = "transparent"; (e.currentTarget).style.color = "#5F6B7A"; }}>
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
            style={{ background: "#2196F3" }} />
        </button>

        {/* User menu */}
        <div className="relative">
          <button onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-xl transition-colors"
            style={{ border: "1px solid #D6EAF8", background: "#FFFFFF" }}
            onMouseEnter={e => (e.currentTarget).style.borderColor = "#90CAF9"}
            onMouseLeave={e => { if (!showUserMenu) (e.currentTarget).style.borderColor = "#D6EAF8"; }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ background: "linear-gradient(90deg, #2196F3, #0D47A1)", color: "#FFFFFF" }}>
              JD
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-medium leading-none" style={{ color: "#211F20" }}>Jane Doe</div>
              <div className="text-[10px] mt-0.5" style={{ color: "#5F6B7A" }}>Admin</div>
            </div>
            <ChevronDown className="w-3 h-3 hidden md:block" style={{ color: "#5F6B7A" }} />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden z-50"
              style={{ background: "#FFFFFF", border: "1px solid #D6EAF8", boxShadow: "0 14px 28px rgba(13, 71, 161, 0.16)" }}>
              {[
                { label: "Profile", icon: "👤" },
                { label: "Workspace Settings", icon: "⚙️" },
                { label: "Billing", icon: "💳" },
                { label: "Help & Support", icon: "❓" },
              ].map((item) => (
                <button key={item.label} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                  style={{ color: "#211F20" }}
                  onMouseEnter={e => { (e.currentTarget).style.background = "#EAF3FB"; (e.currentTarget).style.color = "#0D47A1"; }}
                  onMouseLeave={e => { (e.currentTarget).style.background = "transparent"; (e.currentTarget).style.color = "#211F20"; }}>
                  <span>{item.icon}</span> {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
