import { Suspense } from "react"
import { DataLoading } from "@/components/shell/data-loading"
import { DashboardScreen } from "@/features/manager/dashboard-screen"

/** Work diaries list reuses the dashboard operational surface. */
export default function ManagerDiariesPage() {
  return (
    <Suspense fallback={<DataLoading />}>
      <DashboardScreen />
    </Suspense>
  )
}
