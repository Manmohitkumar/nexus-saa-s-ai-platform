import { jsPDF } from "jspdf";
import type { AgentTaskView } from "./types";

// Real PDF download for Project-Specific Report Export. jsPDF builds an actual
// .pdf file client-side from the same structured data the backend JSON export
// returns — no browser print dialog, no popup dependency.

export interface ProjectExportJson {
    project: string;
    exportedAt: string;
    tasks: AgentTaskView[];
}

const W = 210; // A4 width (mm)
const M = 14;  // margin
const CONTENT_W = W - M * 2;

function safe(s: string | null | undefined, max = 90): string {
    const t = String(s ?? "").replace(/\s+/g, " ").trim();
    return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function projectReportToPdf(data: ProjectExportJson, exportedBy = "system"): jsPDF {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageHeight = doc.internal.pageSize.getHeight();
    const footer = () => {
        doc.setFontSize(8);
        doc.setTextColor(144, 164, 174);
        const page = doc.getNumberOfPages();
        doc.text(`Exported from Project Phoenix — Agent Task Intelligence Layer · ${data.project} · page ${page}`, M, pageHeight - 8);
    };
    let y = 0;

    const ensure = (needed: number) => {
        if (y + needed > pageHeight - 20) {
            footer();
            doc.addPage();
            y = M;
        }
    };

    // Header
    doc.setFillColor(13, 71, 161);
    doc.rect(0, 0, W, 26, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Agent Task Report — " + safe(data.project, 60), M, 12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Project-specific task intelligence report · ${data.tasks.length} task(s) · ${new Date(data.exportedAt).toLocaleString()} · exported by ${exportedBy}`, M, 18);
    y = 34;

    // Summary table
    doc.setTextColor(13, 71, 161);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Task Summary", M, y);
    y += 4;
    const headers = ["#", "Task", "Feature", "Status", "Readiness", "Req", "Missing", "Agent"];
    const widths = [8, 56, 22, 22, 26, 12, 16, 18];
    const startX = M;
    const rowH = 7;
    ensure(rowH + 2);
    // header row
    doc.setFillColor(234, 243, 251);
    doc.rect(startX, y, CONTENT_W, rowH, "F");
    doc.setFontSize(8);
    doc.setTextColor(13, 71, 161);
    doc.setFont("helvetica", "bold");
    let x = startX;
    headers.forEach((h, i) => {
        doc.text(h, x + 1.5, y + 4.5);
        x += widths[i];
    });
    y += rowH;
    // body rows
    doc.setFont("helvetica", "normal");
    doc.setTextColor(33, 31, 32);
    data.tasks.forEach((t, idx) => {
        ensure(rowH);
        if (idx % 2 === 1) {
            doc.setFillColor(248, 251, 255);
            doc.rect(startX, y, CONTENT_W, rowH, "F");
        }
        const cells = [String(idx + 1), safe(t.title, 40), t.feature, t.status, t.readiness, `${t.indicators.requiredComplete}/${t.indicators.requiredTotal}`, String(t.indicators.missingSourceCount), t.responsibleAgent];
        x = startX;
        cells.forEach((c, i) => {
            doc.text(safe(c, 30), x + 1.5, y + 4.5);
            x += widths[i];
        });
        y += rowH;
    });

    // Per-task breakdown
    y += 6;
    for (const t of data.tasks) {
        ensure(26);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(13, 71, 161);
        doc.text(t.title, M, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(95, 107, 122);
        doc.text(`Feature: ${t.feature} · Status: ${t.status} · Readiness: ${t.readiness} · Priority: ${t.priority} · Owner: ${t.owner || "—"} · Team: ${t.team || "—"} · Agent: ${t.responsibleAgent}`, M, y);
        y += 4.5;
        doc.setTextColor(33, 31, 32);
        doc.text(safe(t.description, 300), M, y);
        y += 5;
        doc.setTextColor(95, 107, 122);
        doc.text(
            `Completion: ${t.indicators.requiredComplete}/${t.indicators.requiredTotal} required (${t.indicators.requiredPercentage}%) · Missing sources: ${t.indicators.missingSourceCount} · Blocked deps: ${t.indicators.blockedDependencyCount}`,
            M,
            y,
        );
        y += 6;
        if (t.generatedSections.length > 0) {
            for (const s of t.generatedSections) {
                ensure(12);
                doc.setTextColor(13, 71, 161);
                doc.setFont("helvetica", "bold");
                doc.text(safe(s.heading, 80), M, y);
                y += 4.5;
                doc.setFont("helvetica", "normal");
                doc.setTextColor(33, 31, 32);
                const body = safe(s.body, 600).match(/.{1,95}/g) ?? [];
                for (const line of body) {
                    ensure(5);
                    doc.text(line, M, y);
                    y += 4.5;
                }
                y += 3;
            }
        } else {
            doc.setTextColor(144, 164, 174);
            doc.text("No generated sections yet.", M, y);
            y += 5;
        }
        y += 6;
    }

    footer();
    return doc;
}
