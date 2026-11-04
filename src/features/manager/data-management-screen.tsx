"use client"

import {
  createElement,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  IdCard,
  Mail,
  MapPin,
  PenLine,
  Phone,
  Search,
  Trash,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { PageFrame } from "@/components/motion/page-frame"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  deleteManagerCompany,
  deleteManagerCustomer,
  deleteManagerSite,
  deleteManagerUser,
  saveManagerAccount,
  saveManagerCompany,
  saveManagerCustomer,
  saveManagerSite,
  saveManagerTeamLeader,
  useManagerDb,
} from "@/data/browser-store"
import { panelSurfaceClass, panelSurfaceStyle } from "@/components/shell/panel-surface"
import { findCompany, findCustomer } from "@/data/lookups"
import type { DeleteBlockedReason } from "@/data/manager"
import type { MockDb } from "@/data/seed"
import { LeaderLoading, LeaderStoreError } from "@/features/leader/leader-states"
import { he } from "@/i18n/he"
import { compareHebrew, sortByHebrewName, sortSelectOptions } from "@/lib/sort"
import { cn } from "cn"

type TabId = "companies" | "customers" | "sites" | "teamLeaders" | "managers"

type Editor =
  | { kind: "company"; id: string | null; name: string }
  | { kind: "customer"; id: string | null; name: string; companyId: string }
  | { kind: "site"; id: string | null; name: string; customerId: string }
  | {
      kind: "teamLeader"
      id: string | null
      fullName: string
      identityNumber: string
      phone: string
    }
  | {
      kind: "manager"
      id: string | null
      fullName: string
      identityNumber: string
      email: string
    }

type TableRow = {
  id: string
  cells: string[]
  onEdit: () => void
  onDelete: () => void
}

type OrgNavItem = {
  id: string
  kind: Editor["kind"]
  name: string
  meta: string
  details: Array<{ label: string; value: string }>
  onEdit: () => void
  onDelete: () => void
}

const tabs: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: "companies", label: he.manager.organization.tabs.companies, icon: Building2 },
  { id: "customers", label: he.manager.organization.tabs.customers, icon: Users },
  { id: "sites", label: he.manager.organization.tabs.sites, icon: MapPin },
  { id: "teamLeaders", label: he.manager.organization.tabs.teamLeaders, icon: UserRound },
  { id: "managers", label: he.manager.organization.tabs.managers, icon: IdCard },
]

const editorInputClass =
  "h-10 w-full min-w-0 rounded-md border border-border bg-muted px-4 text-right text-sm text-foreground shadow-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-[#222228]"

