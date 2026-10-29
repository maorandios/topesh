import { Suspense } from "react"
import { SideNav, SideNavFallback } from "@/components/shell/side-nav"
import { RoleGate } from "@/features/dev-role/role-gate"
import { LeaderFrame } from "@/features/leader/leader-frame"

export default function LeaderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RoleGate role="teamLeader">
      <div className="flex min-h-dvh bg-background">
        <Suspense fallback={<SideNavFallback />}>
          <SideNav variant="leader" />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col pt-[env(safe-area-inset-top)]">
          <LeaderFrame>{children}</LeaderFrame>
        </div>
      </div>
    </RoleGate>
  )
}
