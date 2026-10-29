"use client"

import { useSyncExternalStore, type ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"
import { ViewTransition } from "react"

const transition = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "nav-traverse",
} as const

function subscribe() {
  return () => {}
}

function prefersMotionFallback() {
  return !("startViewTransition" in document)
}

export function PageFrame({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion()
  const fallback = useSyncExternalStore(subscribe, prefersMotionFallback, () => false)
  const direction = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.nav ?? "forward",
    () => "forward"
  )

  if (fallback) {
    const offset = direction === "back" ? "24%" : "-100%"
    return (
      <motion.div
        className="flex min-h-full min-w-0 flex-1 flex-col bg-background"
        initial={reduce ? false : { x: offset }}
        animate={{ x: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <ViewTransition enter={transition} exit={transition} default="none">
      <div className="flex min-h-full min-w-0 flex-1 flex-col bg-background">
        {children}
      </div>
    </ViewTransition>
  )
}
