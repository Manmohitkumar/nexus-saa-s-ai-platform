"use client";

import { DashboardTopbar } from "@/components/dashboard/topbar";
import { useEffect, useMemo, useState } from "react";
import { Search, ZoomIn, ZoomOut, RefreshCw, Filter } from "lucide-react";
import { fetchBrainGraphView } from "@/lib/phoenix/api";
import type { BrainGraphView } from "@/lib/phoenix/types";

const riskColors: Record<string, string> = {
  low: "oklch(0.65 0.15 150)",
  medium: "oklch(0.75 0.18 60)",
  high: "oklch(0.7 0.2 40)",
  critical: "oklch(0.65 0.25 25)",
};

const typeIcons: Record<string, string> = {
  service: "⚙️", database: "🗄️", external: "🌐", repo: "📁",
};

const coordinateX = [50, 150, 280, 280, 60, 400, 420, 380, 260, 80];
const coordinateY = [50, 120, 60, 200, 180, 80, 160, 260, 310, 310];

export default function BrainPage() {
  const [graphView, setGraphView] = useState<BrainGraphView | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(1);
  const [riskFilter, setRiskFilter] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadGraph = () => {
    setRefreshing(true);
    fetchBrainGraphView()
      .then(setGraphView)
      .catch((error) => console.error("Failed to load brain graph", error))
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    loadGraph();
  }, []);

  const nodes = useMemo(() => {
    if (!graphView) return [];
    return graphView.nodes.map((node, index) => ({
      ...node,
      x: coordinateX[index % coordinateX.length] ?? 80,
      y: coordinateY[index % coordinateY.length] ?? 180,
      type: node.kind === "service" ? "service" : node.kind === "database" ? "database" : node.kind === "repository" ? "repo" : node.kind === "team" ? "repo" : "external",
    }));
  }, [graphView]);

  if (!graphView) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.07 0.015 260)" }}>
        <div className="rounded-2xl p-6 bg-white shadow-lg">Loading brain graph...</div>
      </div>
    );
  }

  const selectedNode = nodes.find((n) => n.id === selected);
  const filteredNodes = nodes.filter((n) =>
    n.label.toLowerCase().includes(search.toLowerCase())
  );

  const riskColors: Record<string, string> = {
    low: "oklch(0.65 0.15 150)",
    medium: "oklch(0.75 0.18 60)",
    high: "oklch(0.7 0.2 40)",
    critical: "oklch(0.65 0.25 25)",
  };

  const typeIcons: Record<string, string> = {
    service: "⚙️", database: "🗄️", external: "🌐", repo: "📁",
  };

  const liveUpdates = [
    { time: "2s ago", msg: "New API endpoint detected in payments-service", type: "info" },
    { time: "14s ago", msg: "Sarah Chen pushed to auth-service/feature/oauth", type: "commit" },
    { time: "1m ago", msg: "Knowledge gap detected: payments-db has no owner", type: "warning" },
    { time: "3m ago", msg: "API Gateway dependency updated to v3.2.1", type: "update" },
    { time: "5m ago", msg: "New team member Mike Ross added to analytics team", type: "info" },
  ];

  return (
      <div style={{ background: "oklch(0.07 0.015 260)", minHeight: "100vh" }}>
        <DashboardTopbar title="Organizational Digital Brain" subtitle="Living knowledge graph of your entire organization" />

        <div className="p-6 space-y-5">
          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Services", value: graphView.summary.services, icon: "⚙️" },
              { label: "Repositories", value: graphView.summary.repositories, icon: "📁" },
              { label: "Dependencies", value: graphView.summary.dependencies, icon: "🔗" },
              { label: "Knowledge Nodes", value: graphView.summary.knowledgeNodes, icon: "🧠" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-4 flex items-center gap-3"
                style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                <span className="text-xl">{s.icon}</span>
                <div>
                  <p className="text-lg font-bold text-white">{s.value}</p>
                  <p className="text-xs" style={{ color: "oklch(0.5 0.03 240)" }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Graph canvas */}
            <div className="lg:col-span-2 rounded-2xl overflow-hidden"
              style={{ background: "oklch(0.09 0.018 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
              {/* Toolbar */}
              <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid oklch(0.18 0.02 260)" }}>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "oklch(0.45 0.02 240)" }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search nodes..."
                    className="w-full pl-8 pr-4 py-1.5 text-xs rounded-lg outline-none"
                    style={{ background: "oklch(0.14 0.02 260)", border: "1px solid oklch(0.22 0.02 260)", color: "oklch(0.75 0.02 240)" }} />
                </div>
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-[10px] mr-1" style={{ color: "oklch(0.5 0.03 240)" }}>{Math.round(zoom * 100)}%</span>
                  <button onClick={() => setZoom((z) => Math.min(z + 0.15, 2))} title="Zoom in"
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: "oklch(0.5 0.03 240)" }}
                    onMouseEnter={e => { (e.currentTarget).style.background = "oklch(0.16 0.025 260)"; }}
                    onMouseLeave={e => { (e.currentTarget).style.background = "transparent"; }}>
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setZoom((z) => Math.max(z - 0.15, 0.5))} title="Zoom out"
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: "oklch(0.5 0.03 240)" }}
                    onMouseEnter={e => { (e.currentTarget).style.background = "oklch(0.16 0.025 260)"; }}
                    onMouseLeave={e => { (e.currentTarget).style.background = "transparent"; }}>
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={loadGraph} title="Refresh graph"
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: "oklch(0.5 0.03 240)" }}
                    onMouseEnter={e => { (e.currentTarget).style.background = "oklch(0.16 0.025 260)"; }}
                    onMouseLeave={e => { (e.currentTarget).style.background = "transparent"; }}>
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                  </button>
                  <button onClick={() => setRiskFilter((f) => !f)} title="Toggle low-risk nodes"
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: riskFilter ? "oklch(0.7 0.18 170)" : "oklch(0.5 0.03 240)" }}
                    onMouseEnter={e => { (e.currentTarget).style.background = "oklch(0.16 0.025 260)"; }}
                    onMouseLeave={e => { (e.currentTarget).style.background = "transparent"; }}>
                    <Filter className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* SVG Graph */}
              <div className="relative" style={{ height: "420px" }}>
                <svg width="100%" height="100%" viewBox="0 0 500 380"
                  style={{ backgroundImage: "radial-gradient(oklch(0.7 0.18 170 / 0.04) 1px, transparent 1px)", backgroundSize: "20px 20px", transform: `scale(${zoom})`, transformOrigin: "50% 50%", transition: "transform 0.2s ease" }}>
                  {/* Edges */}
                  {nodes.map((node) =>
                    node.connections.map((conn) => {
                      const target = nodes.find((n) => n.id === conn);
                      if (!target) return null;
                      const isHighlighted = selected === node.id || selected === conn;
                      return (
                        <line key={`${node.id}-${conn}`}
                          x1={node.x * 0.95 + 20} y1={node.y * 1.0 + 10}
                          x2={target.x * 0.95 + 20} y2={target.y * 1.0 + 10}
                          stroke={isHighlighted ? "oklch(0.7 0.18 170)" : "oklch(0.3 0.02 260)"}
                          strokeWidth={isHighlighted ? 1.5 : 0.8}
                          strokeOpacity={isHighlighted ? 0.9 : 0.5}
                          style={{ filter: isHighlighted ? "drop-shadow(0 0 4px oklch(0.7 0.18 170 / 0.5))" : "none" }}
                        />
                      );
                    })
                  )}
                  {/* Nodes */}
                  {nodes.map((node) => {
                    const isActive = (filteredNodes.includes(node) || !search) && (!riskFilter || node.risk !== "low");
                    const isSelected = selected === node.id;
                    const nx = node.x * 0.95 + 20;
                    const ny = node.y * 1.0 + 10;
                    return (
                      <g key={node.id} transform={`translate(${nx}, ${ny})`}
                        className="cursor-pointer"
                        onClick={() => setSelected(selected === node.id ? null : node.id)}
                        style={{ opacity: isActive ? 1 : 0.2 }}>
                        {isSelected && (
                          <circle r="22" fill="none" stroke="oklch(0.7 0.18 170)" strokeWidth="1"
                            strokeOpacity="0.5" strokeDasharray="3 2">
                            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="8s" repeatCount="indefinite" />
                          </circle>
                        )}
                        <circle r="14" fill="oklch(0.14 0.025 260)"
                          stroke={isSelected ? "oklch(0.7 0.18 170)" : riskColors[node.risk]}
                          strokeWidth={isSelected ? 2 : 1.2}
                          style={{ filter: isSelected ? "drop-shadow(0 0 8px oklch(0.7 0.18 170 / 0.6))" : `drop-shadow(0 0 4px ${riskColors[node.risk]} / 0.3)` }} />
                        <text textAnchor="middle" dy=".35em" fontSize="11" fill="white">{typeIcons[node.type]}</text>
                        <text textAnchor="middle" dy="26" fontSize="8" fill="oklch(0.6 0.02 240)">{node.label}</text>
                      </g>
                    );
                  })}
                </svg>

                {/* Legend */}
                <div className="absolute bottom-3 left-3 flex items-center gap-3 flex-wrap">
                  {Object.entries(riskColors).map(([key, color]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="text-[10px] capitalize" style={{ color: "oklch(0.5 0.03 240)" }}>{key}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right panel */}
            <div className="space-y-4">
              {/* Node details */}
              {selectedNode ? (
                <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.7 0.18 170 / 0.3)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">{typeIcons[selectedNode.type]}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{selectedNode.label}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: riskColors[selectedNode.risk] }} />
                        <span className="text-[10px] capitalize" style={{ color: riskColors[selectedNode.risk] }}>{selectedNode.risk} risk</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-lg p-3" style={{ background: "oklch(0.09 0.018 260)" }}>
                      <p className="text-[10px] font-medium mb-1" style={{ color: "oklch(0.5 0.03 240)" }}>CONNECTIONS</p>
                      <p className="text-sm text-white font-bold">{selectedNode.connections.length}</p>
                    </div>
                    <div className="rounded-lg p-3" style={{ background: "oklch(0.09 0.018 260)" }}>
                      <p className="text-[10px] font-medium mb-1" style={{ color: "oklch(0.5 0.03 240)" }}>TYPE</p>
                      <p className="text-sm text-white capitalize">{selectedNode.type}</p>
                    </div>
                    {selectedNode.connections.length > 0 && (
                      <div className="rounded-lg p-3" style={{ background: "oklch(0.09 0.018 260)" }}>
                        <p className="text-[10px] font-medium mb-2" style={{ color: "oklch(0.5 0.03 240)" }}>DEPENDS ON</p>
                        <div className="space-y-1">
                          {selectedNode.connections.map((c) => (
                            <div key={c} className="text-xs text-white flex items-center gap-1.5">
                              <div className="w-1 h-1 rounded-full" style={{ background: "oklch(0.7 0.18 170)" }} />
                              {nodes.find((n) => n.id === c)?.label || c}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl p-5 text-center" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                  <span className="text-3xl">🧠</span>
                  <p className="text-sm text-white mt-2">Click any node to explore</p>
                  <p className="text-xs mt-1" style={{ color: "oklch(0.5 0.03 240)" }}>See connections, owners, and risk</p>
                </div>
              )}

              {/* Live updates */}
              <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.22 0.02 260)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "oklch(0.65 0.15 150)" }} />
                  <span className="text-xs font-semibold text-white">Live Updates</span>
                </div>
                <div className="space-y-3">
                  {liveUpdates.map((u, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-[10px] shrink-0 mt-0.5" style={{ color: "oklch(0.4 0.02 240)" }}>{u.time}</span>
                      <p className="text-[11px]" style={{ color: "oklch(0.6 0.02 240)" }}>{u.msg}</p>
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
