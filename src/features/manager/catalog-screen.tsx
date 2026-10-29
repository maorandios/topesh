"use client"

import { useState, useSyncExternalStore } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  deleteManagerComponent,
  deleteManagerDomain,
  saveManagerComponent,
  saveManagerDomain,
  useManagerDb,
} from "@/data/browser-store"
import type { DeleteBlockedReason } from "@/data/manager"
import type { MockDb } from "@/data/seed"
import { LeaderLoading, LeaderStoreError } from "@/features/leader/leader-states"
import { Field, fieldClass } from "@/features/manager/fields"
import { he } from "@/i18n/he"
import { cn } from "cn"

type TabId = "domains" | "components"

type Editor =
  | { kind: "domain"; id: string | null; name: string }
  | { kind: "component"; id: string | null; domainId: string; name: string; unit: string }

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "domains", label: he.manager.catalog.tabs.domains },
  { id: "components", label: he.manager.catalog.tabs.components },
]

export function CatalogScreen() {
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

  const chooseTab = (next: TabId) => {
    setTab(next)
    setSearch("")
    setEditor(null)
    router.replace(`/manager/catalog?tab=${next}`, { scroll: false })
  }

  const openCreate = () => {
    setError(false)
    setEditor(createBlank(tab, db))
  }

  const save = () => {
    if (!editor) return
    const result =
      editor.kind === "domain"
        ? saveManagerDomain(editor.id, editor.name)
        : saveManagerComponent(editor.id, {
            domainId: editor.domainId,
            name: editor.name,
            unit: editor.unit,
          })
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
    const result =
      deleteId.kind === "domains"
        ? deleteManagerDomain(deleteId.id)
        : deleteManagerComponent(deleteId.id)
    setDeleteId(null)
    if (!result.ok) {
      const reason = "reason" in result ? result.reason : "not-found"
      setBlockReason(reason)
      toast(he.manager.catalog.deleteBlocked[reason])
      return
    }
    setBlockReason(null)
    toast(he.manager.catalog.delete)
  }

  return (
    <PageFrame>
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{he.manager.catalog.title}</h1>
          <Button type="button" size="touch" onClick={openCreate}>
            {he.manager.catalog.add}
          </Button>
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "pressable min-h-11 shrink-0 rounded-xl border px-3 text-sm",
                tab === item.id
                  ? "border-foreground bg-muted font-medium"
                  : "border-border bg-card text-muted-foreground"
              )}
              onClick={() => chooseTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Input
          value={search}
          placeholder={he.manager.catalog.search}
          className="h-11 max-w-md text-base md:text-base"
          onChange={(event) => setSearch(event.target.value)}
        />
        {blockReason ? (
          <p className="text-sm text-muted-foreground">{he.manager.catalog.deleteBlocked[blockReason]}</p>
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
      <EditorPanel
        db={db}
        editor={editor}
        error={error}
        onOpenChange={(open) => {
          if (!open) setEditor(null)
        }}
        onChange={setEditor}
        onSave={save}
      />
      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{he.manager.catalog.delete}</DialogTitle>
            <DialogDescription>{he.manager.catalog.deleteConfirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" size="touch" onClick={runDelete}>
              {he.manager.catalog.deleteAction}
            </Button>
            <Button type="button" size="touch" variant="outline" onClick={() => setDeleteId(null)}>
              {he.manager.catalog.keep}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageFrame>
  )
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
    const rows = db.domains.filter((item) => !query || item.name.includes(query))
    return (
      <Table
        empty={rows.length === 0}
        headers={[he.manager.catalog.name, ""]}
        rows={rows.map((item) => ({
          id: item.id,
          cells: [item.name],
          onEdit: () => onEdit({ kind: "domain", id: item.id, name: item.name }),
          onDelete: () => onDelete("domains", item.id),
        }))}
      />
    )
  }
  const rows = db.components.filter((item) => {
    if (!query) return true
    const domain = db.domains.find((domain) => domain.id === item.domainId)?.name ?? ""
    return item.name.includes(query) || item.unit.includes(query) || domain.includes(query)
  })
  return (
    <Table
      empty={rows.length === 0}
      headers={[he.manager.catalog.name, he.manager.catalog.domain, he.manager.catalog.unit, ""]}
      rows={rows.map((item) => ({
        id: item.id,
        cells: [
          item.name,
          db.domains.find((domain) => domain.id === item.domainId)?.name ?? "",
          item.unit,
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
      }))}
    />
  )
}

function Table({
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
  if (empty) return <p className="text-sm text-muted-foreground">{he.manager.empty}</p>
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              {headers.map((header, index) => (
                <th key={`${header}-${index}`} className="px-3 py-2 text-start font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-b-0">
                {row.cells.map((cell, index) => (
                  <td key={`${row.id}-${index}`} className="px-3 py-2">
                    {cell}
                  </td>
                ))}
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="touch" variant="outline" onClick={row.onEdit}>
                      {he.manager.edit}
                    </Button>
                    <Button type="button" size="touch" variant="outline" onClick={row.onDelete}>
                      {he.manager.catalog.delete}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-2 lg:hidden">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-border bg-card p-3 text-sm">
            <p className="font-medium">{row.cells[0]}</p>
            {row.cells.slice(1).map((cell, index) => (
              <p key={`${row.id}-m-${index}`} className="text-muted-foreground">
                {cell}
              </p>
            ))}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" size="touch" variant="outline" onClick={row.onEdit}>
                {he.manager.edit}
              </Button>
              <Button type="button" size="touch" variant="outline" onClick={row.onDelete}>
                {he.manager.catalog.delete}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </>
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
    <EditorForm db={db} editor={editor} error={error} onChange={onChange} onSave={onSave} />
  ) : null
  if (desktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-full data-[side=left]:max-w-lg">
          <SheetHeader className="pe-12">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
    )
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle swipeDirection="down">
      <DrawerContent className="overflow-hidden">
        <DrawerHeader className="text-start">
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        {body}
      </DrawerContent>
    </Drawer>
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
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex flex-col gap-3 text-sm">
          <Field label={he.manager.catalog.name}>
            <Input
              value={editor.name}
              className="h-11 text-base md:text-base"
              onChange={(event) => onChange({ ...editor, name: event.target.value })}
            />
          </Field>
          {editor.kind === "component" ? (
            <>
              <Field label={he.manager.catalog.domain}>
                <select
                  className={fieldClass}
                  value={editor.domainId}
                  onChange={(event) => onChange({ ...editor, domainId: event.target.value })}
                >
                  {db.domains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={he.manager.catalog.unit}>
                <Input
                  value={editor.unit}
                  className="h-11 text-base md:text-base"
                  onChange={(event) => onChange({ ...editor, unit: event.target.value })}
                />
              </Field>
            </>
          ) : null}
          {error ? <p className="text-muted-foreground">{he.manager.invalid}</p> : null}
        </div>
      </div>
      <div className="border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="button" size="touch" onClick={onSave}>
          {he.manager.save}
        </Button>
      </div>
    </>
  )
}

function createBlank(tab: TabId, db: MockDb): Editor {
  if (tab === "domains") return { kind: "domain", id: null, name: "" }
  return {
    kind: "component",
    id: null,
    domainId: db.domains[0]?.id ?? "",
    name: "",
    unit: "",
  }
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
