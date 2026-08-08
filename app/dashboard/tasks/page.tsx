"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import {
  addTaskDependency,
  assignTask,
  createTask,
  exportProjectTasks,
  exportTask,
  fetchProjectExports,
  fetchTaskDetail,
  fetchTaskEvents,
  fetchTaskExports,
  fetchTaskOverview,
  fetchTaskProjects,
  fetchTasks,
  generateTask,
  removeTaskDependency,
  toggleChecklistItem,
  updateTaskStatus,
  validateTask,
} from "@/lib/phoenix/api";
import { projectReportToPdf } from "@/lib/phoenix/project-pdf";
import type {
  AgentTaskView,
  BusEvent,
  ProjectExportView,
  TaskDetailView,
  TaskExplorerFilters,
  TaskOverview,
} from "@/lib/phoenix/types";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  ClipboardCheck,
  Download,
  FileText,
  Filter,
  Link2,
  ListChecks,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  X,
  Zap,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens & helpers (Project Phoenix light theme)
// ---------------------------------------------------------------------------

const featureLabels: Record<string, string> = {
  "org-brain": "Org Brain",
  decisions: "Decisions",
  "exit-sim": "Exit Simulation",
  risk: "Risk Heatmap",
  mentor: "Mentor",
  docs: "Docs Engine",
  intelligence: "Intelligence",
  executive: "Executive",
  "cross-feature": "Cross-Feature",
};

const featureColors: Record<string, string> = {
  "org-brain": "#0D47A1",
  decisions: "#6A1B9A",
  "exit-sim": "#C62828",
  risk: "#E65100",
  mentor: "#00695C",
  docs: "#4527A0",
  intelligence: "#2E7D32",
  executive: "#1A237E",
  "cross-feature": "#F9A825",
};

const readinessStyles: Record<string, { bg: string; fg: string; label: string }> = {
  ready: { bg: "rgba(46, 125, 50, 0.12)", fg: "#2E7D32", label: "ready" },
  waiting: { bg: "rgba(33, 150, 243, 0.12)", fg: "#0D47A1", label: "waiting" },
  blocked: { bg: "rgba(211, 47, 47, 0.12)", fg: "#D32F2F", label: "blocked" },
  failed: { bg: "rgba(211, 47, 47, 0.16)", fg: "#B71C1C", label: "failed" },
  stale: { bg: "rgba(249, 168, 37, 0.16)", fg: "#B26A00", label: "stale" },
  "missing-data": { bg: "rgba(230, 81, 0, 0.14)", fg: "#E65100", label: "missing data" },
  complete: { bg: "rgba(46, 125, 50, 0.14)", fg: "#1B5E20", label: "complete" },
};

const statusStyles: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "rgba(95, 107, 122, 0.12)", fg: "#5F6B7A" },
  in_progress: { bg: "rgba(33, 150, 243, 0.12)", fg: "#0D47A1" },
  awaiting_review: { bg: "rgba(249, 168, 37, 0.16)", fg: "#B26A00" },
  complete: { bg: "rgba(46, 125, 50, 0.12)", fg: "#2E7D32" },
  blocked: { bg: "rgba(211, 47, 47, 0.12)", fg: "#D32F2F" },
};

const validationStyles: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "rgba(95, 107, 122, 0.12)", fg: "#5F6B7A" },
  validated: { bg: "rgba(46, 125, 50, 0.12)", fg: "#2E7D32" },
  missing: { bg: "rgba(230, 81, 0, 0.14)", fg: "#E65100" },
  inaccessible: { bg: "rgba(211, 47, 47, 0.12)", fg: "#D32F2F" },
  stale: { bg: "rgba(249, 168, 37, 0.16)", fg: "#B26A00" },
  invalid: { bg: "rgba(211, 47, 47, 0.12)", fg: "#D32F2F" },
  conflicting: { bg: "rgba(211, 47, 47, 0.12)", fg: "#D32F2F" },
  "needs-review": { bg: "rgba(249, 168, 37, 0.16)", fg: "#B26A00" },
};

const dependencyStyles: Record<string, { bg: string; fg: string }> = {
  ready: { bg: "rgba(46, 125, 50, 0.12)", fg: "#2E7D32" },
  waiting: { bg: "rgba(33, 150, 243, 0.12)", fg: "#0D47A1" },
  blocked: { bg: "rgba(211, 47, 47, 0.12)", fg: "#D32F2F" },
  failed: { bg: "rgba(211, 47, 47, 0.16)", fg: "#B71C1C" },
  stale: { bg: "rgba(249, 168, 37, 0.16)", fg: "#B26A00" },
  "missing-data": { bg: "rgba(230, 81, 0, 0.14)", fg: "#E65100" },
  complete: { bg: "rgba(46, 125, 50, 0.14)", fg: "#1B5E20" },
};

function Card({ children, className = "", accent }: { children: React.ReactNode; className?: string; accent?: string }) {
  return (
    <section
      className={`rounded-2xl p-6 ${className}`}
      style={{ background: "#FFFFFF", border: `1px solid ${accent ?? "#D6EAF8"}`, boxShadow: "0 10px 30px rgba(33,150,243,.12)" }}
    >
      {children}
    </section>
  );
}

function CardHeader({ icon: Icon, title, badge, action }: { icon: typeof Activity; title: string; badge?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon className="h-4 w-4" style={{ color: "#0D47A1" }} />
      <h2 className="text-lg font-semibold" style={{ color: "#211F20" }}>{title}</h2>
      {badge}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

function ReadinessPill({ readiness }: { readiness: string }) {
  const s = readinessStyles[readiness] ?? readinessStyles.waiting;
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = statusStyles[status] ?? statusStyles.pending;
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background: s.bg, color: s.fg }}>
      {status.replace("_", " ")}
    </span>
  );
}

