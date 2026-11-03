import { redirect } from "next/navigation"

export default async function LeaderDiaryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/leader?diary=${encodeURIComponent(id)}`)
}
