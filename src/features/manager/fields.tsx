import type { ReactNode } from "react"
import { AppLink } from "@/components/shell/app-link"
import { he } from "@/i18n/he"

export const fieldClass =
  "h-11 w-full min-w-0 rounded-xl border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm">
      {label}
      {children}
    </label>
  )
}

export function NewDiaryLink({ className = "" }: { className?: string }) {
  return (
    <AppLink
      href="/manager/diaries/new"
      className={`pressable inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground ${className}`}
    >
      {he.manager.newDiary}
    </AppLink>
  )
}
