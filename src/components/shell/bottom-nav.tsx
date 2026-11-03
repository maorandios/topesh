"use client"

import { Plus } from "lucide-react"
import { usePathname } from "next/navigation"
import { AppLink } from "@/components/shell/app-link"
import { isNavActive, managerMobileNav } from "@/components/shell/nav"
import { useManagerCreate } from "@/features/manager/manager-create-provider"
import { useKeyboardOpen } from "@/lib/use-keyboard-open"
import { he } from "@/i18n/he"
import { cn } from "cn"

export function BottomNav({ variant }: { variant: "manager" | "leader" }) {
  if (variant === "leader") return null
  return <ManagerBottomNav />
}

function ManagerBottomNav() {
  const pathname = usePathname()
  const keyboardOpen = useKeyboardOpen()
  const { openCreate } = useManagerCreate()
  const [leftA, leftB] = managerMobileNav.slice(0, 2)
  const [rightA, rightB] = managerMobileNav.slice(2)

  return (
    <nav
      className={cn(
        "app-chrome fixed inset-x-0 bottom-0 z-40 border-t border-border pb-[env(safe-area-inset-bottom)] lg:hidden",
        keyboardOpen && "hidden"
      )}
      style={{ viewTransitionName: "app-bottom-nav" }}
    >
      <div className="grid grid-cols-5 items-end">
        <MobileNavLink item={leftA!} pathname={pathname} />
        <MobileNavLink item={leftB!} pathname={pathname} />
        <button
          type="button"
          className="pressable relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] leading-none text-primary"
          aria-label={he.nav.create}
          onClick={openCreate}
        >
          {/* Same icon footprint as sibling tabs so the label shares their baseline. */}
          <span className="relative size-5 shrink-0" aria-hidden>
            <span className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-[calc(50%+1.05rem)] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_16px_rgb(255_51_0_/0.35)] ring-4 ring-background">
              <Plus className="size-6" strokeWidth={2.5} />
            </span>
          </span>
          <span className="max-w-full truncate">{he.nav.createShort}</span>
        </button>
        <MobileNavLink item={rightA!} pathname={pathname} />
        <MobileNavLink item={rightB!} pathname={pathname} />
      </div>
    </nav>
  )
}

function MobileNavLink({
  item,
  pathname,
}: {
  item: (typeof managerMobileNav)[number]
  pathname: string
}) {
  const active = isNavActive(pathname, item.href)
  const Icon = item.icon
  return (
    <AppLink
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
}
