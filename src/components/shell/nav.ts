import type { LucideIcon } from "lucide-react"
import {
  Building2,
  ClipboardList,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  Boxes,
  Settings,
} from "lucide-react"
import { he } from "@/i18n/he"

export type NavItem = {
  href: string
  label: string
  shortLabel: string
  icon: LucideIcon
}

export const managerPrimaryNav: NavItem[] = [
  {
    href: "/manager",
    label: he.nav.dashboard,
    shortLabel: he.nav.dashboardShort,
    icon: LayoutDashboard,
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
    shortLabel: he.nav.catalog,
    icon: Boxes,
  },
]

export const managerSecondaryNav: NavItem[] = [
  {
    href: "/manager/reports",
    label: he.nav.reports,
    shortLabel: he.nav.reports,
    icon: FileSpreadsheet,
  },
  {
    href: "/manager/settings",
    label: he.nav.settings,
    shortLabel: he.nav.settings,
    icon: Settings,
  },
]

export const managerNav = [...managerPrimaryNav, ...managerSecondaryNav]

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
