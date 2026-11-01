"use client"

import { X } from "lucide-react"
import { cn } from "cn"

export type FilterChip = {
  id: string
  label: string
}

export function FilterChips({
  chips,
  onRemove,
  onClear,
  clearLabel,
  className,
}: {
  chips: FilterChip[]
  onRemove: (id: string) => void
  onClear?: () => void
  clearLabel?: string
  className?: string
}) {
  if (chips.length === 0) return null

  return (
    <div className={cn("flex flex-wrap items-center gap-2 lg:hidden", className)}>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className="pressable inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground"
          onClick={() => onRemove(chip.id)}
        >
          <span className="truncate">{chip.label}</span>
          <X className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      ))}
      {onClear && clearLabel ? (
        <button
          type="button"
          className="pressable text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          onClick={onClear}
        >
          {clearLabel}
        </button>
      ) : null}
    </div>
  )
}
