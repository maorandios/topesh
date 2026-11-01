"use client"

import { useEffect } from "react"

const FLAG = "work-diary:dev-sw-cleared"

/** Stale Serwist workers from production builds can force-refresh the tab every update check. */
export function DevServiceWorkerCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    if (!("serviceWorker" in navigator)) return

    void (async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      const hadWorker = registrations.length > 0 || Boolean(navigator.serviceWorker.controller)
      await Promise.all(registrations.map((registration) => registration.unregister()))
      if ("caches" in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      }
      if (!hadWorker) return
      if (sessionStorage.getItem(FLAG) === "1") return
      sessionStorage.setItem(FLAG, "1")
      window.location.reload()
    })()
  }, [])

  return null
}
