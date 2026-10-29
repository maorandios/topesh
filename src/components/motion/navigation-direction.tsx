"use client"

import { useEffect } from "react"

type TraverseEvent = Event & {
  navigationType: string
  destination: { index: number }
}

type AppNavigation = {
  currentEntry?: { index: number } | null
  addEventListener: (type: "navigate", listener: (event: Event) => void) => void
  removeEventListener: (type: "navigate", listener: (event: Event) => void) => void
}

export function NavigationDirection() {
  useEffect(() => {
    const root = document.documentElement

    const setDirection = (direction: "forward" | "back") => {
      root.dataset.nav = direction
    }

    const navigation = (window as Window & { navigation?: AppNavigation }).navigation
    if (navigation) {
      const onNavigate = (event: Event) => {
        const navigateEvent = event as TraverseEvent
        if (navigateEvent.navigationType === "traverse") {
          const from = navigation.currentEntry?.index ?? 0
          const to = navigateEvent.destination.index
          setDirection(to < from ? "back" : "forward")
          return
        }
        setDirection("forward")
      }

      navigation.addEventListener("navigate", onNavigate)
      return () => navigation.removeEventListener("navigate", onNavigate)
    }

    const onPopState = () => setDirection("back")
    window.addEventListener("popstate", onPopState, true)
    return () => window.removeEventListener("popstate", onPopState, true)
  }, [])

  return null
}
