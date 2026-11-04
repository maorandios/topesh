"use client"

import { createElement, useState, useSyncExternalStore, type ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Boxes,
  ChevronDown,
  Layers,
  PenLine,
  Ruler,
  Search,
  Trash,
  type LucideIcon,
} from "lucide-react"
import { panelSurfaceClass, panelSurfaceStyle } from "@/components/shell/panel-surface"
import { sortByHebrewName, sortSelectOptions } from "@/lib/sort"
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
  deleteManagerComponent,
  deleteManagerDomain,
  saveManagerComponent,
  saveManagerDomain,
  useManagerDb,
} from "@/data/browser-store"
import type { DeleteBlockedReason } from "@/data/manager"
import type { MockDb } from "@/data/seed"
import { LeaderLoading, LeaderStoreError } from "@/features/leader/leader-states"
import { he } from "@/i18n/he"
import { cn } from "cn"

type TabId = "domains" | "components"

type Editor =
  | { kind: "domain"; id: string | null; name: string }
  | { kind: "component"; id: string | null; domainId: string; name: string; unit: string }

type TableRow = {
  id: string
  cells: string[]
  onEdit: () => void
  onDelete: () => void
}

type CatalogNavItem = {
  id: string
  kind: Editor["kind"]
  name: string
  meta: string
  details: Array<{ label: string; value: string }>
  onEdit: () => void
  onDelete: () => void
}

const tabs: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: "domains", label: he.manager.catalog.tabs.domains, icon: Layers },
  { id: "components", label: he.manager.catalog.tabs.components, icon: Boxes },
]

/** Stable desktop grid: # | שם | A | B | עריכה | מחיקה */
const TABLE_COLUMN_WIDTHS = ["6%", "36%", "21%", "21%", "8%", "8%"] as const

const UNIT_OPTIONS = [
  { value: "מטר אורך", label: "מטר אורך" },
  { value: "יחידות", label: "יחידות" },
] as const

const DEFAULT_UNIT = UNIT_OPTIONS[0].value

const editorInputClass =
  "h-10 w-full min-w-0 rounded-md border border-border bg-muted px-4 text-right text-sm text-foreground shadow-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-[#222228]"

