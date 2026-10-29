"use client"

import { useState, type ReactNode } from "react"
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
import {
  saveManagerCompany,
  saveManagerCustomer,
  saveManagerSite,
  saveManagerSubSite,
  useManagerDb,
} from "@/data/browser-store"
import { findCustomer } from "@/data/lookups"
import { LeaderLoading, LeaderStoreError } from "@/features/leader/leader-states"
import { Field, fieldClass } from "@/features/manager/fields"
import { he } from "@/i18n/he"

type Editor =
  | { kind: "company"; id: string | null; name: string }
  | { kind: "customer"; id: string | null; name: string; companyId: string }
  | { kind: "site"; id: string | null; name: string; customerId: string }
  | { kind: "subSite"; id: string | null; name: string; siteId: string }

export function OrganizationScreen() {
  const query = useManagerDb()
  const [editor, setEditor] = useState<Editor | null>(null)
  const [error, setError] = useState(false)
  if (query.status === "loading") return <LeaderLoading />
  if (query.status === "error") return <LeaderStoreError />
  const db = query.db

  const save = () => {
    if (!editor) return
    const result =
      editor.kind === "company"
        ? saveManagerCompany(editor.id, editor.name)
        : editor.kind === "customer"
          ? saveManagerCustomer(editor.id, editor.companyId, editor.name)
          : editor.kind === "site"
            ? saveManagerSite(editor.id, editor.customerId, editor.name)
            : saveManagerSubSite(editor.id, editor.siteId, editor.name)
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
        <h1 className="text-xl font-semibold">{he.manager.organization.title}</h1>
        <div className="grid gap-4 lg:grid-cols-2">
          <Section title={he.manager.organization.company} onAdd={() => { setError(false); setEditor({ kind: "company", id: null, name: "" }) }}>
            {db.companies.map((company) => (
              <Row key={company.id} label={company.name} onEdit={() => setEditor({ kind: "company", id: company.id, name: company.name })} />
            ))}
          </Section>
          <Section title={he.manager.organization.customer} onAdd={() => { setError(false); setEditor({ kind: "customer", id: null, name: "", companyId: db.companies[0]?.id ?? "" }) }}>
            {db.customers.map((customer) => (
              <Row
                key={customer.id}
                label={customer.name}
                hint={db.companies.find((company) => company.id === customer.companyId)?.name}
                onEdit={() => setEditor({ kind: "customer", id: customer.id, name: customer.name, companyId: customer.companyId })}
              />
            ))}
          </Section>
          <Section title={he.manager.organization.site} onAdd={() => { setError(false); setEditor({ kind: "site", id: null, name: "", customerId: db.customers[0]?.id ?? "" }) }}>
            {db.sites.map((site) => (
              <Row
                key={site.id}
                label={site.name}
                hint={findCustomer(db, site.customerId)?.name}
                onEdit={() => setEditor({ kind: "site", id: site.id, name: site.name, customerId: site.customerId })}
              />
            ))}
          </Section>
          <Section title={he.manager.organization.subSite} onAdd={() => { setError(false); setEditor({ kind: "subSite", id: null, name: "", siteId: db.sites[0]?.id ?? "" }) }}>
            {db.subSites.map((subSite) => (
              <Row
                key={subSite.id}
                label={subSite.name}
                hint={db.sites.find((site) => site.id === subSite.siteId)?.name}
                onEdit={() => setEditor({ kind: "subSite", id: subSite.id, name: subSite.name, siteId: subSite.siteId })}
              />
            ))}
          </Section>
        </div>
      </div>
      <Dialog open={editor !== null} onOpenChange={(open) => { if (!open) setEditor(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editor ? titleFor(editor.kind) : ""}</DialogTitle>
          </DialogHeader>
          {editor ? (
            <div className="grid gap-3">
              <Field label={he.manager.organization.name}>
                <Input value={editor.name} className="h-11 text-base md:text-base" onChange={(event) => setEditor({ ...editor, name: event.target.value })} />
              </Field>
              {editor.kind === "customer" ? (
                <Field label={he.manager.organization.company}>
                  <select className={fieldClass} value={editor.companyId} onChange={(event) => setEditor({ ...editor, companyId: event.target.value })}>
                    {db.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                  </select>
                </Field>
              ) : null}
              {editor.kind === "site" ? (
                <Field label={he.manager.organization.customer}>
                  <select className={fieldClass} value={editor.customerId} onChange={(event) => setEditor({ ...editor, customerId: event.target.value })}>
                    {db.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                  </select>
                </Field>
              ) : null}
              {editor.kind === "subSite" ? (
                <Field label={he.manager.organization.site}>
                  <select className={fieldClass} value={editor.siteId} onChange={(event) => setEditor({ ...editor, siteId: event.target.value })}>
                    {db.sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
                  </select>
                </Field>
              ) : null}
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

function titleFor(kind: Editor["kind"]) {
  if (kind === "company") return he.manager.organization.company
  if (kind === "customer") return he.manager.organization.customer
  if (kind === "site") return he.manager.organization.site
  return he.manager.organization.subSite
}

function Section({ title, onAdd, children }: { title: string; onAdd: () => void; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-medium">{title}</h2>
        <Button type="button" size="touch" variant="outline" onClick={onAdd}>{he.manager.add}</Button>
      </div>
      <ul className="flex flex-col gap-2">{children}</ul>
    </section>
  )
}

function Row({ label, hint, onEdit }: { label: string; hint?: string; onEdit: () => void }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
      <span className="min-w-0">
        <span className="block text-sm">{label}</span>
        {hint ? <span className="block text-sm text-muted-foreground">{hint}</span> : null}
      </span>
      <Button type="button" size="touch" variant="outline" onClick={onEdit}>{he.manager.edit}</Button>
    </li>
  )
}
