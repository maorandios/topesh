import type { ManagerDiaryDetail } from "@/data/manager"
import { downloadBlob, reportStamp } from "@/features/manager/reports/download"
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
import { formatWorkDate } from "@/lib/format"

function statusLabel(status: ManagerDiaryDetail["status"]) {
  if (status === "pending") return he.leader.status.pending
  if (status === "cancelled") return he.leader.status.cancelled
  return he.leader.status.submitted
}

export async function buildDiaryPdfBytes(diary: ManagerDiaryDetail) {
  const ctx = await createHebrewPdf()
  drawHeaderBand(ctx, "TOPESH — יומן עבודה", formatWorkDate(diary.workDate))
  drawMetaLines(ctx, [
    `סטטוס: ${statusLabel(diary.status)}`,
    `חברה: ${diary.companyName}`,
    `לקוח: ${diary.customerName}`,
    `אתר: ${diary.siteName}`,
    diary.subSiteName ? `אתר משנה: ${diary.subSiteName}` : "",
    `ראש צוות: ${diary.teamLeaderName}`,
    `הזמנת עבודה: ${diary.workOrderNumber}`,
    diary.projectName ? `פרויקט: ${diary.projectName}` : "",
  ].filter(Boolean))

  drawSectionTitle(ctx, "רכיבים שבוצעו")
  drawTable(
    ctx,
    [
      { key: "domain", label: "מערכת", width: 120 },
      { key: "component", label: "רכיב", width: 160 },
      { key: "qty", label: "כמות", width: 60 },
      { key: "unit", label: "יחידה", width: 70 },
    ],
    diary.items.map((item) => ({
      domain: item.domainName,
      component: item.componentName,
      qty: String(item.quantity),
      unit: item.unit,
    })),
    { emptyText: "אין רכיבים" }
  )

  if (diary.workers.length) {
    drawSectionTitle(ctx, "עובדים")
    for (const worker of diary.workers) {
      ensureSpace(ctx, 14)
      drawRightText(ctx, `• ${worker.fullName}`, PAGE.width - MARGIN, ctx.y, 9)
      ctx.y -= 14
    }
    ctx.y -= 4
  }

  const checked = diary.checkboxes.filter((item) => item.checked)
  if (checked.length) {
    drawSectionTitle(ctx, "סימונים")
    for (const check of checked) {
      ensureSpace(ctx, 14)
      drawRightText(ctx, `• ${check.label}`, PAGE.width - MARGIN, ctx.y, 9)
      ctx.y -= 14
    }
    ctx.y -= 4
  }

  if (diary.notes.trim()) {
    drawSectionTitle(ctx, "הערות")
    ensureSpace(ctx, 14)
    drawRightText(ctx, diary.notes, PAGE.width - MARGIN, ctx.y, 9)
  }

  return pdfBytes(ctx)
}

export async function exportDiaryPdf(diary: ManagerDiaryDetail) {
  const bytes = await buildDiaryPdfBytes(diary)
  downloadBlob(
    new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
    `topesh-diary-${diary.workOrderNumber || diary.id}-${reportStamp()}.pdf`
  )
}
