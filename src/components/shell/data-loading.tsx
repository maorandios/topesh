import { LoaderCircle } from "lucide-react"
import { PageFrame } from "@/components/motion/page-frame"
import { he } from "@/i18n/he"
import { cn } from "cn"

export function DataLoading({
  className,
  framed = true,
}: {
  className?: string
  /** Wrap in PageFrame for full-screen route fallbacks. Panels can pass false. */
  framed?: boolean
}) {
  const body = (
    <div
      className={cn(
        "flex min-h-48 flex-1 flex-col items-center justify-center gap-3 px-4 py-8",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoaderCircle className="size-8 animate-spin text-primary" aria-hidden />
      <p className="text-sm text-muted-foreground">{he.loading.data}</p>
    </div>
  )

  if (!framed) return body
  return <PageFrame>{body}</PageFrame>
}
