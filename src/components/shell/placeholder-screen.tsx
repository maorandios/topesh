import type { ReactNode } from "react"
import { PageFrame } from "@/components/motion/page-frame"

export function PlaceholderScreen({
  title,
  body,
  children,
}: {
  title: string
  body: string
  children?: ReactNode
}) {
  return (
    <PageFrame>
      <div className="flex flex-col gap-3 px-4 py-5 sm:px-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{body}</p>
        {children}
      </div>
    </PageFrame>
  )
}
