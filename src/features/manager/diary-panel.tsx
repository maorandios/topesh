"use client"

import { useState, useSyncExternalStore } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  deleteManagerDiary,
  editManagerDiary,
  markManagerDiaryCancelled,
} from "@/data/browser-store"
import { findCustomer, findDomain, findComponent, activeDomainsFrom } from "@/data/lookups"
import { getManagerDiary } from "@/data/manager"
import { addQuantities, parseQuantityInput } from "@/data/quantity"
import type { MockDb } from "@/data/seed"
import type { DiaryStatus } from "@/domain/types"
import { Field, fieldClass } from "@/features/manager/fields"
import { he } from "@/i18n/he"
import { formatDateTime, formatQuantity, formatWorkDate } from "@/lib/format"
import { BidiText } from "@/lib/bidi"
import { cn } from "cn"

type PanelDiary = NonNullable<ReturnType<typeof getManagerDiary>>
type DraftItem = {
  id: string
  componentId: string
  domainName: string
  componentName: string
  unit: string
  quantity: string
}
type ConfirmKind = "cancel" | "delete"

export function diaryStatusLabel(status: DiaryStatus) {
  if (status === "pending") return he.leader.status.pending
  if (status === "cancelled") return he.leader.status.cancelled
  return he.leader.status.submitted
}

export function DiaryPanel({
  db,
  diary,
  onOpenChange,
}: {
  db: MockDb
  diary: ReturnType<typeof getManagerDiary>
  onOpenChange: (open: boolean) => void
}) {
  const desktop = useDesktop()
  const open = Boolean(diary)
  const body = diary ? <DiaryBody key={diary.id} db={db} diary={diary} onClose={() => onOpenChange(false)} /> : null
  const title = diary ? formatWorkDate(diary.workDate) : he.manager.dashboard.title
  if (desktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-full data-[side=left]:max-w-xl">
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
        <DrawerHeader className="text-start group-data-[swipe-axis=y]/drawer-popup:text-start">
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        {body}
      </DrawerContent>
    </Drawer>
  )
}

function DiaryBody({
  db,
  diary,
  onClose,
}: {
  db: MockDb
  diary: PanelDiary
  onClose: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null)

  const runConfirm = () => {
    if (confirm === "delete") {
      const result = deleteManagerDiary(diary.id)
      if (!result.ok) return
      toast(he.manager.panel.deleted)
      onClose()
      return
    }
    const result = markManagerDiaryCancelled(diary.id)
    setConfirm(null)
    if (!result.ok) return
    toast(he.manager.panel.cancelled)
  }

  if (editing) {
    return (
      <DiaryEditor
        db={db}
        diary={diary}
        onSaved={() => setEditing(false)}
        onCancelEdit={() => setEditing(false)}
      />
    )
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <DiaryView diary={diary} />
      </div>
      <div className="flex flex-col gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {confirm ? (
          <>
            <p>{confirm === "delete" ? he.manager.panel.deleteConfirm : he.manager.panel.cancelConfirm}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="touch" onClick={runConfirm}>
                {confirm === "delete" ? he.manager.panel.deleteAction : he.manager.panel.cancelAction}
              </Button>
              <Button type="button" size="touch" variant="outline" onClick={() => setConfirm(null)}>
                {he.manager.keep}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="touch" onClick={() => setEditing(true)}>
              {he.manager.edit}
            </Button>
            <Button
              type="button"
              size="touch"
              variant="outline"
              disabled={diary.status === "cancelled"}
              onClick={() => setConfirm("cancel")}
            >
              {he.manager.panel.cancelDiary}
            </Button>
            <Button type="button" size="touch" variant="outline" onClick={() => setConfirm("delete")}>
              {he.manager.panel.deleteDiary}
            </Button>
          </div>
        )}
      </div>
    </>
  )
}

