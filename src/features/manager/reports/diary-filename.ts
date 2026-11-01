import { formatWorkDateNumeric } from "@/lib/format"

export function sanitizeFilenamePart(value: string) {
  const cleaned = value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/_+/g, "_")
    .replace(/^[\s._-]+|[\s._-]+$/g, "")
  return cleaned.slice(0, 80) || "—"
}

/** Filename stem: תאריך_שם אתר_מספר הזמנה */
export function diaryFileBasename(diary: {
  workDate: string
  siteName: string
  workOrderNumber: string
}) {
  const date = sanitizeFilenamePart(formatWorkDateNumeric(diary.workDate).replaceAll("/", "-"))
  const site = sanitizeFilenamePart(diary.siteName)
  const workOrder = sanitizeFilenamePart(diary.workOrderNumber)
  return `${date}_${site}_${workOrder}`
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
