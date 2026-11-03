import type { LeaderDiarySummary } from "@/data/repository"
import { he } from "@/i18n/he"
import { formatWorkDate } from "@/lib/format"
import { cn } from "cn"

function statusDotClass(status: LeaderDiarySummary["status"]) {
  if (status === "pending") return "bg-orange-500"
  if (status === "submitted") return "bg-emerald-500"
  if (status === "cancelled") return "bg-zinc-500"
  return null
}

function statusLabel(status: LeaderDiarySummary["status"]) {
  if (status === "pending") return he.leader.status.pending
  if (status === "cancelled") return he.leader.status.cancelled
  return he.leader.status.submitted
}

export function DiaryCard({
  diary,
  onOpen,
}: {
  diary: LeaderDiarySummary
  onOpen: (id: string) => void
}) {
  const place = [diary.siteName, diary.subSiteName].filter(Boolean).join(" · ")
  const statusDot = statusDotClass(diary.status)

  return (
    <button
      type="button"
      className={cn(
        "flex w-full min-w-0 flex-col gap-1 px-3 py-2.5 text-start text-sm",
        diary.status === "cancelled" && "text-muted-foreground line-through"
      )}
      onClick={() => onOpen(diary.id)}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-2 truncate font-medium">
          {statusDot ? (
            <span className={cn("size-2 shrink-0 rounded-full", statusDot)} aria-hidden />
          ) : null}
          <span className="truncate">{formatWorkDate(diary.workDate)}</span>
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">{statusLabel(diary.status)}</span>
      </span>
      {place ? <span className="truncate text-xs text-muted-foreground">{place}</span> : null}
      {diary.projectName ? (
        <span className="truncate text-xs text-muted-foreground">{diary.projectName}</span>
      ) : null}
    </button>
  )
}
