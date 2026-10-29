"use client"

import { usePathname } from "next/navigation"
import { AppLink } from "@/components/shell/app-link"
import { isNavActive, leaderNav, managerNav, type NavItem } from "@/components/shell/nav"
import { he } from "@/i18n/he"
import { cn } from "cn"

export function SideNav({ variant }: { variant: "manager" | "leader" }) {
  const pathname = usePathname()
  const items: NavItem[] = variant === "manager" ? managerNav : leaderNav

  return (
    <aside
      className="app-chrome sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-e border-border bg-card lg:flex"
      style={{ viewTransitionName: "app-sidebar" }}
    >
      <div className="flex h-14 items-center px-4 text-sm font-semibold">
        {he.appName}
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 pb-4">
        {items.map((item) => {
          const active = isNavActive(pathname, item.href)
          const Icon = item.icon
          return (
            <AppLink
              key={item.href}
              href={item.href}
              className={cn(
                "pressable flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm",
                active
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </AppLink>
          )
        })}
      </nav>
    </aside>
  )
}

export function SideNavFallback() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-e border-border bg-card lg:block" />
  )
}
