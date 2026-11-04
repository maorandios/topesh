"use client"

import { type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { IdCard, LogOut, Mail, Phone, UserRound } from "lucide-react"
import { AppLink } from "@/components/shell/app-link"
import { panelSurfaceClass, panelSurfaceStyle } from "@/components/shell/panel-surface"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { InstallSettingsSection } from "@/components/pwa/install-settings-section"
import { useDevSession } from "@/features/dev-role/dev-session"
import { devRoleSwitcherEnabled } from "@/features/dev-role/users"
import { ThemeModePicker } from "@/features/theme/theme-toggle"
import { he } from "@/i18n/he"
import { cn } from "cn"

export type SettingsRole = "manager" | "teamLeader"

export function SettingsDrawer({
  role,
  open,
  onOpenChange,
}: {
  role: SettingsRole
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle swipeDirection="down">
      <DrawerContent className={cn("overflow-hidden", panelSurfaceClass)} style={panelSurfaceStyle}>
        <DrawerHeader className="sr-only">
          <DrawerTitle>{he.manager.settings.title}</DrawerTitle>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SettingsBody role={role} onAfterLogout={() => onOpenChange(false)} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

/** Desktop settings: side panel over the current screen (no dedicated route). */
export function SettingsSheet({
  role,
  open,
  onOpenChange,
}: {
  role: SettingsRole
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showCloseButton={false}
        className={cn(
          "w-full gap-0 overflow-hidden data-[side=left]:!max-w-[28.8rem]",
          panelSurfaceClass
        )}
        style={panelSurfaceStyle}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{he.manager.settings.title}</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SettingsBody role={role} onAfterLogout={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function SettingsBody({
  role,
  onAfterLogout,
}: {
  role: SettingsRole
  onAfterLogout?: () => void
}) {
  const session = useDevSession()
  const router = useRouter()
  const user = session.user

  const logout = () => {
    session.clearRole()
    onAfterLogout?.()
    router.replace("/")
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-1 pb-4">
        <h2 className="text-base font-semibold tracking-tight">{he.manager.settings.title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{he.manager.settings.body}</p>
      </div>

      <section className="flex flex-col gap-3 border-t border-border py-4">
        <h3 className="text-sm font-semibold tracking-tight">{he.settings.profile}</h3>
        <ul className="flex flex-col gap-3">
          <ProfileRow
            icon={<UserRound className="size-3.5" aria-hidden />}
            label={he.settings.fullName}
            value={user?.fullName || "—"}
          />
          {role === "manager" ? (
            <ProfileRow
              icon={<Mail className="size-3.5" aria-hidden />}
              label={he.settings.email}
              value={user?.email || "—"}
            />
          ) : (
            <>
              <ProfileRow
                icon={<IdCard className="size-3.5" aria-hidden />}
                label={he.settings.identityNumber}
                value={user?.identityNumber || "—"}
              />
              <ProfileRow
                icon={<Phone className="size-3.5" aria-hidden />}
                label={he.settings.phone}
                value={user?.phone || "—"}
              />
            </>
          )}
        </ul>
      </section>

      <section className="flex flex-col gap-3 border-t border-border py-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold tracking-tight">{he.manager.settings.appearance}</h3>
          <p className="text-sm text-muted-foreground">{he.manager.settings.appearanceHint}</p>
        </div>
        <ThemeModePicker />
      </section>

      <InstallSettingsSection />

      <div className="border-t border-border py-4">
        <Button
          type="button"
          variant="outline"
          size="touch"
          className="w-full justify-center gap-2"
          onClick={logout}
        >
          <LogOut className="size-4" aria-hidden />
          {he.settings.logout}
        </Button>
      </div>

      {devRoleSwitcherEnabled ? (
        <section className="flex flex-col gap-3 border-t border-border py-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold tracking-tight">{he.role.switch}</h3>
            <p className="text-sm text-muted-foreground">{he.role.switchHint}</p>
          </div>
          <AppLink
            href="/"
            direction="back"
            className="pressable flex min-h-11 items-center justify-center rounded-xl border border-border px-3 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            {he.role.switch}
          </AppLink>
        </section>
      ) : null}
    </div>
  )
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <li className="grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-x-2">
      <span className="mt-0.5 inline-flex size-4 items-center justify-center text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate text-start text-sm font-medium">{value}</p>
      </div>
    </li>
  )
}
