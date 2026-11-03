import { Suspense } from "react"
import { PullToRefresh } from "@/components/shell/pull-to-refresh"
import { SideNav, SideNavFallback } from "@/components/shell/side-nav"
import { RoleGate } from "@/features/dev-role/role-gate"
import { LeaderFrame } from "@/features/leader/leader-frame"
import { LeaderMobileTopBar } from "@/features/leader/leader-mobile-top-bar"

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
        <div className="flex min-w-0 flex-1 flex-col">
          <LeaderMobileTopBar />
          <PullToRefresh>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:pt-[env(safe-area-inset-top)]">
              <LeaderFrame>{children}</LeaderFrame>
            </div>
          </PullToRefresh>
        </div>
      </div>
    </RoleGate>
  )
}
