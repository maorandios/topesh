"use client"

import { Flame } from "lucide-react"
import { AppLink } from "@/components/shell/app-link"
import { devRoleSwitcherEnabled } from "@/features/dev-role/users"
import { he } from "@/i18n/he"

export function TopBar() {
  return (
    <header
      className="app-chrome sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b border-border px-4 pt-[env(safe-area-inset-top)]"
      style={{ viewTransitionName: "app-header" }}
    >
      <p className="inline-flex min-w-0 items-center gap-2 truncate text-sm font-semibold lg:hidden">
        <Flame className="size-5 shrink-0 text-foreground" aria-hidden />
        <span className="truncate">{he.appName}</span>
      </p>
      {devRoleSwitcherEnabled ? (
        <AppLink
          href="/"
          direction="back"
          className="pressable inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm text-muted-foreground"
        >
          {he.role.switch}
        </AppLink>
      ) : null}
    </header>
  )
}
