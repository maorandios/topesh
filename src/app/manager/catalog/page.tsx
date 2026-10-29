import { Suspense } from "react"
import { CatalogScreen } from "@/features/manager/catalog-screen"
import { LeaderLoading } from "@/features/leader/leader-states"

export default function CatalogPage() {
  return (
    <Suspense fallback={<LeaderLoading />}>
      <CatalogScreen />
    </Suspense>
  )
}
