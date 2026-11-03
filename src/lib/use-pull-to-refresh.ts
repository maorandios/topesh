"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"

const THRESHOLD = 72
const MAX_PULL = 112

function useIsMobile() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const query = window.matchMedia("(max-width: 1023px)")
      query.addEventListener("change", onStoreChange)
      return () => query.removeEventListener("change", onStoreChange)
    },
    () => window.matchMedia("(max-width: 1023px)").matches,
    () => false
  )
}

function scrollTop() {
  return window.scrollY || document.documentElement.scrollTop || 0
}

export function usePullToRefresh(onRefresh: () => void | Promise<void>) {
  const mobile = useIsMobile()
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startYRef = useRef(0)
  const pullingRef = useRef(false)
  const distanceRef = useRef(0)
  const refreshingRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  useEffect(() => {
    if (!mobile) return

    const overlayOpen = () =>
      Boolean(document.querySelector('[role="dialog"][aria-modal="true"], [data-vaul-drawer]'))

    const onTouchStart = (event: TouchEvent) => {
      if (refreshingRef.current || overlayOpen()) return
      if (scrollTop() > 1) return
      const touch = event.touches[0]
      if (!touch) return
      startYRef.current = touch.clientY
      pullingRef.current = true
      distanceRef.current = 0
    }

    const onTouchMove = (event: TouchEvent) => {
      if (!pullingRef.current || refreshingRef.current) return
      if (scrollTop() > 1) {
        pullingRef.current = false
        distanceRef.current = 0
        setPullDistance(0)
        return
      }
      const touch = event.touches[0]
      if (!touch) return
      const delta = touch.clientY - startYRef.current
      if (delta <= 0) {
        distanceRef.current = 0
        setPullDistance(0)
        return
      }
      const resisted = Math.min(MAX_PULL, delta * 0.45)
      distanceRef.current = resisted
      setPullDistance(resisted)
      if (resisted > 8 && event.cancelable) event.preventDefault()
    }

    const onTouchEnd = () => {
      if (!pullingRef.current) return
      pullingRef.current = false
      const distance = distanceRef.current
      distanceRef.current = 0
      if (distance < THRESHOLD || refreshingRef.current) {
        setPullDistance(0)
        return
      }
      refreshingRef.current = true
      setRefreshing(true)
      setPullDistance(THRESHOLD * 0.7)
      void Promise.resolve(onRefreshRef.current())
        .catch(() => {})
        .finally(() => {
          window.setTimeout(() => {
            refreshingRef.current = false
            setRefreshing(false)
            setPullDistance(0)
          }, 350)
        })
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("touchend", onTouchEnd)
    window.addEventListener("touchcancel", onTouchEnd)
    return () => {
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [mobile])

  return {
    enabled: mobile,
    pullDistance,
    refreshing,
    progress: Math.min(1, pullDistance / THRESHOLD),
    threshold: THRESHOLD,
  }
}
