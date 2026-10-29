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
import { Field } from "@/features/manager/fields"
import { he } from "@/i18n/he"
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{he.manager.organization.title}</h1>
          <Button type="button" size="touch" onClick={openCreate}>
            {he.manager.organization.add}
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
          placeholder={he.manager.organization.search}
          className="h-11 max-w-md text-base md:text-base"
          onChange={(event) => setSearch(event.target.value)}
        />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{he.manager.organization.delete}</DialogTitle>
            <DialogDescription>{he.manager.organization.deleteConfirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" size="touch" onClick={runDelete}>
              {he.manager.organization.deleteAction}
            </Button>
            <Button type="button" size="touch" variant="outline" onClick={() => setDeleteId(null)}>
              {he.manager.organization.keep}
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
  if (tab === "companies") {
    const rows = db.companies.filter((item) => !query || item.name.includes(query))
    return (
      <Table
        empty={rows.length === 0}
        headers={[he.manager.organization.name, ""]}
        rows={rows.map((item) => ({
          id: item.id,
          cells: [item.name],
          onEdit: () => onEdit({ kind: "company", id: item.id, name: item.name }),
          onDelete: () => onDelete("companies", item.id),
        }))}
      />
    )
  }
  if (tab === "customers") {
    const rows = db.customers.filter((item) => !query || item.name.includes(query))
    return (
      <Table
        empty={rows.length === 0}
        headers={[he.manager.organization.name, ""]}
        rows={rows.map((item) => ({
          id: item.id,
          cells: [item.name],
          onEdit: () => onEdit({ kind: "customer", id: item.id, name: item.name }),
          onDelete: () => onDelete("customers", item.id),
        }))}
      />
    )
  }
  if (tab === "sites") {
    const rows = db.sites.filter((item) => !query || item.name.includes(query))
    return (
      <Table
        empty={rows.length === 0}
        headers={[he.manager.organization.name, ""]}
        rows={rows.map((item) => ({
          id: item.id,
          cells: [item.name],
          onEdit: () => onEdit({ kind: "site", id: item.id, name: item.name }),
          onDelete: () => onDelete("sites", item.id),
        }))}
      />
    )
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
      <Table
        empty={rows.length === 0}
        headers={[
          he.manager.teamLeaders.name,
          he.manager.teamLeaders.identity,
          he.manager.teamLeaders.phone,
          "",
        ]}
        rows={rows.map((item) => ({
          id: item.id,
          cells: [item.fullName, item.identityNumber, item.phone ?? ""],
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
    <Table
      empty={rows.length === 0}
      headers={[he.manager.managers.name, he.manager.managers.email, ""]}
      rows={rows.map((item) => ({
        id: item.id,
        cells: [item.fullName, item.email ?? ""],
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
                      {he.manager.organization.delete}
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
                {he.manager.organization.delete}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </>
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
    <EditorForm editor={editor} error={error} onChange={onChange} onSave={onSave} />
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
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex flex-col gap-3 text-sm">
          {editor.kind === "company" || editor.kind === "customer" || editor.kind === "site" ? (
            <Field label={he.manager.organization.name}>
              <Input
                value={editor.name}
                className="h-11 text-base md:text-base"
                onChange={(event) => onChange({ ...editor, name: event.target.value })}
              />
            </Field>
          ) : null}
          {editor.kind === "teamLeader" ? (
            <>
              <Field label={he.manager.teamLeaders.name}>
                <Input
                  value={editor.fullName}
                  className="h-11 text-base md:text-base"
                  onChange={(event) => onChange({ ...editor, fullName: event.target.value })}
                />
              </Field>
              <Field label={he.manager.teamLeaders.identity}>
                <Input
                  dir="ltr"
                  value={editor.identityNumber}
                  className="h-11 text-base md:text-base"
                  onChange={(event) => onChange({ ...editor, identityNumber: event.target.value })}
                />
                <span className="text-muted-foreground">{he.manager.teamLeaders.identityInvalid}</span>
              </Field>
              <Field label={he.manager.teamLeaders.phone}>
                <Input
                  dir="ltr"
                  value={editor.phone}
                  className="h-11 text-base md:text-base"
                  onChange={(event) => onChange({ ...editor, phone: event.target.value })}
                />
              </Field>
            </>
          ) : null}
          {editor.kind === "manager" ? (
            <>
              <Field label={he.manager.managers.name}>
                <Input
                  value={editor.fullName}
                  className="h-11 text-base md:text-base"
                  onChange={(event) => onChange({ ...editor, fullName: event.target.value })}
                />
              </Field>
              <Field label={he.manager.managers.email}>
                <Input
                  dir="ltr"
                  value={editor.email}
                  className="h-11 text-base md:text-base"
                  onChange={(event) => onChange({ ...editor, email: event.target.value })}
                />
                <span className="text-muted-foreground">{he.manager.managers.emailInvalid}</span>
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
