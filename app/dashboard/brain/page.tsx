"use client";

import { DashboardTopbar } from "@/components/dashboard/topbar";
import { useEffect, useMemo, useState } from "react";
import { Search, ZoomIn, ZoomOut, RefreshCw, Filter } from "lucide-react";
import { fetchBrainGraphView, fetchBrainGraphNode, fetchRecentEvents } from "@/lib/phoenix/api";
import type { BrainGraphNodeDetail, BrainGraphView, BusEvent } from "@/lib/phoenix/types";

const riskColors: Record<string, string> = {
  low: "oklch(0.65 0.15 150)",
  medium: "oklch(0.75 0.18 60)",
  high: "oklch(0.7 0.2 40)",
  critical: "oklch(0.65 0.25 25)",
};

const typeIcons: Record<string, string> = {
  service: "⚙️", database: "🗄️", external: "🌐", repo: "📁", team: "👥", person: "🧑‍💻",
};

const coordinateX = [50, 150, 280, 280, 60, 400, 420, 380, 260, 80, 200, 340, 110];
const coordinateY = [50, 120, 60, 200, 180, 80, 160, 260, 310, 310, 250, 30, 330];

export default function BrainPage() {
  const [graphView, setGraphView] = useState<BrainGraphView | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<BrainGraphNodeDetail | null>(null);
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(1);
  const [riskFilter, setRiskFilter] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [liveEvents, setLiveEvents] = useState<BusEvent[]>([]);

  const loadGraph = () => {
    setRefreshing(true);
    fetchBrainGraphView()
      .then(setGraphView)
      .catch((error) => console.error("Failed to load brain graph", error))
      .finally(() => setRefreshing(false));
  };

  const loadEvents = () => {
    fetchRecentEvents()
      .then((res) => setLiveEvents(res.events))
      .catch((error) => console.error("Failed to load events", error));
  };

  const selectNode = (id: string | null) => {
    setSelected(id);
    setSelectedDetail(null);
    if (!id) return;
    fetchBrainGraphNode(id)
      .then(setSelectedDetail)
      .catch((error) => {
        console.error("Failed to load node detail", error);
        setSelectedDetail(null);
      });
  };

  useEffect(() => {
    loadGraph();
    loadEvents();
    const timer = setInterval(loadEvents, 15000);
    return () => clearInterval(timer);
  }, []);

  const nodes = useMemo(() => {
    if (!graphView) return [];
    return graphView.nodes.map((node, index) => ({
      ...node,
      x: coordinateX[index % coordinateX.length] ?? 80,
      y: coordinateY[index % coordinateY.length] ?? 180,
      type: node.kind === "service" ? "service" : node.kind === "database" ? "database" : node.kind === "repository" ? "repo" : node.kind === "team" ? "team" : "person",
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
    service: "⚙️", database: "🗄️", external: "🌐", repo: "📁", team: "👥", person: "🧑‍💻",
  };

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
                        onClick={() => selectNode(selected === node.id ? null : node.id)}
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
              {selected ? (
                <div className="rounded-2xl p-5" style={{ background: "oklch(0.11 0.02 260)", border: "1px solid oklch(0.7 0.18 170 / 0.3)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">{typeIcons[selectedNode?.type ?? "service"]}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{selectedNode?.label}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: riskColors[selectedNode?.risk ?? "low"] }} />
                        <span className="text-[10px] capitalize" style={{ color: riskColors[selectedNode?.risk ?? "low"] }}>{selectedNode?.risk} risk</span>
                      </div>
                    </div>
                  </div>

                  {!selectedDetail ? (
                    <div className="rounded-lg p-4 text-center" style={{ background: "oklch(0.09 0.018 260)" }}>
                      <p className="text-xs" style={{ color: "oklch(0.5 0.03 240)" }}>Loading detail...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDetail.summary && (
                        <div className="rounded-lg p-3" style={{ background: "oklch(0.09 0.018 260)" }}>
                          <p className="text-[10px] font-medium mb-1" style={{ color: "oklch(0.5 0.03 240)" }}>SUMMARY</p>
                          <p className="text-xs" style={{ color: "oklch(0.75 0.02 240)" }}>{selectedDetail.summary}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg p-3" style={{ background: "oklch(0.09 0.018 260)" }}>
                          <p className="text-[10px] font-medium mb-1" style={{ color: "oklch(0.5 0.03 240)" }}>OWNER</p>
                          <p className="text-sm text-white font-bold">{selectedDetail.owner ?? "Unassigned"}</p>
                          {selectedDetail.ownerRole && (
                            <p className="text-[10px] mt-0.5" style={{ color: "oklch(0.5 0.03 240)" }}>{selectedDetail.ownerRole}</p>
                          )}
                        </div>
                        <div className="rounded-lg p-3" style={{ background: "oklch(0.09 0.018 260)" }}>
                          <p className="text-[10px] font-medium mb-1" style={{ color: "oklch(0.5 0.03 240)" }}>TYPE</p>
                          <p className="text-sm text-white capitalize">{selectedDetail.kind}</p>
                          {selectedDetail.team && (
                            <p className="text-[10px] mt-0.5" style={{ color: "oklch(0.5 0.03 240)" }}>{selectedDetail.team}</p>
                          )}
                        </div>
                      </div>

                      {selectedDetail.flagStats.total > 0 && (
                        <div className="rounded-lg p-3" style={{ background: "oklch(0.09 0.018 260)" }}>
                          <p className="text-[10px] font-medium mb-2" style={{ color: "oklch(0.5 0.03 240)" }}>FEATURE FLAGS</p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-sm font-bold text-white">{selectedDetail.flagStats.total}</p>
                              <p className="text-[9px]" style={{ color: "oklch(0.5 0.03 240)" }}>total</p>
                            </div>
                            <div>
                              <p className="text-sm font-bold" style={{ color: "oklch(0.75 0.18 60)" }}>{selectedDetail.flagStats.undocumented}</p>
                              <p className="text-[9px]" style={{ color: "oklch(0.5 0.03 240)" }}>undocumented</p>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{selectedDetail.flagStats.enabled}</p>
                              <p className="text-[9px]" style={{ color: "oklch(0.5 0.03 240)" }}>enabled</p>
                            </div>
                            <div>
                              <p className="text-sm font-bold" style={{ color: "oklch(0.7 0.2 40)" }}>{selectedDetail.flagStats.enabledUndocumented}</p>
                              <p className="text-[9px]" style={{ color: "oklch(0.5 0.03 240)" }}>live undocumented</p>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{selectedDetail.flagStats.killSwitches}</p>
                              <p className="text-[9px]" style={{ color: "oklch(0.5 0.03 240)" }}>kill-switches</p>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{selectedDetail.flagStats.experiments}</p>
                              <p className="text-[9px]" style={{ color: "oklch(0.5 0.03 240)" }}>experiments</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedDetail.insight && (
                        <div className="rounded-lg p-3" style={{ background: "oklch(0.09 0.018 260)" }}>
                          <p className="text-[10px] font-medium mb-1" style={{ color: "oklch(0.5 0.03 240)" }}>AI INSIGHT</p>
                          <p className="text-xs" style={{ color: "oklch(0.75 0.02 240)" }}>{selectedDetail.insight}</p>
                        </div>
                      )}

                      {selectedDetail.recommendations.length > 0 && (
                        <div className="rounded-lg p-3" style={{ background: "oklch(0.09 0.018 260)" }}>
                          <p className="text-[10px] font-medium mb-2" style={{ color: "oklch(0.5 0.03 240)" }}>RECOMMENDATIONS</p>
                          <div className="space-y-1.5">
                            {selectedDetail.recommendations.map((r, i) => (
                              <div key={i} className="text-xs flex items-start gap-1.5" style={{ color: "oklch(0.6 0.02 240)" }}>
                                <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: "oklch(0.7 0.18 170)" }} />
                                {r}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedDetail.connections.length > 0 && (
                        <div className="rounded-lg p-3" style={{ background: "oklch(0.09 0.018 260)" }}>
                          <p className="text-[10px] font-medium mb-2" style={{ color: "oklch(0.5 0.03 240)" }}>CONNECTED ENTITIES</p>
                          <div className="space-y-1">
                            {selectedDetail.connections.map((c) => (
                              <div key={c.targetId} className="text-xs flex items-center gap-1.5" style={{ color: "oklch(0.6 0.02 240)" }}>
                                <div className="w-1 h-1 rounded-full shrink-0" style={{ background: "oklch(0.7 0.18 170)" }} />
                                <span>{c.direction === "out" ? "→" : "←"}</span>
                                <span className="font-medium" style={{ color: "oklch(0.8 0.02 240)" }}>{c.targetLabel}</span>
                                <span className="text-[10px]" style={{ color: "oklch(0.5 0.03 240)" }}>{c.type}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                  {liveEvents.length === 0 ? (
                    <p className="text-[11px]" style={{ color: "oklch(0.4 0.02 240)" }}>No events yet.</p>
                  ) : (
                    liveEvents.slice(0, 8).map((e, i) => (
                      <div key={`${e.resource}-${i}`} className="flex gap-2">
                        <span className="text-[10px] shrink-0 mt-0.5" style={{ color: "oklch(0.4 0.02 240)" }}>
                          {new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <p className="text-[11px]" style={{ color: "oklch(0.6 0.02 240)" }}>
                          <span className="font-medium" style={{ color: "oklch(0.75 0.02 240)" }}>{e.resource}: </span>
                          {e.detail}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
