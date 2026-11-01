"use client"

import { Moon, Sun } from "lucide-react"
import { cn } from "cn"
import { useTheme } from "@/features/theme/theme-provider"
import type { AppTheme } from "@/features/theme/theme"
import { he } from "@/i18n/he"

const options: { value: AppTheme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: he.theme.light, icon: Sun },
  { value: "dark", label: he.theme.dark, icon: Moon },
]

export function ThemeModePicker({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label={he.theme.label}
      className={cn(
        "inline-flex w-full max-w-sm overflow-hidden rounded-md border border-border bg-card p-1",
        className
      )}
    >
      {options.map(({ value, label, icon: Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={cn(
              "pressable inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </button>
        )
      })}
    </div>
  )
}
