"use client"

import { Download } from "lucide-react"
import { usePwaInstall } from "@/components/pwa/use-pwa-install"
import { he } from "@/i18n/he"

/** Shown in settings only while the PWA is not installed on this device. */
export function InstallSettingsSection() {
  const { showInstall, canInstallAndroid, canInstallIos, promptInstall } = usePwaInstall()
  if (!showInstall) return null

  if (canInstallAndroid) {
    return (
      <section className="border-t border-border py-4">
        <button
          type="button"
          className="pressable flex w-full items-center gap-3 rounded-xl text-start hover:bg-muted/40"
          onClick={() => void promptInstall()}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold tracking-tight">
              {he.install.downloadTitle}
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {he.install.downloadHint}
            </span>
          </span>
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Download className="size-4" aria-hidden />
          </span>
        </button>
      </section>
    )
  }

  if (!canInstallIos) return null

  return (
    <section className="border-t border-border py-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold tracking-tight">{he.install.downloadTitle}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{he.install.iosBody}</p>
        </div>
        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Download className="size-4" aria-hidden />
        </span>
      </div>
    </section>
  )
}
