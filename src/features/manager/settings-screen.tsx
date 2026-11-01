"use client"

import { PageFrame } from "@/components/motion/page-frame"
import { ThemeModePicker } from "@/features/theme/theme-toggle"
import { he } from "@/i18n/he"

export function SettingsScreen() {
  return (
    <PageFrame>
      <div className="flex max-w-2xl flex-col gap-6 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{he.manager.settings.title}</h1>
          <p className="text-sm leading-6 text-muted-foreground">{he.manager.settings.body}</p>
        </div>

        <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold tracking-tight">{he.manager.settings.appearance}</h2>
            <p className="text-sm text-muted-foreground">{he.manager.settings.appearanceHint}</p>
          </div>
          <ThemeModePicker />
        </section>
      </div>
    </PageFrame>
  )
}
