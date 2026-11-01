"use client"

import { createElement, useState, useSyncExternalStore, type ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Building2,
  ChevronDown,
  IdCard,
  Mail,
  MapPin,
  PenLine,
  Phone,
  Power,
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
  setManagerCompanyActive,
  setManagerCustomerActive,
  setManagerSiteActive,
  setManagerUserActive,
  useManagerDb,
} from "@/data/browser-store"
import { findCompany, findCustomer } from "@/data/lookups"
import type { DeleteBlockedReason } from "@/data/manager"
import type { MockDb } from "@/data/seed"
import { LeaderLoading, LeaderStoreError } from "@/features/leader/leader-states"
import { he } from "@/i18n/he"
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
      companyId: string
    }
  | {
      kind: "manager"
      id: string | null
      fullName: string
      identityNumber: string
      email: string
      companyId: string
    }

type TableRow = {
  id: string
  cells: string[]
  isActive: boolean
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "companies", label: he.manager.organization.tabs.companies },
  { id: "customers", label: he.manager.organization.tabs.customers },
  { id: "sites", label: he.manager.organization.tabs.sites },
  { id: "teamLeaders", label: he.manager.organization.tabs.teamLeaders },
  { id: "managers", label: he.manager.organization.tabs.managers },
]

const panelSurfaceClass =
  "border-border/40 bg-white/92 shadow-lg backdrop-blur-xl dark:border-border/40 dark:bg-background/90"

const panelSurfaceStyle = {
  backgroundColor: "rgb(255 255 255 / 0.92)",
  WebkitBackdropFilter: "blur(16px)",
  backdropFilter: "blur(16px)",
} as const

