import { Suspense } from "react"
import { BottomNav } from "@/components/shell/bottom-nav"
import { SideNav, SideNavFallback } from "@/components/shell/side-nav"
import { TopBar } from "@/components/shell/top-bar"
import { RoleGate } from "@/features/dev-role/role-gate"

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RoleGate role="manager">
      <div className="flex min-h-dvh bg-background">
        <Suspense fallback={<SideNavFallback />}>
          <SideNav variant="manager" />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-0">
            {children}
          </main>
        </div>
        <Suspense fallback={null}>
          <BottomNav variant="manager" />
        </Suspense>
      </div>
    </RoleGate>
  )
}
