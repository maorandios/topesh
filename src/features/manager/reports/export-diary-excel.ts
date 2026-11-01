import ExcelJS from "exceljs"
import type { ManagerDiaryDetail } from "@/data/manager"
import { diaryFileBasename } from "@/features/manager/reports/diary-filename"
import { downloadBlob } from "@/features/manager/reports/download"
import { he } from "@/i18n/he"
import { formatWorkDateNumeric } from "@/lib/format"

function statusLabel(status: ManagerDiaryDetail["status"]) {
  if (status === "pending") return he.leader.status.pending
  if (status === "cancelled") return he.leader.status.cancelled
  return he.leader.status.submitted
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

function addSectionTitle(sheet: ExcelJS.Worksheet, title: string) {
  const row = sheet.addRow([title])
  row.font = { bold: true, size: 12 }
  row.alignment = { horizontal: "right" }
  sheet.addRow([])
}

function addKeyValue(sheet: ExcelJS.Worksheet, label: string, value: string) {
  const row = sheet.addRow([label, value || "—"])
  row.getCell(1).font = { bold: true }
  row.alignment = { horizontal: "right" }
}

export async function buildDiaryExcelBuffer(diary: ManagerDiaryDetail) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "TOPESH"
  workbook.created = new Date()

  const sheet = workbook.addWorksheet("יומן עבודה", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  })

  const title = sheet.addRow([`יומן עבודה לתאריך ${formatWorkDateNumeric(diary.workDate)}`])
  title.font = { bold: true, size: 14 }
  title.alignment = { horizontal: "right" }
  sheet.addRow([])

  addSectionTitle(sheet, he.manager.panel.details)
  addKeyValue(sheet, "סטטוס", statusLabel(diary.status))
  addKeyValue(sheet, he.manager.dashboard.columns.company, diary.companyName)
  addKeyValue(sheet, he.manager.dashboard.columns.customer, diary.customerName)
  addKeyValue(sheet, he.manager.dashboard.columns.site, diary.siteName)
  addKeyValue(sheet, he.manager.diaries.project, diary.projectName || "—")
  addKeyValue(sheet, he.manager.dashboard.columns.subSite, diary.subSiteName || "—")
  addKeyValue(sheet, he.manager.dashboard.columns.leader, diary.teamLeaderName)
  addKeyValue(sheet, he.manager.diaries.workOrder, diary.workOrderNumber)
  sheet.addRow([])

  addSectionTitle(sheet, he.leader.form.workersTitle)
  if (diary.workers.length === 0) {
    sheet.addRow([he.leader.form.readOnlyWorkers])
  } else {
    for (const worker of diary.workers) {
      sheet.addRow([worker.fullName]).alignment = { horizontal: "right" }
    }
  }
  sheet.addRow([])

  addSectionTitle(sheet, he.leader.form.workTitle)
  const itemsHeader = sheet.addRow([
    he.leader.form.system,
    he.leader.form.component,
    he.leader.form.quantity,
    he.leader.form.units,
  ])
  styleHeader(itemsHeader)
  if (diary.items.length === 0) {
    sheet.addRow([he.leader.form.readOnlyItems, "", "", ""])
  } else {
    for (const item of diary.items) {
      const row = sheet.addRow([item.domainName, item.componentName, item.quantity, item.unit])
      row.getCell(3).numFmt = "#,##0.##"
      row.alignment = { horizontal: "right" }
    }
  }
  sheet.addRow([])

  addSectionTitle(sheet, he.leader.form.checksTitle)
  const checked = diary.checkboxes.filter((item) => item.checked)
  if (checked.length === 0) {
    sheet.addRow([he.leader.form.readOnlyChecks])
  } else {
    for (const check of checked) {
      sheet.addRow([check.label]).alignment = { horizontal: "right" }
    }
  }
  sheet.addRow([])

  addSectionTitle(sheet, he.leader.form.notesTitle)
  sheet.addRow([diary.notes.trim() || he.leader.form.readOnlyNotes]).alignment = {
    horizontal: "right",
    wrapText: true,
  }

  sheet.columns = [{ width: 22 }, { width: 28 }, { width: 12 }, { width: 12 }]
  return workbook.xlsx.writeBuffer()
}

export async function exportDiaryExcel(diary: ManagerDiaryDetail) {
  const buffer = await buildDiaryExcelBuffer(diary)
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${diaryFileBasename(diary)}.xlsx`
  )
}
