"use client"

import { PageFrame } from "@/components/motion/page-frame"
import { useLeaderDiaries } from "@/data/browser-store"
import { useDevSession } from "@/features/dev-role/dev-session"
import { DiaryCard } from "@/features/leader/diary-card"
import { LeaderLoading, LeaderStoreError } from "@/features/leader/leader-states"
import { he } from "@/i18n/he"

export function LeaderHomeScreen() {
  const session = useDevSession()
  const query = useLeaderDiaries()

  if (query.status === "loading") return <LeaderLoading />
  if (query.status === "error") return <LeaderStoreError />

  const name = session.user?.fullName ?? ""

  return (
    <PageFrame>
      <div className="flex flex-col gap-4 px-4 py-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">{he.leader.home.title}</h1>
          <p className="text-sm text-muted-foreground">
            {he.leader.home.assignedTo} {name}
          </p>
        </div>
        {query.data.length === 0 ? (
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-medium">{he.leader.home.emptyTitle}</h2>
            <p className="text-sm leading-6 text-muted-foreground">{he.leader.home.emptyBody}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {query.data.map((diary) => (
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
