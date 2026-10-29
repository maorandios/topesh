"use client"

import { Suspense, type ReactNode } from "react"
import { BottomNav } from "@/components/shell/bottom-nav"
import { useDiaryFilling } from "@/features/leader/diary-chrome"
import { cn } from "cn"

export function LeaderFrame({ children }: { children: ReactNode }) {
  const filling = useDiaryFilling()

  return (
    <>
      <main
        className={cn(
          "mx-auto flex min-h-0 w-full min-w-0 max-w-xl flex-1 flex-col overflow-x-clip lg:max-w-2xl",
          filling
            ? "pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-24"
            : "pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-6"
        )}
      >
        {children}
      </main>
      {filling ? null : (
        <Suspense fallback={null}>
          <BottomNav variant="leader" />
        </Suspense>
      )}
    </>
  )
}
