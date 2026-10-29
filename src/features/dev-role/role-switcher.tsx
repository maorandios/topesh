"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { BidiText } from "@/lib/bidi"
import { Pressable } from "@/components/motion/pressable"
import { useRepositorySnapshot } from "@/data/browser-store"
import { useDevSession, useHasHydrated } from "@/features/dev-role/dev-session"
import { devManager, devTeamLeaders } from "@/features/dev-role/users"
import { he } from "@/i18n/he"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "cn"

export function RoleSwitcher() {
  const router = useRouter()
  const session = useDevSession()
  const hydrated = useHasHydrated()
  const snapshot = useRepositorySnapshot()
  const [aboutOpen, setAboutOpen] = useState(false)
  const managers =
    hydrated && snapshot.status === "ready"
      ? snapshot.db.users.filter((user) => user.role === "manager")
      : [devManager]
  const leaders =
    hydrated && snapshot.status === "ready"
      ? snapshot.db.users.filter((user) => user.role === "teamLeader")
      : devTeamLeaders

  const chooseManager = (userId: string) => {
    session.setManager(userId)
    router.push("/manager", { transitionTypes: ["nav-forward"] })
  }

  const chooseLeader = (userId: string) => {
    session.setTeamLeader(userId)
    router.push("/leader", { transitionTypes: ["nav-forward"] })
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-8 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{he.appName}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{he.role.title}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{he.role.body}</p>
      </div>

      <div className="grid gap-3">
        {managers.map((manager) => (
          <RoleCard
            key={manager.id}
            title={he.role.manager}
            hint={manager.isActive ? he.role.managerHint : he.role.inactive}
            name={manager.fullName}
            detailLabel={he.role.email}
            detail={manager.email ?? ""}
            selected={session.user?.id === manager.id}
            onSelect={() => chooseManager(manager.id)}
          />
        ))}
        {leaders.map((leader) => (
          <RoleCard
            key={leader.id}
            title={he.role.teamLeader}
            hint={leader.isActive ? he.role.teamLeaderHint : he.role.inactive}
            name={leader.fullName}
            detailLabel={he.role.phone}
            detail={leader.phone ?? ""}
            selected={session.user?.id === leader.id}
            onSelect={() => chooseLeader(leader.id)}
          />
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="touch"
        className="self-start"
        onClick={() => setAboutOpen(true)}
      >
        {he.role.aboutTitle}
      </Button>

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{he.role.aboutTitle}</DialogTitle>
            <DialogDescription>{he.role.aboutBody}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" size="touch" onClick={() => setAboutOpen(false)}>
              {he.role.aboutAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function RoleCard({
  title,
  hint,
  name,
  detailLabel,
  detail,
  selected,
  onSelect,
}: {
  title: string
  hint: string
  name: string
  detailLabel: string
  detail: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <Pressable>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full flex-col gap-2 rounded-2xl border bg-card p-4 text-start",
          selected ? "border-foreground" : "border-border"
        )}
      >
        <span className="flex items-center justify-between gap-3">
          <span className="text-base font-medium">{title}</span>
          {selected ? (
            <span className="text-xs text-muted-foreground">{he.role.current}</span>
          ) : null}
        </span>
        <span className="text-sm text-muted-foreground">{hint}</span>
        <span className="text-sm">{name}</span>
        <span className="flex items-baseline justify-between gap-3 text-sm text-muted-foreground">
          <bdi>{detailLabel}</bdi>
          <BidiText>{detail}</BidiText>
        </span>
      </button>
    </Pressable>
  )
}
