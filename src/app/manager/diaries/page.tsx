import { Suspense } from "react"
import { LeaderLoading } from "@/features/leader/leader-states"
import { DiariesScreen } from "@/features/manager/diaries-screen"

export default function ManagerDiariesPage() {
  return (
    <Suspense fallback={<LeaderLoading />}>
      <DiariesScreen />
    </Suspense>
  )
}
