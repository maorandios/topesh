"use client"

import { useEffect, useSyncExternalStore, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ChevronDown, X } from "lucide-react"
import { he } from "@/i18n/he"
import { cn } from "cn"

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

export function MobileFilterPicker({
  open,
  title,
  onClose,
  children,
  footer,
  showClose = true,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  showClose?: boolean
}) {
  const mounted = useIsClient()

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  if (!mounted || !open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#2B2B2B]/40 backdrop-blur-[16px] dark:bg-black/40"
        aria-label={he.close}
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[85vh] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-card text-card-foreground shadow-lg dark:bg-[#16161a]">
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
          <h2 className="min-w-0 flex-1 text-start font-heading text-base font-medium">{title}</h2>
          {showClose ? (
            <button
              type="button"
              className="pressable inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground"
              onClick={onClose}
              aria-label={he.close}
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer}
      </div>
    </div>,
    document.body
  )
}

export function FilterTriggerControl({
  className,
  label,
  muted = false,
  active,
  resetLabel,
  onOpen,
  onReset,
}: {
  className?: string
  label: ReactNode
  muted?: boolean
  active: boolean
  resetLabel: string
  onOpen: () => void
  onReset: () => void
}) {
  return (
    <div className={cn(className, "relative flex items-center gap-1 pe-2 ps-4")}>
      <button type="button" className="pressable min-w-0 flex-1 truncate text-start" onClick={onOpen}>
        <span className={cn("block truncate", muted && "text-muted-foreground")}>{label}</span>
      </button>
      {active ? (
        <button
          type="button"
          className="pressable inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground"
          onClick={onReset}
          aria-label={resetLabel}
        >
          <X className="size-3.5" aria-hidden />
          <span>{resetLabel}</span>
        </button>
      ) : (
        <button
          type="button"
          className="pressable inline-flex size-8 shrink-0 items-center justify-center text-muted-foreground"
          onClick={onOpen}
          aria-hidden
          tabIndex={-1}
        >
          <ChevronDown className="size-4" aria-hidden />
        </button>
      )}
    </div>
  )
}
