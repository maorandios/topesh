export function formatWorkDateNumeric(isoDate: string): string {
  const date = calendarDate(isoDate)
  if (!date) return isoDate
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${day}/${month}/${date.getFullYear()}`
}

export function formatWorkDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  const year = Number(match?.[1])
  const month = Number(match?.[2])
  const day = Number(match?.[3])
  if (!year || !month || !day) return isoDate
  return new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day))
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jerusalem",
  }).format(date)
}

export function jerusalemDay(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

export function jerusalemToday(now = new Date()): string {
  return jerusalemDay(now.toISOString())
}

export function addCalendarDays(isoDate: string, days: number): string {
  const date = calendarDate(isoDate)
  if (!date) return isoDate
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

export function jerusalemSpan(
  preset: "today" | "week" | "month",
  now = new Date()
): { from: string; to: string } {
  const today = calendarDate(jerusalemToday(now))
  if (!today) return { from: "", to: "" }
  if (preset === "today") {
    const iso = toIsoDate(today)
    return { from: iso, to: iso }
  }
  if (preset === "week") {
    const start = new Date(today)
    start.setDate(today.getDate() - today.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { from: toIsoDate(start), to: toIsoDate(end) }
  }
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return { from: toIsoDate(start), to: toIsoDate(end) }
}

function calendarDate(isoDate: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  const year = Number(match?.[1])
  const month = Number(match?.[2])
  const day = Number(match?.[3])
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat("he-IL", {
    maximumFractionDigits: 2,
  }).format(value)
}
