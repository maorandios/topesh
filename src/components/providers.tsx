"use client"

import type { ReactNode } from "react"
import { MotionConfig } from "motion/react"
import { DirectionProvider } from "@/components/ui/direction"
import { Toaster } from "@/components/ui/sonner"
import { NavigationDirection } from "@/components/motion/navigation-direction"
import { InstallPrompt } from "@/components/pwa/install-prompt"
import { DevSessionProvider } from "@/features/dev-role/dev-session"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <DirectionProvider direction="rtl">
      <MotionConfig reducedMotion="user">
        <DevSessionProvider>
          <NavigationDirection />
          {children}
          <InstallPrompt />
          <Toaster position="top-center" />
        </DevSessionProvider>
      </MotionConfig>
    </DirectionProvider>
  )
}
