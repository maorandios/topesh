import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
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

export function NewDiaryButton({
  className = "",
  onClick,
}: {
  className?: string
  onClick: () => void
}) {
  return (
    <Button type="button" size="touch" className={className} onClick={onClick}>
      {he.manager.newDiary}
    </Button>
  )
}
