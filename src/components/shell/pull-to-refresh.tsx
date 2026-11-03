"use client"

import { type ReactNode } from "react"
import { LoaderCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { reloadBrowserStore } from "@/data/browser-store"
import { usePullToRefresh } from "@/lib/use-pull-to-refresh"
import { he } from "@/i18n/he"
import { cn } from "cn"

export function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { enabled, pullDistance, refreshing, progress } = usePullToRefresh(async () => {
    reloadBrowserStore()
    router.refresh()
    await new Promise((resolve) => window.setTimeout(resolve, 280))
  })

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      {enabled ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center"
          style={{
            height: Math.max(pullDistance, refreshing ? 40 : 0),
            opacity: refreshing ? 1 : progress,
            transition: refreshing || pullDistance === 0 ? "height 180ms ease, opacity 180ms ease" : undefined,
          }}
          aria-hidden={!refreshing && pullDistance < 8}
        >
          <div
            className={cn(
              "mt-[max(0.5rem,env(safe-area-inset-top))] flex size-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm",
              refreshing && "text-primary"
            )}
            role="status"
            aria-live="polite"
            aria-label={he.pullToRefresh.refreshing}
          >
            <LoaderCircle
              className={cn("size-4", (refreshing || progress >= 1) && "animate-spin")}
              aria-hidden
            />
          </div>
        </div>
      ) : null}
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        style={{
          transform: enabled && pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: refreshing || pullDistance === 0 ? "transform 180ms ease" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  )
}
