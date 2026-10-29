"use client"

import { useState } from "react"
import { PageFrame } from "@/components/motion/page-frame"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLeaderDiaries } from "@/data/browser-store"
import type { DiaryStatus } from "@/domain/types"
import { DiaryCard } from "@/features/leader/diary-card"
import { LeaderLoading, LeaderStoreError } from "@/features/leader/leader-states"
import { he } from "@/i18n/he"
import { cn } from "cn"

const filters = ["all", "pending", "submitted"] as const

export function LeaderHistoryScreen() {
  const query = useLeaderDiaries()
  const [status, setStatus] = useState<(typeof filters)[number]>("all")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  if (query.status === "loading") return <LeaderLoading />
  if (query.status === "error") return <LeaderStoreError />

  const rangeInvalid = Boolean(from && to && from > to)
  const filtered = rangeInvalid
    ? []
    : query.data.filter((diary) => {
        if (status !== "all" && diary.status !== status) return false
        if (from && diary.workDate < from) return false
        if (to && diary.workDate > to) return false
        return true
      })
  const filtering = status !== "all" || from !== "" || to !== ""

  return (
    <PageFrame>
      <div className="flex flex-col gap-4 px-4 py-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">{he.leader.history.title}</h1>
          <p className="text-sm leading-6 text-muted-foreground">{he.leader.history.body}</p>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label={he.leader.history.title}>
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={status === item}
              className={cn(
                "pressable min-h-11 rounded-xl border px-3 text-sm",
                status === item ? "border-foreground bg-muted font-medium" : "border-border bg-card"
              )}
              onClick={() => setStatus(item)}
            >
              {item === "all"
                ? he.leader.history.all
                : he.leader.status[item satisfies DiaryStatus]}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            {he.leader.history.from}
            <Input
              type="date"
              dir="ltr"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-11 text-base md:text-base"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {he.leader.history.to}
            <Input
              type="date"
              dir="ltr"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="h-11 text-base md:text-base"
            />
          </label>
        </div>

        {filtering ? (
          <Button
            type="button"
            variant="outline"
            size="touch"
            className="self-start"
            onClick={() => {
              setStatus("all")
              setFrom("")
              setTo("")
            }}
          >
            {he.leader.history.clear}
          </Button>
        ) : null}

        {rangeInvalid ? (
          <p className="text-sm leading-6 text-muted-foreground">{he.leader.history.rangeInvalid}</p>
        ) : null}

        {filtered.length === 0 ? (
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-medium">{he.leader.history.emptyTitle}</h2>
            <p className="text-sm leading-6 text-muted-foreground">{he.leader.history.emptyBody}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map((diary) => (
              <li key={diary.id}>
                <DiaryCard diary={diary} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageFrame>
  )
}
