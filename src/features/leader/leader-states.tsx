import { PageFrame } from "@/components/motion/page-frame"
import { AppLink } from "@/components/shell/app-link"
import { DataLoading } from "@/components/shell/data-loading"
import { Button } from "@/components/ui/button"
import { resetLeaderStore } from "@/data/browser-store"
import { he } from "@/i18n/he"

/** Shared route/table loading state — spinner + "טוען נתונים". Keeps layout chrome visible. */
export function LeaderLoading() {
  return <DataLoading />
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
