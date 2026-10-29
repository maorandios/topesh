"use client"

import { HoldingScreen } from "@/features/dev-role/role-gate"
import { RoleSwitcher } from "@/features/dev-role/role-switcher"
import { devRoleSwitcherEnabled } from "@/features/dev-role/users"

export function HomeScreen() {
  if (!devRoleSwitcherEnabled) return <HoldingScreen />
  return <RoleSwitcher />
}
