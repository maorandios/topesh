"use client"

import type { ReactNode } from "react"
import { useDiaryFilling } from "@/features/leader/diary-chrome"
import { cn } from "cn"

export function LeaderFrame({ children }: { children: ReactNode }) {
  const filling = useDiaryFilling()

  return (
    <main
      className={cn(
        "mx-auto flex min-h-0 w-full min-w-0 max-w-xl flex-1 flex-col overflow-x-clip lg:max-w-2xl",
        filling
          ? "pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-24"
          : "pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-6"
      )}
    >
      {children}
    </main>
  )
}
