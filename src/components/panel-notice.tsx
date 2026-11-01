"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { toast as sonnerToast } from "sonner"
import { cn } from "cn"

type Tone = "default" | "success" | "error"

type Notice = {
  id: number
  message: string
  tone: Tone
}

type PanelNoticeApi = {
  show: (message: string, tone?: Tone) => void
  success: (message: string) => void
  error: (message: string) => void
  notice: Notice | null
}

const PanelNoticeContext = createContext<PanelNoticeApi | null>(null)

export function PanelNoticeProvider({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const [notice, setNotice] = useState<Notice | null>(null)
  const timerRef = useRef<number | null>(null)

  const show = useCallback((message: string, tone: Tone = "default") => {
    const id = Date.now()
    setNotice({ id, message, tone })
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      setNotice((current) => (current?.id === id ? null : current))
    }, 3200)
  }, [])

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    []
  )

  const api: PanelNoticeApi = {
    show,
    success: (message) => show(message, "success"),
    error: (message) => show(message, "error"),
    notice,
  }

  return (
    <PanelNoticeContext.Provider value={api}>
      <div className={cn("flex h-full min-h-0 flex-1 flex-col overflow-hidden", className)}>
        {children}
      </div>
    </PanelNoticeContext.Provider>
  )
}

/** Place this immediately above the panel footer action button. */
export function PanelNoticeBanner({ className }: { className?: string }) {
  const ctx = useContext(PanelNoticeContext)
  const notice = ctx?.notice
  if (!notice) return null

  return (
    <div className={cn("shrink-0 px-4 pb-2", className)}>
      <div
        role="status"
        className={cn(
          "animate-in fade-in slide-in-from-bottom-2 rounded-xl border bg-card px-4 py-3 text-center text-sm font-medium shadow-[0_-4px_24px_rgba(0,0,0,0.06)]",
          notice.tone === "success" && "border-emerald-200 text-foreground",
          notice.tone === "error" && "border-red-200",
          notice.tone === "default" && "border-border/60 text-foreground"
        )}
        style={notice.tone === "error" ? { color: "#dc2626" } : undefined}
      >
        {notice.message}
      </div>
    </div>
  )
}

export function usePanelNotice(): PanelNoticeApi {
  const ctx = useContext(PanelNoticeContext)
  if (ctx) return ctx
  return {
    show: (message) => sonnerToast(message),
    success: (message) => sonnerToast.success(message),
    error: (message) => sonnerToast.error(message),
    notice: null,
  }
}
