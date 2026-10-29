"use client"

import { useSyncExternalStore } from "react"

function subscribe(onStoreChange: () => void) {
  const viewport = window.visualViewport
  if (!viewport) return () => {}
  viewport.addEventListener("resize", onStoreChange)
  viewport.addEventListener("scroll", onStoreChange)
  return () => {
    viewport.removeEventListener("resize", onStoreChange)
    viewport.removeEventListener("scroll", onStoreChange)
  }
}

function getSnapshot() {
  const viewport = window.visualViewport
  if (!viewport) return false
  return window.innerHeight - viewport.height > 150
}

export function useKeyboardOpen() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
