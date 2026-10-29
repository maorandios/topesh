import { Suspense } from "react"
import { DiaryScreen } from "@/features/leader/diary-screen"
import { LeaderLoading } from "@/features/leader/leader-states"

export default function LeaderDiaryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<LeaderLoading />}>
      <DiaryRoute params={params} />
    </Suspense>
  )
}

async function DiaryRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DiaryScreen diaryId={id} />
}
