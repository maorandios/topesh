"use client"

import { useSyncExternalStore } from "react"

let filling = false
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export function setDiaryFilling(next: boolean) {
  if (filling === next) return
  filling = next
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useDiaryFilling() {
  return useSyncExternalStore(subscribe, () => filling, () => false)
}
