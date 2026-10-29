import type { LucideIcon } from "lucide-react"
import {
  Building2,
  ClipboardList,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  NotebookPen,
  Users,
  Boxes,
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
    href: "/manager/diaries",
    label: he.nav.diaries,
    shortLabel: he.nav.diaries,
    icon: NotebookPen,
  },
  {
    href: "/manager/organization",
    label: he.nav.sites,
    shortLabel: he.nav.sites,
    icon: Building2,
  },
]

export const managerSecondaryNav: NavItem[] = [
  {
    href: "/manager/catalog",
    label: he.nav.catalog,
    shortLabel: he.nav.catalog,
    icon: Boxes,
  },
  {
    href: "/manager/team-leaders",
    label: he.nav.teamLeaders,
    shortLabel: he.nav.teamLeaders,
    icon: Users,
  },
  {
    href: "/manager/reports",
    label: he.nav.reports,
    shortLabel: he.nav.reports,
    icon: FileSpreadsheet,
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
