import type { ManagerDiaryDetail } from "@/data/manager"
import { diaryFileBasename } from "@/features/manager/reports/diary-filename"
import { downloadBlob } from "@/features/manager/reports/download"
import {
  createHebrewPdf,
  drawHeaderBand,
  drawMetaLines,
  drawRightText,
  drawSectionTitle,
  drawTable,
  ensureSpace,
  PAGE,
  MARGIN,
  pdfBytes,
} from "@/features/manager/reports/pdf-draw"
import { he } from "@/i18n/he"
import { formatWorkDate, formatWorkDateNumeric } from "@/lib/format"

function statusLabel(status: ManagerDiaryDetail["status"]) {
  if (status === "pending") return he.leader.status.pending
  if (status === "cancelled") return he.leader.status.cancelled
  return he.leader.status.submitted
}

export async function buildDiaryPdfBytes(diary: ManagerDiaryDetail) {
  const ctx = await createHebrewPdf()
  drawHeaderBand(
    ctx,
    "יומן עבודה — TOPESH",
    `${he.manager.panel.workDiaryForDate} ${formatWorkDate(diary.workDate)}`
  )
  drawMetaLines(ctx, [
    `סטטוס: ${statusLabel(diary.status)}`,
    `${he.manager.dashboard.columns.company}: ${diary.companyName}`,
    `${he.manager.dashboard.columns.customer}: ${diary.customerName}`,
    `${he.manager.dashboard.columns.site}: ${diary.siteName}`,
    diary.projectName ? `${he.manager.diaries.project}: ${diary.projectName}` : "",
    diary.subSiteName ? `${he.manager.dashboard.columns.subSite}: ${diary.subSiteName}` : "",
    `${he.manager.dashboard.columns.leader}: ${diary.teamLeaderName}`,
    `${he.manager.diaries.workOrder}: ${diary.workOrderNumber}`,
    `תאריך ביצוע: ${formatWorkDateNumeric(diary.workDate)}`,
  ].filter(Boolean))

  drawSectionTitle(ctx, he.leader.form.workersTitle)
  if (diary.workers.length === 0) {
    ensureSpace(ctx, 14)
    drawRightText(ctx, he.leader.form.readOnlyWorkers, PAGE.width - MARGIN, ctx.y, 9)
    ctx.y -= 18
  } else {
    for (const worker of diary.workers) {
      ensureSpace(ctx, 14)
      drawRightText(ctx, `• ${worker.fullName}`, PAGE.width - MARGIN, ctx.y, 9)
      ctx.y -= 14
    }
    ctx.y -= 4
  }

  drawSectionTitle(ctx, he.leader.form.workTitle)
  drawTable(
    ctx,
    [
      { key: "domain", label: he.leader.form.system, width: 120 },
      { key: "component", label: he.leader.form.component, width: 160 },
      { key: "qty", label: he.leader.form.quantity, width: 60 },
      { key: "unit", label: he.leader.form.units, width: 70 },
    ],
    diary.items.map((item) => ({
      domain: item.domainName,
      component: item.componentName,
      qty: String(item.quantity),
      unit: item.unit,
    })),
    { emptyText: he.leader.form.readOnlyItems }
  )

  drawSectionTitle(ctx, he.leader.form.checksTitle)
  const checked = diary.checkboxes.filter((item) => item.checked)
  if (checked.length === 0) {
    ensureSpace(ctx, 14)
    drawRightText(ctx, he.leader.form.readOnlyChecks, PAGE.width - MARGIN, ctx.y, 9)
    ctx.y -= 18
  } else {
    for (const check of checked) {
      ensureSpace(ctx, 14)
      drawRightText(ctx, `• ${check.label}`, PAGE.width - MARGIN, ctx.y, 9)
      ctx.y -= 14
    }
    ctx.y -= 4
  }

  drawSectionTitle(ctx, he.leader.form.notesTitle)
  ensureSpace(ctx, 14)
  drawRightText(
    ctx,
    diary.notes.trim() || he.leader.form.readOnlyNotes,
    PAGE.width - MARGIN,
    ctx.y,
    9
  )

  return pdfBytes(ctx)
}

export async function exportDiaryPdf(diary: ManagerDiaryDetail) {
  const bytes = await buildDiaryPdfBytes(diary)
  downloadBlob(
    new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
    `${diaryFileBasename(diary)}.pdf`
  )
}
