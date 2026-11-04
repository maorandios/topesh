import JSZip from "jszip"
import type { ManagerDiaryDetail } from "@/data/manager"
import { diaryFileBasename, sanitizeFilenamePart } from "@/features/manager/reports/diary-filename"
import { downloadBlob } from "@/features/manager/reports/download"
import { buildDiaryExcelBuffer } from "@/features/manager/reports/export-diary-excel"
import { buildDiaryPdfBytes } from "@/features/manager/reports/export-diary-pdf"
import { formatWorkDateNumeric } from "@/lib/format"

export function diariesZipBasename(diaries: ManagerDiaryDetail[]) {
  const dates = [...new Set(diaries.map((d) => d.workDate))].sort()
  const datePart =
    dates.length === 1
      ? formatWorkDateNumeric(dates[0]!).replaceAll("/", "-")
      : dates.length > 1
        ? `${formatWorkDateNumeric(dates[0]!).replaceAll("/", "-")}_${formatWorkDateNumeric(dates[dates.length - 1]!).replaceAll("/", "-")}`
        : formatWorkDateNumeric(new Date().toISOString().slice(0, 10)).replaceAll("/", "-")
  return sanitizeFilenamePart(`יומנים לתאריך_${datePart}`)
}

export async function buildDiariesZipBlob(
  diaries: ManagerDiaryDetail[],
  kind: "excel" | "pdf",
  options?: { generatedBy?: string }
) {
  const zip = new JSZip()
  const usedNames = new Map<string, number>()

  for (const diary of diaries) {
    const base = diaryFileBasename(diary)
    const ext = kind === "excel" ? "xlsx" : "pdf"
    const key = `${base}.${ext}`
    const next = (usedNames.get(key) ?? 0) + 1
    usedNames.set(key, next)
    const filename = next === 1 ? key : `${base}_${next}.${ext}`

    if (kind === "excel") {
      const buffer = await buildDiaryExcelBuffer(diary)
      zip.file(filename, buffer)
    } else {
      const bytes = await buildDiaryPdfBytes(diary, options)
      zip.file(filename, bytes)
    }
  }

  return zip.generateAsync({ type: "blob" })
}

export async function exportDiariesZip(
  diaries: ManagerDiaryDetail[],
  kind: "excel" | "pdf",
  options?: { generatedBy?: string }
) {
  const blob = await buildDiariesZipBlob(diaries, kind, options)
  downloadBlob(blob, `${diariesZipBasename(diaries)}.zip`)
}
