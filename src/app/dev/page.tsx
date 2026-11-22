import { RoleSwitcher } from "@/features/dev-role/role-switcher"
import { HoldingScreen } from "@/features/dev-role/role-gate"
import { devRoleSwitcherEnabled } from "@/features/dev-role/users"

export default function DevPage() {
  if (!devRoleSwitcherEnabled) return <HoldingScreen />
  return <RoleSwitcher />
}