export function DataManagementScreen() {
  const query = useManagerDb()
  const params = useSearchParams()
  const router = useRouter()
  const initialTab = parseTab(params.get("tab"))
  const [tab, setTab] = useState<TabId>(initialTab)
  const [search, setSearch] = useState("")
  const [create, setCreate] = useState<Editor>(() => createBlank(initialTab, null))
  const [createError, setCreateError] = useState(false)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [editError, setEditError] = useState(false)
  const [deleteFlow, setDeleteFlow] = useState<
    | { step: "confirm"; kind: TabId; id: string }
    | { step: "blocked"; kind: TabId; id: string; reason: DeleteBlockedReason }
    | null
  >(null)
  const cardScrollerRef = useRef<HTMLDivElement>(null)
  const syncingScrollRef = useRef(false)
  const scrollEndTimerRef = useRef<number | null>(null)
  const tabRef = useRef(tab)

  useEffect(() => {
    tabRef.current = tab
  }, [tab])

  const cardEdgeInset = (scroller: HTMLElement) => {
    const style = getComputedStyle(scroller)
    return (
      Number.parseFloat(style.scrollPaddingRight) ||
      Number.parseFloat(style.paddingRight) ||
      16
    )
  }

  const alignCardToStart = (next: TabId, behavior: ScrollBehavior = "smooth") => {
    const scroller = cardScrollerRef.current
    if (!scroller) return
    const card = scroller.querySelector<HTMLElement>(`[data-tab-id="${next}"]`)
    if (!card) return
    const scrollerRect = scroller.getBoundingClientRect()
    const cardRect = card.getBoundingClientRect()
    const inset = cardEdgeInset(scroller)
    // Physical delta: move so the card's inline-start (right in RTL) meets the content start edge.
    const delta = cardRect.right - (scrollerRect.right - inset)
    if (Math.abs(delta) < 1) return
    syncingScrollRef.current = true
    scroller.scrollBy({ left: delta, behavior })
    window.setTimeout(
      () => {
        syncingScrollRef.current = false
      },
      behavior === "smooth" ? 420 : 0
    )
  }

  const closestTabFromScroll = (): TabId => {
    const scroller = cardScrollerRef.current
    if (!scroller) return tabRef.current
    const scrollerRect = scroller.getBoundingClientRect()
    const startEdge = scrollerRect.right - cardEdgeInset(scroller)
    let closest: TabId = tabRef.current
    let closestDistance = Number.POSITIVE_INFINITY
    for (const item of tabs) {
      const card = scroller.querySelector<HTMLElement>(`[data-tab-id="${item.id}"]`)
      if (!card) continue
      const rect = card.getBoundingClientRect()
      const distance = Math.abs(rect.right - startEdge)
      if (distance < closestDistance) {
        closestDistance = distance
        closest = item.id
      }
    }
    return closest
  }

  const chooseTab = (next: TabId) => {
    if (next === tabRef.current) return
    tabRef.current = next
    setTab(next)
    setSearch("")
    setCreate(createBlank(next, query.status === "ready" ? query.db : null))
    setCreateError(false)
    setEditor(null)
    setEditError(false)
    router.replace(`/manager/organization?tab=${next}`, { scroll: false })
  }

  const syncTabFromScroll = () => {
    if (syncingScrollRef.current) return
    const closest = closestTabFromScroll()
    if (closest !== tabRef.current) chooseTab(closest)
  }

  const onCardScroll = () => {
    if (syncingScrollRef.current) return
    if (scrollEndTimerRef.current !== null) window.clearTimeout(scrollEndTimerRef.current)
    scrollEndTimerRef.current = window.setTimeout(() => {
      scrollEndTimerRef.current = null
      syncTabFromScroll()
    }, 60)
  }

  useEffect(() => {
    if (query.status !== "ready") return
    // Initial align only — do not re-scroll on every tab change (that fights RTL drag).
    const frame = window.requestAnimationFrame(() => {
      const scroller = cardScrollerRef.current
      const card = scroller?.querySelector<HTMLElement>(`[data-tab-id="${tabRef.current}"]`)
      if (!scroller || !card) return
      const scrollerRect = scroller.getBoundingClientRect()
      const cardRect = card.getBoundingClientRect()
      const inset = cardEdgeInset(scroller)
      const delta = cardRect.right - (scrollerRect.right - inset)
      if (Math.abs(delta) >= 1) scroller.scrollBy({ left: delta, behavior: "instant" })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [query.status])

  if (query.status === "loading") return <LeaderLoading />
  if (query.status === "error") return <LeaderStoreError />
  const db = query.db

  const saveCreate = () => {
    const result = persistEditor(create)
    if (!result.ok) {
      setCreateError(true)
      return
    }
    setCreateError(false)
    setDeleteFlow(null)
    setCreate(createBlank(tab, db))
  }

  const saveEdit = () => {
    if (!editor) return
    const result = persistEditor(editor)
    if (!result.ok) {
      setEditError(true)
      return
    }
    setEditError(false)
    setDeleteFlow(null)
    setEditor(null)
  }

  const runDelete = () => {
    if (!deleteFlow || deleteFlow.step !== "confirm") return
    const pending = deleteFlow
    const result = persistDelete(pending.kind, pending.id)
    if (!result.ok) {
      const reason = "reason" in result ? result.reason : "not-found"
      setDeleteFlow({ step: "blocked", kind: pending.kind, id: pending.id, reason })
      return
    }
    setDeleteFlow(null)
    toast.info(he.manager.organization.delete)
  }

  return (
    <PageFrame>
      <div className="flex w-full flex-col gap-3 px-4 py-4 sm:px-6">
        <div
          ref={cardScrollerRef}
          role="tablist"
          aria-label={he.manager.organization.title}
          dir="ltr"
          className="-mx-4 snap-x snap-mandatory scroll-px-4 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] lg:mx-0 lg:snap-none lg:scroll-px-0 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden"
          onScroll={onCardScroll}
        >
          <div
            dir="rtl"
            className="flex w-max gap-3 px-4 lg:grid lg:w-full lg:grid-cols-5 lg:gap-3 lg:px-0"
          >
            {tabs.map((item) => {
              const selected = tab === item.id
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  data-tab-id={item.id}
                  aria-selected={selected}
                  className={cn(
                    "pressable flex aspect-square w-[6.75rem] shrink-0 snap-start flex-col items-center justify-center gap-2.5 rounded-xl border px-3 py-3 text-center transition-colors",
                    "lg:aspect-auto lg:h-auto lg:min-h-0 lg:w-auto lg:flex-row lg:justify-start lg:gap-2 lg:rounded-md lg:px-3 lg:py-2.5 lg:text-start lg:snap-align-none",
                    selected
                      ? "border-primary bg-primary/10 text-foreground shadow-[0_0_0_1px_rgb(255_51_0_/0.25)]"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  )}
                  onClick={() => {
                    chooseTab(item.id)
                    alignCardToStart(item.id)
                  }}
                >
                  <span
                    className={cn(
                      "inline-flex size-9 items-center justify-center rounded-full lg:size-7",
                      selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    )}
                  >
                    <Icon className="size-4 lg:size-3.5" aria-hidden />
                  </span>
                  <span className="text-sm font-medium leading-tight lg:text-xs">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-start">
          <div className="order-2 flex w-full min-w-0 flex-col gap-2 lg:order-1 lg:min-w-0 lg:flex-1">
            <div className="relative min-w-0">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                placeholder={he.manager.organization.search}
                className="h-9 rounded-md border-border bg-card pe-3 ps-9 text-sm shadow-none md:text-sm"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <EntityList
              db={db}
              tab={tab}
              search={search}
              onEdit={(next) => {
                setEditError(false)
                setDeleteFlow(null)
                setEditor(next)
              }}
              onDelete={(kind, id) => {
                setDeleteFlow({ step: "confirm", kind, id })
              }}
            />
          </div>

          <CreateCard
            key={create.kind}
            db={db}
            create={create}
            error={createError}
            onChange={setCreate}
            onSave={saveCreate}
          />
        </div>
      </div>
      <EditorPanel
        db={db}
        editor={editor}
        error={editError}
        onOpenChange={(open) => {
          if (!open) setEditor(null)
        }}
        onChange={setEditor}
        onSave={saveEdit}
      />
      <Dialog open={deleteFlow !== null} onOpenChange={(open) => { if (!open) setDeleteFlow(null) }}>
        <DialogContent className="rounded-md sm:max-w-md">
          {deleteFlow?.step === "blocked" ? (
            <>
              <DialogHeader>
                <DialogTitle>{he.manager.organization.deleteBlockedTitle}</DialogTitle>
                <DialogDescription className="text-start">
                  {he.manager.organization.deleteBlocked[deleteFlow.reason]}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-row gap-2 sm:justify-stretch">
                <Button
                  type="button"
                  size="default"
                  variant="outline"
                  className="h-[calc(2.5rem*1.1*1.1)] w-full"
                  onClick={() => setDeleteFlow(null)}
                >
                  {he.manager.organization.deleteBlockedKeep}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{he.manager.organization.delete}</DialogTitle>
                <DialogDescription>{he.manager.organization.deleteConfirm}</DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-row gap-2 sm:justify-stretch">
                <Button
                  type="button"
                  size="default"
                  variant="outline"
                  className="h-[calc(2.5rem*1.1*1.1)] w-[30%]"
                  onClick={() => setDeleteFlow(null)}
                >
                  {he.manager.panel.abortAction}
                </Button>
                <Button type="button" size="default" className="h-[calc(2.5rem*1.1*1.1)] w-[70%]" onClick={runDelete}>
                  {he.manager.organization.deleteAction}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageFrame>
  )
}

function columnWidths(columnCount: number): string[] {
  if (columnCount <= 0) return []
  if (columnCount === 5) return ["6%", "46%", "32%", "8%", "8%"]
  if (columnCount === 6) return ["6%", "28%", "25%", "25%", "8%", "8%"]
  const actionShare = 8
  const indexShare = 6
  const remaining = Math.max(0, 100 - indexShare - actionShare * 2)
  const middleCount = Math.max(1, columnCount - 3)
  const middleShare = remaining / middleCount
  return Array.from({ length: columnCount }, (_, index) => {
    if (index === 0) return `${indexShare}%`
    if (index >= columnCount - 2) return `${actionShare}%`
    return `${middleShare}%`
  })
}

function countDiaries(db: MockDb, tab: TabId, id: string) {
  if (tab === "companies") return db.diaries.filter((diary) => diary.companyId === id).length
  if (tab === "customers") return db.diaries.filter((diary) => diary.customerId === id).length
  if (tab === "sites") return db.diaries.filter((diary) => diary.siteId === id).length
  if (tab === "teamLeaders") return db.diaries.filter((diary) => diary.teamLeaderId === id).length
  return 0
}

function EntityList({
  db,
  tab,
  search,
  onEdit,
  onDelete,
}: {
  db: MockDb
  tab: TabId
  search: string
  onEdit: (editor: Editor) => void
  onDelete: (kind: TabId, id: string) => void
}) {
  const query = search.trim()

  if (tab === "companies") {
    const items = sortByHebrewName(
      db.companies.filter((item) => !query || item.name.includes(query))
    )
    const rows: TableRow[] = items.map((item, index) => ({
      id: item.id,
      cells: [String(index + 1), item.name, String(countDiaries(db, tab, item.id))],
      onEdit: () => onEdit({ kind: "company", id: item.id, name: item.name }),
      onDelete: () => onDelete(tab, item.id),
    }))
    const navItems: OrgNavItem[] = items.map((item) => {
      const diariesCount = countDiaries(db, tab, item.id)
      return {
        id: item.id,
        kind: "company",
        name: item.name,
        meta: String(diariesCount),
        details: [
          { label: he.manager.organization.name, value: item.name },
          { label: he.manager.organization.diariesCount, value: String(diariesCount) },
        ],
        onEdit: () => onEdit({ kind: "company", id: item.id, name: item.name }),
        onDelete: () => onDelete(tab, item.id),
      }
    })

    return (
      <>
        <DataTable
          empty={rows.length === 0}
          mobile={false}
          headers={[
            he.manager.organization.index,
            he.manager.organization.name,
            he.manager.organization.diariesCount,
            he.manager.edit,
            he.manager.organization.delete,
          ]}
          rows={rows}
        />
        <OrgNavList empty={navItems.length === 0} items={navItems} />
      </>
    )
  }

  if (tab === "customers") {
    const items = sortByHebrewName(
      db.customers.filter((item) => !query || item.name.includes(query))
    )
    const rows: TableRow[] = items.map((item, index) => ({
      id: item.id,
      cells: [String(index + 1), item.name, findCompany(db, item.companyId)?.name ?? "—"],
      onEdit: () =>
        onEdit({ kind: "customer", id: item.id, name: item.name, companyId: item.companyId }),
      onDelete: () => onDelete(tab, item.id),
    }))
    const navItems: OrgNavItem[] = items.map((item) => {
      const diariesCount = countDiaries(db, tab, item.id)
      const companyName = findCompany(db, item.companyId)?.name ?? "—"
      return {
        id: item.id,
        kind: "customer",
        name: item.name,
        meta: String(diariesCount),
        details: [
          { label: he.manager.organization.name, value: item.name },
          { label: he.manager.organization.company, value: companyName },
          { label: he.manager.organization.diariesCount, value: String(diariesCount) },
        ],
        onEdit: () =>
          onEdit({ kind: "customer", id: item.id, name: item.name, companyId: item.companyId }),
        onDelete: () => onDelete(tab, item.id),
      }
    })

    return (
      <>
        <DataTable
          empty={rows.length === 0}
          mobile={false}
          headers={[
            he.manager.organization.index,
            he.manager.organization.name,
            he.manager.organization.company,
            he.manager.edit,
            he.manager.organization.delete,
          ]}
          rows={rows}
        />
        <OrgNavList empty={navItems.length === 0} items={navItems} />
      </>
    )
  }

  if (tab === "sites") {
    const items = sortByHebrewName(
      db.sites.filter((item) => !query || item.name.includes(query))
    )
    const rows: TableRow[] = items.map((item, index) => ({
      id: item.id,
      cells: [String(index + 1), item.name, findCustomer(db, item.customerId)?.name ?? "—"],
      onEdit: () =>
        onEdit({ kind: "site", id: item.id, name: item.name, customerId: item.customerId }),
      onDelete: () => onDelete(tab, item.id),
    }))
    const navItems: OrgNavItem[] = items.map((item) => {
      const diariesCount = countDiaries(db, tab, item.id)
      const customerName = findCustomer(db, item.customerId)?.name ?? "—"
      return {
        id: item.id,
        kind: "site",
        name: item.name,
        meta: String(diariesCount),
        details: [
          { label: he.manager.organization.name, value: item.name },
          { label: he.manager.organization.customer, value: customerName },
          { label: he.manager.organization.diariesCount, value: String(diariesCount) },
        ],
        onEdit: () =>
          onEdit({ kind: "site", id: item.id, name: item.name, customerId: item.customerId }),
        onDelete: () => onDelete(tab, item.id),
      }
    })

    return (
      <>
        <DataTable
          empty={rows.length === 0}
          mobile={false}
          headers={[
            he.manager.organization.index,
            he.manager.organization.name,
            he.manager.organization.customer,
            he.manager.edit,
            he.manager.organization.delete,
          ]}
          rows={rows}
        />
        <OrgNavList empty={navItems.length === 0} items={navItems} />
      </>
    )
  }

  if (tab === "teamLeaders") {
    const items = db.users
      .filter((user) => {
        if (user.role !== "teamLeader") return false
        if (!query) return true
        return (
          user.fullName.includes(query) ||
          user.identityNumber.includes(query) ||
          (user.phone ?? "").includes(query)
        )
      })
      .slice()
      .sort((a, b) => compareHebrew(a.fullName, b.fullName))
    const rows: TableRow[] = items.map((item, index) => ({
      id: item.id,
      cells: [
        String(index + 1),
        item.fullName,
        item.identityNumber || "—",
        item.phone || "—",
      ],
      onEdit: () =>
        onEdit({
          kind: "teamLeader",
          id: item.id,
          fullName: item.fullName,
          identityNumber: item.identityNumber,
          phone: item.phone ?? "",
        }),
      onDelete: () => onDelete("teamLeaders", item.id),
    }))
    const navItems: OrgNavItem[] = items.map((item) => {
      const phone = item.phone || "—"
      const diariesCount = countDiaries(db, "teamLeaders", item.id)
      return {
        id: item.id,
        kind: "teamLeader",
        name: item.fullName,
        meta: phone,
        details: [
          { label: he.manager.teamLeaders.name, value: item.fullName },
          { label: he.manager.teamLeaders.identity, value: item.identityNumber || "—" },
          { label: he.manager.teamLeaders.phone, value: phone },
          { label: he.manager.organization.diariesCount, value: String(diariesCount) },
        ],
        onEdit: () =>
          onEdit({
            kind: "teamLeader",
            id: item.id,
            fullName: item.fullName,
            identityNumber: item.identityNumber,
            phone: item.phone ?? "",
          }),
        onDelete: () => onDelete("teamLeaders", item.id),
      }
    })

    return (
      <>
        <DataTable
          empty={rows.length === 0}
          mobile={false}
          headers={[
            he.manager.organization.index,
            he.manager.teamLeaders.name,
            he.manager.teamLeaders.identity,
            he.manager.teamLeaders.phone,
            he.manager.edit,
            he.manager.organization.delete,
          ]}
          rows={rows}
        />
        <OrgNavList empty={navItems.length === 0} items={navItems} />
      </>
    )
  }

  const items = db.users
    .filter((user) => {
      if (user.role !== "manager") return false
      if (!query) return true
      return user.fullName.includes(query) || (user.email ?? "").includes(query)
    })
    .slice()
    .sort((a, b) => compareHebrew(a.fullName, b.fullName))
  const rows: TableRow[] = items.map((item, index) => ({
    id: item.id,
    cells: [String(index + 1), item.fullName, item.email ?? "—"],
    onEdit: () =>
      onEdit({
        kind: "manager",
        id: item.id,
        fullName: item.fullName,
        identityNumber: item.identityNumber,
        email: item.email ?? "",
      }),
    onDelete: () => onDelete("managers", item.id),
  }))
  const navItems: OrgNavItem[] = items.map((item) => {
    const email = item.email || "—"
    return {
      id: item.id,
      kind: "manager",
      name: item.fullName,
      meta: email,
      details: [
        { label: he.manager.managers.name, value: item.fullName },
        { label: he.manager.managers.identity, value: item.identityNumber || "—" },
        { label: he.manager.managers.email, value: email },
      ],
      onEdit: () =>
        onEdit({
          kind: "manager",
          id: item.id,
          fullName: item.fullName,
          identityNumber: item.identityNumber,
          email: item.email ?? "",
        }),
      onDelete: () => onDelete("managers", item.id),
    }
  })

  return (
    <>
      <DataTable
        empty={rows.length === 0}
        mobile={false}
        headers={[
          he.manager.organization.index,
          he.manager.managers.name,
          he.manager.managers.email,
          he.manager.edit,
          he.manager.organization.delete,
        ]}
        rows={rows}
      />
      <OrgNavList empty={navItems.length === 0} items={navItems} />
    </>
  )
}

function RowIconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      className="size-[calc(2.25rem*1.1*1.1)] text-muted-foreground hover:text-foreground"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function DataTable({
  empty,
  headers,
  rows,
  mobile = true,
}: {
  empty: boolean
  headers: string[]
  rows: TableRow[]
  mobile?: boolean
}) {
  return (
    <>
      <div className="hidden w-full overflow-hidden rounded-md border border-border bg-card lg:block">
        <table className="w-full table-fixed border-collapse text-[11px] leading-4">
          <colgroup>
            {columnWidths(headers.length).map((width, index) => (
              <col key={index} style={{ width }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-20 bg-muted">
            <tr className="border-b border-border bg-muted text-foreground">
              {headers.map((header, index) => (
                <th
                  key={`${header}-${index}`}
                  className={cn(
                    "h-10 bg-muted px-2 text-[11px] font-medium whitespace-nowrap",
                    index === 1 ? "text-start" : "text-center"
                  )}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {empty ? (
              <tr>
                <td colSpan={headers.length} className="px-3 py-8 text-center text-xs text-muted-foreground">
                  {he.manager.empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="h-12 border-b border-border/80 last:border-b-0 hover:bg-muted/40">
                  {row.cells.map((cell, index) => (
                    <td
                      key={`${row.id}-${index}`}
                      className={cn(
                        "px-2 py-2 align-middle",
                        index === 1
                          ? "text-start font-medium break-words whitespace-normal"
                          : "truncate text-center tabular-nums text-muted-foreground"
                      )}
                      title={index === 1 ? cell : undefined}
                    >
                      {cell || "—"}
                    </td>
                  ))}
                  <td className="px-1 py-1 text-center align-middle">
                    <div className="flex items-center justify-center gap-0">
                      <RowIconButton label={he.manager.edit} onClick={row.onEdit}>
                        <PenLine className="size-3.5" aria-hidden />
                      </RowIconButton>
                    </div>
                  </td>
                  <td className="px-1 py-1 text-center align-middle">
                    <RowIconButton label={he.manager.organization.delete} onClick={row.onDelete}>
                      <Trash className="size-3.5" aria-hidden />
                    </RowIconButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {mobile ? (
        <ul className="w-full overflow-hidden rounded-md border border-border bg-card lg:hidden">
          {empty ? (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">{he.manager.empty}</li>
          ) : (
            rows.map((row) => (
              <li key={row.id} className="border-b border-border px-3 py-[calc(0.75rem*1.15*1.15)] last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium break-words">
                      <span className="me-2 text-muted-foreground tabular-nums">{row.cells[0]}.</span>
                      {row.cells[1]}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground break-words">
                      {row.cells.slice(2).filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <RowIconButton label={he.manager.edit} onClick={row.onEdit}>
                      <PenLine className="size-3.5" aria-hidden />
                    </RowIconButton>
                    <RowIconButton label={he.manager.organization.delete} onClick={row.onDelete}>
                      <Trash className="size-3.5" aria-hidden />
                    </RowIconButton>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </>
  )
}

function OrgNavList({ empty, items }: { empty: boolean; items: OrgNavItem[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = items.find((item) => item.id === selectedId) ?? null

  return (
    <>
      <ul className="w-full overflow-hidden rounded-md border border-border bg-card lg:hidden">
        {empty ? (
          <li className="px-3 py-8 text-center text-sm text-muted-foreground">{he.manager.empty}</li>
        ) : (
          items.map((item) => (
            <li key={item.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                className="pressable flex w-full items-center gap-3 px-3 py-[calc(0.75rem*1.15*1.15)] text-start"
                onClick={() => setSelectedId(item.id)}
              >
                <p className="min-w-0 flex-1 text-sm font-medium break-words">
                  <span>{item.name}</span>
                  <span className="text-muted-foreground"> · </span>
                  <span className="tabular-nums text-muted-foreground" dir="ltr">
                    {item.meta}
                  </span>
                </p>
                <ArrowLeft className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </li>
          ))
        )}
      </ul>

      <Drawer
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
        showSwipeHandle
        swipeDirection="down"
      >
        <DrawerContent
          className={cn("min-h-[min(52dvh,28rem)] overflow-hidden", panelSurfaceClass)}
          style={panelSurfaceStyle}
        >
          <DrawerHeader className="gap-1 pb-2 text-start md:text-start">
            <DrawerTitle className="flex items-center justify-start gap-2 text-start">
              {selected
                ? createElement(editorIcon(selected.kind), {
                    className: "size-4 shrink-0 text-muted-foreground",
                    "aria-hidden": true,
                  })
                : null}
              <span className="min-w-0 truncate">{selected?.name ?? ""}</span>
            </DrawerTitle>
          </DrawerHeader>
          {selected ? (
            <div className="flex flex-1 flex-col gap-5 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1">
              <dl className="flex flex-col gap-0 overflow-hidden rounded-xl border border-border bg-muted/25">
                {selected.details.map((detail, index) => (
                  <div
                    key={detail.label}
                    className={cn(
                      "flex flex-col gap-1.5 px-4 py-3.5",
                      index < selected.details.length - 1 && "border-b border-border/70"
                    )}
                  >
                    <dt className="text-[11px] font-medium tracking-wide text-muted-foreground">
                      {detail.label}
                    </dt>
                    <dd className="text-base font-semibold leading-snug text-foreground break-words">
                      {detail.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-auto flex flex-row gap-2">
                <Button
                  type="button"
                  size="default"
                  className="h-[calc(2.75rem*1.1*1.1)] w-[70%]"
                  onClick={() => {
                    const item = selected
                    setSelectedId(null)
                    item.onEdit()
                  }}
                >
                  {he.manager.edit}
                </Button>
                <Button
                  type="button"
                  size="default"
                  variant="outline"
                  className="h-[calc(2.75rem*1.1*1.1)] w-[30%]"
                  onClick={() => {
                    const item = selected
                    setSelectedId(null)
                    item.onDelete()
                  }}
                >
                  {he.manager.organization.delete}
                </Button>
              </div>
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>
    </>
  )
}

function editorIcon(kind: Editor["kind"]): LucideIcon {
  if (kind === "company") return Building2
  if (kind === "customer") return Users
  if (kind === "site") return MapPin
  if (kind === "manager") return IdCard
  return UserRound
}

function CreateCard({
  db,
  create,
  error,
  onChange,
  onSave,
}: {
  db: MockDb
  create: Editor
  error: boolean
  onChange: (editor: Editor) => void
  onSave: () => void
}) {
  const desktop = useDesktop()
  const [open, setOpen] = useState(false)
  // Desktop stays expanded; mobile keeps the collapsible accordion.
  const expanded = desktop || open

  return (
    <section className="order-1 flex w-full min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card lg:order-2 lg:h-fit lg:w-[450px] lg:shrink-0">
      {desktop ? (
        <div className="border-b border-border/70 px-4 py-3">
          <EditorHeader title={he.manager.organization.addTitles[create.kind]} kind={create.kind} />
        </div>
      ) : (
        <button
          type="button"
          className={cn(
            "pressable flex w-full items-center gap-2 px-4 py-3 text-start transition-[border-color] duration-300",
            open ? "border-b border-border/70" : "border-b border-transparent"
          )}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <div className="min-w-0 flex-1">
            <EditorHeader title={he.manager.organization.addTitles[create.kind]} kind={create.kind} />
          </div>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-out",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </button>
      )}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          desktop ? "grid-rows-[1fr]" : expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div
          className={cn(
            "min-h-0 overflow-hidden",
            !expanded && "pointer-events-none"
          )}
          aria-hidden={!expanded}
          inert={expanded ? undefined : true}
        >
          <div
            className={cn(
              "transition-[opacity,transform] duration-300 ease-out",
              expanded ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
            )}
          >
            <EditorForm
              db={db}
              editor={create}
              error={error}
              onChange={onChange}
              onSave={onSave}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function EditorPanel({
  db,
  editor,
  error,
  onOpenChange,
  onChange,
  onSave,
}: {
  db: MockDb
  editor: Editor | null
  error: boolean
  onOpenChange: (open: boolean) => void
  onChange: (editor: Editor) => void
  onSave: () => void
}) {
  const desktop = useDesktop()
  const open = editor !== null
  const title = editorTitle(editor)
  const body = editor ? (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-4 py-3">
        <EditorHeader title={title} kind={editor.kind} />
      </div>
      <EditorForm
        db={db}
        editor={editor}
        error={error}
        onChange={onChange}
        onSave={onSave}
      />
    </div>
  ) : null
  if (desktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className={cn("w-full gap-0 overflow-hidden data-[side=left]:!max-w-[28.8rem]", panelSurfaceClass)}
          style={panelSurfaceStyle}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
    )
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle swipeDirection="down">
      <DrawerContent className={cn("overflow-hidden", panelSurfaceClass)} style={panelSurfaceStyle}>
        <DrawerHeader className="sr-only">
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        {body}
      </DrawerContent>
    </Drawer>
  )
}

function EditorHeader({ title, kind }: { title: string; kind: Editor["kind"] }) {
  return (
    <div className="grid grid-cols-[1rem_minmax(0,1fr)] items-center gap-x-2">
      {createElement(editorIcon(kind), {
        className: "size-4 justify-self-center text-muted-foreground",
        "aria-hidden": true,
      })}
      <p className="text-sm font-semibold text-foreground">{title}</p>
    </div>
  )
}

function EditorField({
  icon: Icon,
  label,
  hint,
  children,
}: {
  icon: LucideIcon
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {label}
      </span>
      {children}
      {hint ? <span className="text-xs leading-5 text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

function OrgSelect({
  value,
  options,
  placeholder,
  onValueChange,
}: {
  value: string
  options: Array<{ value: string; label: string }>
  placeholder: string
  onValueChange: (value: string) => void
}) {
  const selected = options.find((option) => option.value === value)?.label ?? placeholder

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          editorInputClass,
          "relative flex cursor-pointer items-center pe-9 ps-4 text-start"
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", !value && "text-muted-foreground")}>
          {selected}
        </span>
        <ChevronDown className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="max-h-52 min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-md p-1.5"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value || "__empty"} value={option.value} className="rounded-md px-3 py-2">
              <span className="truncate">{option.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function companyOptions(db: MockDb, allowEmpty: boolean) {
  const options = sortSelectOptions(
    db.companies.map((company) => ({ value: company.id, label: company.name }))
  )
  if (allowEmpty) {
    return [{ value: "", label: "—" }, ...options]
  }
  return options
}

function customerOptions(db: MockDb) {
  return sortSelectOptions(
    db.customers.map((customer) => ({ value: customer.id, label: customer.name }))
  )
}

function EditorForm({
  db,
  editor,
  error,
  onChange,
  onSave,
}: {
  db: MockDb
  editor: Editor
  error: boolean
  onChange: (editor: Editor) => void
  onSave: () => void
}) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="flex flex-col gap-4 text-sm">
          {editor.kind === "company" ? (
            <EditorField icon={Building2} label={he.manager.organization.name}>
              <Input
                value={editor.name}
                className={editorInputClass}
                onChange={(event) => onChange({ ...editor, name: event.target.value })}
              />
            </EditorField>
          ) : null}
          {editor.kind === "customer" ? (
            <>
              <EditorField icon={Users} label={he.manager.organization.name}>
                <Input
                  value={editor.name}
                  className={editorInputClass}
                  onChange={(event) => onChange({ ...editor, name: event.target.value })}
                />
              </EditorField>
              <EditorField icon={Building2} label={he.manager.organization.company}>
                <OrgSelect
                  value={editor.companyId}
                  placeholder={he.manager.organization.company}
                  options={companyOptions(db, false)}
                  onValueChange={(companyId) => onChange({ ...editor, companyId })}
                />
              </EditorField>
            </>
          ) : null}
          {editor.kind === "site" ? (
            <>
              <EditorField icon={MapPin} label={he.manager.organization.name}>
                <Input
                  value={editor.name}
                  className={editorInputClass}
                  onChange={(event) => onChange({ ...editor, name: event.target.value })}
                />
              </EditorField>
              <EditorField icon={Users} label={he.manager.organization.customer}>
                <OrgSelect
                  value={editor.customerId}
                  placeholder={he.manager.organization.customer}
                  options={customerOptions(db)}
                  onValueChange={(customerId) => onChange({ ...editor, customerId })}
                />
              </EditorField>
            </>
          ) : null}
          {editor.kind === "teamLeader" ? (
            <>
              <EditorField icon={UserRound} label={he.manager.teamLeaders.name}>
                <Input
                  value={editor.fullName}
                  className={editorInputClass}
                  onChange={(event) => onChange({ ...editor, fullName: event.target.value })}
                />
              </EditorField>
              <EditorField
                icon={IdCard}
                label={he.manager.teamLeaders.identity}
                hint={he.manager.teamLeaders.identityInvalid}
              >
                <Input
                  dir="ltr"
                  inputMode="numeric"
                  value={editor.identityNumber}
                  className={editorInputClass}
                  onChange={(event) => onChange({ ...editor, identityNumber: event.target.value })}
                />
              </EditorField>
              <EditorField icon={Phone} label={he.manager.teamLeaders.phone}>
                <Input
                  dir="ltr"
                  inputMode="tel"
                  value={editor.phone}
                  className={editorInputClass}
                  onChange={(event) => onChange({ ...editor, phone: event.target.value })}
                />
              </EditorField>
            </>
          ) : null}
          {editor.kind === "manager" ? (
            <>
              <EditorField icon={UserRound} label={he.manager.managers.name}>
                <Input
                  value={editor.fullName}
                  className={editorInputClass}
                  onChange={(event) => onChange({ ...editor, fullName: event.target.value })}
                />
              </EditorField>
              <EditorField
                icon={IdCard}
                label={he.manager.managers.identity}
                hint={he.manager.teamLeaders.identityInvalid}
              >
                <Input
                  dir="ltr"
                  inputMode="numeric"
                  value={editor.identityNumber}
                  className={editorInputClass}
                  onChange={(event) => onChange({ ...editor, identityNumber: event.target.value })}
                />
              </EditorField>
              <EditorField icon={Mail} label={he.manager.managers.email} hint={he.manager.managers.emailInvalid}>
                <Input
                  dir="ltr"
                  inputMode="email"
                  value={editor.email}
                  className={editorInputClass}
                  onChange={(event) => onChange({ ...editor, email: event.target.value })}
                />
              </EditorField>
            </>
          ) : null}
          {error ? <p className="text-xs text-muted-foreground">{he.manager.invalid}</p> : null}
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-border/70 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="button" size="default" className="h-[calc(2.25rem*1.1*1.1)] w-full" onClick={onSave}>
          {he.manager.save}
        </Button>
      </div>
    </>
  )
}

function createBlank(tab: TabId, db: MockDb | null): Editor {
  const defaultCompanyId = db?.companies[0]?.id ?? ""
  const defaultCustomerId = db?.customers[0]?.id ?? ""
  if (tab === "companies") return { kind: "company", id: null, name: "" }
  if (tab === "customers") return { kind: "customer", id: null, name: "", companyId: defaultCompanyId }
  if (tab === "sites") return { kind: "site", id: null, name: "", customerId: defaultCustomerId }
  if (tab === "teamLeaders") {
    return {
      kind: "teamLeader",
      id: null,
      fullName: "",
      identityNumber: "",
      phone: "",
    }
  }
  return {
    kind: "manager",
    id: null,
    fullName: "",
    identityNumber: "",
    email: "",
  }
}

function persistEditor(editor: Editor) {
  if (editor.kind === "company") return saveManagerCompany(editor.id, editor.name)
  if (editor.kind === "customer") {
    return saveManagerCustomer(editor.id, { name: editor.name, companyId: editor.companyId })
  }
  if (editor.kind === "site") {
    return saveManagerSite(editor.id, { name: editor.name, customerId: editor.customerId })
  }
  if (editor.kind === "teamLeader") {
    return saveManagerTeamLeader(editor.id, {
      fullName: editor.fullName,
      identityNumber: editor.identityNumber,
      phone: editor.phone,
      companyId: "",
    })
  }
  return saveManagerAccount(editor.id, {
    fullName: editor.fullName,
    identityNumber: editor.identityNumber,
    email: editor.email,
    companyId: "",
  })
}

function persistDelete(kind: TabId, id: string) {
  if (kind === "companies") return deleteManagerCompany(id)
  if (kind === "customers") return deleteManagerCustomer(id)
  if (kind === "sites") return deleteManagerSite(id)
  return deleteManagerUser(id)
}

function editorTitle(editor: Editor | null) {
  if (!editor) return he.manager.organization.title
  if (editor.kind === "company") return he.manager.organization.tabs.companies
  if (editor.kind === "customer") return he.manager.organization.tabs.customers
  if (editor.kind === "site") return he.manager.organization.tabs.sites
  if (editor.kind === "teamLeader") return he.manager.organization.tabs.teamLeaders
  return he.manager.organization.tabs.managers
}

function parseTab(value: string | null): TabId {
  if (value === "customers" || value === "sites" || value === "teamLeaders" || value === "managers") {
    return value
  }
  return "companies"
}

function useDesktop() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const query = window.matchMedia("(min-width: 1024px)")
      query.addEventListener("change", onStoreChange)
      return () => query.removeEventListener("change", onStoreChange)
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false
  )
}
