import { Suspense } from "react"
import { redirect } from "next/navigation"
import { LeaderLoading } from "@/features/leader/leader-states"

export default function LeaderDiaryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<LeaderLoading />}>
      <DiaryRedirect params={params} />
    </Suspense>
  )
}

async function DiaryRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/leader?diary=${encodeURIComponent(id)}`)
  return null
}
