import ExcelJS from "exceljs"
import type { EndpointReport } from "@/data/endpoint-reports"
import type { ReportFilterLabels } from "@/data/reports"
import { downloadBlob, endpointListBasename } from "@/features/manager/reports/download"
import { formatWorkDateNumeric } from "@/lib/format"

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

function addMeta(
  sheet: ExcelJS.Worksheet,
  report: EndpointReport,
  labels: ReportFilterLabels
) {
  const lines = [
    ["סוג דוח", "אביזרי קצה"],
    ["מתאריך", labels.from || "—"],
    ["עד תאריך", labels.to || "—"],
    ["חברה", labels.company || "—"],
    ["לקוח", labels.customer || "—"],
    ["אתר", labels.site || "—"],
    ["הזמנת עבודה", labels.workOrderNumber || "—"],
    ["ראש צוות", labels.teamLeader || "—"],
    ["מספר יומנים", String(report.matchingDiaryCount)],
    ["שורות אביזרים", String(report.details.length)],
  ]
  for (const [label, value] of lines) {
    const row = sheet.addRow([label, value])
    row.getCell(1).font = { bold: true }
    row.alignment = { horizontal: "right" }
  }
  sheet.addRow([])
}

export async function buildEndpointReportExcelBuffer(
  report: EndpointReport,
  labels: ReportFilterLabels
) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "TOPESH"
  workbook.created = new Date()

  const summary = workbook.addWorksheet("סיכום אביזרי קצה", {
    views: [{ rightToLeft: true }],
  })
  applyRtl(summary)
  addMeta(summary, report, labels)
  const summaryHeader = summary.addRow(["מערכת", "אביזר קצה", "יחידה", "סה״כ כמות"])
  styleHeader(summaryHeader)
  summary.autoFilter = {
    from: { row: summaryHeader.number, column: 1 },
    to: { row: summaryHeader.number, column: 4 },
  }
  for (const row of report.summary) {
    const excelRow = summary.addRow([
      row.domainName,
      row.componentName,
      row.unit,
      row.totalQuantity,
    ])
    excelRow.getCell(4).numFmt = "#,##0.##"
    excelRow.alignment = { horizontal: "right" }
  }
  summary.columns = [{ width: 22 }, { width: 28 }, { width: 14 }, { width: 14 }]

  const details = workbook.addWorksheet("פירוט לפי יומן", {
    views: [{ rightToLeft: true }],
  })
  applyRtl(details)
  addMeta(details, report, labels)
  const detailsHeader = details.addRow([
    "תאריך",
    "חברה",
    "לקוח",
    "אתר",
    "תת־אתר",
    "ראש צוות",
    "הזמנת עבודה",
    "מערכת",
    "אביזר קצה",
    "כמות",
    "יחידה",
  ])
  styleHeader(detailsHeader)
  details.autoFilter = {
    from: { row: detailsHeader.number, column: 1 },
    to: { row: detailsHeader.number, column: 11 },
  }
  for (const row of report.details) {
    const excelRow = details.addRow([
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
  details.columns = [
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

  return workbook.xlsx.writeBuffer()
}

export async function exportEndpointReportExcel(
  report: EndpointReport,
  labels: ReportFilterLabels
) {
  const buffer = await buildEndpointReportExcelBuffer(report, labels)
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${endpointListBasename()}.xlsx`
  )
}
