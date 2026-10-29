import { Suspense } from "react"
import { DataManagementScreen } from "@/features/manager/data-management-screen"
import { LeaderLoading } from "@/features/leader/leader-states"

export default function OrganizationPage() {
  return (
    <Suspense fallback={<LeaderLoading />}>
      <DataManagementScreen />
    </Suspense>
  )
}
