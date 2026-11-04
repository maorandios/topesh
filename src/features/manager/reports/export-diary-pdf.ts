import type { ManagerDiaryDetail } from "@/data/manager"
import { diaryFileBasename } from "@/features/manager/reports/diary-filename"
import { downloadBlob } from "@/features/manager/reports/download"
import {
  createHebrewPdf,
  drawDocumentHeader,
  drawFieldGrid,
  drawHairline,
  drawRightText,
  drawSectionTitle,
  drawTable,
  ensureSpace,
  MARGIN,
  PAGE,
  pdfBytes,
  type PdfCtx,
} from "@/features/manager/reports/pdf-draw"
import { he } from "@/i18n/he"
import { formatWorkDateNumeric, jerusalemToday } from "@/lib/format"

export type DiaryPdfOptions = {
  generatedBy?: string
}

function statusLabel(status: ManagerDiaryDetail["status"]) {
  if (status === "pending") return he.leader.status.pending
  if (status === "cancelled") return he.leader.status.cancelled
  return he.leader.status.submitted
}

function drawBulletList(ctx: PdfCtx, items: string[], emptyText: string) {
  if (items.length === 0) {
    ensureSpace(ctx, 16)
    drawRightText(ctx, emptyText, PAGE.width - MARGIN, ctx.y, 9)
    ctx.y -= 16
    return
  }
  const bulletGap = 10
  for (const item of items) {
    ensureSpace(ctx, 15)
    const bulletWidth = drawRightText(ctx, "•", PAGE.width - MARGIN, ctx.y, 9)
    drawRightText(ctx, item, PAGE.width - MARGIN - bulletWidth - bulletGap, ctx.y, 9)
    ctx.y -= 14
  }
  ctx.y -= 4
}

export async function buildDiaryPdfBytes(diary: ManagerDiaryDetail, options?: DiaryPdfOptions) {
  const ctx = await createHebrewPdf()
  const generatedAt = formatWorkDateNumeric(jerusalemToday())
  const generatedBy = options?.generatedBy?.trim() || "—"

  drawDocumentHeader(ctx, {
    title: 'ט.י טופ אש בע"מ',
    subtitle: "יומן עבודה",
    meta: [
      { label: "תאריך הפקת יומן", value: generatedAt },
      { label: "הופק ע״י", value: generatedBy },
    ],
  })

  const details: { label: string; value: string }[] = [
    { label: "סטטוס", value: statusLabel(diary.status) },
    { label: "תאריך ביצוע", value: formatWorkDateNumeric(diary.workDate) },
    { label: he.manager.dashboard.columns.company, value: diary.companyName },
    { label: he.manager.dashboard.columns.customer, value: diary.customerName },
    { label: he.manager.dashboard.columns.site, value: diary.siteName },
    {
      label: he.manager.dashboard.columns.subSite,
      value: diary.subSiteName || "—",
    },
    { label: he.manager.diaries.project, value: diary.projectName || "—" },
    { label: he.manager.diaries.workOrder, value: diary.workOrderNumber },
    { label: he.manager.dashboard.columns.leader, value: diary.teamLeaderName },
  ]

  drawFieldGrid(ctx, details, { columns: 2 })
  ctx.y -= 10
  drawHairline(ctx)

  drawSectionTitle(ctx, he.leader.form.workersTitle)
  drawBulletList(
    ctx,
    diary.workers.map((worker) => worker.fullName),
    he.leader.form.readOnlyWorkers
  )

  drawSectionTitle(ctx, he.leader.form.workTitle)
  drawTable(
    ctx,
    [
      { key: "domain", label: he.leader.form.system, width: 130 },
      { key: "component", label: he.leader.form.component, width: 180 },
      { key: "qty", label: he.leader.form.quantity, width: 55 },
      { key: "unit", label: he.leader.form.units, width: 55 },
    ],
    diary.items.map((item) => ({
      domain: item.domainName,
      component: item.componentName,
      qty: String(item.quantity),
      unit: item.unit,
    })),
    { emptyText: he.leader.form.readOnlyItems, fitPageWidth: true }
  )

  drawSectionTitle(ctx, he.leader.form.checksTitle)
  drawBulletList(
    ctx,
    diary.checkboxes.filter((item) => item.checked).map((item) => item.label),
    he.leader.form.readOnlyChecks
  )

  drawSectionTitle(ctx, he.leader.form.notesTitle)
  ensureSpace(ctx, 16)
  drawRightText(
    ctx,
    diary.notes.trim() || he.leader.form.readOnlyNotes,
    PAGE.width - MARGIN,
    ctx.y,
    9
  )

  return pdfBytes(ctx)
}

export async function exportDiaryPdf(diary: ManagerDiaryDetail, options?: DiaryPdfOptions) {
  const bytes = await buildDiaryPdfBytes(diary, options)
  downloadBlob(
    new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
    `${diaryFileBasename(diary)}.pdf`
  )
}
