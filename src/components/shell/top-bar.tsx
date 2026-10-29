"use client"

import { AppLink } from "@/components/shell/app-link"
import { devRoleSwitcherEnabled } from "@/features/dev-role/users"
import { he } from "@/i18n/he"

export function TopBar() {
  return (
    <header
      className="app-chrome sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b border-border bg-card px-4 pt-[env(safe-area-inset-top)]"
      style={{ viewTransitionName: "app-header" }}
    >
      <p className="truncate text-sm font-semibold lg:hidden">{he.appName}</p>
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
