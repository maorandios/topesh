import ExcelJS from "exceljs"
import type { ReportFilterLabels, ReportResult, ReportType } from "@/data/reports"
import { downloadBlob, reportStamp } from "@/features/manager/reports/download"
import { he } from "@/i18n/he"
import { formatWorkDateNumeric } from "@/lib/format"

function statusLabel(status: ReportFilterLabels["status"] | "pending" | "submitted" | "cancelled") {
  if (status === "pending") return he.leader.status.pending
  if (status === "cancelled") return he.leader.status.cancelled
  if (status === "submitted") return he.leader.status.submitted
  return he.manager.reports.all
}

const reportTypeLabel: Record<ReportType, string> = {
  workOrder: "לפי הזמנת עבודה",
  site: "לפי אתר",
  components: "לפי רכיבים",
  diaries: "יומני עבודה",
}

export async function buildReportExcelBuffer(result: ReportResult, labels: ReportFilterLabels) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "TOPESH"
  workbook.created = new Date()

  if (result.type === "diaries") {
    buildDiariesSheet(workbook, result, labels)
  } else {
    buildSummarySheet(workbook, result, labels)
    buildDetailsSheet(workbook, result, labels)
  }

  return workbook.xlsx.writeBuffer()
}

export async function exportReportExcel(result: ReportResult, labels: ReportFilterLabels) {
  const buffer = await buildReportExcelBuffer(result, labels)
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  downloadBlob(blob, `topesh-report-${result.type}-${reportStamp()}.xlsx`)
}

function applyRtl(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ rightToLeft: true, state: "frozen", ySplit: 1 }]
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FF111827" } }
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE5E7EB" },
  }
  row.alignment = { vertical: "middle", horizontal: "right", wrapText: true }
  row.height = 22
}

function addMeta(sheet: ExcelJS.Worksheet, result: ReportResult, labels: ReportFilterLabels) {
  const lines = [
    ["סוג דוח", reportTypeLabel[result.type]],
    ["מתאריך", labels.from || "—"],
    ["עד תאריך", labels.to || "—"],
    ["חברה", labels.company || "—"],
    ["לקוח", labels.customer || "—"],
    ["אתר", labels.site || "—"],
    ["הזמנת עבודה", labels.workOrderNumber || "—"],
    ["ראש צוות", labels.teamLeader || "—"],
    ["מערכת", labels.domain || "—"],
    ["רכיב", labels.component || "—"],
    ["סטטוס", labels.status === "all" ? "הכל" : statusLabel(labels.status)],
    ["סימון", labels.checkbox || "—"],
    ["מספר יומנים", String(result.matchingDiaryCount)],
  ]
  for (const [label, value] of lines) {
    const row = sheet.addRow([label, value])
    row.getCell(1).font = { bold: true }
    row.alignment = { horizontal: "right" }
  }
  sheet.addRow([])
}

function buildSummarySheet(workbook: ExcelJS.Workbook, result: ReportResult, labels: ReportFilterLabels) {
  const sheet = workbook.addWorksheet("סיכום ביצוע", {
    views: [{ rightToLeft: true }],
  })
  applyRtl(sheet)
  addMeta(sheet, result, labels)

  const header = sheet.addRow(["מערכת", "רכיב", "יחידה", "סה״כ כמות"])
  styleHeader(header)
  sheet.autoFilter = {
    from: { row: header.number, column: 1 },
    to: { row: header.number, column: 4 },
  }

  for (const row of result.summary) {
    const excelRow = sheet.addRow([row.domainName, row.componentName, row.unit, row.totalQuantity])
    excelRow.getCell(4).numFmt = "#,##0.##"
    excelRow.alignment = { horizontal: "right" }
  }

  sheet.columns = [{ width: 22 }, { width: 28 }, { width: 14 }, { width: 14 }]
}

function buildDetailsSheet(workbook: ExcelJS.Workbook, result: ReportResult, labels: ReportFilterLabels) {
  const sheet = workbook.addWorksheet("פירוט יומי", {
    views: [{ rightToLeft: true }],
  })
  applyRtl(sheet)
  addMeta(sheet, result, labels)

  const header = sheet.addRow([
    "תאריך",
    "חברה",
    "לקוח",
    "אתר",
    "אתר משנה",
    "ראש צוות",
    "הזמנת עבודה",
    "מערכת",
    "רכיב",
    "כמות",
    "יחידה",
  ])
  styleHeader(header)
  sheet.autoFilter = {
    from: { row: header.number, column: 1 },
    to: { row: header.number, column: 11 },
  }

  for (const row of result.details) {
    const excelRow = sheet.addRow([
      formatWorkDateNumeric(row.workDate),
      row.companyName,
      row.customerName,
      row.siteName,
      row.subSiteName || "—",
      row.teamLeaderName,
      row.workOrderNumber,
      row.domainName,
      row.componentName,
      row.quantity,
      row.unit,
    ])
    excelRow.getCell(10).numFmt = "#,##0.##"
    excelRow.alignment = { horizontal: "right" }
  }

  sheet.columns = [
    { width: 12 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 16 },
    { width: 16 },
    { width: 14 },
    { width: 16 },
    { width: 22 },
    { width: 10 },
    { width: 12 },
  ]
}

function buildDiariesSheet(workbook: ExcelJS.Workbook, result: ReportResult, labels: ReportFilterLabels) {
  const sheet = workbook.addWorksheet("יומני עבודה", {
    views: [{ rightToLeft: true }],
  })
  applyRtl(sheet)
  addMeta(sheet, result, labels)

  const header = sheet.addRow([
    "תאריך",
    "סטטוס",
    "ראש צוות",
    "חברה",
    "לקוח",
    "אתר",
    "אתר משנה",
    "הזמנת עבודה",
  ])
  styleHeader(header)
  sheet.autoFilter = {
    from: { row: header.number, column: 1 },
    to: { row: header.number, column: 8 },
  }

  for (const diary of result.diaries) {
    const excelRow = sheet.addRow([
      formatWorkDateNumeric(diary.workDate),
      statusLabel(diary.status),
      diary.teamLeaderName,
      diary.companyName,
      diary.customerName,
      diary.siteName,
      diary.subSiteName || "—",
      diary.workOrderNumber,
    ])
    excelRow.alignment = { horizontal: "right" }
  }

  sheet.columns = [
    { width: 12 },
    { width: 14 },
    { width: 16 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 16 },
    { width: 14 },
  ]
}
