"use client"

import Link from "next/link"
import { useSyncExternalStore, type ComponentProps } from "react"

type AppLinkProps = ComponentProps<typeof Link> & {
  direction?: "forward" | "back"
}

const DESKTOP_QUERY = "(min-width: 1024px)"

function subscribeDesktop(onStoreChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY)
  query.addEventListener("change", onStoreChange)
  return () => query.removeEventListener("change", onStoreChange)
}

function isDesktop() {
  return window.matchMedia(DESKTOP_QUERY).matches
}

export function AppLink({
  direction = "forward",
  ...props
}: AppLinkProps) {
  const desktop = useSyncExternalStore(subscribeDesktop, isDesktop, () => false)

  if (desktop) {
    return <Link {...props} />
  }

  return (
    <Link
      {...props}
      transitionTypes={[direction === "back" ? "nav-back" : "nav-forward"]}
    />
  )
}
