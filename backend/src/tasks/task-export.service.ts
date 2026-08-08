import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskChecklistService } from './task-checklist.service';
import { AgentTaskView, TaskDetailView } from './task.types';

export type ExportFormat = 'markdown' | 'csv' | 'html' | 'json';

export interface ExportResult {
    id: string;
    taskId: string;
    format: ExportFormat;
    taskVersion: number;
    exportedBy: string;
    content: string;
    summary: string;
    createdAt: string;
}

export interface ProjectExportResult {
    id: string;
    project: string;
    format: ExportFormat;
    exportedBy: string;
    taskCount: number;
    content: string;
    summary: string;
    createdAt: string;
}

/**
 * Export service for the Agent Task Intelligence Layer. Exports a selected
 * agent task using already captured information (no new AI reasoning), as an
 * extension of the existing Documentation / Reporting infrastructure. Supports
 * Markdown, CSV, and standalone HTML. Every export records traceability
 * (who, when, which task version, which format, which evidence state).
 */
@Injectable()
export class TaskExportService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly checklist: TaskChecklistService,
    ) {}

    async exportTask(task: TaskDetailView, format: ExportFormat, exportedBy = 'system'): Promise<ExportResult> {
        const content = format === 'markdown' ? this.toMarkdown(task) : format === 'csv' ? this.toCsv(task) : this.toHtml(task);
        const summary = this.summaryFor(task);
        const row = await this.prisma.agentTaskExport.create({
            data: {
                taskId: task.id,
                format,
                taskVersion: task.version,
                exportedBy,
                content,
                summary,
            },
        });
        await this.prisma.agentTaskActivity.create({
            data: {
                taskId: task.id,
                actor: exportedBy,
                action: 'exported',
                detail: `Exported as ${format.toUpperCase()} (v${task.version})`,
                evidenceDelta: JSON.stringify({ format, taskVersion: task.version, evidenceState: task.readiness }),
            },
        });
        return {
            id: row.id,
            taskId: task.id,
            format,
            taskVersion: row.taskVersion,
            exportedBy,
            content: row.content,
            summary: row.summary,
            createdAt: row.createdAt.toISOString(),
        };
    }

    /**
     * Project-specific report export. Aggregates every task belonging to a
     * project into a single self-contained Markdown/CSV/HTML report and persists
     * the generated artifact as an AgentProjectExport row (traceability for who
     * exported which project report when, in which format).
     */
    async exportProject(project: string, tasks: AgentTaskView[], format: ExportFormat, exportedBy = 'system'): Promise<ProjectExportResult> {
        const content =
            format === 'markdown'
                ? this.projectToMarkdown(project, tasks)
                : format === 'csv'
                  ? this.projectToCsv(project, tasks)
                  : format === 'json'
                    ? JSON.stringify({ project, exportedAt: new Date().toISOString(), tasks }, null, 2)
                    : this.projectToHtml(project, tasks);
        const summary = this.projectSummaryFor(project, tasks);
        const row = await this.prisma.agentProjectExport.create({
            data: { project, format, exportedBy, content, summary },
        });
        return {
            id: row.id,
            project,
            format,
            exportedBy,
            taskCount: tasks.length,
            content: row.content,
            summary: row.summary,
            createdAt: row.createdAt.toISOString(),
        };
    }

    async listProjectExports(project: string): Promise<ProjectExportResult[]> {
        const rows = await this.prisma.agentProjectExport.findMany({ where: { project }, orderBy: { createdAt: 'desc' } });
        return rows.map((r) => ({
            id: r.id,
            project: r.project,
            format: r.format as ExportFormat,
            exportedBy: r.exportedBy,
            taskCount: JSON.parse(r.summary || '{"tasks":0}').tasks ?? 0,
            content: r.content,
            summary: r.summary,
            createdAt: r.createdAt.toISOString(),
        }));
    }

    async projectExportDetail(id: string): Promise<ProjectExportResult | null> {
        const r = await this.prisma.agentProjectExport.findUnique({ where: { id } });
        if (!r) return null;
        return {
            id: r.id,
            project: r.project,
            format: r.format as ExportFormat,
            exportedBy: r.exportedBy,
            taskCount: JSON.parse(r.summary || '{"tasks":0}').tasks ?? 0,
            content: r.content,
            summary: r.summary,
            createdAt: r.createdAt.toISOString(),
        };
    }

    async list(taskId: string): Promise<ExportResult[]> {
        const rows = await this.prisma.agentTaskExport.findMany({ where: { taskId }, orderBy: { createdAt: 'desc' } });
        return rows.map((r) => ({
            id: r.id,
            taskId: r.taskId,
            format: r.format as ExportFormat,
            taskVersion: r.taskVersion,
            exportedBy: r.exportedBy,
            content: r.content,
            summary: r.summary,
            createdAt: r.createdAt.toISOString(),
        }));
    }

    async detail(id: string): Promise<ExportResult | null> {
        const r = await this.prisma.agentTaskExport.findUnique({ where: { id } });
        if (!r) return null;
        return {
            id: r.id,
            taskId: r.taskId,
            format: r.format as ExportFormat,
            taskVersion: r.taskVersion,
            exportedBy: r.exportedBy,
            content: r.content,
            summary: r.summary,
            createdAt: r.createdAt.toISOString(),
        };
    }

    private summaryFor(task: TaskDetailView): string {
        return `${task.title} [${task.feature}] — ${task.readiness} (${task.indicators.requiredPercentage}% required checklist, ${task.indicators.missingSourceCount} missing sources, ${task.indicators.blockedDependencyCount} blocked deps)`;
    }

    private projectSummaryFor(project: string, tasks: AgentTaskView[]): string {
        const ready = tasks.filter((t) => t.readiness === 'ready' || t.readiness === 'complete').length;
        const blocked = tasks.filter((t) => t.readiness === 'blocked' || t.readiness === 'failed').length;
        const missing = tasks.reduce((n, t) => n + (t.indicators.missingSourceCount > 0 ? 1 : 0), 0);
        return JSON.stringify({ project, tasks: tasks.length, ready, blocked, missing });
    }

    // ------------------------------------------------------------------
    // Project-specific report renderers
    // ------------------------------------------------------------------

    private projectToMarkdown(project: string, tasks: AgentTaskView[]): string {
        const lines: string[] = [
            `# Agent Task Report — ${project}`,
            ``,
            `> Project-specific task intelligence report aggregating **${tasks.length}** agent task(s) across the ACE features.`,
            ``,
            `**Generated:** ${new Date().toISOString()} · **Tasks:** ${tasks.length}`,
            ``,
            `## Task Summary`,
            `| Task | Feature | Status | Readiness | Required | Missing | Agent |`,
            `| --- | --- | --- | --- | --- | --- | --- |`,
            ...tasks.map(
                (t, i) =>
                    `| ${i + 1}. ${t.title.replace(/\|/g, '\\|')} | ${t.feature} | ${t.status} | ${t.readiness} | ${t.indicators.requiredComplete}/${t.indicators.requiredTotal} | ${t.indicators.missingSourceCount} | ${t.responsibleAgent} |`,
            ),
            ``,
            `## Task Breakdown`,
            ...(tasks.length
                ? tasks.map((t) => this.projectTaskSectionMarkdown(t)).join('\n\n')
                : `_No agent tasks recorded for this project._`),
            ``,
            `---`,
            `_Exported from Project Phoenix — Agent Task Intelligence Layer. All evidence references existing Organizational Brain, Decision Time Machine, Workforce, Risk, Mentor, Documentation, Intelligence, and Executive outputs._`,
        ];
        return lines.join('\n');
    }

    private projectTaskSectionMarkdown(t: AgentTaskView): string {
        const sections = t.generatedSections.length
            ? t.generatedSections.map((s) => `### ${s.heading}\n${s.body}`).join('\n\n')
            : `_No generated sections yet._`;
        return [
            `### ${t.title}`,
            `${t.description || '_No description provided._'}`,
            ``,
            `**Status:** ${t.status} · **Readiness:** ${t.readiness} · **Priority:** ${t.priority} · **Owner:** ${t.owner || '—'} · **Team:** ${t.team || '—'}`,
            ``,
            `**Completion:** ${t.indicators.requiredComplete}/${t.indicators.requiredTotal} required (${t.indicators.requiredPercentage}%) · Missing sources: **${t.indicators.missingSourceCount}** · Blocked deps: **${t.indicators.blockedDependencyCount}**`,
            ``,
            sections,
        ].join('\n');
    }

    private projectToCsv(project: string, tasks: AgentTaskView[]): string {
        const esc = (v: unknown): string => {
            const s = String(v ?? '').replace(/"/g, '""');
            return /[",\n]/.test(s) ? `"${s}"` : s;
        };
        const rows: unknown[][] = [];
        rows.push(['Project Report', project, new Date().toISOString(), `${tasks.length} tasks`]);
        rows.push([]);
        rows.push(['Task Summary']);
        rows.push(['Task', 'Feature', 'Status', 'Readiness', 'Required Done', 'Required Total', 'Required %', 'Optional Done', 'Optional Total', 'Missing', 'Stale', 'Blocked', 'Agent', 'Owner', 'Priority', 'Generated Sections']);
        for (const t of tasks) {
            rows.push([t.title, t.feature, t.status, t.readiness, t.indicators.requiredComplete, t.indicators.requiredTotal, t.indicators.requiredPercentage, t.indicators.optionalComplete, t.indicators.optionalTotal, t.indicators.missingSourceCount, t.indicators.staleSourceCount, t.indicators.blockedDependencyCount, t.responsibleAgent, t.owner, t.priority, t.generatedSections.length]);
        }
        return rows.map((r) => r.map(esc).join(',')).join('\n');
    }

    private projectToHtml(project: string, tasks: AgentTaskView[]): string {
        const summaryRows = tasks
            .map(
                (t, i) =>
                    `<tr><td>${i + 1}</td><td>${this.h(t.title)}</td><td>${this.h(t.feature)}</td><td><span class="state ${t.status}">${t.status}</span></td><td><span class="state ${t.readiness}">${t.readiness}</span></td><td>${t.indicators.requiredComplete}/${t.indicators.requiredTotal}</td><td>${t.indicators.missingSourceCount}</td><td>${this.h(t.responsibleAgent)}</td></tr>`,
            )
            .join('\n');
        const breakdownHtml = tasks.length
            ? tasks
                  .map(
                      (t) => `<section id="${this.anchor(t.title)}"><h3>${this.h(t.title)}</h3><p>${this.h(t.description) || '<em>No description provided.</em>'}</p><p class="meta"><strong>Status:</strong> ${t.status} · <strong>Readiness:</strong> ${t.readiness} · <strong>Priority:</strong> ${t.priority} · <strong>Owner:</strong> ${this.h(t.owner) || '—'} · <strong>Team:</strong> ${this.h(t.team) || '—'}</p><p class="meta">Completion: <strong>${t.indicators.requiredComplete}/${t.indicators.requiredTotal}</strong> required (${t.indicators.requiredPercentage}%) · Missing sources: <strong>${t.indicators.missingSourceCount}</strong> · Blocked deps: <strong>${t.indicators.blockedDependencyCount}</strong></p>${t.generatedSections.length ? t.generatedSections.map((s) => `<h4>${this.h(s.heading)}</h4><p>${this.h(s.body)}</p>`).join('') : '<p>No generated sections yet.</p>'}</section>`,
                  )
                  .join('\n')
            : '<p>No agent tasks recorded for this project.</p>';

        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Agent Task Report — ${this.h(project)}</title>
<style>
body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: #211F20; margin: 32px auto; max-width: 900px; padding: 0 24px; line-height: 1.5; }
h1 { border-bottom: 3px solid #2196F3; padding-bottom: 8px; }
h2 { margin-top: 32px; color: #0D47A1; border-bottom: 1px solid #D6EAF8; padding-bottom: 4px; }
h3 { margin-top: 24px; color: #0D47A1; }
h4 { margin-bottom: 2px; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 13px; }
th, td { border: 1px solid #D6EAF8; padding: 6px 10px; text-align: left; }
th { background: #EAF3FB; }
.meta { font-size: 13px; color: #5F6B7A; }
.state { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
.state.ready, .state.complete, .state.awaiting_review { background: rgba(46,125,50,0.12); color: #2E7D32; }
.state.blocked, .state.failed { background: rgba(211,47,47,0.12); color: #D32F2F; }
.state.missing-data, .state.stale, .state.waiting { background: rgba(249,168,37,0.16); color: #B26A00; }
.state.in_progress, .state.pending { background: rgba(33,150,243,0.14); color: #0D47A1; }
footer { margin-top: 40px; font-size: 12px; color: #5F6B7A; border-top: 1px solid #D6EAF8; padding-top: 12px; }
@media print { body { max-width: 100%; } }
</style>
</head>
<body>
<h1>Agent Task Report — ${this.h(project)}</h1>
<p>Project-specific task intelligence report aggregating <strong>${tasks.length}</strong> agent task(s) across the ACE features.</p>
<p class="meta"><strong>Generated:</strong> ${new Date().toISOString()} · <strong>Tasks:</strong> ${tasks.length}</p>
<h2>Task Summary</h2>
<table><thead><tr><th>#</th><th>Task</th><th>Feature</th><th>Status</th><th>Readiness</th><th>Required</th><th>Missing</th><th>Agent</th></tr></thead><tbody>
${summaryRows}
</tbody></table>
<h2>Task Breakdown</h2>
${breakdownHtml}
<footer>Exported from Project Phoenix — Agent Task Intelligence Layer. All evidence references existing Organizational Brain, Decision Time Machine, Workforce, Risk, Mentor, Documentation, Intelligence, and Executive outputs. No new intelligence is created by this report.</footer>
</body>
</html>`;
    }

    // ------------------------------------------------------------------
    // Markdown
    // ------------------------------------------------------------------

    private toMarkdown(task: TaskDetailView): string {
        const lines: string[] = [
            `# Agent Task Report — ${task.title}`,
            ``,
            `> ${task.description || 'No description provided.'}`,
            ``,
            `**Project:** ${task.project} · **ACE Feature:** ${this.checklist.featureLabel(task.feature)} · **Status:** ${task.status} · **Readiness:** ${task.readiness}`,
            ``,
            `**Responsible Agent:** ${task.responsibleAgent} · **Owner:** ${task.owner || '—'} · **Team:** ${task.team || '—'} · **Priority:** ${task.priority}`,
            ``,
            `**Generated:** ${task.createdAt} · **Last updated:** ${task.updatedAt} · **Version:** ${task.version}`,
            ``,
            `## Completion Indicators`,
            `- Required checklist: **${task.indicators.requiredComplete}/${task.indicators.requiredTotal}** (${task.indicators.requiredPercentage}%)`,
            `- Optional checklist: **${task.indicators.optionalComplete}/${task.indicators.optionalTotal}** (${task.indicators.optionalPercentage}%)`,
            `- Missing sources: **${task.indicators.missingSourceCount}** · Stale sources: **${task.indicators.staleSourceCount}**`,
            `- Blocked dependencies: **${task.indicators.blockedDependencyCount}** · Validation failures: **${task.indicators.validationFailures}**`,
            ``,
            `## Source Checklist`,
            `| # | Requirement | Source | Required | State | Freshness |`,
            `| --- | --- | --- | --- | --- | --- |`,
            ...task.checklist.map(
                (c, i) => `| ${i + 1} | ${c.requirementName} | ${c.sourceType}:${c.sourceRef || 'auto'} | ${c.required ? 'yes' : 'no'} | ${c.validationState}${c.missingData ? ' ⚠ missing' : ''} | ${c.freshness} |`,
            ),
            ``,
            `## Dependencies`,
            task.dependencies.length
                ? task.dependencies.map((d) => `- **${d.sourceLabel}** (${d.dependencyType}) — ${d.status}${d.reason ? `: ${d.reason}` : ''}`).join('\n')
                : `_No explicit dependencies declared._`,
            ``,
            `## Evidence Mapping`,
            task.evidenceMappings.length
                ? task.evidenceMappings.map((m) => `### ${m.heading}\n${m.sources.map((s) => `- ${s.sourceType}: ${s.sourceLabel} (conf ${s.confidence}%, ${s.feature})`).join('\n')}`).join('\n\n')
                : `_No generated sections yet._`,
            ``,
            `## Activity History`,
            task.activities.length
                ? task.activities.map((a) => `- ${a.createdAt} — **${a.actor}** ${a.action}: ${a.detail}`).join('\n')
                : `_No activity recorded._`,
            ``,
            `## Notes`,
            task.notes || `_None._`,
            ``,
            `---`,
            `_Exported from Project Phoenix — Agent Task Intelligence Layer. All evidence references existing Organizational Brain, Decision Time Machine, Workforce, Risk, Mentor, Documentation, Intelligence, and Executive outputs._`,
        ];
        return lines.join('\n');
    }

    // ------------------------------------------------------------------
    // CSV
    // ------------------------------------------------------------------

    private toCsv(task: TaskDetailView): string {
        const esc = (v: unknown): string => {
            const s = String(v ?? '').replace(/"/g, '""');
            return /[",\n]/.test(s) ? `"${s}"` : s;
        };
        const rows: unknown[][] = [];
        rows.push(['Task Metadata']);
        rows.push(['Project', 'Feature', 'Title', 'Status', 'Readiness', 'Agent', 'Owner', 'Priority']);
        rows.push([task.project, task.feature, task.title, task.status, task.readiness, task.responsibleAgent, task.owner, task.priority]);
        rows.push([]);
        rows.push(['Completion Indicators']);
        rows.push(['Required', 'Required Done', 'Required %', 'Optional', 'Optional Done', 'Optional %', 'Missing', 'Stale', 'Blocked', 'Validation Failures']);
        rows.push([task.indicators.requiredTotal, task.indicators.requiredComplete, task.indicators.requiredPercentage, task.indicators.optionalTotal, task.indicators.optionalComplete, task.indicators.optionalPercentage, task.indicators.missingSourceCount, task.indicators.staleSourceCount, task.indicators.blockedDependencyCount, task.indicators.validationFailures]);
        rows.push([]);
        rows.push(['Checklist Item']);
        rows.push(['Requirement', 'Description', 'Source Type', 'Source Ref', 'Required', 'Completed', 'Validation State', 'Missing Data', 'Freshness', 'Confidence', 'Upstream Feature']);
        for (const c of task.checklist) {
            rows.push([c.requirementName, c.description, c.sourceType, c.sourceRef, c.required ? 'yes' : 'no', c.completed ? 'yes' : 'no', c.validationState, c.missingData ? 'yes' : 'no', c.freshness, c.confidence, c.upstreamDependency]);
        }
        rows.push([]);
        rows.push(['Dependency']);
        rows.push(['Dependency Type', 'Source Type', 'Source', 'Status', 'Reason']);
        for (const d of task.dependencies) {
            rows.push([d.dependencyType, d.sourceType, d.sourceLabel, d.status, d.reason]);
        }
        rows.push([]);
        rows.push(['Evidence']);
        rows.push(['Section', 'Source Type', 'Source Label', 'Confidence', 'Feature']);
        for (const m of task.evidenceMappings) {
            for (const s of m.sources) {
                rows.push([m.heading, s.sourceType, s.sourceLabel, s.confidence, s.feature]);
            }
        }
        rows.push([]);
        rows.push(['Activity History']);
        rows.push(['When', 'Actor', 'Action', 'Detail']);
        for (const a of task.activities) {
            rows.push([a.createdAt, a.actor, a.action, a.detail]);
        }
        return rows.map((r) => r.map(esc).join(',')).join('\n');
    }
    // ------------------------------------------------------------------

    private toHtml(task: TaskDetailView): string {
        const featureLabel = this.checklist.featureLabel(task.feature);
        const checklistRows = task.checklist
            .map(
                (c, i) => `<tr><td>${i + 1}</td><td>${this.h(c.requirementName)}</td><td>${this.h(c.sourceType)}${c.sourceRef ? ` <code>${this.h(c.sourceRef)}</code>` : ''}</td><td>${c.required ? 'yes' : 'no'}</td><td><span class="state ${c.validationState}">${c.validationState}${c.missingData ? ' ⚠' : ''}</span></td><td>${c.freshness}</td><td>${c.confidence}%</td></tr>`,
            )
            .join('\n');
        const depRows = task.dependencies
            .map((d) => `<tr><td>${this.h(d.sourceLabel)}</td><td>${d.dependencyType}</td><td><span class="state ${d.status}">${d.status}</span></td><td>${this.h(d.reason)}</td></tr>`)
            .join('\n');
        const evidenceHtml = task.evidenceMappings.length
            ? task.evidenceMappings
                  .map((m) => `<h3 id="${this.anchor(m.heading)}">${this.h(m.heading)}</h3><ul>${m.sources.map((s) => `<li><strong>${this.h(s.sourceType)}</strong>: ${this.h(s.sourceLabel)} <em>(conf ${s.confidence}%, ${this.h(s.feature)})</em></li>`).join('')}</ul>`)
                  .join('\n')
            : '<p>No generated sections yet.</p>';
        const activityHtml = task.activities.length
            ? `<ul>${task.activities.map((a) => `<li><strong>${this.h(a.actor)}</strong> ${this.h(a.action)}: ${this.h(a.detail)} <em>(${a.createdAt})</em></li>`).join('')}</ul>`
            : '<p>No activity recorded.</p>';

        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Agent Task Report — ${this.h(task.title)}</title>
<style>
body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: #211F20; margin: 32px auto; max-width: 900px; padding: 0 24px; line-height: 1.5; }
h1 { border-bottom: 3px solid #2196F3; padding-bottom: 8px; }
h2 { margin-top: 32px; color: #0D47A1; border-bottom: 1px solid #D6EAF8; padding-bottom: 4px; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 13px; }
th, td { border: 1px solid #D6EAF8; padding: 6px 10px; text-align: left; }
th { background: #EAF3FB; }
code { background: #F1F8FE; padding: 1px 4px; border-radius: 4px; }
.state { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
.state.validated, .state.ready, .state.complete { background: rgba(46,125,50,0.12); color: #2E7D32; }
.state.missing, .state.blocked, .state.failed, .state.inaccessible { background: rgba(211,47,47,0.12); color: #D32F2F; }
.state.stale, .state.waiting { background: rgba(249,168,37,0.16); color: #B26A00; }
.state.invalid, .state.conflicting { background: rgba(123,31,162,0.12); color: #7B1FA2; }
.meta { font-size: 13px; color: #5F6B7A; }
footer { margin-top: 40px; font-size: 12px; color: #5F6B7A; border-top: 1px solid #D6EAF8; padding-top: 12px; }
@media print { body { max-width: 100%; } }
</style>
</head>
<body>
<h1>Agent Task Report — ${this.h(task.title)}</h1>
<p>${this.h(task.description) || '<em>No description provided.</em>'}</p>
<p class="meta"><strong>Project:</strong> ${this.h(task.project)} · <strong>ACE Feature:</strong> ${featureLabel} · <strong>Status:</strong> ${this.h(task.status)} · <strong>Readiness:</strong> <span class="state ${task.readiness}">${task.readiness}</span></p>
<p class="meta"><strong>Responsible Agent:</strong> ${this.h(task.responsibleAgent)} · <strong>Owner:</strong> ${this.h(task.owner) || '—'} · <strong>Team:</strong> ${this.h(task.team) || '—'} · <strong>Priority:</strong> ${this.h(task.priority)}</p>
<p class="meta"><strong>Generated:</strong> ${task.createdAt} · <strong>Last updated:</strong> ${task.updatedAt} · <strong>Version:</strong> ${task.version}</p>
<h2>Completion Indicators</h2>
<p>Required checklist: <strong>${task.indicators.requiredComplete}/${task.indicators.requiredTotal}</strong> (${task.indicators.requiredPercentage}%) · Optional: <strong>${task.indicators.optionalComplete}/${task.indicators.optionalTotal}</strong> (${task.indicators.optionalPercentage}%)</p>
<p>Missing sources: <strong>${task.indicators.missingSourceCount}</strong> · Stale sources: <strong>${task.indicators.staleSourceCount}</strong> · Blocked dependencies: <strong>${task.indicators.blockedDependencyCount}</strong> · Validation failures: <strong>${task.indicators.validationFailures}</strong></p>
<h2>Source Checklist</h2>
<table><thead><tr><th>#</th><th>Requirement</th><th>Source</th><th>Req</th><th>State</th><th>Fresh</th><th>Conf</th></tr></thead><tbody>
${checklistRows}
</tbody></table>
<h2>Dependencies</h2>
${task.dependencies.length ? `<table><thead><tr><th>Source</th><th>Type</th><th>Status</th><th>Reason</th></tr></thead><tbody>\n${depRows}\n</tbody></table>` : '<p>No explicit dependencies declared.</p>'}
<h2>Evidence Mapping</h2>
${evidenceHtml}
<h2>Activity History</h2>
${activityHtml}
<h2>Notes</h2>
<p>${this.h(task.notes) || '<em>None.</em>'}</p>
<footer>Exported from Project Phoenix — Agent Task Intelligence Layer. All evidence references existing Organizational Brain, Decision Time Machine, Workforce, Risk, Mentor, Documentation, Intelligence, and Executive outputs. No new intelligence is created by this report.</footer>
</body>
</html>`;
    }

    private h(value: string): string {
        return (value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    private anchor(value: string): string {
        return value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
}
