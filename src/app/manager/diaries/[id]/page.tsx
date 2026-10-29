import { Suspense } from "react"
import { LeaderLoading } from "@/features/leader/leader-states"
import { ManagerDiaryScreen } from "@/features/manager/diary-detail-screen"

export default function ManagerDiaryPage({
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
  return <ManagerDiaryScreen diaryId={id} />
}
