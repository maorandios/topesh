"use client"

import { useState } from "react"
import { PageFrame } from "@/components/motion/page-frame"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { saveManagerComponent, saveManagerDomain, useManagerDb } from "@/data/browser-store"
import { LeaderLoading, LeaderStoreError } from "@/features/leader/leader-states"
import { Field, fieldClass } from "@/features/manager/fields"
import { he } from "@/i18n/he"
import { cn } from "cn"

type Editor =
  | { kind: "domain"; id: string | null; name: string; isActive: boolean }
  | { kind: "component"; id: string | null; domainId: string; name: string; unit: string; isActive: boolean }

export function CatalogScreen() {
  const query = useManagerDb()
  const [editor, setEditor] = useState<Editor | null>(null)
  const [error, setError] = useState(false)
  if (query.status === "loading") return <LeaderLoading />
  if (query.status === "error") return <LeaderStoreError />
  const db = query.db

  const save = () => {
    if (!editor) return
    const result = editor.kind === "domain"
      ? saveManagerDomain(editor.id, editor.name, editor.isActive)
      : saveManagerComponent(editor.id, editor)
    if (!result.ok) {
      setError(true)
      return
    }
    setError(false)
    setEditor(null)
  }

  return (
    <PageFrame>
      <div className="flex flex-col gap-5 px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{he.manager.catalog.title}</h1>
          <Button type="button" size="touch" onClick={() => { setError(false); setEditor({ kind: "domain", id: null, name: "", isActive: true }) }}>
            {he.manager.add}
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          {db.domains.map((domain) => (
            <section key={domain.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-medium">{domain.name}</h2>
                  <p className="text-sm text-muted-foreground">{domain.isActive ? he.manager.active : he.manager.inactive}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="touch" variant="outline" onClick={() => setEditor({ kind: "domain", id: domain.id, name: domain.name, isActive: domain.isActive })}>
                    {he.manager.edit}
                  </Button>
                  <Button type="button" size="touch" variant="outline" onClick={() => { setError(false); setEditor({ kind: "component", id: null, domainId: domain.id, name: "", unit: "", isActive: true }) }}>
                    {he.manager.add}
                  </Button>
                </div>
              </div>
              <ul className="flex flex-col gap-2">
                {db.components.filter((item) => item.domainId === domain.id).map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm">
                    <span>
                      {item.name}
                      <span className="text-muted-foreground"> · {item.unit}</span>
                      <span className="block text-muted-foreground">{item.isActive ? he.manager.active : he.manager.inactive}</span>
                    </span>
                    <Button type="button" size="touch" variant="outline" onClick={() => setEditor({ kind: "component", id: item.id, domainId: item.domainId, name: item.name, unit: item.unit, isActive: item.isActive })}>
                      {he.manager.edit}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
      <Dialog open={editor !== null} onOpenChange={(open) => { if (!open) setEditor(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editor?.kind === "component" ? he.manager.catalog.component : he.manager.catalog.domain}</DialogTitle>
          </DialogHeader>
          {editor ? (
            <div className="grid gap-3">
              <Field label={he.manager.catalog.name}>
                <Input value={editor.name} className="h-11 text-base md:text-base" onChange={(event) => setEditor({ ...editor, name: event.target.value })} />
              </Field>
              {editor.kind === "component" ? (
                <>
                  <Field label={he.manager.catalog.domain}>
                    <select className={fieldClass} value={editor.domainId} onChange={(event) => setEditor({ ...editor, domainId: event.target.value })}>
                      {db.domains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name}</option>)}
                    </select>
                  </Field>
                  <Field label={he.manager.catalog.unit}>
                    <Input value={editor.unit} className="h-11 text-base md:text-base" onChange={(event) => setEditor({ ...editor, unit: event.target.value })} />
                  </Field>
                </>
              ) : null}
              <button
                type="button"
                aria-pressed={editor.isActive}
                className={cn("min-h-11 rounded-xl border px-4 text-start text-sm", editor.isActive ? "border-foreground bg-muted font-medium" : "border-border")}
                onClick={() => setEditor({ ...editor, isActive: !editor.isActive })}
              >
                {editor.isActive ? he.manager.active : he.manager.inactive}
              </button>
              {error ? <p className="text-sm text-muted-foreground">{he.manager.invalid}</p> : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" size="touch" onClick={save}>{he.manager.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageFrame>
  )
}