function DiaryEditor({
  db,
  diary,
  onSaved,
  onCancelEdit,
}: {
  db: MockDb
  diary: PanelDiary
  onSaved: () => void
  onCancelEdit: () => void
}) {
  const domains = activeDomainsFrom(db)
  const checks = db.checkboxDefinitions
    .filter((item) => item.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const [siteId, setSiteId] = useState(diary.siteId)
  const [subSiteId, setSubSiteId] = useState(diary.subSiteId)
  const [workOrder, setWorkOrder] = useState(diary.workOrderNumber)
  const [workers, setWorkers] = useState(() =>
    diary.workers.length > 0 ? diary.workers.map((worker) => ({ ...worker })) : [{ id: crypto.randomUUID(), fullName: "" }]
  )
  const [items, setItems] = useState<DraftItem[]>(() =>
    diary.items.map((item) => ({
      id: item.id,
      componentId: item.componentId,
      domainName: item.domainName,
      componentName: item.componentName,
      unit: item.unit,
      quantity: quantityField(item.quantity),
    }))
  )
  const [checkedIds, setCheckedIds] = useState(() =>
    diary.checkboxes
      .filter((item) => item.checked && checks.some((definition) => definition.id === item.checkboxId))
      .map((item) => item.checkboxId)
  )
  const [notes, setNotes] = useState(diary.notes)
  const [domainId, setDomainId] = useState(domains[0]?.id ?? "")
  const [componentId, setComponentId] = useState(domains[0]?.components[0]?.id ?? "")
  const [quantity, setQuantity] = useState("")
  const [itemError, setItemError] = useState("")
  const [error, setError] = useState(false)
  const subSites = db.subSites.filter((item) => item.siteId === siteId)
  const components = domains.find((domain) => domain.id === domainId)?.components ?? []

  const addItem = () => {
    const parsed = parseQuantityInput(quantity)
    const component = findComponent(db, componentId)
    const domain = component ? findDomain(db, component.domainId) : null
    if (!parsed || !component || !domain || !component.isActive) {
      setItemError(he.leader.form.quantityInvalid)
      return
    }
    const existing = items.find((item) => item.componentId === component.id)
    if (existing) {
      const current = parseQuantityInput(existing.quantity)
      const sum = current === null ? null : addQuantities(current, parsed)
      if (sum === null) {
        setItemError(he.leader.form.quantityLimit)
        return
      }
      setItems((currentItems) =>
        currentItems.map((item) =>
          item.componentId === component.id ? { ...item, quantity: quantityField(sum) } : item
        )
      )
      toast(he.leader.form.quantityMerged)
    } else {
      setItems((currentItems) => [
        ...currentItems,
        {
          id: crypto.randomUUID(),
          componentId: component.id,
          domainName: domain.name,
          componentName: component.name,
          unit: component.unit,
          quantity: quantityField(parsed),
        },
      ])
    }
    setQuantity("")
    setItemError("")
  }

  const save = () => {
    const parsedItems: { id: string; componentId: string; quantity: number }[] = []
    for (const item of items) {
      const parsed = parseQuantityInput(item.quantity)
      if (parsed === null) {
        setError(true)
        return
      }
      parsedItems.push({ id: item.id, componentId: item.componentId, quantity: parsed })
    }
    const result = editManagerDiary(
      diary.id,
      {
        teamLeaderId: diary.teamLeaderId,
        workDate: diary.workDate,
        siteId,
        subSiteId,
        workOrderNumber: workOrder,
      },
      { workers, items: parsedItems, checkedIds, notes }
    )
    setError(!result.ok)
    if (result.ok) {
      toast(he.manager.panel.saved)
      onSaved()
    }
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex flex-col gap-4 text-sm">
          <p className="text-muted-foreground">
            {diaryStatusLabel(diary.status)}
            {diary.submittedAt ? (
              <>
                {" · "}
                {he.leader.form.submittedOn} {formatDateTime(diary.submittedAt)}
              </>
            ) : null}
          </p>
          <ReadOnlyField label={he.manager.diaries.leader} value={diary.teamLeaderName} />
          <ReadOnlyField label={he.manager.diaries.date} value={formatWorkDate(diary.workDate)} />
          <Field label={he.manager.diaries.site}>
            <select
              className={fieldClass}
              value={siteId}
              onChange={(event) => {
                const next = event.target.value
                setSiteId(next)
                setSubSiteId(db.subSites.find((item) => item.siteId === next)?.id ?? "")
              }}
            >
              {db.sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {findCustomer(db, site.customerId)?.name} · {site.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={he.manager.diaries.subSite}>
            <select className={fieldClass} value={subSiteId} onChange={(event) => setSubSiteId(event.target.value)}>
              {subSites.map((subSite) => (
                <option key={subSite.id} value={subSite.id}>
                  {subSite.name}
                </option>
              ))}
            </select>
          </Field>
          {subSites.length === 0 ? <p className="text-muted-foreground">{he.manager.noSubsites}</p> : null}
          <Field label={he.manager.diaries.workOrder}>
            <Input
              dir="ltr"
              value={workOrder}
              className="h-11 text-base md:text-base"
              onChange={(event) => setWorkOrder(event.target.value)}
            />
          </Field>
          <section className="flex flex-col gap-2">
            <h3 className="font-medium">{he.leader.form.workersTitle}</h3>
            {workers.map((worker) => (
              <div key={worker.id} className="flex items-center gap-2">
                <Input
                  value={worker.fullName}
                  placeholder={he.leader.form.workerName}
                  className="h-11 text-base md:text-base"
                  onChange={(event) =>
                    setWorkers((current) =>
                      current.map((item) =>
                        item.id === worker.id ? { ...item, fullName: event.target.value } : item
                      )
                    )
                  }
                />
                <Button
                  type="button"
                  size="touch"
                  variant="outline"
                  onClick={() => setWorkers((current) => current.filter((item) => item.id !== worker.id))}
                >
                  {he.leader.remove}
                </Button>
              </div>
            ))}
            <Button
              type="button"
              size="touch"
              variant="outline"
              className="self-start"
              onClick={() => setWorkers((current) => [...current, { id: crypto.randomUUID(), fullName: "" }])}
            >
              + {he.leader.form.addWorker}
            </Button>
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="font-medium">{he.leader.form.workTitle}</h3>
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <span className="block truncate">{item.componentName}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.domainName}</span>
                </div>
                <Input
                  dir="ltr"
                  inputMode="decimal"
                  value={item.quantity}
                  aria-label={he.leader.form.quantity}
                  className="h-11 w-20 text-base md:text-base"
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((entry) =>
                        entry.id === item.id ? { ...entry, quantity: event.target.value } : entry
                      )
                    )
                  }
                />
                <span className="w-12 shrink-0 text-xs text-muted-foreground">{item.unit}</span>
                <Button
                  type="button"
                  size="touch"
                  variant="outline"
                  onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
                >
                  {he.leader.remove}
                </Button>
              </div>
            ))}
            <div className="grid gap-2">
              <Field label={he.leader.form.domain}>
                <select
                  className={fieldClass}
                  value={domainId}
                  onChange={(event) => {
                    const next = event.target.value
                    setDomainId(next)
                    setComponentId(domains.find((domain) => domain.id === next)?.components[0]?.id ?? "")
                  }}
                >
                  {domains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={he.leader.form.component}>
                <select className={fieldClass} value={componentId} onChange={(event) => setComponentId(event.target.value)}>
                  {components.map((component) => (
                    <option key={component.id} value={component.id}>
                      {component.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={he.leader.form.quantity}>
                <Input
                  dir="ltr"
                  inputMode="decimal"
                  value={quantity}
                  className="h-11 text-base md:text-base"
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </Field>
              <Button type="button" size="touch" variant="outline" className="self-start" onClick={addItem}>
                + {he.leader.form.addItem}
              </Button>
              {itemError ? <p className="text-muted-foreground">{itemError}</p> : null}
            </div>
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="font-medium">{he.leader.form.checksTitle}</h3>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {checks.map((option) => {
                const checked = checkedIds.includes(option.id)
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={checked}
                    className={cn(
                      "flex min-h-11 w-full items-center border-b border-border px-3 text-start last:border-b-0",
                      checked ? "bg-muted font-medium" : "bg-card"
                    )}
                    onClick={() =>
                      setCheckedIds((current) =>
                        checked ? current.filter((id) => id !== option.id) : [...current, option.id]
                      )
                    }
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </section>
          <Field label={he.leader.form.notesTitle}>
            <textarea
              value={notes}
              maxLength={2000}
              placeholder={he.leader.form.notesPlaceholder}
              className="min-h-20 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
          {error ? <p className="text-muted-foreground">{he.manager.invalid}</p> : null}
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="touch" onClick={save}>
            {he.manager.save}
          </Button>
          <Button type="button" size="touch" variant="outline" onClick={onCancelEdit}>
            {he.manager.panel.cancelEdit}
          </Button>
        </div>
      </div>
    </>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function DiaryView({ diary }: { diary: PanelDiary }) {
  const checks = diary.checkboxes.filter((item) => item.checked)
  const facts = [
    [he.manager.dashboard.columns.company, diary.companyName],
    [he.manager.dashboard.columns.customer, diary.customerName],
    [he.manager.dashboard.columns.site, diary.siteName],
    [he.manager.dashboard.columns.subSite, diary.subSiteName],
    [he.manager.dashboard.columns.leader, diary.teamLeaderName],
    [he.manager.diaries.workOrder, diary.workOrderNumber],
    [he.manager.dashboard.columns.status, diaryStatusLabel(diary.status)],
  ] as const
  return (
    <div className="flex flex-col gap-4 text-sm">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
        {facts.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{label === he.manager.diaries.workOrder ? <BidiText>{value}</BidiText> : value}</dd>
          </div>
        ))}
        {diary.submittedAt ? (
          <>
            <dt className="text-muted-foreground">{he.leader.form.submittedOn}</dt>
            <dd>{formatDateTime(diary.submittedAt)}</dd>
          </>
        ) : null}
      </dl>
      <ViewList title={he.leader.form.workersTitle} empty={he.leader.form.readOnlyWorkers} values={diary.workers.map((worker) => worker.fullName)} />
      <ViewList
        title={he.leader.form.workTitle}
        empty={he.leader.form.readOnlyItems}
        values={diary.items.map((item) => `${item.domainName}, ${item.componentName} — ${formatQuantity(item.quantity)} ${item.unit}`)}
      />
      <ViewList title={he.leader.form.checksTitle} empty={he.leader.form.readOnlyChecks} values={checks.map((item) => item.label)} />
      <section className="flex flex-col gap-1">
        <h3 className="font-medium">{he.leader.form.notesTitle}</h3>
        <p className="leading-6">{diary.notes.trim() || he.leader.form.readOnlyNotes}</p>
      </section>
    </div>
  )
}

function ViewList({ title, empty, values }: { title: string; empty: string; values: string[] }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="font-medium">{title}</h3>
      {values.length === 0 ? (
        <p className="text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {values.map((value, index) => (
            <li key={`${value}-${index}`}>{value}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

function quantityField(value: number) {
  return String(value)
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