function FeatureBadge({ feature }: { feature: string }) {
  const color = featureColors[feature] ?? "#5F6B7A";
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background: `${color}14`, color }}>
      {featureLabels[feature] ?? feature}
    </span>
  );
}

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "#0D47A1" }}>{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-semibold" style={{ color: "#211F20" }}>{title}</h1>
      {description && <p className="mt-1 text-sm" style={{ color: "#1E3A5F" }}>{description}</p>}
    </div>
  );
}

function ProgressBar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full" style={{ background: "#EAF3FB" }}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color ?? (value >= 80 ? "#43A047" : value >= 50 ? "#F9A825" : "#E53935") }} />
    </div>
  );
}

function toLocal(s: string) {
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

// Section-level search highlighting: wraps every occurrence of the free-text
// search query in the task title/description so the match is visible at a
// glance in the explorer results.
function Highlight({ text, query }: { text: string; query?: string }) {
  if (!query || !text) return <>{text}</>;
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  let at = lower.indexOf(ql, i);
  let key = 0;
  while (at !== -1) {
    if (at > i) parts.push(text.slice(i, at));
    parts.push(
      <mark key={key++} className="rounded-sm" style={{ background: "#FFF59D", color: "#211F20" }}>
        {text.slice(at, at + q.length)}
      </mark>,
    );
    i = at + q.length;
    at = lower.indexOf(ql, i);
  }
  if (i < text.length) parts.push(text.slice(i));
  return <>{parts}</>;
}

// ---------------------------------------------------------------------------
// Task Explorer (search + combined filters + reset)
// ---------------------------------------------------------------------------

const FEATURES = Object.keys(featureLabels);
const STATUSES = ["pending", "in_progress", "awaiting_review", "complete", "blocked"];
const READINESSES = ["ready", "waiting", "blocked", "failed", "stale", "missing-data", "complete"];

export default function TaskExplorer() {
  const [overview, setOverview] = useState<TaskOverview | null>(null);
  const [tasks, setTasks] = useState<AgentTaskView[]>([]);
  const [events, setEvents] = useState<BusEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TaskDetailView | null>(null);
  const [exports, setExports] = useState<Array<{ id: string; format: string; createdAt: string }>>([]);

  const [filters, setFilters] = useState<TaskExplorerFilters>({});
  const [searchDraft, setSearchDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [expandedActivity, setExpandedActivity] = useState(false);
  const [projects, setProjects] = useState<Array<{ project: string; count: number }>>([]);
  const [projectExportProject, setProjectExportProject] = useState("");
  const [projectExports, setProjectExports] = useState<ProjectExportView[]>([]);

  const loadExplorer = useCallback(async (f: TaskExplorerFilters) => {
    try {
      const [ov, res, ev, pr] = await Promise.all([fetchTaskOverview(), fetchTasks(f), fetchTaskEvents(), fetchTaskProjects()]);
      setOverview(ov);
      setTasks(res.tasks);
      setEvents(ev);
      setProjects(pr);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load task explorer");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExplorer(filters);
  }, [loadExplorer, filters]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const [d, ex] = await Promise.all([fetchTaskDetail(id), fetchTaskExports(id)]);
      setDetail(d);
      setExports(ex);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load task detail");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openTask = async (id: string) => {
    setSelectedId(id);
    await loadDetail(id);
  };

  const refreshDetail = async () => {
    if (!selectedId) return;
    await loadDetail(selectedId);
    await loadExplorer(filters);
  };

  const setFilter = (key: keyof TaskExplorerFilters, value: string | undefined) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value === undefined || value === "") delete next[key];
      else next[key] = value;
      return next;
    });
  };

  const resetFilters = () => {
    setFilters({});
    setSearchDraft("");
  };

  const activeFilterCount = Object.values(filters).filter((v) => v !== undefined && v !== "").length;

  const handleGenerate = async () => {
    if (!selectedId) return;
    setBusy("generate");
    try {
      const result = await generateTask(selectedId);
      if (!result.executed && result.preValidation.blocked) {
        setError(`Generation blocked: ${result.preValidation.failures.join("; ")}`);
      }
      await refreshDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(null);
    }
  };

  const handleValidate = async () => {
    if (!selectedId) return;
    setBusy("validate");
    try {
      await validateTask(selectedId);
      await refreshDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setBusy(null);
    }
  };

  const handleToggle = async (itemId: string, completed: boolean) => {
    if (!selectedId) return;
    setBusy(`check-${itemId}`);
    try {
      await toggleChecklistItem(selectedId, itemId, completed);
      await refreshDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checklist update failed");
    } finally {
      setBusy(null);
    }
  };

  const handleStatus = async (status: string) => {
    if (!selectedId) return;
    setBusy("status");
    try {
      await updateTaskStatus(selectedId, status);
      await refreshDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setBusy(null);
    }
  };

  const handleExport = async (format: "markdown" | "csv" | "html") => {
    if (!selectedId) return;
    setBusy(`export-${format}`);
    try {
      const result = await exportTask(selectedId, format);
      await refreshDetail();
      const blob = new Blob([result.content], { type: format === "html" ? "text/html" : format === "csv" ? "text/csv" : "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  };

  const handlePrintPdf = async () => {
    if (!selectedId) return;
    setBusy("pdf");
    try {
      const result = await exportTask(selectedId, "html");
      const win = window.open("", "_blank", "width=900,height=700");
      if (!win) {
        setError("Popup blocked — allow popups to save the task report as PDF.");
        return;
      }
      win.document.open();
      win.document.write(result.content);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 400);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF export failed");
    } finally {
      setBusy(null);
    }
  };

  const handleRemoveDependency = async (dependencyId: string) => {
    if (!selectedId) return;
    setBusy("dep");
    try {
      await removeTaskDependency(selectedId, dependencyId);
      await refreshDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dependency removal failed");
    } finally {
      setBusy(null);
    }
  };

  const handleProjectExport = async (format: "markdown" | "csv" | "html") => {
    if (!projectExportProject) {
      setError("Select a project to export.");
      return;
    }
    setBusy(`project-${format}`);
    try {
      const result = await exportProjectTasks(projectExportProject, format);
      await loadProjectExports(projectExportProject);
      const blob = new Blob([result.content], { type: format === "html" ? "text/html" : format === "csv" ? "text/csv" : "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectExportProject.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}-report.${format === "html" ? "html" : format === "csv" ? "csv" : "md"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Project export failed");
    } finally {
      setBusy(null);
    }
  };

  const handleProjectExportJson = async () => {
    if (!projectExportProject) {
      setError("Select a project to export.");
      return;
    }
    setBusy("project-json");
    try {
      const result = await exportProjectTasks(projectExportProject, "json");
      const blob = new Blob([result.content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectExportProject.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}-report.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Project export failed");
    } finally {
      setBusy(null);
    }
  };

  const handleProjectExportPdf = async () => {
    if (!projectExportProject) {
      setError("Select a project to export.");
      return;
    }
    setBusy("project-pdf");
    try {
      const result = await exportProjectTasks(projectExportProject, "json");
      const doc = projectReportToPdf(JSON.parse(result.content), "system");
      doc.save(`${projectExportProject.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}-report.pdf`);
      await loadProjectExports(projectExportProject);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF export failed");
    } finally {
      setBusy(null);
    }
  };

  const loadProjectExports = useCallback(async (project: string) => {
    try {
      const ex = await fetchTaskProjects(); // keeps projects list fresh
      setProjects(ex);
      const rows = await fetchProjectExports(project);
      setProjectExports(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load project exports");
    }
  }, []);

  const selected = tasks.find((t) => t.id === selectedId);

  return (
    <div className="min-h-screen" style={{ background: "#E3F2FD" }}>
      <DashboardTopbar
        title="Agent Task Intelligence"
        subtitle="Shared coordination layer across the eight ACE features"
      />

      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        {/* Header banner */}
        <section
          className="rounded-2xl p-6"
          style={{ background: "linear-gradient(135deg, #E3F2FD 0%, #90CAF9 45%, #2196F3 100%)", border: "1px solid #D6EAF8", boxShadow: "0 10px 30px rgba(33,150,243,.12)" }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "#0D47A1" }}>
                Feature 9 · Agent Task Intelligence Layer
              </p>
              <h1 className="mt-2 text-2xl font-semibold" style={{ color: "#211F20" }}>
                Task Intelligence Explorer
              </h1>
              <p className="mt-1 max-w-2xl text-sm" style={{ color: "#1E3A5F" }}>
                Agent tasks declare source checklists, validate evidence against existing ACE features, expose readiness,
                and report every result with full evidence mapping. This layer owns no intelligence — it coordinates it.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowNewTask(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity"
                style={{ background: "#0D47A1", color: "#FFFFFF" }}
              >
                <Plus className="h-4 w-4" /> New task
              </button>
              <div className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs" style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(13,71,161,0.18)", color: "#0D47A1" }}>
                <RefreshCw className="h-3.5 w-3.5" /> Event-driven readiness updates
              </div>
            </div>
          </div>
        </section>

        {error && (
          <section className="rounded-2xl border p-4 text-sm" style={{ background: "#FFF9F9", borderColor: "#F5C6C6", color: "#D32F2F" }}>
            {error}
          </section>
        )}

        {showNewTask && (
          <NewTaskForm
            onClose={() => setShowNewTask(false)}
            onCreated={async (id) => {
              setShowNewTask(false);
              setFilters({});
              await loadExplorer({});
              await openTask(id);
            }}
          />
        )}

        {/* Summary strip */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Total Tasks", value: `${overview?.total ?? "—"}`, icon: ListChecks },
            { label: "Awaiting Review", value: `${overview?.awaitingReview ?? "—"}`, icon: ClipboardCheck },
            { label: "Missing Data", value: `${overview?.missingDataTasks ?? "—"}`, icon: AlertTriangle },
            { label: "Exports Generated", value: `${overview?.exportsGenerated ?? "—"}`, icon: FileText },
          ].map((card) => (
            <Card key={card.label} className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium" style={{ color: "#5F6B7A" }}>{card.label}</p>
                <card.icon className="h-4 w-4" style={{ color: "#2196F3" }} />
              </div>
              <p className="mt-2 text-3xl font-semibold" style={{ color: "#211F20" }}>{card.value}</p>
            </Card>
          ))}
        </section>

        {/* Feature chain */}
        <Card>
          <CardHeader icon={Link2} title="Feature Execution Chain" badge={<span className="rounded-full px-2 py-1 text-xs" style={{ background: "#EAF3FB", color: "#0D47A1" }}>task layer coordinates all features</span>} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(overview?.featureChain ?? []).map((entry) => (
              <div key={entry.feature} className="rounded-xl border p-3" style={{ borderColor: "#EAF3FB", background: "#F8FBFF" }}>
                <div className="flex items-center justify-between gap-2">
                  <FeatureBadge feature={entry.feature} />
                  <span className="text-xs font-semibold" style={{ color: "#211F20" }}>{entry.tasks} tasks</span>
                </div>
                <p className="mt-2 text-xs" style={{ color: "#5F6B7A" }}>{entry.label}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded-full px-2 py-0.5" style={{ background: "rgba(46,125,50,0.12)", color: "#2E7D32" }}>{entry.ready} ready</span>
                  <span className="rounded-full px-2 py-0.5" style={{ background: "rgba(211,47,47,0.12)", color: "#D32F2F" }}>{entry.blocked} blocked</span>
                  <span className="rounded-full px-2 py-0.5" style={{ background: "rgba(230,81,0,0.14)", color: "#E65100" }}>{entry.missingData} missing</span>
                  <span className="rounded-full px-2 py-0.5" style={{ background: "rgba(46,125,50,0.14)", color: "#1B5E20" }}>{entry.complete} complete</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Task explorer */}
        <Card>
          <CardHeader
            icon={Search}
            title="Task Explorer"
            badge={<span className="rounded-full px-2 py-1 text-xs" style={{ background: "#EAF3FB", color: "#0D47A1" }}>{tasks.length} shown</span>}
            action={
              <button onClick={resetFilters} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "#EAF3FB", color: "#0D47A1" }}>
                <RotateCcw className="h-3 w-3" /> Reset filters
              </button>
            }
          />

          {/* Combined filters */}
          <div className="mb-4 rounded-xl border p-3" style={{ borderColor: "#EAF3FB", background: "#F8FBFF" }}>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4" style={{ color: "#90A4AE" }} />
              <select
                value={filters.feature ?? ""}
                onChange={(e) => setFilter("feature", e.target.value || undefined)}
                className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                style={{ borderColor: "#D6EAF8", color: "#211F20", background: "#FFFFFF" }}
              >
                <option value="">All features</option>
                {FEATURES.map((f) => <option key={f} value={f}>{featureLabels[f]}</option>)}
              </select>
              <select
                value={filters.status ?? ""}
                onChange={(e) => setFilter("status", e.target.value || undefined)}
                className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                style={{ borderColor: "#D6EAF8", color: "#211F20", background: "#FFFFFF" }}
              >
                <option value="">All statuses</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
              <select
                value={filters.readiness ?? ""}
                onChange={(e) => setFilter("readiness", e.target.value || undefined)}
                className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                style={{ borderColor: "#D6EAF8", color: "#211F20", background: "#FFFFFF" }}
              >
                <option value="">All readiness</option>
                {READINESSES.map((r) => <option key={r} value={r}>{r.replace("-", " ")}</option>)}
              </select>
              <select
                value={filters.missingData ?? ""}
                onChange={(e) => setFilter("missingData", e.target.value || undefined)}
                className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                style={{ borderColor: "#D6EAF8", color: "#211F20", background: "#FFFFFF" }}
              >
                <option value="">Any missing data</option>
                <option value="true">Has missing data</option>
                <option value="false">No missing data</option>
              </select>
              <select
                value={filters.project ?? ""}
                onChange={(e) => setFilter("project", e.target.value || undefined)}
                className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                style={{ borderColor: "#D6EAF8", color: "#211F20", background: "#FFFFFF" }}
              >
                <option value="">All projects</option>
                {projects.map((p) => <option key={p.project} value={p.project}>{p.project} ({p.count})</option>)}
              </select>
              <select
                value={filters.dependencyState ?? ""}
                onChange={(e) => setFilter("dependencyState", e.target.value || undefined)}
                className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                style={{ borderColor: "#D6EAF8", color: "#211F20", background: "#FFFFFF" }}
              >
                <option value="">Any dependency state</option>
                <option value="blocked">Has blocked dependencies</option>
                <option value="clear">No blocked dependencies</option>
              </select>
              <input
                value={filters.owner ?? ""}
                onChange={(e) => setFilter("owner", e.target.value || undefined)}
                placeholder="Owner..."
                className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                style={{ borderColor: "#D6EAF8", color: "#211F20", background: "#FFFFFF" }}
              />
              <input
                value={filters.section ?? ""}
                onChange={(e) => setFilter("section", e.target.value || undefined)}
                placeholder="Section..."
                className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                style={{ borderColor: "#D6EAF8", color: "#211F20", background: "#FFFFFF" }}
              />
              <input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") setFilter("search", searchDraft || undefined); }}
                placeholder="Search title, description, notes, sections..."
                className="min-w-40 flex-1 rounded-lg border px-3 py-1.5 text-xs outline-none"
                style={{ borderColor: "#D6EAF8", color: "#211F20", background: "#FFFFFF" }}
              />
              <button
                onClick={() => setFilter("search", searchDraft || undefined)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                style={{ background: "#0D47A1", color: "#FFFFFF" }}
              >
                Search
              </button>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase" style={{ color: "#90A4AE" }}>Active filters</span>
                {Object.entries(filters).filter(([, v]) => v !== undefined && v !== "").map(([key, value]) => (
                  <span key={key} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ background: "#EAF3FB", color: "#0D47A1" }}>
                    {key === "search" ? `search: ${value}` : `${key}: ${value}`}
                    <button onClick={() => setFilter(key as keyof TaskExplorerFilters, undefined)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <button onClick={resetFilters} className="text-[10px] font-semibold underline" style={{ color: "#D32F2F" }}>Clear all</button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm" style={{ color: "#5F6B7A" }}>
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" style={{ color: "#2196F3" }} />
              Assembling task explorer...
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-8 text-center text-sm" style={{ color: "#5F6B7A" }}>
              No tasks match the current filters. Adjust the filters above or create a new task.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#90A4AE" }}>
                    <th className="pb-3 pr-3">Task</th>
                    <th className="pb-3 pr-3">Feature</th>
                    <th className="pb-3 pr-3">Readiness</th>
                    <th className="pb-3 pr-3">Status</th>
                    <th className="pb-3 pr-3">Checklist</th>
                    <th className="pb-3 pr-3">Agent</th>
                    <th className="pb-3 pr-3">Updated</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => {
                    const selected = task.id === selectedId;
                    return (
                      <tr
                        key={task.id}
                        onClick={() => openTask(task.id)}
                        className="cursor-pointer transition-colors"
                        style={{ background: selected ? "#EAF3FB" : "transparent", borderTop: "1px solid #EAF3FB" }}
                      >
                        <td className="py-3 pr-3">
                          <p className="font-semibold" style={{ color: "#211F20" }}><Highlight text={task.title} query={filters.search} /></p>
                          <p className="mt-0.5 line-clamp-1 text-[11px]" style={{ color: "#5F6B7A" }}><Highlight text={task.description || "—"} query={filters.search} /></p>
                        </td>
                        <td className="py-3 pr-3"><FeatureBadge feature={task.feature} /></td>
                        <td className="py-3 pr-3"><ReadinessPill readiness={task.readiness} /></td>
                        <td className="py-3 pr-3"><StatusPill status={task.status} /></td>
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2">
                            <ProgressBar value={task.indicators.requiredPercentage} color={task.indicators.requiredPercentage >= 100 ? "#43A047" : undefined} />
                            <span className="text-[10px] font-semibold" style={{ color: "#5F6B7A" }}>
                              {task.indicators.requiredComplete}/{task.indicators.requiredTotal}
                            </span>
                          </div>
                          {task.indicators.missingSourceCount > 0 && (
                            <p className="mt-1 text-[10px] font-semibold" style={{ color: "#E65100" }}>⚠ {task.indicators.missingSourceCount} missing source(s)</p>
                          )}
                        </td>
                        <td className="py-3 pr-3"><span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "#EAF3FB", color: "#0D47A1" }}>{task.responsibleAgent}</span></td>
                        <td className="py-3 pr-3 text-[11px]" style={{ color: "#90A4AE" }}>{toLocal(task.updatedAt)}</td>
                        <td className="py-3 pr-3"><ArrowRight className="h-3.5 w-3.5" style={{ color: selected ? "#0D47A1" : "#90CAF9" }} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Project-specific report export */}
        <Card>
          <CardHeader
            icon={FileText}
            title="Project Report Export"
            badge={<span className="rounded-full px-2 py-1 text-xs" style={{ background: "#EAF3FB", color: "#0D47A1" }}>project-scoped reporting</span>}
          />
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-semibold" style={{ color: "#5F6B7A" }}>Project</label>
              <select
                value={projectExportProject}
                onChange={(e) => {
                  setProjectExportProject(e.target.value);
                  if (e.target.value) void loadProjectExports(e.target.value);
                }}
                className="rounded-lg border px-3 py-1.5 text-xs outline-none"
                style={{ borderColor: "#D6EAF8", color: "#211F20", background: "#FFFFFF" }}
              >
                <option value="">Select a project...</option>
                {projects.map((p) => <option key={p.project} value={p.project}>{p.project} ({p.count} tasks)</option>)}
              </select>
              <div className="flex flex-wrap items-center gap-2">
                {(["markdown", "csv", "html"] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => handleProjectExport(format)}
                    disabled={busy === `project-${format}` || !projectExportProject}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity disabled:opacity-40"
                    style={{ background: "#EAF3FB", color: "#0D47A1" }}
                  >
                    {busy === `project-${format}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                    Export {format}
                  </button>
                ))}
                <button
                  onClick={handleProjectExportJson}
                  disabled={busy === "project-json" || !projectExportProject}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity disabled:opacity-40"
                  style={{ background: "#EAF3FB", color: "#0D47A1" }}
                >
                  {busy === "project-json" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                  Export JSON
                </button>
                <button
                  onClick={handleProjectExportPdf}
                  disabled={busy === "project-pdf" || !projectExportProject}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity disabled:opacity-40"
                  style={{ background: "#D32F2F", color: "#FFFFFF" }}
                >
                  {busy === "project-pdf" ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                  Export PDF
                </button>
              </div>
            </div>
            <div className="rounded-xl border p-3" style={{ borderColor: "#EAF3FB", background: "#F8FBFF" }}>
              <p className="text-[10px] font-semibold uppercase" style={{ color: "#90A4AE" }}>Recent project reports</p>
              {projectExports.length === 0 ? (
                <p className="mt-1 text-xs" style={{ color: "#5F6B7A" }}>No reports generated for this project yet. Select a project and choose a format above.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {projectExports.map((ex) => (
                    <span key={ex.id} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ background: "#EAF3FB", color: "#0D47A1" }}>
                      {ex.format.toUpperCase()} · {ex.taskCount} tasks · {toLocal(ex.createdAt)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Task detail workspace */}
        {selected && detail && (
          <TaskDetailWorkspace
            task={detail}
            exports={exports}
            busy={busy}
            expandedActivity={expandedActivity}
            onToggleActivity={() => setExpandedActivity(!expandedActivity)}
            onGenerate={handleGenerate}
            onValidate={handleValidate}
            onToggleItem={handleToggle}
            onStatus={handleStatus}
            onExport={handleExport}
            onPrintPdf={handlePrintPdf}
            onRemoveDependency={handleRemoveDependency}
            onBack={() => setSelectedId(null)}
          />
        )}
        {selected && !detail && detailLoading && (
          <div className="py-8 text-center text-sm" style={{ color: "#5F6B7A" }}>
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" style={{ color: "#2196F3" }} />
            Loading task workspace...
          </div>
        )}

        {/* Events feed */}
        <Card>
          <CardHeader icon={Activity} title="Task Intelligence Feed" badge={<span className="rounded-full px-2 py-1 text-xs" style={{ background: "#EAF3FB", color: "#0D47A1" }}>event-driven collaboration</span>} />
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {events.slice(0, 12).map((event, idx) => (
              <div key={`${event.type}-${idx}`} className="flex items-start gap-2 rounded-xl border px-3 py-2" style={{ borderColor: "#EAF3FB", background: "#F8FBFF" }}>
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ background: event.type.startsWith("task.generation_blocked") ? "#E53935" : event.type.startsWith("task.generated") ? "#43A047" : "#2196F3" }} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold" style={{ color: "#211F20" }}>{event.type}</p>
                  <p className="truncate text-[11px]" style={{ color: "#5F6B7A" }}>{event.detail}</p>
                  <p className="text-[10px]" style={{ color: "#90A4AE" }}>{toLocal(event.at)}</p>
                </div>
              </div>
            ))}
            {events.length === 0 && <p className="text-xs" style={{ color: "#5F6B7A" }}>No task events yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Task Form
// ---------------------------------------------------------------------------

function NewTaskForm({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [feature, setFeature] = useState("executive");
  const [owner, setOwner] = useState("");
  const [responsibleAgent, setResponsibleAgent] = useState("a13");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("A task title is required.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createTask({
        title: title.trim(),
        description,
        feature,
        owner,
        responsibleAgent,
        priority,
        createdBy: "human",
      });
      onCreated(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Task creation failed");
      setSubmitting(false);
    }
  };

  const inputStyle = { borderColor: "#D6EAF8", color: "#211F20", background: "#FFFFFF" };

  return (
    <Card accent="#90CAF9">
      <CardHeader icon={Plus} title="New Agent Task" action={
        <button onClick={onClose} className="rounded-lg p-1.5" style={{ color: "#90A4AE" }}>
          <X className="h-4 w-4" />
        </button>
      } />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold" style={{ color: "#0D47A1" }}>Title *</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Board-ready weekly intelligence briefing"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none" style={inputStyle} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold" style={{ color: "#0D47A1" }}>Feature</span>
          <select value={feature} onChange={(e) => setFeature(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm outline-none" style={inputStyle}>
            {FEATURES.map((f) => <option key={f} value={f}>{featureLabels[f]}</option>)}
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-xs font-semibold" style={{ color: "#0D47A1" }}>Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            placeholder="What should this agent task accomplish? Its source checklist is derived from the feature's real dependencies."
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none" style={inputStyle} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold" style={{ color: "#0D47A1" }}>Owner</span>
          <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="e.g. Priya Nair"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none" style={inputStyle} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold" style={{ color: "#0D47A1" }}>Responsible Agent</span>
          <select value={responsibleAgent} onChange={(e) => setResponsibleAgent(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm outline-none" style={inputStyle}>
            {["a1", "a6", "a7", "a8", "a9", "a10", "a11", "a12", "a13"].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold" style={{ color: "#0D47A1" }}>Priority</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm outline-none" style={inputStyle}>
            {["low", "medium", "high", "critical"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      </div>
      {error && <p className="mt-3 text-sm" style={{ color: "#D32F2F" }}>{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: "#EAF3FB", color: "#0D47A1" }}>
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={submitting} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-60" style={{ background: "#0D47A1", color: "#FFFFFF" }}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Create task
        </button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Task Detail Workspace — source checklist, dependencies, evidence, activity,
// export controls, generation + validation.
// ---------------------------------------------------------------------------

function TaskDetailWorkspace({
  task,
  exports,
  busy,
  expandedActivity,
  onToggleActivity,
  onGenerate,
  onValidate,
  onToggleItem,
  onStatus,
  onExport,
  onPrintPdf,
  onRemoveDependency,
  onBack,
}: {
  task: TaskDetailView;
  exports: Array<{ id: string; format: string; createdAt: string }>;
  busy: string | null;
  expandedActivity: boolean;
  onToggleActivity: () => void;
  onGenerate: () => void;
  onValidate: () => void;
  onToggleItem: (itemId: string, completed: boolean) => void;
  onStatus: (status: string) => void;
  onExport: (format: "markdown" | "csv" | "html") => void;
  onPrintPdf: () => void;
  onRemoveDependency: (dependencyId: string) => void;
  onBack: () => void;
}) {
  const ind = task.indicators;

  return (
    <Card>
      <CardHeader icon={ClipboardCheck} title="Task Workspace" badge={<FeatureBadge feature={task.feature} />} action={
        <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "#EAF3FB", color: "#0D47A1" }}>
          <ArrowLeft className="h-3 w-3" /> Back to explorer
        </button>
      } />

      {/* Task header */}
      <div className="mb-4 rounded-xl border p-4" style={{ borderColor: "#EAF3FB", background: "#F8FBFF" }}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold" style={{ color: "#211F20" }}>{task.title}</h3>
          <ReadinessPill readiness={task.readiness} />
          <StatusPill status={task.status} />
        </div>
        {task.description && <p className="mt-2 text-sm leading-relaxed" style={{ color: "#5F6B7A" }}>{task.description}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px]">
          <span className="rounded-full px-2 py-1" style={{ background: "#EAF3FB", color: "#0D47A1" }}>Agent {task.responsibleAgent}</span>
          <span className="rounded-full px-2 py-1" style={{ background: "#EAF3FB", color: "#0D47A1" }}>Owner: {task.owner || "unassigned"}</span>
          <span className="rounded-full px-2 py-1" style={{ background: "#EAF3FB", color: "#0D47A1" }}>Team: {task.team || "—"}</span>
          <span className="rounded-full px-2 py-1" style={{ background: "#EAF3FB", color: "#0D47A1" }}>Priority: {task.priority}</span>
          <span className="rounded-full px-2 py-1" style={{ background: "#EAF3FB", color: "#0D47A1" }}>Version {task.version}</span>
          <span className="rounded-full px-2 py-1" style={{ background: "#EAF3FB", color: "#0D47A1" }}>Created {toLocal(task.createdAt)}</span>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={onGenerate}
            disabled={busy === "generate" || task.status === "complete"}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-opacity disabled:opacity-50"
            style={{ background: "#0D47A1", color: "#FFFFFF" }}
          >
            {busy === "generate" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Generate
          </button>
          <button
            onClick={onValidate}
            disabled={busy === "validate"}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-opacity disabled:opacity-50"
            style={{ background: "#EAF3FB", color: "#0D47A1" }}
          >
            {busy === "validate" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Re-validate sources
          </button>
          {["pending", "in_progress", "awaiting_review", "complete", "blocked"].map((s) => (
            <button
              key={s}
              onClick={() => onStatus(s)}
              disabled={busy === "status"}
              className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold capitalize transition-opacity disabled:opacity-50"
              style={task.status === s ? { background: "#0D47A1", color: "#FFFFFF" } : { background: "#FFFFFF", border: "1px solid #D6EAF8", color: "#0D47A1" }}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Completion indicators */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-xl border p-3" style={{ borderColor: "#EAF3FB" }}>
          <p className="text-[10px] font-semibold uppercase" style={{ color: "#90A4AE" }}>Required</p>
          <p className="mt-1 text-xl font-semibold" style={{ color: "#211F20" }}>{ind.requiredComplete}/{ind.requiredTotal}</p>
          <ProgressBar value={ind.requiredPercentage} />
        </div>
        <div className="rounded-xl border p-3" style={{ borderColor: "#EAF3FB" }}>
          <p className="text-[10px] font-semibold uppercase" style={{ color: "#90A4AE" }}>Optional</p>
          <p className="mt-1 text-xl font-semibold" style={{ color: "#211F20" }}>{ind.optionalComplete}/{ind.optionalTotal}</p>
          <ProgressBar value={ind.optionalPercentage} color="#2196F3" />
        </div>
        <div className="rounded-xl border p-3" style={{ borderColor: ind.missingSourceCount > 0 ? "#FFCDD2" : "#EAF3FB" }}>
          <p className="text-[10px] font-semibold uppercase" style={{ color: "#90A4AE" }}>Missing sources</p>
          <p className="mt-1 text-xl font-semibold" style={{ color: ind.missingSourceCount > 0 ? "#E65100" : "#211F20" }}>{ind.missingSourceCount}</p>
          {ind.missingSourceCount > 0 && <p className="text-[10px] font-semibold" style={{ color: "#E65100" }}>⚠ blocks generation</p>}
        </div>
        <div className="rounded-xl border p-3" style={{ borderColor: ind.blockedDependencyCount > 0 ? "#FFCDD2" : "#EAF3FB" }}>
          <p className="text-[10px] font-semibold uppercase" style={{ color: "#90A4AE" }}>Blocked deps</p>
          <p className="mt-1 text-xl font-semibold" style={{ color: ind.blockedDependencyCount > 0 ? "#D32F2F" : "#211F20" }}>{ind.blockedDependencyCount}</p>
        </div>
        <div className="rounded-xl border p-3" style={{ borderColor: "#EAF3FB" }}>
          <p className="text-[10px] font-semibold uppercase" style={{ color: "#90A4AE" }}>Exports</p>
          <p className="mt-1 text-xl font-semibold" style={{ color: "#211F20" }}>{task.exportCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Source checklist */}
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: "#0D47A1" }}>
            <ListChecks className="h-4 w-4" /> Source Checklist
            <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: "#EAF3FB", color: "#0D47A1" }}>validated against live feature data</span>
          </h3>
          <div className="space-y-2">
            {task.checklist.map((item) => {
              const vs = validationStyles[item.validationState] ?? validationStyles.pending;
              return (
                <div key={item.id} className="rounded-xl border p-3" style={{ borderColor: "#EAF3FB" }}>
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => onToggleItem(item.id, !item.completed)}
                      disabled={busy === `check-${item.id}`}
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-opacity disabled:opacity-50"
                      style={{ borderColor: item.completed ? "#43A047" : "#B0BEC5", background: item.completed ? "#43A047" : "#FFFFFF", color: "#FFFFFF" }}
                      title={item.completed ? "Mark incomplete" : "Mark complete"}
                    >
                      {busy === `check-${item.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : item.completed ? <Check className="h-3 w-3" /> : null}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-medium ${item.completed ? "line-through" : ""}`} style={{ color: item.completed ? "#90A4AE" : "#211F20" }}>
                          {item.requirementName}
                        </p>
                        {item.required && <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ background: "#EAF3FB", color: "#0D47A1" }}>required</span>}
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: vs.bg, color: vs.fg }}>{item.validationState}</span>
                        {item.missingData && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(230,81,0,0.14)", color: "#E65100" }}>
                            <AlertTriangle className="h-3 w-3" /> missing data
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px]" style={{ color: "#5F6B7A" }}>{item.description}</p>
                      <p className="mt-1 text-[10px]" style={{ color: "#90A4AE" }}>
                        source: {item.sourceType}{item.sourceRef ? ` · ref: ${item.sourceRef}` : ""} · from {featureLabels[item.upstreamDependency] ?? item.upstreamDependency} · confidence {item.confidence}%
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {task.checklist.length === 0 && <p className="text-xs" style={{ color: "#5F6B7A" }}>No checklist items.</p>}
          </div>
        </div>

        {/* Dependencies */}
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: "#0D47A1" }}>
            <Link2 className="h-4 w-4" /> Explicit Dependencies
          </h3>
          <div className="space-y-2">
            {task.dependencies.map((dep) => {
              const ds = dependencyStyles[dep.status] ?? dependencyStyles.waiting;
              return (
                <div key={dep.id} className="rounded-xl border p-3" style={{ borderColor: "#EAF3FB" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium" style={{ color: "#211F20" }}>{dep.sourceLabel}</p>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: ds.bg, color: ds.fg }}>{dep.status}</span>
                      </div>
                      <p className="mt-0.5 text-[11px]" style={{ color: "#5F6B7A" }}>{dep.reason}</p>
                      <p className="mt-1 text-[10px]" style={{ color: "#90A4AE" }}>
                        {dep.dependencyType} · {dep.sourceType}{dep.sourceId ? ` · ${dep.sourceId}` : ""} · last validated {toLocal(dep.lastValidatedAt)}
                      </p>
                    </div>
                    <button onClick={() => onRemoveDependency(dep.id)} disabled={busy === "dep"} className="rounded-lg p-1.5 transition-colors" style={{ color: "#90A4AE" }} title="Remove dependency">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            {task.dependencies.length === 0 && <p className="text-xs" style={{ color: "#5F6B7A" }}>No explicit dependencies declared.</p>}
          </div>
        </div>
      </div>

      {/* Generated sections + evidence mapping */}
      <div className="mt-6">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: "#0D47A1" }}>
          <FileText className="h-4 w-4" /> Generated Content & Evidence Mapping
        </h3>
        {task.generatedSections.length === 0 ? (
          <p className="rounded-xl border p-4 text-xs" style={{ borderColor: "#EAF3FB", color: "#5F6B7A" }}>
            No content generated yet. Complete the required checklist and run <strong>Generate</strong>. Pre-generation validation blocks fabrication when required sources are missing.
          </p>
        ) : (
          <div className="space-y-3">
            {task.generatedSections.map((section) => {
              const mapping = task.evidenceMappings.find((m) => m.heading === section.heading);
              return (
                <details key={section.id} className="rounded-xl border p-3" style={{ borderColor: "#EAF3FB" }} open>
                  <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold" style={{ color: "#0D47A1" }}>
                    <ChevronDown className="h-4 w-4" /> {section.heading}
                    <span className="ml-auto text-[10px] font-normal" style={{ color: "#90A4AE" }}>{mapping?.sources.length ?? 0} mapped sources</span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "#211F20" }}>{section.body}</p>
                  {(mapping?.sources?.length ?? 0) > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {mapping!.sources.map((src, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-1.5 text-[10px]" style={{ background: "#F8FBFF", border: "1px solid #EAF3FB" }}>
                          <CheckCircle2 className="h-3 w-3" style={{ color: "#2E7D32" }} />
                          <span className="font-semibold" style={{ color: "#211F20" }}>{src.sourceLabel}</span>
                          <span className="rounded-full px-1.5 py-0.5" style={{ background: "#EAF3FB", color: "#0D47A1" }}>{src.sourceType}</span>
                          <span className="rounded-full px-1.5 py-0.5" style={{ background: "#EAF3FB", color: "#0D47A1" }}>{featureLabels[src.feature] ?? src.feature}</span>
                          <span className="ml-auto" style={{ color: "#90A4AE" }}>confidence {src.confidence}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </details>
              );
            })}
          </div>
        )}
      </div>

      {/* Export controls */}
      <div className="mt-6">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: "#0D47A1" }}>
          <Download className="h-4 w-4" /> Export & Reports
        </h3>
        <div className="mb-3 flex flex-wrap gap-2">
          {(["markdown", "csv", "html"] as const).map((format) => (
            <button
              key={format}
              onClick={() => onExport(format)}
              disabled={busy === `export-${format}`}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold uppercase transition-opacity disabled:opacity-50"
              style={{ background: "#0D47A1", color: "#FFFFFF" }}
            >
              {busy === `export-${format}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {format}
            </button>
          ))}
          <button
            onClick={onPrintPdf}
            disabled={busy === "pdf"}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold uppercase transition-opacity disabled:opacity-50"
            style={{ background: "#C62828", color: "#FFFFFF" }}
            title="Renders the print-ready HTML report and opens the browser print dialog to save as PDF"
          >
            {busy === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            PDF
          </button>
        </div>
        <div className="space-y-1.5">
          {exports.map((ex) => (
            <div key={ex.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "#EAF3FB" }}>
              <span style={{ color: "#211F20" }}>{ex.format.toUpperCase()} · {ex.id.slice(-6)}</span>
              <span style={{ color: "#90A4AE" }}>{toLocal(ex.createdAt)}</span>
            </div>
          ))}
          {exports.length === 0 && <p className="text-xs" style={{ color: "#5F6B7A" }}>No exports generated yet.</p>}
        </div>
      </div>

      {/* Activity history */}
      <div className="mt-6">
        <button onClick={onToggleActivity} className="flex w-full items-center gap-2 text-sm font-semibold" style={{ color: "#0D47A1" }}>
          <Activity className="h-4 w-4" /> Activity History
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-normal" style={{ color: "#90A4AE" }}>
            {task.activities.length} events {expandedActivity ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </span>
        </button>
        {expandedActivity && (
          <div className="mt-3 space-y-1.5">
            {task.activities.map((a) => (
              <div key={a.id} className="flex items-start gap-2 rounded-lg border px-3 py-2" style={{ borderColor: "#EAF3FB" }}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium" style={{ color: "#211F20" }}>
                    <span className="font-semibold" style={{ color: "#0D47A1" }}>{a.actor}</span> {a.detail}
                  </p>
                  <p className="text-[10px]" style={{ color: "#90A4AE" }}>{toLocal(a.createdAt)}</p>
                </div>
              </div>
            ))}
            {task.activities.length === 0 && <p className="text-xs" style={{ color: "#5F6B7A" }}>No activity recorded.</p>}
          </div>
        )}
      </div>
    </Card>
  );
}
