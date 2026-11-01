import { Suspense } from "react"
import { DashboardScreen } from "@/features/manager/dashboard-screen"

/** Work diaries list reuses the dashboard operational surface. */
export default function ManagerDiariesPage() {
  return (
    <Suspense fallback={null}>
      <DashboardScreen />
    </Suspense>
  )
}
