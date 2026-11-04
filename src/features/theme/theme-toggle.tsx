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
        "inline-flex w-full max-w-sm rounded-lg border border-border/70 bg-muted/30 p-0.5",
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
              "pressable inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs transition-colors",
              active
                ? "bg-card font-medium text-foreground shadow-sm ring-1 ring-border/80"
                : "font-normal text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
            {label}
          </button>
        )
      })}
    </div>
  )
}
