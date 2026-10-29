"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Role } from "@/domain/types"
import { useDevSession, useHasHydrated } from "@/features/dev-role/dev-session"
import { devRoleSwitcherEnabled } from "@/features/dev-role/users"
import { he } from "@/i18n/he"

export function RoleGate({
  role,
  children,
}: {
  role: Role
  children: React.ReactNode
}) {
  const router = useRouter()
  const session = useDevSession()
  const hydrated = useHasHydrated()

  useEffect(() => {
    if (!devRoleSwitcherEnabled || !hydrated) return
    if (session.role !== role) router.replace("/")
  }, [hydrated, role, router, session.role])

  if (!devRoleSwitcherEnabled) return <HoldingScreen />
  return children
}

export function HoldingScreen() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-3 px-4 py-8">
      <h1 className="text-xl font-semibold">{he.holding.title}</h1>
      <p className="text-sm leading-6 text-muted-foreground">{he.holding.body}</p>
    </main>
  )
}
