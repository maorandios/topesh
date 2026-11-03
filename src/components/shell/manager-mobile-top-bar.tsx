"use client"

import { Flame, Settings } from "lucide-react"
import { AppLink } from "@/components/shell/app-link"
import { he } from "@/i18n/he"

/** Mobile chrome for manager / team-leader. Hidden at lg+ so desktop SideNav stays untouched. */
export function ManagerMobileTopBar({
  settingsHref = "/manager/settings",
}: {
  settingsHref?: string
}) {
  return (
    <header
      className="app-chrome sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b border-border px-4 pt-[env(safe-area-inset-top)] lg:hidden"
      style={{ viewTransitionName: "app-header" }}
    >
      <p className="inline-flex min-w-0 items-center gap-2 truncate text-sm font-semibold text-primary">
        <Flame className="size-5 shrink-0 text-primary" aria-hidden />
        <span className="truncate">{he.appName}</span>
      </p>
      <AppLink
        href={settingsHref}
        className="pressable inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        aria-label={he.nav.settings}
      >
        <Settings className="size-5" aria-hidden />
      </AppLink>
    </header>
  )
}
