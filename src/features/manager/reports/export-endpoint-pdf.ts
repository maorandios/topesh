import type { EndpointReport } from "@/data/endpoint-reports"
import type { ReportFilterLabels } from "@/data/reports"
import { downloadBlob, endpointListBasename } from "@/features/manager/reports/download"
import {
  createHebrewPdf,
  drawDocumentHeader,
  drawSectionTitle,
  drawTable,
  pdfBytes,
  type TableColumn,
} from "@/features/manager/reports/pdf-draw"
import { formatWorkDateNumeric, jerusalemToday } from "@/lib/format"

export type EndpointPdfOptions = {
  generatedBy?: string
}

export async function buildEndpointReportPdfBytes(
  report: EndpointReport,
  labels: ReportFilterLabels,
  options?: EndpointPdfOptions
) {
  const ctx = await createHebrewPdf()
  const generatedAt = formatWorkDateNumeric(jerusalemToday())
  const generatedBy = options?.generatedBy?.trim() || "—"

  drawDocumentHeader(ctx, {
    title: 'ט.י טופ אש בע"מ',
    subtitle: "רשימת אביזרי קצה",
    meta: [
      { label: "תאריך הפקת רשימה", value: generatedAt },
      { label: "הופק ע״י", value: generatedBy },
      { label: "יומנים שנבחרו", value: String(report.matchingDiaryCount) },
      ...(labels.from ? [{ label: "מתאריך", value: labels.from }] : []),
      ...(labels.to ? [{ label: "עד תאריך", value: labels.to }] : []),
    ],
  })

  drawSectionTitle(ctx, "סיכום אביזרי קצה")
  const summaryColumns: TableColumn[] = [
    { key: "domain", label: "מערכת", width: 100 },
    { key: "component", label: "אביזר קצה", width: 160 },
    { key: "unit", label: "יחידה", width: 50 },
    { key: "qty", label: "סה״כ", width: 55 },
  ]
  drawTable(
    ctx,
    summaryColumns,
    report.summary.map((row) => ({
      domain: row.domainName,
      component: row.componentName,
      unit: row.unit,
      qty: String(row.totalQuantity),
    })),
    { emptyText: "אין אביזרי קצה ביומנים שנבחרו", fitPageWidth: true }
  )

  drawSectionTitle(ctx, "פירוט לפי יומן")
  const detailColumns: TableColumn[] = [
    { key: "date", label: "תאריך", width: 48 },
    { key: "site", label: "אתר", width: 70 },
    { key: "wo", label: "הזמנה", width: 50 },
    { key: "domain", label: "מערכת", width: 70 },
    { key: "component", label: "אביזר", width: 90 },
    { key: "qty", label: "כמות", width: 40 },
    { key: "unit", label: "יח׳", width: 35 },
  ]
  drawTable(
    ctx,
    detailColumns,
    report.details.map((row) => ({
      date: formatWorkDateNumeric(row.workDate),
      site: row.siteName,
      wo: row.workOrderNumber,
      domain: row.domainName,
      component: row.componentName,
      qty: String(row.quantity),
      unit: row.unit,
    })),
    { emptyText: "אין אביזרי קצה ביומנים שנבחרו", fitPageWidth: true }
  )

  return pdfBytes(ctx)
}

export async function exportEndpointReportPdf(
  report: EndpointReport,
  labels: ReportFilterLabels,
  options?: EndpointPdfOptions
) {
  const bytes = await buildEndpointReportPdfBytes(report, labels, options)
  downloadBlob(
    new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
    `${endpointListBasename()}.pdf`
  )
}
