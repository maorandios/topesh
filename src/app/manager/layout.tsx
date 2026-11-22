import { Suspense } from "react"
import { BottomNav } from "@/components/shell/bottom-nav"
import { DataLoading } from "@/components/shell/data-loading"
import { ManagerMobileTopBar } from "@/components/shell/manager-mobile-top-bar"
import { PullToRefresh } from "@/components/shell/pull-to-refresh"
import { SideNav, SideNavFallback } from "@/components/shell/side-nav"
import { RoleGate } from "@/features/dev-role/role-gate"
import { ManagerCreateProvider } from "@/features/manager/manager-create-provider"

function BottomNavFallback() {
  return (
    <div
      className="app-chrome fixed inset-x-0 bottom-0 z-40 h-[calc(3.5rem+env(safe-area-inset-bottom))] border-t border-border lg:hidden"
      aria-hidden
    />
  )
}

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RoleGate role="manager">
      <ManagerCreateProvider>
        <div className="flex min-h-dvh bg-background">
          <Suspense fallback={<SideNavFallback />}>
            <SideNav variant="manager" />
          </Suspense>
          <div className="flex min-w-0 flex-1 flex-col">
            <ManagerMobileTopBar />
            <PullToRefresh>
              <main className="flex min-h-0 min-w-0 flex-1 flex-col pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pt-[env(safe-area-inset-top)]">
                <Suspense fallback={<DataLoading />}>{children}</Suspense>
              </main>
            </PullToRefresh>
          </div>
          <Suspense fallback={<BottomNavFallback />}>
            <BottomNav variant="manager" />
          </Suspense>
        </div>
      </ManagerCreateProvider>
    </RoleGate>
  )
}
