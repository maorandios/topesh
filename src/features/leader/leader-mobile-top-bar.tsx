"use client"

import { ManagerMobileTopBar } from "@/components/shell/manager-mobile-top-bar"
import { useDiaryFilling } from "@/features/leader/diary-chrome"

export function LeaderMobileTopBar() {
  const filling = useDiaryFilling()
  if (filling) return null
  return <ManagerMobileTopBar settingsHref="/leader/settings" />
}
