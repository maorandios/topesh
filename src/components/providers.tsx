"use client"

import type { ReactNode } from "react"
import { MotionConfig } from "motion/react"
import { DirectionProvider } from "@/components/ui/direction"
import { Toaster } from "@/components/ui/sonner"
import { NavigationDirection } from "@/components/motion/navigation-direction"
import { DevServiceWorkerCleanup } from "@/components/pwa/dev-sw-cleanup"
import { InstallPrompt } from "@/components/pwa/install-prompt"
import { DevSessionProvider } from "@/features/dev-role/dev-session"
import { ThemeProvider } from "@/features/theme/theme-provider"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <DirectionProvider direction="rtl">
      <MotionConfig reducedMotion="user">
        <ThemeProvider>
          <DevSessionProvider>
            <DevServiceWorkerCleanup />
            <NavigationDirection />
            {children}
            <InstallPrompt />
            <Toaster />
          </DevSessionProvider>
        </ThemeProvider>
      </MotionConfig>
    </DirectionProvider>
  )
}
