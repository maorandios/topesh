"use client"

import { useState, useSyncExternalStore, type ReactNode } from "react"
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

const filterControlClass =
  "h-10 w-full min-w-0 rounded-md border border-border bg-white px-4 text-sm text-foreground shadow-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-card"

export function DataManagementScreen() {
  const query = useManagerDb()
  const params = useSearchParams()
  const router = useRouter()
  const initialTab = parseTab(params.get("tab"))
  const [tab, setTab] = useState<TabId>(initialTab)
  const [search, setSearch] = useState("")
  const [editor, setEditor] = useState<Editor | null>(null)
  const [error, setError] = useState(false)
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
    setEditor(null)
    router.replace(`/manager/organization?tab=${next}`, { scroll: false })
  }

  const openCreate = () => {
    setError(false)
    setEditor(createBlank(tab))
  }

  const save = () => {
    if (!editor) return
    const result = persistEditor(editor)
    if (!result.ok) {
      setError(true)
      return
    }
    setError(false)
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
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-6">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "pressable flex flex-col gap-3 rounded-md border px-4 py-3.5 text-start transition-colors",
                tab === item.id
                  ? "border-foreground bg-card"
                  : "border-border bg-card hover:bg-muted/40"
              )}
              onClick={() => chooseTab(item.id)}
            >
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="text-start text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {counts[item.id]}
              </p>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    tab === item.id ? "bg-emerald-500" : "bg-muted-foreground/40"
                  )}
                  aria-hidden
                />
                <span>{item.label}</span>
              </p>
            </button>
          ))}
          <button
            type="button"
            className="pressable flex flex-col gap-3 rounded-md border border-foreground bg-foreground px-4 py-3.5 text-start text-background"
            onClick={openCreate}
          >
            <span className="text-sm text-background/70">{he.manager.organization.addCard.label}</span>
            <span className="text-3xl font-semibold tracking-tight">{he.manager.organization.addCard.title}</span>
            <span className="flex items-center gap-2 text-xs text-background/70">
              <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
              <span>{he.manager.organization.addCard.hint}</span>
            </span>
          </button>
        </div>

        <div className="flex w-full max-w-4xl flex-col gap-3">
          <section className="rounded-md border border-border bg-muted/40 px-4 py-3">
            <FilterField label={he.manager.organization.search} icon={Search}>
              <Input
                value={search}
                placeholder={he.manager.organization.search}
                className={filterControlClass}
                onChange={(event) => setSearch(event.target.value)}
              />
            </FilterField>
          </section>

          {blockReason ? (
            <p className="text-sm text-muted-foreground">{he.manager.organization.deleteBlocked[blockReason]}</p>
          ) : null}

          <EntityList
            db={db}
            tab={tab}
            search={search}
            onEdit={(next) => {
              setError(false)
              setBlockReason(null)
              setEditor(next)
            }}
            onDelete={(kind, id) => {
              setBlockReason(null)
              setDeleteId({ kind, id })
            }}
          />
        </div>
      </div>
      <EditorPanel
        editor={editor}
        error={error}
        onOpenChange={(open) => {
          if (!open) setEditor(null)
        }}
        onChange={setEditor}
        onSave={save}
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

function FilterField({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="inline-flex items-center gap-1 text-start text-[11px] font-semibold text-foreground">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        {label}
      </span>
      <div className="w-full">{children}</div>
    </div>
  )
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
  if (tab === "companies" || tab === "customers" || tab === "sites") {
    const orgRows =
      tab === "companies"
        ? db.companies
            .filter((item) => !query || item.name.includes(query))
            .map((item, index) => ({
              id: item.id,
              index: index + 1,
              name: item.name,
              foundedAt: item.createdAt,
              diaries: countDiaries(db, "companies", item.id),
              onEdit: () => onEdit({ kind: "company", id: item.id, name: item.name }),
              onDelete: () => onDelete("companies", item.id),
            }))
        : tab === "customers"
          ? db.customers
              .filter((item) => !query || item.name.includes(query))
              .map((item, index) => ({
                id: item.id,
                index: index + 1,
                name: item.name,
                foundedAt: item.createdAt,
                diaries: countDiaries(db, "customers", item.id),
                onEdit: () => onEdit({ kind: "customer", id: item.id, name: item.name }),
                onDelete: () => onDelete("customers", item.id),
              }))
          : db.sites
              .filter((item) => !query || item.name.includes(query))
              .map((item, index) => ({
                id: item.id,
                index: index + 1,
                name: item.name,
                foundedAt: item.createdAt,
                diaries: countDiaries(db, "sites", item.id),
                onEdit: () => onEdit({ kind: "site", id: item.id, name: item.name }),
                onDelete: () => onDelete("sites", item.id),
              }))
    return <OrgEntityTable rows={orgRows} />
  }
  if (tab === "teamLeaders") {
    const rows = db.users.filter((user) => {
      if (user.role !== "teamLeader") return false
      if (!query) return true
      return (
        user.fullName.includes(query) ||
        user.identityNumber.includes(query) ||
        (user.phone ?? "").includes(query)
      )
    })
    return (
      <EntityTable
        empty={rows.length === 0}
        headers={[
          he.manager.organization.index,
          he.manager.teamLeaders.name,
          he.manager.teamLeaders.identity,
          he.manager.teamLeaders.phone,
          he.manager.edit,
          he.manager.organization.delete,
        ]}
        rows={rows.map((item, index) => ({
          id: item.id,
          cells: [String(index + 1), item.fullName, item.identityNumber, item.phone ?? ""],
          onEdit: () =>
            onEdit({
              kind: "teamLeader",
              id: item.id,
              fullName: item.fullName,
              identityNumber: item.identityNumber,
              phone: item.phone ?? "",
            }),
          onDelete: () => onDelete("teamLeaders", item.id),
        }))}
      />
    )
  }
  const rows = db.users.filter((user) => {
    if (user.role !== "manager") return false
    if (!query) return true
    return user.fullName.includes(query) || (user.email ?? "").includes(query)
  })
  return (
    <EntityTable
      empty={rows.length === 0}
      headers={[
        he.manager.organization.index,
        he.manager.managers.name,
        he.manager.managers.email,
        he.manager.edit,
        he.manager.organization.delete,
      ]}
      rows={rows.map((item, index) => ({
        id: item.id,
        cells: [String(index + 1), item.fullName, item.email ?? ""],
        onEdit: () =>
          onEdit({
            kind: "manager",
            id: item.id,
            fullName: item.fullName,
            email: item.email ?? "",
          }),
        onDelete: () => onDelete("managers", item.id),
      }))}
    />
  )
}

