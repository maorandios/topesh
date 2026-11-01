"use client"

import { useSyncExternalStore, type ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"
import { ViewTransition } from "react"

const transition = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "nav-traverse",
} as const

const DESKTOP_QUERY = "(min-width: 1024px)"

function subscribe() {
  return () => {}
}

function prefersMotionFallback() {
  return !("startViewTransition" in document)
}

function subscribeDesktop(onStoreChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY)
  query.addEventListener("change", onStoreChange)
  return () => query.removeEventListener("change", onStoreChange)
}

function isDesktop() {
  return window.matchMedia(DESKTOP_QUERY).matches
}

export function PageFrame({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion()
  const desktop = useSyncExternalStore(subscribeDesktop, isDesktop, () => false)
  const fallback = useSyncExternalStore(subscribe, prefersMotionFallback, () => false)
  const direction = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.nav ?? "forward",
    () => "forward"
  )

  const shell = (
    <div className="flex min-h-full min-w-0 flex-1 flex-col bg-background">{children}</div>
  )

  // Desktop: keep side nav fixed and swap content with no page slide.
  if (desktop || reduce) return shell

  if (fallback) {
    const offset = direction === "back" ? "24%" : "-100%"
    return (
      <motion.div
        className="flex min-h-full min-w-0 flex-1 flex-col bg-background"
        initial={{ x: offset }}
        animate={{ x: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <ViewTransition enter={transition} exit={transition} default="none">
      {shell}
    </ViewTransition>
  )
}
