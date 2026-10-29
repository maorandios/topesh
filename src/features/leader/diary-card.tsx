import { AppLink } from "@/components/shell/app-link"
import type { LeaderDiarySummary } from "@/data/repository"
import { he } from "@/i18n/he"
import { formatWorkDate } from "@/lib/format"
import { cn } from "cn"

export function DiaryCard({ diary }: { diary: LeaderDiarySummary }) {
  const pending = diary.status === "pending"
  return (
    <AppLink
      href={`/leader/diaries/${diary.id}`}
      className="pressable flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="text-base font-medium">{formatWorkDate(diary.workDate)}</span>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-2 py-1 text-xs",
            pending
              ? "border border-border text-muted-foreground"
              : "bg-primary text-primary-foreground"
          )}
        >
          {pending
            ? he.leader.status.pending
            : diary.status === "cancelled"
              ? he.leader.status.cancelled
              : he.leader.status.submitted}
        </span>
      </span>
      <span className="flex flex-col gap-1 text-sm">
        <span>{diary.siteName}</span>
        <span className="text-muted-foreground">{diary.subSiteName}</span>
      </span>
      <span className="text-sm font-medium">
        {pending ? he.leader.fill : he.leader.view}
      </span>
    </AppLink>
  )
}
