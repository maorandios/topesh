import type { LucideIcon } from "lucide-react"
import {
  Building2,
  ClipboardList,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  Boxes,
} from "lucide-react"
import { he } from "@/i18n/he"

export type NavItem = {
  href: string
  label: string
  shortLabel: string
  icon: LucideIcon
}

/** Exactly five Manager navigation items (Phase 3.6). */
export const managerNav: NavItem[] = [
  {
    href: "/manager",
    label: he.nav.dashboard,
    shortLabel: he.nav.dashboardShort,
    icon: LayoutDashboard,
  },
  {
    href: "/manager/diaries",
    label: he.nav.workDiaries,
    shortLabel: he.nav.workDiariesShort,
    icon: ClipboardList,
  },
  {
    href: "/manager/organization",
    label: he.nav.dataManagement,
    shortLabel: he.nav.dataManagementShort,
    icon: Building2,
  },
  {
    href: "/manager/catalog",
    label: he.nav.catalog,
    shortLabel: he.nav.catalogShort,
    icon: Boxes,
  },
  {
    href: "/manager/reports",
    label: he.nav.reports,
    shortLabel: he.nav.reports,
    icon: FileSpreadsheet,
  },
]

/** Bottom bar shows the first three items + overflow menu with all five. */
export const managerPrimaryNav: NavItem[] = managerNav.slice(0, 3)

export const leaderNav: NavItem[] = [
  {
    href: "/leader",
    label: he.nav.myDiaries,
    shortLabel: he.nav.myDiaries,
    icon: ClipboardList,
  },
  {
    href: "/leader/history",
    label: he.nav.history,
    shortLabel: he.nav.history,
    icon: History,
  },
]

export function isNavActive(pathname: string, href: string) {
  if (href === "/manager" || href === "/leader") return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}
