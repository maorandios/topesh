"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import { usePathname } from "next/navigation"
import { AppLink } from "@/components/shell/app-link"
import {
  isNavActive,
  leaderNav,
  managerNav,
  managerPrimaryNav,
} from "@/components/shell/nav"
import { useKeyboardOpen } from "@/lib/use-keyboard-open"
import { he } from "@/i18n/he"
import { cn } from "cn"
import { devRoleSwitcherEnabled } from "@/features/dev-role/users"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function BottomNav({ variant }: { variant: "manager" | "leader" }) {
  const pathname = usePathname()
  const keyboardOpen = useKeyboardOpen()
  const [menuOpen, setMenuOpen] = useState(false)
  const items = variant === "manager" ? managerPrimaryNav : leaderNav
  const menuItems = variant === "manager" ? managerNav : null
  const menuActive = menuItems?.some((item) => isNavActive(pathname, item.href))
  const columns = menuItems ? "grid-cols-4" : "grid-cols-2"

  return (
    <>
      <nav
        className={cn(
          "app-chrome fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden",
          keyboardOpen && "hidden"
        )}
        style={{ viewTransitionName: "app-bottom-nav" }}
      >
        <div className={cn("grid", columns)}>
          {items.map((item) => {
            const active = isNavActive(pathname, item.href)
            const Icon = item.icon
            return (
              <AppLink
                key={item.href}
                href={item.href}
                className={cn(
                  "pressable flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] leading-none",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="size-5" />
                <span className="max-w-full truncate">{item.shortLabel}</span>
              </AppLink>
            )
          })}
          {menuItems ? (
            <button
              type="button"
              className={cn(
                "pressable flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] leading-none",
                menuActive ? "text-foreground" : "text-muted-foreground"
              )}
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="size-5" />
              <span>{he.nav.menu}</span>
            </button>
          ) : null}
        </div>
      </nav>

      {menuItems ? (
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>{he.nav.menuTitle}</SheetTitle>
              <SheetDescription>{he.appName}</SheetDescription>
            </SheetHeader>
            <nav className="flex flex-1 flex-col gap-1 px-4">
              {menuItems.map((item) => {
                const active = isNavActive(pathname, item.href)
                const Icon = item.icon
                return (
                  <AppLink
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "pressable flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm",
                      active
                        ? "bg-accent font-medium text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <Icon className="size-5 shrink-0" />
                    <span>{item.label}</span>
                  </AppLink>
                )
              })}
            </nav>
            {devRoleSwitcherEnabled ? (
              <div className="mt-auto border-t border-border p-4">
                <AppLink
                  href="/"
                  direction="back"
                  onClick={() => setMenuOpen(false)}
                  className="pressable flex min-h-11 items-center justify-center rounded-xl border border-border px-3 text-sm text-muted-foreground"
                >
                  {he.role.switch}
                </AppLink>
              </div>
            ) : null}
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  )
}