export function CatalogScreen() {
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
  const [deleteId, setDeleteId] = useState<{ kind: TabId; id: string } | null>(null)
  const [blockReason, setBlockReason] = useState<DeleteBlockedReason | null>(null)

  if (query.status === "loading") return <LeaderLoading />
  if (query.status === "error") return <LeaderStoreError />
  const db = query.db

  const createForm =
    create.kind === "component"
      ? {
          ...create,
          domainId: create.domainId || db.domains[0]?.id || "",
          unit: create.unit || DEFAULT_UNIT,
        }
      : create

  const chooseTab = (next: TabId) => {
    if (next === tab) return
    setTab(next)
    setSearch("")
    setCreate(createBlank(next, db))
    setCreateError(false)
    setEditor(null)
    setEditError(false)
    router.replace(`/manager/catalog?tab=${next}`, { scroll: false })
  }

  const saveCreate = () => {
    const result = persistEditor(createForm)
    if (!result.ok) {
      setCreateError(true)
      return
    }
    setCreateError(false)
    setBlockReason(null)
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
    setBlockReason(null)
    setEditor(null)
  }

  const runDelete = () => {
    if (!deleteId) return
    const result =
      deleteId.kind === "domains"
        ? deleteManagerDomain(deleteId.id)
        : deleteManagerComponent(deleteId.id)
    setDeleteId(null)
    if (!result.ok) {
      const reason = "reason" in result ? result.reason : "not-found"
      setBlockReason(reason)
      toast.info(he.manager.catalog.deleteBlocked[reason])
      return
    }
    setBlockReason(null)
    toast.info(he.manager.catalog.delete)
  }

  return (
    <PageFrame>
      <div className="flex w-full flex-col gap-3 px-4 py-4 sm:px-6">
        <div
          role="tablist"
          aria-label={he.manager.catalog.title}
          className="grid grid-cols-2 gap-3"
        >
          {tabs.map((item) => {
            const selected = tab === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={cn(
                  "pressable flex min-h-[6.75rem] w-full flex-col items-center justify-center gap-2.5 rounded-xl border px-3 py-3 text-center transition-colors",
                  "lg:min-h-0 lg:flex-row lg:justify-start lg:gap-2 lg:rounded-md lg:px-3 lg:py-2.5 lg:text-start",
                  selected
                    ? "border-primary bg-primary/10 text-foreground shadow-[0_0_0_1px_rgb(255_51_0_/0.25)]"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
                onClick={() => chooseTab(item.id)}
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

        {blockReason ? (
          <p className="text-sm text-muted-foreground">{he.manager.catalog.deleteBlocked[blockReason]}</p>
        ) : null}

        <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-start">
          <div className="order-2 flex w-full min-w-0 flex-col gap-2 lg:order-1 lg:min-w-0 lg:flex-1">
            <div className="relative min-w-0">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                placeholder={he.manager.catalog.search}
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
            key={createForm.kind}
            db={db}
            create={createForm}
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
      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <DialogContent className="rounded-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{he.manager.catalog.delete}</DialogTitle>
            <DialogDescription>{he.manager.catalog.deleteConfirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:justify-stretch">
            <Button
              type="button"
              size="default"
              variant="outline"
              className="h-[calc(2.5rem*1.1*1.1)] w-[30%]"
              onClick={() => setDeleteId(null)}
            >
              {he.manager.panel.abortAction}
            </Button>
            <Button type="button" size="default" className="h-[calc(2.5rem*1.1*1.1)] w-[70%]" onClick={runDelete}>
              {he.manager.catalog.deleteAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageFrame>
  )
}

function statusLabel(isActive: boolean) {
  return isActive ? he.manager.catalog.active : he.manager.catalog.inactive
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

  if (tab === "domains") {
    const items = sortByHebrewName(
      db.domains.filter((item) => !query || item.name.includes(query))
    )
    const rows: TableRow[] = items.map((item, index) => {
      const componentsCount = db.components.filter(
        (component) => component.domainId === item.id
      ).length
      return {
        id: item.id,
        cells: [
          String(index + 1),
          item.name,
          String(componentsCount),
          statusLabel(item.isActive),
        ],
        onEdit: () => onEdit({ kind: "domain", id: item.id, name: item.name }),
        onDelete: () => onDelete("domains", item.id),
      }
    })
    const navItems: CatalogNavItem[] = items.map((item) => {
      const componentsCount = db.components.filter(
        (component) => component.domainId === item.id
      ).length
      return {
        id: item.id,
        kind: "domain",
        name: item.name,
        meta: String(componentsCount),
        details: [
          { label: he.manager.catalog.name, value: item.name },
          { label: he.manager.catalog.componentsCount, value: String(componentsCount) },
          { label: he.manager.catalog.status, value: statusLabel(item.isActive) },
        ],
        onEdit: () => onEdit({ kind: "domain", id: item.id, name: item.name }),
        onDelete: () => onDelete("domains", item.id),
      }
    })

    return (
      <>
        <DataTable
          empty={rows.length === 0}
          mobile={false}
          headers={[
            he.manager.catalog.index,
            he.manager.catalog.name,
            he.manager.catalog.componentsCount,
            he.manager.catalog.status,
            he.manager.edit,
            he.manager.catalog.delete,
          ]}
          rows={rows}
        />
        <CatalogNavList empty={navItems.length === 0} items={navItems} />
      </>
    )
  }

  const items = sortByHebrewName(
    db.components.filter((item) => {
      if (!query) return true
      const domain = db.domains.find((entry) => entry.id === item.domainId)?.name ?? ""
      return item.name.includes(query) || item.unit.includes(query) || domain.includes(query)
    })
  )
  const rows: TableRow[] = items.map((item, index) => ({
    id: item.id,
    cells: [
      String(index + 1),
      item.name,
      db.domains.find((domain) => domain.id === item.domainId)?.name ?? "—",
      item.unit || "—",
    ],
    onEdit: () =>
      onEdit({
        kind: "component",
        id: item.id,
        domainId: item.domainId,
        name: item.name,
        unit: item.unit,
      }),
    onDelete: () => onDelete("components", item.id),
  }))
  const navItems: CatalogNavItem[] = items.map((item) => {
    const domainName = db.domains.find((domain) => domain.id === item.domainId)?.name ?? "—"
    const unit = item.unit || "—"
    return {
      id: item.id,
      kind: "component",
      name: item.name,
      meta: unit,
      details: [
        { label: he.manager.catalog.name, value: item.name },
        { label: he.manager.catalog.domain, value: domainName },
        { label: he.manager.catalog.unit, value: unit },
      ],
      onEdit: () =>
        onEdit({
          kind: "component",
          id: item.id,
          domainId: item.domainId,
          name: item.name,
          unit: item.unit,
        }),
      onDelete: () => onDelete("components", item.id),
    }
  })

  return (
    <>
      <DataTable
        empty={rows.length === 0}
        mobile={false}
        headers={[
          he.manager.catalog.index,
          he.manager.catalog.name,
          he.manager.catalog.domain,
          he.manager.catalog.unit,
          he.manager.edit,
          he.manager.catalog.delete,
        ]}
        rows={rows}
      />
      <CatalogNavList empty={navItems.length === 0} items={navItems} />
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
                    <RowIconButton label={he.manager.catalog.delete} onClick={row.onDelete}>
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
              <li
                key={row.id}
                className="border-b border-border px-3 py-[calc(0.75rem*1.15*1.15)] last:border-b-0"
              >
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
                    <RowIconButton label={he.manager.catalog.delete} onClick={row.onDelete}>
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

function CatalogNavList({ empty, items }: { empty: boolean; items: CatalogNavItem[] }) {
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
                  {he.manager.catalog.delete}
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
  return kind === "component" ? Boxes : Layers
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
          <EditorHeader title={he.manager.catalog.addTitles[create.kind]} kind={create.kind} />
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
            <EditorHeader title={he.manager.catalog.addTitles[create.kind]} kind={create.kind} />
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
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
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
              "transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
              expanded ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
            )}
          >
            <EditorForm db={db} editor={create} error={error} onChange={onChange} onSave={onSave} />
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
  const title =
    editor?.kind === "component" ? he.manager.catalog.tabs.components : he.manager.catalog.tabs.domains
  const body = editor ? (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-4 py-3">
        <EditorHeader title={title} kind={editor.kind} />
      </div>
      <EditorForm db={db} editor={editor} error={error} onChange={onChange} onSave={onSave} />
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
  children,
}: {
  icon: LucideIcon
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {label}
      </span>
      {children}
    </div>
  )
}

function CatalogSelect({
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
      <DropdownMenuContent align="start" sideOffset={6} className="max-h-52 min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-md p-1.5">
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} className="rounded-md px-3 py-2">
              <span className="truncate">{option.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function unitOptionsFor(current: string): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = UNIT_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  }))
  if (current && !options.some((option) => option.value === current)) {
    options.push({ value: current, label: current })
  }
  return options
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
      <div className="min-h-0 overflow-y-auto px-4 py-3">
        <div className="flex flex-col gap-4 text-sm">
          <EditorField icon={editor.kind === "component" ? Boxes : Layers} label={he.manager.catalog.name}>
            <Input
              value={editor.name}
              className={editorInputClass}
              onChange={(event) => onChange({ ...editor, name: event.target.value })}
            />
          </EditorField>
          {editor.kind === "component" ? (
            <>
              <EditorField icon={Layers} label={he.manager.catalog.domain}>
                <CatalogSelect
                  value={editor.domainId}
                  placeholder={he.manager.catalog.domain}
                  options={sortSelectOptions(db.domains.map((domain) => ({ value: domain.id, label: domain.name })))}
                  onValueChange={(domainId) => onChange({ ...editor, domainId })}
                />
              </EditorField>
              <EditorField icon={Ruler} label={he.manager.catalog.unit}>
                <CatalogSelect
                  value={editor.unit}
                  placeholder={he.manager.catalog.unit}
                  options={unitOptionsFor(editor.unit)}
                  onValueChange={(unit) => onChange({ ...editor, unit })}
                />
              </EditorField>
            </>
          ) : null}
          {error ? <p className="text-xs text-muted-foreground">{he.manager.invalid}</p> : null}
        </div>
      </div>
      <div className="border-t border-border/70 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="button" size="default" className="h-[calc(2.25rem*1.1*1.1)] w-full" onClick={onSave}>
          {he.manager.save}
        </Button>
      </div>
    </>
  )
}

function createBlank(tab: TabId, db: MockDb | null): Editor {
  if (tab === "domains") return { kind: "domain", id: null, name: "" }
  return {
    kind: "component",
    id: null,
    domainId: db?.domains[0]?.id ?? "",
    name: "",
    unit: DEFAULT_UNIT,
  }
}

function persistEditor(editor: Editor) {
  if (editor.kind === "domain") return saveManagerDomain(editor.id, editor.name)
  return saveManagerComponent(editor.id, {
    domainId: editor.domainId,
    name: editor.name,
    unit: editor.unit,
  })
}

function parseTab(value: string | null): TabId {
  return value === "components" ? "components" : "domains"
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
