import type { ReportFilterLabels, ReportResult, ReportType } from "@/data/reports"
import { downloadBlob, reportStamp } from "@/features/manager/reports/download"
import {
  createHebrewPdf,
  drawDocumentHeader,
  drawHeaderBand,
  drawMetaLines,
  drawSectionTitle,
  drawTable,
  pdfBytes,
  type TableColumn,
} from "@/features/manager/reports/pdf-draw"
import { he } from "@/i18n/he"
import { formatWorkDateNumeric, jerusalemToday } from "@/lib/format"

const reportTypeLabel: Record<ReportType, string> = {
  workOrder: "לפי הזמנת עבודה",
  site: "לפי אתר",
  components: "לפי רכיבים",
  diaries: "יומני עבודה",
}

export type ReportPdfOptions = {
  generatedBy?: string
}

function statusLabel(status: "all" | "pending" | "submitted" | "cancelled") {
  if (status === "pending") return he.leader.status.pending
  if (status === "cancelled") return he.leader.status.cancelled
  if (status === "submitted") return he.leader.status.submitted
  return "הכל"
}

function drawDiariesListPdf(
  ctx: Awaited<ReturnType<typeof createHebrewPdf>>,
  result: Extract<ReportResult, { type: "diaries" }> | ReportResult,
  options?: ReportPdfOptions
) {
  const generatedAt = formatWorkDateNumeric(jerusalemToday())
  const generatedBy = options?.generatedBy?.trim() || "—"
  drawDocumentHeader(ctx, {
    title: 'ט.י טופ אש בע"מ',
    subtitle: "רשימת יומנים",
    meta: [
      { label: "תאריך הפקת רשימה", value: generatedAt },
      { label: "הופק ע״י", value: generatedBy },
    ],
  })

  const columns: TableColumn[] = [
    { key: "index", label: "#", width: 22 },
    { key: "date", label: "תאריך", width: 48 },
    { key: "company", label: "חברה", width: 72 },
    { key: "customer", label: "לקוח", width: 68 },
    { key: "site", label: "אתר", width: 68 },
    { key: "subSite", label: "תת אתר", width: 42 },
    { key: "leader", label: "ראש צוות", width: 62 },
    { key: "wo", label: "מספר הזמנה", width: 55 },
    { key: "status", label: "סטאטוס", width: 58 },
  ]

  drawTable(
    ctx,
    columns,
    result.diaries.map((diary, index) => ({
      index: String(index + 1),
      date: formatWorkDateNumeric(diary.workDate),
      company: diary.companyName,
      customer: diary.customerName,
      site: diary.siteName,
      subSite: diary.subSiteName || "—",
      leader: diary.teamLeaderName,
      wo: diary.workOrderNumber,
      status: statusLabel(diary.status),
    })),
    { emptyText: "אין יומנים תואמים", fitPageWidth: true }
  )
}

export async function buildReportPdfBytes(
  result: ReportResult,
  labels: ReportFilterLabels,
  options?: ReportPdfOptions
) {
  const ctx = await createHebrewPdf()

  if (result.type === "diaries") {
    drawDiariesListPdf(ctx, result, options)
    return pdfBytes(ctx)
  }

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
    `יומנים תואמים: ${result.matchingDiaryCount}`,
  ].filter(Boolean)
  drawMetaLines(ctx, meta)

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

  return pdfBytes(ctx)
}

export async function exportReportPdf(
  result: ReportResult,
  labels: ReportFilterLabels,
  options?: ReportPdfOptions
) {
  const bytes = await buildReportPdfBytes(result, labels, options)
  downloadBlob(
    new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
    `topesh-report-${result.type}-${reportStamp()}.pdf`
  )
}
