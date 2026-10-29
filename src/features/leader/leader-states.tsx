import { PageFrame } from "@/components/motion/page-frame"
import { AppLink } from "@/components/shell/app-link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { resetLeaderStore } from "@/data/browser-store"
import { he } from "@/i18n/he"

export function LeaderLoading() {
  return (
    <PageFrame>
      <div className="flex flex-col gap-3 px-4 py-5" aria-busy="true">
        <span className="sr-only">{he.leader.loading}</span>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    </PageFrame>
  )
}

export function LeaderStoreError() {
  return (
    <PageFrame>
      <div className="flex flex-col gap-3 px-4 py-5">
        <h1 className="text-xl font-semibold">{he.leader.loadErrorTitle}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{he.leader.loadErrorBody}</p>
        <Button type="button" size="touch" className="self-start" onClick={() => resetLeaderStore()}>
          {he.leader.restore}
        </Button>
      </div>
    </PageFrame>
  )
}

export function LeaderMessage({
  title,
  body,
  back = false,
}: {
  title: string
  body: string
  back?: boolean
}) {
  return (
    <PageFrame>
      <div className="flex flex-col gap-3 px-4 py-5">
        {back ? (
          <AppLink
            href="/leader"
            direction="back"
            className="pressable inline-flex min-h-11 items-center self-start text-sm text-muted-foreground"
          >
            {he.leader.back}
          </AppLink>
        ) : null}
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{body}</p>
      </div>
    </PageFrame>
  )
}