function OrgEntityTable({
  rows,
}: {
  rows: Array<{
    id: string
    index: number
    name: string
    foundedAt: string
    diaries: number
    onEdit: () => void
    onDelete: () => void
  }>
}) {
  const headers = [
    he.manager.organization.index,
    he.manager.organization.name,
    he.manager.organization.foundedAt,
    he.manager.organization.diariesCount,
    he.manager.edit,
    he.manager.organization.delete,
  ]
  const empty = rows.length === 0
  return (
    <>
      <div className="hidden rounded-md border border-border bg-card lg:block">
        <table className="w-full border-collapse text-[11px] leading-4">
          <colgroup>
            <col className="w-12" />
            <col />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-16" />
            <col className="w-16" />
          </colgroup>
          <thead className="sticky top-0 z-20 bg-muted">
            <tr className="border-b border-border bg-muted text-foreground">
              {headers.map((header, index) => (
                <th
                  key={header}
                  className={cn(
                    "bg-muted px-3 py-2.5 font-medium whitespace-nowrap",
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
                <td colSpan={headers.length} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {he.manager.empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-border/80 last:border-b-0 hover:bg-muted/40">
                  <td className="px-3 py-2.5 text-center tabular-nums text-muted-foreground">{row.index}</td>
                  <td className="truncate px-3 py-2.5 text-start font-medium">{row.name}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums whitespace-nowrap">
                    {formatWorkDateNumeric(row.foundedAt.slice(0, 10))}
                  </td>
                  <td className="px-3 py-2.5 text-center tabular-nums">{row.diaries}</td>
                  <td className="px-2 py-2 text-center">
                    <RowIconButton label={he.manager.edit} onClick={row.onEdit}>
                      <PenLine className="size-3.5" aria-hidden />
                    </RowIconButton>
                  </td>
                  <td className="px-2 py-2 text-center">
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
      <ul className="overflow-hidden rounded-md border border-border bg-card lg:hidden">
        {empty ? (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">{he.manager.empty}</li>
        ) : (
          rows.map((row) => (
            <li key={row.id} className="border-b border-border px-3 py-3 text-sm last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    <span className="me-2 text-muted-foreground tabular-nums">{row.index}.</span>
                    {row.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatWorkDateNumeric(row.foundedAt.slice(0, 10))} · {row.diaries}{" "}
                    {he.manager.organization.diariesCount}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
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
      className="text-muted-foreground hover:text-foreground"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function EntityTable({
  empty,
  headers,
  rows,
}: {
  empty: boolean
  headers: string[]
  rows: Array<{
    id: string
    cells: string[]
    onEdit: () => void
    onDelete: () => void
  }>
}) {
  return (
    <>
      <div className="hidden rounded-md border border-border bg-card lg:block">
        <table className="w-full border-collapse text-[11px] leading-4">
          <thead className="sticky top-0 z-20 bg-muted">
            <tr className="border-b border-border bg-muted text-foreground">
              {headers.map((header, index) => (
                <th
                  key={`${header}-${index}`}
                  className={cn(
                    "bg-muted px-3 py-2.5 font-medium whitespace-nowrap",
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
                <td colSpan={headers.length} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {he.manager.empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-border/80 last:border-b-0 hover:bg-muted/40">
                  {row.cells.map((cell, index) => (
                    <td
                      key={`${row.id}-${index}`}
                      className={cn(
                        "truncate px-3 py-2.5",
                        index === 1 ? "text-start font-medium" : "text-center tabular-nums"
                      )}
                    >
                      {cell || "—"}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center">
                    <RowIconButton label={he.manager.edit} onClick={row.onEdit}>
                      <PenLine className="size-3.5" aria-hidden />
                    </RowIconButton>
                  </td>
                  <td className="px-2 py-2 text-center">
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

      <ul className="overflow-hidden rounded-md border border-border bg-card lg:hidden">
        {empty ? (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">{he.manager.empty}</li>
        ) : (
          rows.map((row) => (
            <li key={row.id} className="border-b border-border px-3 py-3 text-sm last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{row.cells[1] ?? row.cells[0]}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.cells
                      .filter((_, index) => index !== 1)
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
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
  const Icon = editorIcon(kind)
  return (
    <div className="grid grid-cols-[1rem_minmax(0,1fr)] items-center gap-x-2">
      <Icon className="size-4 justify-self-center text-muted-foreground" aria-hidden />
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

const editorInputClass = cn(filterControlClass, "text-right")

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
