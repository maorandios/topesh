"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { he } from "@/i18n/he"

const DISMISS_KEY = "work-diary:install-dismissed"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
}

function subscribe() {
  return () => {}
}

function shouldOfferIosInstall() {
  if (window.matchMedia("(display-mode: standalone)").matches) return false
  if (window.localStorage.getItem(DISMISS_KEY) === "1") return false
  const ua = window.navigator.userAgent
  const ios = /iphone|ipad|ipod/i.test(ua)
  const standalone =
    "standalone" in window.navigator &&
    Boolean(
      (window.navigator as Navigator & { standalone?: boolean }).standalone
    )
  return ios && !standalone
}

export function InstallPrompt() {
  const iosEligible = useSyncExternalStore(
    subscribe,
    shouldOfferIosInstall,
    () => false
  )
  const [dismissed, setDismissed] = useState(false)
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(
    null
  )

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    return () => window.removeEventListener("beforeinstallprompt", onPrompt)
  }, [])

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1")
    setDismissed(true)
    setPromptEvent(null)
  }

  if (dismissed) return null

  if (promptEvent) {
    return (
      <div className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 rounded-2xl border border-border bg-card p-4 lg:inset-x-auto lg:end-4 lg:bottom-4 lg:w-80">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">{he.install.android}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="touch"
              onClick={() => {
                void promptEvent.prompt()
                dismiss()
              }}
            >
              {he.install.install}
            </Button>
            <Button type="button" size="touch" variant="outline" onClick={dismiss}>
              {he.install.dismiss}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!iosEligible) return null

  return (
    <div className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 rounded-2xl border border-border bg-card p-4 lg:inset-x-auto lg:end-4 lg:bottom-4 lg:w-80">
      <Accordion>
        <AccordionItem value="ios">
          <AccordionTrigger className="min-h-11 py-0">
            {he.install.iosSummary}
          </AccordionTrigger>
          <AccordionContent>
            <p className="leading-6 text-muted-foreground">{he.install.iosBody}</p>
            <Button
              type="button"
              size="touch"
              variant="outline"
              className="mt-3"
              onClick={dismiss}
            >
              {he.install.dismiss}
            </Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
