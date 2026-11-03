import type { LucideIcon } from "lucide-react"
import {
  CircuitBoard,
  ClipboardList,
  FileSpreadsheet,
  GitCompare,
  Settings,
  SquareKanbanPlus,
} from "lucide-react"
import { he } from "@/i18n/he"

export type NavItem = {
  href: string
  label: string
  shortLabel: string
  icon: LucideIcon
}

/** Manager primary navigation (desktop SideNav). */
export const managerNav: NavItem[] = [
  {
    href: "/manager",
    label: he.nav.dashboard,
    shortLabel: he.nav.dashboardShort,
    icon: SquareKanbanPlus,
  },
  {
    href: "/manager/organization",
    label: he.nav.dataManagement,
    shortLabel: he.nav.dataManagementShort,
    icon: GitCompare,
  },
  {
    href: "/manager/catalog",
    label: he.nav.catalog,
    shortLabel: he.nav.catalogShort,
    icon: CircuitBoard,
  },
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

/** Mobile bottom bar destinations excluding the center Create action. */
export const managerMobileNav: NavItem[] = [
  {
    href: "/manager",
    label: he.nav.dashboard,
    shortLabel: he.nav.homeShort,
    icon: SquareKanbanPlus,
  },
  {
    href: "/manager/organization",
    label: he.nav.dataManagement,
    shortLabel: he.nav.dataManagementShort,
    icon: GitCompare,
  },
  {
    href: "/manager/catalog",
    label: he.nav.catalog,
    shortLabel: he.nav.catalogShort,
    icon: CircuitBoard,
  },
  {
    href: "/manager/reports",
    label: he.nav.reports,
    shortLabel: he.nav.reports,
    icon: FileSpreadsheet,
  },
]

/** @deprecated Prefer managerMobileNav; kept for any leftover imports. */
export const managerPrimaryNav: NavItem[] = managerNav.slice(0, 3)

export const leaderNav: NavItem[] = [
  {
    href: "/leader",
    label: he.nav.myDiaries,
    shortLabel: he.nav.myDiaries,
    icon: ClipboardList,
  },
  {
    href: "/leader/settings",
    label: he.nav.settings,
    shortLabel: he.nav.settings,
    icon: Settings,
  },
]

export function isNavActive(pathname: string, href: string) {
  if (href === "/manager" || href === "/leader") return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}
