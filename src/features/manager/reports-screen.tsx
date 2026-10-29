"use client"

import { PageFrame } from "@/components/motion/page-frame"
import { he } from "@/i18n/he"

export function ReportsScreen() {
  return (
    <PageFrame>
      <div className="flex max-w-2xl flex-col gap-3 px-4 py-5 sm:px-6">
        <h1 className="text-xl font-semibold tracking-tight">{he.manager.reports.title}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{he.manager.reports.body}</p>
      </div>
    </PageFrame>
  )
}
