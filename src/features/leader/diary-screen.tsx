"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { toast } from "sonner"
import { PageFrame } from "@/components/motion/page-frame"
import { AppLink } from "@/components/shell/app-link"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { useRepositorySnapshot } from "@/data/browser-store"
import { activeDomainsFrom, findComponent, findDomain } from "@/data/lookups"
import { saveLeaderDraft, submitLeaderDiary, useLeaderDiary } from "@/data/browser-store"
import { addQuantities, parseQuantityInput } from "@/data/quantity"
import type { DiaryDraft, LeaderDiaryDetail } from "@/data/repository"
import { setDiaryFilling } from "@/features/leader/diary-chrome"
import {
  LeaderLoading,
  LeaderMessage,
  LeaderStoreError,
} from "@/features/leader/leader-states"
import { he } from "@/i18n/he"
import { useKeyboardOpen } from "@/lib/use-keyboard-open"
import { formatDateTime, formatQuantity, formatWorkDate } from "@/lib/format"
import { cn } from "cn"

const fieldClass = "h-11 text-base md:text-base"

export function DiaryScreen({ diaryId }: { diaryId: string }) {
  const query = useLeaderDiary(diaryId)
  if (query.status === "loading") return <LeaderLoading />
  if (query.status === "error") return <LeaderStoreError />
  if (!query.data) {
    return (
      <LeaderMessage
        title={he.leader.notFoundTitle}
        body={he.leader.notFoundBody}
        back
      />
    )
  }
  if (query.data.status !== "pending") {
    return <ReadOnlyDiary detail={query.data} />
  }
  return (
    <DiaryEditor
      key={query.data.id}
      teamLeaderId={query.teamLeaderId}
      detail={query.data}
    />
  )
}

function DiaryEditor({
  teamLeaderId,
  detail,
}: {
  teamLeaderId: string
  detail: LeaderDiaryDetail
}) {
  const keyboardOpen = useKeyboardOpen()
  const [draft, setDraft] = useState<DiaryDraft>(() => draftFromDetail(detail))
  const [reviewOpen, setReviewOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const draftRef = useRef(draft)
  const dirtyRef = useRef(false)
  const timerRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    setDiaryFilling(true)
    return () => setDiaryFilling(false)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      if (dirtyRef.current) saveLeaderDraft(teamLeaderId, detail.id, draftRef.current)
    }
  }, [detail.id, teamLeaderId])

  const updateDraft = (next: DiaryDraft, immediate = false) => {
    draftRef.current = next
    dirtyRef.current = true
    setDraft(next)
    if (timerRef.current) window.clearTimeout(timerRef.current)
    if (immediate) {
      saveLeaderDraft(teamLeaderId, detail.id, next)
      dirtyRef.current = false
      return
    }
    timerRef.current = window.setTimeout(() => {
      saveLeaderDraft(teamLeaderId, detail.id, draftRef.current)
      dirtyRef.current = false
    }, 250)
  }

  const openReview = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    saveLeaderDraft(teamLeaderId, detail.id, draftRef.current)
    dirtyRef.current = false
    setSubmitError(false)
    setReviewOpen(true)
  }

  const confirmSubmit = () => {
    dirtyRef.current = false
    const result = submitLeaderDiary(teamLeaderId, detail.id, draftRef.current)
    if (!result.ok) {
      setSubmitError(true)
      return
    }
    if (!result.unchanged) toast.success(he.leader.review.success)
    setReviewOpen(false)
  }

  const hideSubmit = keyboardOpen || sheetOpen || reviewOpen

  return (
    <PageFrame>
      <div
        className="flex flex-col gap-4 px-4 py-3 [&_input]:scroll-mb-28 [&_textarea]:scroll-mb-28"
        onFocus={(event) => {
          const target = event.target
          if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return
          window.setTimeout(() => target.scrollIntoView({ block: "center" }), 280)
        }}
      >
        <AppLink
          href="/leader"
          direction="back"
          className="pressable inline-flex min-h-11 items-center self-start text-sm text-muted-foreground"
        >
          {he.leader.back}
        </AppLink>
        <AssignmentFacts detail={detail} />
        <WorkerFields
          workers={draft.workers}
          onChange={(workers) => updateDraft({ ...draft, workers }, true)}
          onEdit={(workers) => updateDraft({ ...draft, workers })}
        />
        <ComponentList
          items={draft.items}
          onChange={(items) => updateDraft({ ...draft, items }, true)}
          onOpenChange={setSheetOpen}
        />
        <CheckboxFields
          options={detail.checkboxes}
          checkedIds={draft.checkedIds}
          onChange={(checkedIds) => updateDraft({ ...draft, checkedIds }, true)}
        />
        <section className="flex flex-col gap-1.5">
          <h2 className="text-sm font-medium">{he.leader.form.notesTitle}</h2>
          <textarea
            value={draft.notes}
            maxLength={2000}
            placeholder={he.leader.form.notesPlaceholder}
            className="min-h-20 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            onChange={(event) => updateDraft({ ...draft, notes: event.target.value })}
          />
        </section>
      </div>

      {hideSubmit ? null : (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:right-60">
          <div className="mx-auto w-full max-w-xl lg:max-w-2xl">
            <Button type="button" size="touch" className="w-full" onClick={openReview}>
              {he.leader.form.submit}
            </Button>
          </div>
        </div>
      )}

      <ReviewSheet
        open={reviewOpen}
        detail={detail}
        draft={draft}
        submitError={submitError}
        onOpenChange={setReviewOpen}
        onConfirm={confirmSubmit}
      />
    </PageFrame>
  )
}

