import type { ReportFilterLabels, ReportResult, ReportType } from "@/data/reports"
import { downloadBlob, reportStamp } from "@/features/manager/reports/download"
import {
  createHebrewPdf,
  drawHeaderBand,
  drawMetaLines,
  drawSectionTitle,
  drawTable,
  pdfBytes,
  type TableColumn,
} from "@/features/manager/reports/pdf-draw"
import { he } from "@/i18n/he"
import { formatWorkDateNumeric } from "@/lib/format"

const reportTypeLabel: Record<ReportType, string> = {
  workOrder: "לפי הזמנת עבודה",
  site: "לפי אתר",
  components: "לפי רכיבים",
  diaries: "יומני עבודה",
}

function statusLabel(status: "all" | "pending" | "submitted" | "cancelled") {
  if (status === "pending") return he.leader.status.pending
  if (status === "cancelled") return he.leader.status.cancelled
  if (status === "submitted") return he.leader.status.submitted
  return "הכל"
}

export async function buildReportPdfBytes(result: ReportResult, labels: ReportFilterLabels) {
  const ctx = await createHebrewPdf()
  drawHeaderBand(ctx, "TOPESH — דוח ביצוע", reportTypeLabel[result.type])

  const meta = [
    `מתאריך: ${labels.from || "—"}`,
    `עד תאריך: ${labels.to || "—"}`,
    labels.company ? `חברה: ${labels.company}` : "",
    labels.customer ? `לקוח: ${labels.customer}` : "",
    labels.site ? `אתר: ${labels.site}` : "",
    labels.workOrderNumber ? `הזמנת עבודה: ${labels.workOrderNumber}` : "",
    labels.teamLeader ? `ראש צוות: ${labels.teamLeader}` : "",
    labels.domain ? `מערכת: ${labels.domain}` : "",
    labels.component ? `רכיב: ${labels.component}` : "",
    result.type === "diaries" ? `סטטוס: ${statusLabel(labels.status)}` : "",
    `יומנים תואמים: ${result.matchingDiaryCount}`,
  ].filter(Boolean)
  drawMetaLines(ctx, meta)

  if (result.type === "diaries") {
    drawSectionTitle(ctx, "יומני עבודה")
    const columns: TableColumn[] = [
      { key: "date", label: "תאריך", width: 55 },
      { key: "status", label: "סטטוס", width: 60 },
      { key: "leader", label: "ראש צוות", width: 70 },
      { key: "company", label: "חברה", width: 70 },
      { key: "customer", label: "לקוח", width: 70 },
      { key: "site", label: "אתר", width: 70 },
      { key: "subSite", label: "אתר משנה", width: 55 },
      { key: "wo", label: "הזמנה", width: 55 },
    ]
    drawTable(
      ctx,
      columns,
      result.diaries.map((diary) => ({
        date: formatWorkDateNumeric(diary.workDate),
        status: statusLabel(diary.status),
        leader: diary.teamLeaderName,
        company: diary.companyName,
        customer: diary.customerName,
        site: diary.siteName,
        subSite: diary.subSiteName || "—",
        wo: diary.workOrderNumber,
      })),
      { emptyText: "אין יומנים תואמים" }
    )
  } else {
    drawSectionTitle(ctx, "סיכום ביצוע")
    drawTable(
      ctx,
      [
        { key: "domain", label: "מערכת", width: 110 },
        { key: "component", label: "רכיב", width: 150 },
        { key: "unit", label: "יחידה", width: 70 },
        { key: "total", label: "סה״כ כמות", width: 70 },
      ],
      result.summary.map((row) => ({
        domain: row.domainName,
        component: row.componentName,
        unit: row.unit,
        total: String(row.totalQuantity),
      })),
      { emptyText: "אין נתוני ביצוע" }
    )

    drawSectionTitle(ctx, "פירוט יומי")
    drawTable(
      ctx,
      [
        { key: "date", label: "תאריך", width: 48 },
        { key: "org", label: "חברה/לקוח", width: 90 },
        { key: "site", label: "אתר", width: 60 },
        { key: "subSite", label: "אתר משנה", width: 50 },
        { key: "leader", label: "ראש צוות", width: 55 },
        { key: "wo", label: "הזמנה", width: 48 },
        { key: "component", label: "רכיב", width: 70 },
        { key: "qty", label: "כמות", width: 36 },
        { key: "unit", label: "יחידה", width: 40 },
      ],
      result.details.map((row) => ({
        date: formatWorkDateNumeric(row.workDate),
        org: `${row.companyName} / ${row.customerName}`,
        site: row.siteName,
        subSite: row.subSiteName || "—",
        leader: row.teamLeaderName,
        wo: row.workOrderNumber,
        component: row.componentName,
        qty: String(row.quantity),
        unit: row.unit,
      })),
      { emptyText: "אין פירוט יומי" }
    )
  }

  return pdfBytes(ctx)
}

export async function exportReportPdf(result: ReportResult, labels: ReportFilterLabels) {
  const bytes = await buildReportPdfBytes(result, labels)
  downloadBlob(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), `topesh-report-${result.type}-${reportStamp()}.pdf`)
}
