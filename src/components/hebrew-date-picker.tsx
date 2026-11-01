"use client"

import { useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { he } from "@/i18n/he"
import {
  formatMonthTitle,
  formatWorkDate,
  jerusalemToday,
  parseIsoDate,
  toIsoDate,
} from "@/lib/format"
import { cn } from "cn"

const HEBREW_WEEKDAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"] as const

export function HebrewDatePicker({
  value,
  placeholder,
  triggerClassName,
  allowClear = false,
  onValueChange,
}: {
  value: string
  placeholder: string
  triggerClassName?: string
  allowClear?: boolean
  onValueChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          "relative flex w-full cursor-pointer items-center pe-9 ps-4 text-start",
          triggerClassName
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate text-right", !value && "text-muted-foreground")}>
          {value ? formatWorkDate(value) : placeholder}
        </span>
        <ChevronDown className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="w-auto rounded-md p-3">
        <HebrewCalendar
          value={value}
          onSelect={(next) => {
            onValueChange(next)
            setOpen(false)
          }}
        />
        {allowClear && value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 h-8 w-full text-xs"
            onClick={() => {
              onValueChange("")
              setOpen(false)
            }}
          >
            {he.manager.dashboard.clearDate}
          </Button>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function HebrewCalendar({
  value,
  onSelect,
}: {
  value: string
  onSelect: (value: string) => void
}) {
  const selected = parseIsoDate(value)
  const initial = selected ?? parseIsoDate(jerusalemToday()) ?? new Date()
  const [cursor, setCursor] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1))
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, index) => {
    if (index < firstDay) return null
    return index - firstDay + 1
  })

  return (
    <div className="w-[16.5rem]" dir="rtl">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          aria-label="חודש הבא"
        >
          <ChevronRight className="size-4" />
        </button>
        <p className="text-sm font-semibold">{formatMonthTitle(year, month)}</p>
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          aria-label="חודש קודם"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {HEBREW_WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} />
          const iso = toIsoDate(new Date(year, month, day))
          const active = value === iso
          return (
            <button
              key={iso}
              type="button"
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-full text-sm tabular-nums hover:bg-muted",
                active && "bg-primary text-primary-foreground hover:bg-primary"
              )}
              onClick={() => onSelect(iso)}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