function AssignmentFacts({ detail }: { detail: LeaderDiaryDetail }) {
  return (
    <header className="flex flex-col">
      <h1 className="text-lg font-semibold leading-7">{detail.subSiteName}</h1>
      <p className="text-sm text-muted-foreground">
        {detail.siteName}
        <span aria-hidden="true"> · </span>
        {formatWorkDate(detail.workDate)}
      </p>
    </header>
  )
}

function WorkerFields({
  workers,
  onChange,
  onEdit,
}: {
  workers: DiaryDraft["workers"]
  onChange: (workers: DiaryDraft["workers"]) => void
  onEdit: (workers: DiaryDraft["workers"]) => void
}) {
  const reduce = useReducedMotion()
  const focusId = useRef<string | null>(null)

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">{he.leader.form.workersTitle}</h2>
      {workers.length > 0 ? (
        <ul className="overflow-hidden rounded-xl border border-border bg-card">
          <AnimatePresence initial={false}>
            {workers.map((worker, index) => (
              <motion.li
                key={worker.id}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="flex items-center border-b border-border last:border-b-0"
              >
                <Input
                  ref={(node) => {
                    if (node && focusId.current === worker.id) {
                      focusId.current = null
                      node.focus()
                    }
                  }}
                  value={worker.fullName}
                  maxLength={80}
                  aria-label={`${he.leader.form.workerName} ${index + 1}`}
                  placeholder={he.leader.form.workerName}
                  className="h-11 min-w-0 flex-1 rounded-none border-0 bg-transparent px-3 text-base shadow-none focus-visible:ring-0 md:text-base"
                  onChange={(event) =>
                    onEdit(
                      workers.map((item) =>
                        item.id === worker.id ? { ...item, fullName: event.target.value } : item
                      )
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return
                    event.preventDefault()
                    const id = crypto.randomUUID()
                    focusId.current = id
                    onChange([...workers, { id, fullName: "" }])
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 shrink-0 rounded-none px-3 text-sm text-muted-foreground"
                  onClick={() => onChange(workers.filter((item) => item.id !== worker.id))}
                >
                  {he.leader.remove}
                </Button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="touch"
        className="self-start bg-card"
        onClick={() => {
          const id = crypto.randomUUID()
          focusId.current = id
          onChange([...workers, { id, fullName: "" }])
        }}
      >
        + {he.leader.form.addWorker}
      </Button>
    </section>
  )
}

function ComponentList({
  items,
  onChange,
  onOpenChange,
}: {
  items: DiaryDraft["items"]
  onChange: (items: DiaryDraft["items"]) => void
  onOpenChange: (open: boolean) => void
}) {
  const snapshot = useRepositorySnapshot()
  const db = snapshot.status === "ready" ? snapshot.db : null
  const [editingId, setEditingId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const setSheet = (next: boolean, itemId: string | null = null) => {
    setEditingId(itemId)
    setOpen(next)
    onOpenChange(next)
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">{he.leader.form.workTitle}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{he.leader.form.noComponents}</p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-border bg-card">
          {items.map((item) => {
            const component = db ? findComponent(db, item.componentId) : null
            const domain = component && db ? findDomain(db, component.domainId) : null
            if (!component || !domain) return null
            return (
              <li key={item.id} className="flex items-center gap-2 border-b border-border px-3 last:border-b-0">
                <div className="min-w-0 flex-1 py-2">
                  <p className="truncate text-sm font-medium">{component.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{domain.name}</p>
                </div>
                <p className="shrink-0 text-sm">
                  {formatQuantity(item.quantity)} {component.unit}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 shrink-0 px-2 text-sm"
                  onClick={() => setSheet(true, item.id)}
                >
                  {he.leader.edit}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 shrink-0 px-2 text-sm text-muted-foreground"
                  onClick={() => onChange(items.filter((entry) => entry.id !== item.id))}
                >
                  {he.leader.remove}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
      <Button
        type="button"
        variant="outline"
        size="touch"
        className="self-start bg-card"
        onClick={() => setSheet(true, null)}
      >
        + {he.leader.form.addItem}
      </Button>
      <ItemSheet
        key={open ? (editingId ?? "add") : "closed"}
        open={open}
        editingId={editingId}
        items={items}
        onOpenChange={(next) => setSheet(next, next ? editingId : null)}
        onChange={onChange}
      />
    </section>
  )
}

function ItemSheet({
  open,
  editingId,
  items,
  onOpenChange,
  onChange,
}: {
  open: boolean
  editingId: string | null
  items: DiaryDraft["items"]
  onOpenChange: (open: boolean) => void
  onChange: (items: DiaryDraft["items"]) => void
}) {
  const snapshot = useRepositorySnapshot()
  const db = snapshot.status === "ready" ? snapshot.db : null
  const domains = db ? activeDomainsFrom(db) : []
  const editing = items.find((item) => item.id === editingId) ?? null
  const stored = editing && db ? findComponent(db, editing.componentId) : null
  const quantityRef = useRef<HTMLInputElement>(null)
  const [domainId, setDomainId] = useState(() => stored?.domainId ?? domains[0]?.id ?? "")
  const [componentId, setComponentId] = useState(() => editing?.componentId ?? "")
  const [rawQuantity, setRawQuantity] = useState(() => (editing ? formatQuantity(editing.quantity) : ""))
  const [message, setMessage] = useState<"invalid" | "limit" | null>(null)

  const domain = domains.find((item) => item.id === domainId) ?? null
  const selected = domain?.components.find((item) => item.id === componentId) ?? null
  const unit = selected?.unit ?? stored?.unit ?? ""

  const commit = () => {
    const quantity = parseQuantityInput(rawQuantity)
    const nextComponentId = selected?.id ?? (editing && componentId === editing.componentId ? editing.componentId : "")
    if (!nextComponentId || quantity === null) {
      setMessage("invalid")
      return
    }
    const others = items.filter((item) => item.id !== editingId)
    const clash = others.find((item) => item.componentId === nextComponentId)
    if (clash) {
      const sum = addQuantities(clash.quantity, quantity)
      if (sum === null) {
        setMessage("limit")
        return
      }
      onChange(others.map((item) => (item.id === clash.id ? { ...item, quantity: sum } : item)))
      toast.success(he.leader.form.quantityMerged)
    } else if (editingId) {
      onChange(items.map((item) => (item.id === editingId ? { ...item, componentId: nextComponentId, quantity } : item)))
    } else {
      onChange([...items, { id: crypto.randomUUID(), componentId: nextComponentId, quantity }])
    }
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle swipeDirection="down">
      <DrawerContent>
        <DrawerHeader className="text-start group-data-[swipe-axis=y]/drawer-popup:text-start">
          <DrawerTitle>{editing ? he.leader.edit : `+ ${he.leader.form.addItem}`}</DrawerTitle>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm text-muted-foreground">{he.leader.form.domain}</legend>
            <div className="flex flex-wrap gap-2">
              {domains.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={item.id === domainId}
                  className={cn(
                    "pressable min-h-11 rounded-xl border px-3 text-sm",
                    item.id === domainId ? "border-foreground bg-muted font-medium" : "border-border bg-card"
                  )}
                  onClick={() => {
                    setDomainId(item.id)
                    setComponentId("")
                    setMessage(null)
                  }}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm text-muted-foreground">{he.leader.form.component}</legend>
            {domain ? (
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                {domain.components.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={item.id === componentId}
                    className={cn(
                      "flex min-h-11 w-full items-center justify-between gap-3 border-b border-border px-3 text-sm last:border-b-0",
                      item.id === componentId ? "bg-muted font-medium" : "bg-card"
                    )}
                    onClick={() => {
                      setComponentId(item.id)
                      setMessage(null)
                      quantityRef.current?.focus()
                    }}
                  >
                    <span className="min-w-0 truncate">{item.name}</span>
                    <span className="shrink-0 text-muted-foreground">{item.unit}</span>
                  </button>
                ))}
              </div>
            ) : stored && editing ? (
              <p className="rounded-xl border border-border bg-card px-3 py-3 text-sm">{stored.name}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{he.leader.form.chooseDomain}</p>
            )}
          </fieldset>
          <label className="flex flex-col gap-1 text-sm">
            {he.leader.form.quantity}
            <span className="flex items-center gap-2">
              <Input
                ref={quantityRef}
                inputMode="decimal"
                value={rawQuantity}
                aria-invalid={message === "invalid"}
                className={cn(fieldClass, "min-w-0 flex-1")}
                onChange={(event) => {
                  setRawQuantity(event.target.value)
                  setMessage(null)
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return
                  event.preventDefault()
                  commit()
                }}
              />
              <span className="shrink-0 text-muted-foreground">{unit}</span>
            </span>
          </label>
          {message ? (
            <p className="text-sm leading-6 text-muted-foreground" aria-live="polite">
              {message === "limit" ? he.leader.form.quantityLimit : he.leader.form.quantityInvalid}
            </p>
          ) : null}
        </div>
        <DrawerFooter className="pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button type="button" size="touch" onClick={commit}>
            {editing ? he.manager.save : he.leader.form.addComponent}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function CheckboxFields({
  options,
  checkedIds,
  onChange,
}: {
  options: LeaderDiaryDetail["checkboxes"]
  checkedIds: string[]
  onChange: (checkedIds: string[]) => void
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">{he.leader.form.checksTitle}</h2>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {options.map((option) => {
          const checked = checkedIds.includes(option.checkboxId)
          return (
            <button
              key={option.checkboxId}
              type="button"
              aria-pressed={checked}
              className={cn(
                "flex min-h-11 w-full items-center border-b border-border px-3 text-start text-sm last:border-b-0",
                checked ? "bg-muted font-medium" : "bg-card"
              )}
              onClick={() =>
                onChange(
                  checked
                    ? checkedIds.filter((id) => id !== option.checkboxId)
                    : [...checkedIds, option.checkboxId]
                )
              }
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function ReviewSheet({
  open,
  detail,
  draft,
  submitError,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  detail: LeaderDiaryDetail
  draft: DiaryDraft
  submitError: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const snapshot = useRepositorySnapshot()
  const db = snapshot.status === "ready" ? snapshot.db : null
  const workers = draft.workers.map((worker) => worker.fullName.trim()).filter(Boolean)
  const items = draft.items.flatMap((item) => {
    const component = db ? findComponent(db, item.componentId) : null
    const domain = component && db ? findDomain(db, component.domainId) : null
    if (!component || !domain) return []
    return [
      {
        id: item.id,
        label: `${domain.name}, ${component.name}`,
        quantity: `${formatQuantity(item.quantity)} ${component.unit}`,
      },
    ]
  })
  const checks = detail.checkboxes.filter((option) =>
    draft.checkedIds.includes(option.checkboxId)
  )
  const notes = draft.notes.trim()

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle swipeDirection="down">
      <DrawerContent>
        <DrawerHeader className="text-start group-data-[swipe-axis=y]/drawer-popup:text-start">
          <DrawerTitle>{he.leader.review.title}</DrawerTitle>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3 text-start">
          <ReviewLine label={he.leader.form.date} value={formatWorkDate(detail.workDate)} />
          <ReviewLine label={he.leader.form.site} value={detail.siteName} />
          <ReviewLine label={he.leader.form.subSite} value={detail.subSiteName} />
          <ReviewGroup
            label={he.leader.form.workersTitle}
            empty={he.leader.review.noWorkers}
            values={workers}
          />
          <ReviewGroup
            label={he.leader.form.workTitle}
            empty={he.leader.review.noItems}
            values={items.map((item) => `${item.label} — ${item.quantity}`)}
          />
          <ReviewGroup
            label={he.leader.form.checksTitle}
            empty={he.leader.review.noChecks}
            values={checks.map((option) => option.label)}
          />
          <ReviewLine label={he.leader.form.notesTitle} value={notes || he.leader.review.noNotes} />
        </div>
        <DrawerFooter className="pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="text-sm leading-6">{he.leader.review.warning}</p>
          {submitError ? (
            <p className="text-sm leading-6 text-muted-foreground">{he.leader.review.invalid}</p>
          ) : null}
          <Button type="button" size="touch" onClick={onConfirm}>
            {he.leader.review.confirm}
          </Button>
          <Button type="button" size="touch" variant="outline" onClick={() => onOpenChange(false)}>
            {he.leader.review.cancel}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex flex-col gap-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </p>
  )
}

function ReviewGroup({
  label,
  empty,
  values,
}: {
  label: string
  empty: string
  values: string[]
}) {
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {values.length === 0 ? (
        <span>{empty}</span>
      ) : (
        <ul className="flex flex-col">
          {values.map((value, index) => (
            <li key={`${value}-${index}`}>{value}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ReadOnlyDiary({ detail }: { detail: LeaderDiaryDetail }) {
  const checks = detail.checkboxes.filter((option) => option.checked)
  return (
    <PageFrame>
      <div className="flex flex-col gap-4 px-4 py-3">
        <AppLink
          href="/leader"
          direction="back"
          className="pressable inline-flex min-h-11 items-center self-start text-sm text-muted-foreground"
        >
          {he.leader.back}
        </AppLink>
        <p className="rounded-xl border border-border bg-muted px-3 py-2.5 text-sm leading-6">
          {detail.status === "cancelled" ? he.leader.form.cancelledBanner : he.leader.form.submittedBanner}
          {detail.submittedAt ? ` ${he.leader.form.submittedOn} ${formatDateTime(detail.submittedAt)}.` : ""}
        </p>
        <AssignmentFacts detail={detail} />
        <ReadOnlyList
          title={he.leader.form.workersTitle}
          empty={he.leader.form.readOnlyWorkers}
          values={detail.workers.map((worker) => worker.fullName)}
        />
        <ReadOnlyList
          title={he.leader.form.workTitle}
          empty={he.leader.form.readOnlyItems}
          values={detail.items.map(
            (item) => `${item.domainName}, ${item.componentName} — ${formatQuantity(item.quantity)} ${item.unit}`
          )}
        />
        <ReadOnlyList
          title={he.leader.form.checksTitle}
          empty={he.leader.form.readOnlyChecks}
          values={checks.map((option) => option.label)}
        />
        <section className="flex flex-col gap-1">
          <h2 className="text-sm font-medium">{he.leader.form.notesTitle}</h2>
          <p className="text-sm leading-6">
            {detail.notes.trim() || he.leader.form.readOnlyNotes}
          </p>
        </section>
      </div>
    </PageFrame>
  )
}

function ReadOnlyList({
  title,
  empty,
  values,
}: {
  title: string
  empty: string
  values: string[]
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">{title}</h2>
      {values.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-border bg-card">
          {values.map((value, index) => (
            <li key={`${value}-${index}`} className="border-b border-border px-3 py-2.5 text-sm last:border-b-0">
              {value}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function draftFromDetail(detail: LeaderDiaryDetail): DiaryDraft {
  return {
    workers: detail.workers.map((worker) => ({
      id: worker.id,
      fullName: worker.fullName,
    })),
    items: detail.items.map((item) => ({
      id: item.id,
      componentId: item.componentId,
      quantity: item.quantity,
    })),
    checkedIds: detail.checkboxes
      .filter((option) => option.checked)
      .map((option) => option.checkboxId),
    notes: detail.notes,
  }
}
