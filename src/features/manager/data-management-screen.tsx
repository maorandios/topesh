"use client"

import { createElement, useState, useSyncExternalStore, type ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Building2,
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
import type { DeleteBlockedReason } from "@/data/manager"
import type { MockDb } from "@/data/seed"
import { LeaderLoading, LeaderStoreError } from "@/features/leader/leader-states"
import { he } from "@/i18n/he"
import { formatWorkDateNumeric } from "@/lib/format"
import { cn } from "cn"

type TabId = "companies" | "customers" | "sites" | "teamLeaders" | "managers"

type Editor =
  | { kind: "company"; id: string | null; name: string }
  | { kind: "customer"; id: string | null; name: string }
  | { kind: "site"; id: string | null; name: string }
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
      email: string
    }

type TableRow = {
  id: string
  cells: string[]
  onEdit: () => void
  onDelete: () => void
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
  const [create, setCreate] = useState<Editor>(() => createBlank(initialTab))
  const [createError, setCreateError] = useState(false)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [editError, setEditError] = useState(false)
  const [deleteId, setDeleteId] = useState<{ kind: TabId; id: string } | null>(null)
  const [blockReason, setBlockReason] = useState<DeleteBlockedReason | null>(null)

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

  const chooseTab = (next: TabId) => {
    setTab(next)
    setSearch("")
    setCreate(createBlank(next))
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
    setBlockReason(null)
    setCreate(createBlank(tab))
  }

  const saveEdit = () => {
    if (!editor) return
    const result = persistEditor(editor)
    if (!result.ok) {
      setEditError(true)
      return
    }
    setEditError(false)
    setBlockReason(null)
    setEditor(null)
  }

  const runDelete = () => {
    if (!deleteId) return
    const result = persistDelete(deleteId.kind, deleteId.id)
    setDeleteId(null)
    if (!result.ok) {
      const reason = "reason" in result ? result.reason : "not-found"
      setBlockReason(reason)
      toast(he.manager.organization.deleteBlocked[reason])
      return
    }
    setBlockReason(null)
    toast(he.manager.organization.delete)
  }

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

        {blockReason ? (
          <p className="text-sm text-muted-foreground">{he.manager.organization.deleteBlocked[blockReason]}</p>
        ) : null}

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
                setBlockReason(null)
                setEditor(next)
              }}
              onDelete={(kind, id) => {
                setBlockReason(null)
                setDeleteId({ kind, id })
              }}
            />
          </div>

          <CreateCard
            create={create}
            error={createError}
            onChange={setCreate}
            onSave={saveCreate}
          />
        </div>
      </div>
      <EditorPanel
        editor={editor}
        error={editError}
        onOpenChange={(open) => {
          if (!open) setEditor(null)
        }}
        onChange={setEditor}
        onSave={saveEdit}
      />
      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <DialogContent className="rounded-md sm:max-w-md">
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
              onClick={() => setDeleteId(null)}
            >
              {he.manager.panel.abortAction}
            </Button>
            <Button type="button" size="default" className="h-10 w-[70%]" onClick={runDelete}>
              {he.manager.organization.deleteAction}
            </Button>
          </DialogFooter>
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
}: {
  db: MockDb
  tab: TabId
  search: string
  onEdit: (editor: Editor) => void
  onDelete: (kind: TabId, id: string) => void
}) {
  const query = search.trim()

  if (tab === "companies" || tab === "customers" || tab === "sites") {
    const items =
      tab === "companies"
        ? db.companies.filter((item) => !query || item.name.includes(query))
        : tab === "customers"
          ? db.customers.filter((item) => !query || item.name.includes(query))
          : db.sites.filter((item) => !query || item.name.includes(query))

    const rows: TableRow[] = items.map((item, index) => ({
      id: item.id,
      cells: [
        String(index + 1),
        item.name,
        formatWorkDateNumeric(item.createdAt.slice(0, 10)),
        String(countDiaries(db, tab, item.id)),
      ],
      onEdit: () => {
        if (tab === "companies") onEdit({ kind: "company", id: item.id, name: item.name })
        else if (tab === "customers") onEdit({ kind: "customer", id: item.id, name: item.name })
        else onEdit({ kind: "site", id: item.id, name: item.name })
      },
      onDelete: () => onDelete(tab, item.id),
    }))

    return (
      <DataTable
        empty={rows.length === 0}
        headers={[
          he.manager.organization.index,
          he.manager.organization.name,
          he.manager.organization.foundedAt,
          he.manager.organization.diariesCount,
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
        item.phone ?? "—",
        item.identityNumber || "—",
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

    return (
      <DataTable
        empty={rows.length === 0}
        headers={[
          he.manager.organization.index,
          he.manager.organization.name,
          he.manager.teamLeaders.phone,
          he.manager.teamLeaders.identity,
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
    onEdit: () =>
      onEdit({
        kind: "manager",
        id: item.id,
        fullName: item.fullName,
        email: item.email ?? "",
      }),
    onDelete: () => onDelete("managers", item.id),
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
                    <RowIconButton label={he.manager.edit} onClick={row.onEdit}>
                      <PenLine className="size-3.5" aria-hidden />
                    </RowIconButton>
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
  create,
  error,
  onChange,
  onSave,
}: {
  create: Editor
  error: boolean
  onChange: (editor: Editor) => void
  onSave: () => void
}) {
  return (
    <section className="order-1 flex w-full min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card lg:order-2 lg:min-h-[12rem] lg:flex-1">
      <div className="shrink-0 border-b border-border/70 px-4 py-3">
        <EditorHeader title={he.manager.organization.addTitles[create.kind]} kind={create.kind} />
      </div>
      <EditorForm editor={create} error={error} onChange={onChange} onSave={onSave} />
    </section>
  )
}

function EditorPanel({
  editor,
  error,
  onOpenChange,
  onChange,
  onSave,
}: {
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
      <EditorForm editor={editor} error={error} onChange={onChange} onSave={onSave} />
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

function EditorForm({
  editor,
  error,
  onChange,
  onSave,
}: {
  editor: Editor
  error: boolean
  onChange: (editor: Editor) => void
  onSave: () => void
}) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="flex flex-col gap-4 text-sm">
          {editor.kind === "company" || editor.kind === "customer" || editor.kind === "site" ? (
            <EditorField
              icon={editor.kind === "company" ? Building2 : editor.kind === "customer" ? Users : MapPin}
              label={he.manager.organization.name}
            >
              <Input
                value={editor.name}
                className={editorInputClass}
                onChange={(event) => onChange({ ...editor, name: event.target.value })}
              />
            </EditorField>
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
      <div className="border-t border-border/70 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="button" size="default" className="h-9 w-full" onClick={onSave}>
          {he.manager.save}
        </Button>
      </div>
    </>
  )
}

function createBlank(tab: TabId): Editor {
  if (tab === "companies") return { kind: "company", id: null, name: "" }
  if (tab === "customers") return { kind: "customer", id: null, name: "" }
  if (tab === "sites") return { kind: "site", id: null, name: "" }
  if (tab === "teamLeaders") {
    return { kind: "teamLeader", id: null, fullName: "", identityNumber: "", phone: "" }
  }
  return { kind: "manager", id: null, fullName: "", email: "" }
}

function persistEditor(editor: Editor) {
  if (editor.kind === "company") return saveManagerCompany(editor.id, editor.name)
  if (editor.kind === "customer") return saveManagerCustomer(editor.id, editor.name)
  if (editor.kind === "site") return saveManagerSite(editor.id, editor.name)
  if (editor.kind === "teamLeader") {
    return saveManagerTeamLeader(editor.id, {
      fullName: editor.fullName,
      identityNumber: editor.identityNumber,
      phone: editor.phone,
    })
  }
  return saveManagerAccount(editor.id, {
    fullName: editor.fullName,
    email: editor.email,
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
