import { formatWorkDateNumeric, jerusalemToday } from "@/lib/format"

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.rel = "noopener"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

/** רשימת_יומנים_תאריך-הורדה — for list export only (not diary contents). */
export function reportListBasename() {
  const date = formatWorkDateNumeric(jerusalemToday()).replaceAll("/", "-")
  return `רשימת_יומנים_${date}`
}

/** רשימת_אביזרי_קצה_תאריך-הורדה */
export function endpointListBasename() {
  const date = formatWorkDateNumeric(jerusalemToday()).replaceAll("/", "-")
  return `רשימת_אביזרי_קצה_${date}`
}
