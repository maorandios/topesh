import { Suspense } from "react"
import { LeaderHomeScreen } from "@/features/leader/home-screen"
import { LeaderLoading } from "@/features/leader/leader-states"

export default function LeaderHomePage() {
  return (
    <Suspense fallback={<LeaderLoading />}>
      <LeaderHomeScreen />
    </Suspense>
  )
}