const editorInputClass =
  "h-10 w-full min-w-0 rounded-md border border-border bg-white px-4 text-right text-sm text-foreground shadow-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-card"

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

  if (query.status === "loading") return <LeaderLoading />
  if (query.status === "error") return <LeaderStoreError />
  const db = query.db

  const counts: Record<TabId, number> = {
    companies: db.companies.length,
    customers: db.customers.length,
    sites: db.sites.length,
    teamLeaders: db.users.filter((user) => user.role === "teamLeader").length,
    managers: db.users.filter((user) => user.role === "manager").length,
  }

  const toggleActive = (kind: TabId, id: string, next: boolean) => {
    const result =
      kind === "companies"
        ? setManagerCompanyActive(id, next)
        : kind === "customers"
          ? setManagerCustomerActive(id, next)
          : kind === "sites"
            ? setManagerSiteActive(id, next)
            : setManagerUserActive(id, next)
    if (!result.ok) {
      const reason = "reason" in result ? result.reason : undefined
      if (reason) toast(he.manager.organization.deleteBlocked[reason])
      return false
    }
    return true
  }

  const chooseTab = (next: TabId) => {
    setTab(next)
    setSearch("")
    setCreate(createBlank(next, db))
    setCreateError(false)
    setEditor(null)
    setEditError(false)
    router.replace(`/manager/organization?tab=${next}`, { scroll: false })
  }

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
    toast(he.manager.organization.delete)
  }

  const runBlockedDeactivate = () => {
    if (!deleteFlow || deleteFlow.step !== "blocked") return
    if (!lookupIsActive(db, deleteFlow.kind, deleteFlow.id)) {
      setDeleteFlow(null)
      return
    }
    const ok = toggleActive(deleteFlow.kind, deleteFlow.id, false)
    if (ok) {
      toast(he.manager.organization.deactivate)
      setDeleteFlow(null)
    }
  }

  const canOfferDeactivate =
    deleteFlow?.step === "blocked" &&
    deleteFlow.reason === "has-diaries" &&
    lookupIsActive(db, deleteFlow.kind, deleteFlow.id)

  return (
    <PageFrame>
      <div className="flex w-full flex-col gap-3 px-4 py-4 sm:px-6">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div
            role="tablist"
            aria-label={he.manager.organization.title}
            className="inline-flex min-w-full gap-1 sm:min-w-0"
          >
            {tabs.map((item) => {
              const selected = tab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={cn(
                    "pressable inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm whitespace-nowrap transition-colors",
                    selected
                      ? "border-foreground bg-muted font-medium text-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                  onClick={() => chooseTab(item.id)}
                >
                  <span>{item.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[11px] tabular-nums",
                      selected ? "bg-background text-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {counts[item.id]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-start">
          <div className="order-2 flex w-full min-w-0 flex-col gap-2 lg:order-1 lg:w-[60%] lg:shrink-0">
            <div className="relative min-w-0">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                placeholder={he.manager.organization.search}
                className="h-9 rounded-md border-border bg-white pe-3 ps-9 text-sm shadow-none md:text-sm"
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
              onToggleActive={(kind, id, isActive) => toggleActive(kind, id, !isActive)}
            />
          </div>

          <CreateCard
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
        onToggleActive={
          editor?.id
            ? () => {
                const item = editor
                if (!item.id) return
                const kind = editorKindToTab(item.kind)
                const active = lookupIsActive(db, kind, item.id)
                toggleActive(kind, item.id, !active)
              }
            : undefined
        }
        isActive={editor?.id ? lookupIsActive(db, editorKindToTab(editor.kind), editor.id) : undefined}
      />
      <Dialog open={deleteFlow !== null} onOpenChange={(open) => { if (!open) setDeleteFlow(null) }}>
        <DialogContent className="rounded-md sm:max-w-md">
          {deleteFlow?.step === "blocked" ? (
            <>
              <DialogHeader>
                <DialogTitle>{he.manager.organization.deleteBlockedTitle}</DialogTitle>
                <DialogDescription className="space-y-2 text-start">
                  <span className="block">{he.manager.organization.deleteBlocked[deleteFlow.reason]}</span>
                  {canOfferDeactivate ? (
                    <span className="block text-muted-foreground">
                      {he.manager.organization.deleteBlockedDeactivateHint}
                    </span>
                  ) : null}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-row gap-2 sm:justify-stretch">
                <Button
                  type="button"
                  size="default"
                  variant="outline"
                  className={cn("h-10", canOfferDeactivate ? "w-[30%]" : "w-full")}
                  onClick={() => setDeleteFlow(null)}
                >
                  {he.manager.organization.deleteBlockedKeep}
                </Button>
                {canOfferDeactivate ? (
                  <Button type="button" size="default" className="h-10 w-[70%]" onClick={runBlockedDeactivate}>
                    {he.manager.organization.deactivate}
                  </Button>
                ) : null}
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
                  className="h-10 w-[30%]"
                  onClick={() => setDeleteFlow(null)}
                >
                  {he.manager.panel.abortAction}
                </Button>
                <Button type="button" size="default" className="h-10 w-[70%]" onClick={runDelete}>
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

function statusLabel(isActive: boolean) {
  return isActive ? he.manager.organization.active : he.manager.organization.inactive
}

/** Stable desktop grid: # | שם | A | B | עריכה | מחיקה */
const TABLE_COLUMN_WIDTHS = ["6%", "36%", "21%", "21%", "8%", "8%"] as const

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
  onToggleActive,
}: {
  db: MockDb
  tab: TabId
  search: string
  onEdit: (editor: Editor) => void
  onDelete: (kind: TabId, id: string) => void
  onToggleActive: (kind: TabId, id: string, isActive: boolean) => void
}) {
  const query = search.trim()

  if (tab === "companies") {
    const items = db.companies.filter((item) => !query || item.name.includes(query))
    const rows: TableRow[] = items.map((item, index) => ({
      id: item.id,
      cells: [
        String(index + 1),
        item.name,
        statusLabel(item.isActive),
        String(countDiaries(db, tab, item.id)),
      ],
      isActive: item.isActive,
      onEdit: () => onEdit({ kind: "company", id: item.id, name: item.name }),
      onDelete: () => onDelete(tab, item.id),
      onToggleActive: () => onToggleActive(tab, item.id, item.isActive),
    }))

    return (
      <DataTable
        empty={rows.length === 0}
        headers={[
          he.manager.organization.index,
          he.manager.organization.name,
          he.manager.organization.status,
          he.manager.organization.diariesCount,
          he.manager.edit,
          he.manager.organization.delete,
        ]}
        rows={rows}
      />
    )
  }

  if (tab === "customers") {
    const items = db.customers.filter((item) => !query || item.name.includes(query))
    const rows: TableRow[] = items.map((item, index) => ({
      id: item.id,
      cells: [
        String(index + 1),
        item.name,
        findCompany(db, item.companyId)?.name ?? "—",
        statusLabel(item.isActive),
      ],
      isActive: item.isActive,
      onEdit: () =>
        onEdit({ kind: "customer", id: item.id, name: item.name, companyId: item.companyId }),
      onDelete: () => onDelete(tab, item.id),
      onToggleActive: () => onToggleActive(tab, item.id, item.isActive),
    }))

    return (
      <DataTable
        empty={rows.length === 0}
        headers={[
          he.manager.organization.index,
          he.manager.organization.name,
          he.manager.organization.company,
          he.manager.organization.status,
          he.manager.edit,
          he.manager.organization.delete,
        ]}
        rows={rows}
      />
    )
  }

  if (tab === "sites") {
    const items = db.sites.filter((item) => !query || item.name.includes(query))
    const rows: TableRow[] = items.map((item, index) => ({
      id: item.id,
      cells: [
        String(index + 1),
        item.name,
        findCustomer(db, item.customerId)?.name ?? "—",
        statusLabel(item.isActive),
      ],
      isActive: item.isActive,
      onEdit: () =>
        onEdit({ kind: "site", id: item.id, name: item.name, customerId: item.customerId }),
      onDelete: () => onDelete(tab, item.id),
      onToggleActive: () => onToggleActive(tab, item.id, item.isActive),
    }))

    return (
      <DataTable
        empty={rows.length === 0}
        headers={[
          he.manager.organization.index,
          he.manager.organization.name,
          he.manager.organization.customer,
          he.manager.organization.status,
          he.manager.edit,
          he.manager.organization.delete,
        ]}
        rows={rows}
      />
    )
  }

  if (tab === "teamLeaders") {
    const items = db.users.filter((user) => {
      if (user.role !== "teamLeader") return false
      if (!query) return true
      return (
        user.fullName.includes(query) ||
        user.identityNumber.includes(query) ||
        (user.phone ?? "").includes(query)
      )
    })
    const rows: TableRow[] = items.map((item, index) => ({
      id: item.id,
      cells: [
        String(index + 1),
        item.fullName,
        findCompany(db, item.companyId)?.name ?? "—",
        statusLabel(item.isActive),
      ],
      isActive: item.isActive,
      onEdit: () =>
        onEdit({
          kind: "teamLeader",
          id: item.id,
          fullName: item.fullName,
          identityNumber: item.identityNumber,
          phone: item.phone ?? "",
          companyId: item.companyId,
        }),
      onDelete: () => onDelete("teamLeaders", item.id),
      onToggleActive: () => onToggleActive("teamLeaders", item.id, item.isActive),
    }))

    return (
      <DataTable
        empty={rows.length === 0}
        headers={[
          he.manager.organization.index,
          he.manager.organization.name,
          he.manager.teamLeaders.company,
          he.manager.organization.status,
          he.manager.edit,
          he.manager.organization.delete,
        ]}
        rows={rows}
      />
    )
  }

  const items = db.users.filter((user) => {
    if (user.role !== "manager") return false
    if (!query) return true
    return user.fullName.includes(query) || (user.email ?? "").includes(query)
  })
  const rows: TableRow[] = items.map((item, index) => ({
    id: item.id,
    cells: [String(index + 1), item.fullName, item.email ?? "—", statusLabel(item.isActive)],
    isActive: item.isActive,
    onEdit: () =>
      onEdit({
        kind: "manager",
        id: item.id,
        fullName: item.fullName,
        identityNumber: item.identityNumber,
        email: item.email ?? "",
        companyId: item.companyId,
      }),
    onDelete: () => onDelete("managers", item.id),
    onToggleActive: () => onToggleActive("managers", item.id, item.isActive),
  }))

  return (
    <DataTable
      empty={rows.length === 0}
      headers={[
        he.manager.organization.index,
        he.manager.organization.name,
        he.manager.managers.email,
        he.manager.organization.status,
        he.manager.edit,
        he.manager.organization.delete,
      ]}
      rows={rows}
    />
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
      className="size-9 text-muted-foreground hover:text-foreground"
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
}: {
  empty: boolean
  headers: string[]
  rows: TableRow[]
}) {
  return (
    <>
      <div className="hidden w-full overflow-hidden rounded-md border border-border bg-card lg:block">
        <table className="w-full table-fixed border-collapse text-[11px] leading-4">
          <colgroup>
            {TABLE_COLUMN_WIDTHS.map((width, index) => (
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
                      <RowIconButton
                        label={
                          row.isActive
                            ? he.manager.organization.deactivate
                            : he.manager.organization.activate
                        }
                        onClick={row.onToggleActive}
                      >
                        <Power
                          className={cn("size-3.5", !row.isActive && "text-muted-foreground/60")}
                          aria-hidden
                        />
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

      <ul className="w-full overflow-hidden rounded-md border border-border bg-card lg:hidden">
        {empty ? (
          <li className="px-3 py-8 text-center text-sm text-muted-foreground">{he.manager.empty}</li>
        ) : (
          rows.map((row) => (
            <li key={row.id} className="border-b border-border px-3 py-3 last:border-b-0">
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
                  <RowIconButton
                    label={
                      row.isActive ? he.manager.organization.deactivate : he.manager.organization.activate
                    }
                    onClick={row.onToggleActive}
                  >
                    <Power
                      className={cn("size-3.5", !row.isActive && "text-muted-foreground/60")}
                      aria-hidden
                    />
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
    </>
  )
}

function editorIcon(kind: Editor["kind"]): LucideIcon {
  if (kind === "company") return Building2
  if (kind === "customer") return Users
  if (kind === "site") return MapPin
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
  return (
    <section className="order-1 flex w-full min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card lg:order-2 lg:h-fit lg:w-[450px] lg:shrink-0 lg:min-h-[12rem]">
      <div className="shrink-0 border-b border-border/70 px-4 py-3">
        <EditorHeader title={he.manager.organization.addTitles[create.kind]} kind={create.kind} />
      </div>
      <EditorForm db={db} editor={create} error={error} onChange={onChange} onSave={onSave} />
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
  onToggleActive,
  isActive,
}: {
  db: MockDb
  editor: Editor | null
  error: boolean
  onOpenChange: (open: boolean) => void
  onChange: (editor: Editor) => void
  onSave: () => void
  onToggleActive?: () => void
  isActive?: boolean
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
        footerExtra={
          editor.id && onToggleActive ? (
            <Button type="button" size="default" variant="outline" className="h-9 w-full" onClick={onToggleActive}>
              {isActive ? he.manager.organization.deactivate : he.manager.organization.activate}
            </Button>
          ) : null
        }
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
  const options = db.companies.map((company) => ({ value: company.id, label: company.name }))
  if (allowEmpty) {
    return [{ value: "", label: "—" }, ...options]
  }
  return options
}

function customerOptions(db: MockDb) {
  return db.customers.map((customer) => ({ value: customer.id, label: customer.name }))
}

function EditorForm({
  db,
  editor,
  error,
  onChange,
  onSave,
  footerExtra,
}: {
  db: MockDb
  editor: Editor
  error: boolean
  onChange: (editor: Editor) => void
  onSave: () => void
  footerExtra?: ReactNode
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
              <EditorField icon={Building2} label={he.manager.teamLeaders.company}>
                <OrgSelect
                  value={editor.companyId}
                  placeholder={he.manager.teamLeaders.company}
                  options={companyOptions(db, false)}
                  onValueChange={(companyId) => onChange({ ...editor, companyId })}
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
              <EditorField icon={Building2} label={he.manager.managers.company}>
                <OrgSelect
                  value={editor.companyId}
                  placeholder={he.manager.managers.company}
                  options={companyOptions(db, true)}
                  onValueChange={(companyId) => onChange({ ...editor, companyId })}
                />
              </EditorField>
            </>
          ) : null}
          {error ? <p className="text-xs text-muted-foreground">{he.manager.invalid}</p> : null}
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-border/70 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {footerExtra}
        <Button type="button" size="default" className="h-9 w-full" onClick={onSave}>
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
      companyId: defaultCompanyId,
    }
  }
  return {
    kind: "manager",
    id: null,
    fullName: "",
    identityNumber: "",
    email: "",
    companyId: defaultCompanyId,
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
      companyId: editor.companyId,
    })
  }
  return saveManagerAccount(editor.id, {
    fullName: editor.fullName,
    identityNumber: editor.identityNumber,
    email: editor.email,
    companyId: editor.companyId,
  })
}

function editorKindToTab(kind: Editor["kind"]): TabId {
  if (kind === "company") return "companies"
  if (kind === "customer") return "customers"
  if (kind === "site") return "sites"
  if (kind === "teamLeader") return "teamLeaders"
  return "managers"
}

function lookupIsActive(db: MockDb, tab: TabId, id: string): boolean {
  if (tab === "companies") return db.companies.find((item) => item.id === id)?.isActive ?? false
  if (tab === "customers") return db.customers.find((item) => item.id === id)?.isActive ?? false
  if (tab === "sites") return db.sites.find((item) => item.id === id)?.isActive ?? false
  return db.users.find((user) => user.id === id)?.isActive ?? false
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
