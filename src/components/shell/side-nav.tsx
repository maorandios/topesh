"use client"

import { useState } from "react"
import { Flame, Mail, Phone, UserRound } from "lucide-react"
import { usePathname } from "next/navigation"
import { AppLink } from "@/components/shell/app-link"
import { isNavActive, leaderNav, managerNav, type NavItem } from "@/components/shell/nav"
import { useDevSession } from "@/features/dev-role/dev-session"
import { SettingsSheet, type SettingsRole } from "@/features/settings/settings-panel"
import { he } from "@/i18n/he"
import { cn } from "cn"

function isSettingsHref(href: string) {
  return href === "/manager/settings" || href === "/leader/settings"
}

export function SideNav({ variant }: { variant: "manager" | "leader" }) {
  const pathname = usePathname()
  const session = useDevSession()
  const items: NavItem[] = variant === "manager" ? managerNav : leaderNav
  const settingsRole: SettingsRole = variant === "manager" ? "manager" : "teamLeader"
  const [settingsOpen, setSettingsOpen] = useState(false)

  const user = session.user
  const detail =
    variant === "manager" ? user?.email?.trim() || "—" : user?.phone?.trim() || "—"

  return (
    <>
      <aside
        className="app-chrome sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-e border-border lg:flex"
        style={{ viewTransitionName: "app-sidebar" }}
      >
        <div className="flex h-14 items-center gap-2 px-4 text-[1.00625rem] font-semibold text-primary">
          <Flame className="size-[1.222rem] shrink-0 text-primary" aria-hidden />
          <span className="truncate">{he.appName}</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 pb-4">
          {items.map((item) => {
            const Icon = item.icon
            if (isSettingsHref(item.href)) {
              return (
                <button
                  key={item.href}
                  type="button"
                  className={cn(
                    "pressable flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.7875rem]",
                    settingsOpen
                      ? "bg-accent font-medium text-foreground"
                      : "text-muted-foreground"
                  )}
                  onClick={() => setSettingsOpen(true)}
                >
                  <Icon className="size-[1.125rem] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              )
            }
            const active = isNavActive(pathname, item.href)
            return (
              <AppLink
                key={item.href}
                href={item.href}
                className={cn(
                  "pressable flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.7875rem]",
                  active
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="size-[1.125rem] shrink-0" />
                <span className="truncate">{item.label}</span>
              </AppLink>
            )
          })}
        </nav>
        <div className="mt-auto border-t border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <UserRound className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <p className="truncate text-sm font-medium text-foreground">
              {user?.fullName || "—"}
            </p>
          </div>
          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            {variant === "manager" ? (
              <Mail className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <Phone className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <p className="truncate text-start text-xs text-muted-foreground">{detail}</p>
          </div>
        </div>
      </aside>
      <SettingsSheet role={settingsRole} open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}

export function SideNavFallback() {
  return (
    <aside className="app-chrome sticky top-0 hidden h-dvh w-60 shrink-0 border-e border-border lg:block" />
  )
}
