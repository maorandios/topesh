"use client"

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import {
  Cable,
  FileText,
  FolderKanban,
  Info,
  Layers3,
  MapPin,
  MessageSquareText,
  Plus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"
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
import { panelSurfaceClass, panelSurfaceStyle } from "@/components/shell/panel-surface"
import {
  FilterTriggerControl,
  MobileFilterPicker,
} from "@/features/manager/mobile-filters/picker-overlay"
import { useRepositorySnapshot } from "@/data/browser-store"
import { activeDomainsFrom, findComponent, findDomain } from "@/data/lookups"
import { saveLeaderDraft, submitLeaderDiary, useLeaderDiary } from "@/data/browser-store"
import { addQuantities, parseQuantityInput } from "@/data/quantity"
import type { DiaryDraft, LeaderDiaryDetail } from "@/data/repository"
import {
  LeaderLoading,
  LeaderMessage,
  LeaderStoreError,
} from "@/features/leader/leader-states"
import { he } from "@/i18n/he"
import { formatDateTime, formatQuantity, formatWorkDate } from "@/lib/format"
import { cn } from "cn"

const fieldClass =
  "h-[calc(2.25rem*1.1*1.1)] w-full min-w-0 rounded-md border border-border bg-card px-4 text-base text-foreground shadow-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-base"

const fieldGridClass = "grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-x-2"

export function LeaderDiaryPanel({
  diaryId,
  open,
  onOpenChange,
}: {
  diaryId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const desktop = useDesktop()
  const title = he.leader.home.title
  const body =
    open && diaryId ? (
      <DiaryPanelBody key={diaryId} diaryId={diaryId} onClose={() => onOpenChange(false)} />
    ) : null

  if (desktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className={cn(
            "w-full gap-0 overflow-hidden data-[side=left]:!max-w-[28.8rem]",
            panelSurfaceClass
          )}
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

function DiaryPanelBody({ diaryId, onClose }: { diaryId: string; onClose: () => void }) {
  const query = useLeaderDiary(diaryId)
  if (query.status === "loading") {
    return (
      <div className="flex min-h-48 flex-1 items-center justify-center p-4">
        <LeaderLoading />
      </div>
    )
  }
  if (query.status === "error") {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        <LeaderStoreError />
      </div>
    )
  }
  if (!query.data) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        <LeaderMessage title={he.leader.notFoundTitle} body={he.leader.notFoundBody} />
      </div>
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
      onSubmitted={onClose}
    />
  )
}

function PanelHeader({ detail }: { detail: LeaderDiaryDetail }) {
  return (
    <div className="shrink-0 px-4 py-3">
      <div className="grid grid-cols-[1rem_minmax(0,1fr)] items-center gap-x-2">
        <FileText className="size-4 justify-self-center text-muted-foreground" aria-hidden />
        <p className="truncate text-sm font-semibold text-foreground">
          {formatWorkDate(detail.workDate)}
        </p>
      </div>
    </div>
  )
}

function DiaryEditor({
  teamLeaderId,
  detail,
  onSubmitted,
}: {
  teamLeaderId: string
  detail: LeaderDiaryDetail
  onSubmitted: () => void
}) {
  const [draft, setDraft] = useState<DiaryDraft>(() => draftFromDetail(detail))
  const [reviewOpen, setReviewOpen] = useState(false)
  const [workerSheetOpen, setWorkerSheetOpen] = useState(false)
  const [itemSheetOpen, setItemSheetOpen] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const draftRef = useRef(draft)
  const dirtyRef = useRef(false)
  const timerRef = useRef<number | null>(null)

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
    onSubmitted()
  }

  const overlayOpen = workerSheetOpen || itemSheetOpen || reviewOpen

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader detail={detail} />
      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3 [&_input]:scroll-mb-24 [&_textarea]:scroll-mb-24"
        onFocus={(event) => {
          const target = event.target
          if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return
          window.setTimeout(() => target.scrollIntoView({ block: "center" }), 280)
        }}
      >
        <div className="flex flex-col gap-6 text-sm">
          <AssignmentFacts detail={detail} />
          <SectionDivider />
          <WorkerFields
            workers={draft.workers}
            sheetOpen={workerSheetOpen}
            onSheetOpenChange={setWorkerSheetOpen}
            onChange={(workers) => updateDraft({ ...draft, workers }, true)}
          />
          <SectionDivider />
          <ComponentList
            items={draft.items}
            onChange={(items) => updateDraft({ ...draft, items }, true)}
            onOpenChange={setItemSheetOpen}
          />
          <SectionDivider />
          <CheckboxFields
            options={detail.checkboxes}
            checkedIds={draft.checkedIds}
            onChange={(checkedIds) => updateDraft({ ...draft, checkedIds }, true)}
          />
          <SectionDivider />
          <NotesSection
            notes={draft.notes}
            onChange={(notes) => updateDraft({ ...draft, notes })}
          />
        </div>
      </div>

      {overlayOpen ? null : (
        <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button type="button" size="touch" className="w-full" onClick={openReview}>
            {he.leader.form.submit}
          </Button>
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
    </div>
  )
}

function AssignmentFacts({ detail }: { detail: LeaderDiaryDetail }) {
  return (
    <ul className="flex flex-col gap-2.5">
      <FactRow icon={MapPin} label={he.leader.form.site} value={detail.siteName || "—"} />
      <FactRow icon={Layers3} label={he.leader.form.subSite} value={detail.subSiteName || "—"} />
      <FactRow
        icon={FolderKanban}
        label={he.manager.diaries.project}
        value={detail.projectName || "—"}
      />
    </ul>
  )
}

function FactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <li className="min-w-0">
      <div className={fieldGridClass}>
        <FieldLead icon={Icon} />
        <div className="min-w-0">
          <div className="mb-0.5 truncate text-[11px] text-muted-foreground">{label}</div>
          <p className="truncate text-sm font-medium">{value}</p>
        </div>
      </div>
    </li>
  )
}

function WorkerFields({
  workers,
  sheetOpen,
  onSheetOpenChange,
  onChange,
}: {
  workers: DiaryDraft["workers"]
  sheetOpen: boolean
  onSheetOpenChange: (open: boolean) => void
  onChange: (workers: DiaryDraft["workers"]) => void
}) {
  const [name, setName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const named = workers.map((worker) => worker.fullName.trim()).filter(Boolean)

  useEffect(() => {
    if (!sheetOpen) return
    setName("")
    window.setTimeout(() => inputRef.current?.focus(), 50)
  }, [sheetOpen])

  const saveWorker = () => {
    const fullName = name.trim()
    if (!fullName) return
    onChange([...workers, { id: crypto.randomUUID(), fullName }])
    onSheetOpenChange(false)
  }

  return (
    <>
      <SectionShell
        icon={Users}
        title={he.leader.form.workersTitle}
        action={
          <button
            type="button"
            className={sectionAddClass}
            aria-label={he.leader.form.addWorker}
            onClick={() => onSheetOpenChange(true)}
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
        }
      >
        {named.length === 0 ? (
          <p className="text-xs text-muted-foreground">{he.leader.form.readOnlyWorkers}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {workers.map((worker) => {
              const label = worker.fullName.trim()
              if (!label) return null
              return (
                <li key={worker.id} className="flex items-center gap-2 py-1">
                  <span className="min-w-0 flex-1 truncate text-sm leading-5">{label}</span>
                  <button
                    type="button"
                    className="pressable inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground"
                    aria-label={he.leader.remove}
                    onClick={() => onChange(workers.filter((item) => item.id !== worker.id))}
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </SectionShell>

      <MobileFilterPicker
        open={sheetOpen}
        title={he.leader.form.addWorker}
        onClose={() => onSheetOpenChange(false)}
        footer={
          <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              size="touch"
              className="w-full"
              disabled={!name.trim()}
              onClick={saveWorker}
            >
              {he.manager.save}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 px-4 py-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-foreground">
              {he.leader.form.workerName}
            </span>
            <Input
              ref={inputRef}
              value={name}
              maxLength={80}
              placeholder={he.leader.form.workerName}
              className={fieldClass}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return
                event.preventDefault()
                saveWorker()
              }}
            />
          </label>
        </div>
      </MobileFilterPicker>
    </>
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

  const rows = items.flatMap((item) => {
    const component = db ? findComponent(db, item.componentId) : null
    const domain = component && db ? findDomain(db, component.domainId) : null
    if (!component || !domain) return []
    return [
      {
        id: item.id,
        domainName: domain.name,
        componentName: component.name,
        quantity: item.quantity,
        unit: component.unit,
      },
    ]
  })

  const setSheet = (next: boolean, itemId: string | null = null) => {
    setEditingId(itemId)
    setOpen(next)
    onOpenChange(next)
  }

  return (
    <SectionShell
      icon={Cable}
      title={he.leader.form.workTitle}
      action={
        <button
          type="button"
          className={sectionAddClass}
          aria-label={he.leader.form.addItem}
          onClick={() => setSheet(true, null)}
        >
          <Plus className="size-3.5" aria-hidden />
        </button>
      }
    >
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{he.leader.form.noComponents}</p>
      ) : (
        <div className="overflow-hidden rounded-sm border border-border/60">
          <table className="w-full table-fixed border-collapse text-xs">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[28%]" />
              <col className="w-[18%]" />
              <col className="w-[16%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground">
                <th className="px-2 py-1.5 text-start font-medium">{he.leader.form.system}</th>
                <th className="px-2 py-1.5 text-start font-medium">{he.leader.form.component}</th>
                <th className="px-2 py-1.5 text-start font-medium">{he.leader.form.quantity}</th>
                <th className="px-2 py-1.5 text-start font-medium">{he.leader.form.units}</th>
                <th className="px-1 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/40 last:border-b-0">
                  <td className="truncate px-2 py-2">
                    <button
                      type="button"
                      className="pressable block w-full truncate text-start"
                      onClick={() => setSheet(true, row.id)}
                    >
                      {row.domainName}
                    </button>
                  </td>
                  <td className="truncate px-2 py-2">
                    <button
                      type="button"
                      className="pressable block w-full truncate text-start"
                      onClick={() => setSheet(true, row.id)}
                    >
                      {row.componentName}
                    </button>
                  </td>
                  <td className="truncate px-2 py-2 tabular-nums">
                    {formatQuantity(row.quantity)}
                  </td>
                  <td className="truncate px-2 py-2">{row.unit}</td>
                  <td className="px-1 py-1">
                    <button
                      type="button"
                      className="pressable inline-flex size-7 items-center justify-center rounded-md text-muted-foreground"
                      aria-label={he.leader.remove}
                      onClick={() => onChange(items.filter((entry) => entry.id !== row.id))}
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ItemSheet
        key={open ? (editingId ?? "add") : "closed"}
        open={open}
        editingId={editingId}
        items={items}
        onOpenChange={(next) => setSheet(next, next ? editingId : null)}
        onChange={onChange}
      />
    </SectionShell>
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
  const [rawQuantity, setRawQuantity] = useState(() =>
    editing ? formatQuantity(editing.quantity) : ""
  )
  const [message, setMessage] = useState<"invalid" | "limit" | null>(null)
  const [domainPickerOpen, setDomainPickerOpen] = useState(false)
  const [componentPickerOpen, setComponentPickerOpen] = useState(false)

  const domain = domains.find((item) => item.id === domainId) ?? null
  const selected = domain?.components.find((item) => item.id === componentId) ?? null
  const unit = selected?.unit ?? stored?.unit ?? ""

  const commit = () => {
    const quantity = parseQuantityInput(rawQuantity)
    const nextComponentId =
      selected?.id ??
      (editing && componentId === editing.componentId ? editing.componentId : "")
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
      onChange(
        items.map((item) =>
          item.id === editingId ? { ...item, componentId: nextComponentId, quantity } : item
        )
      )
    } else {
      onChange([...items, { id: crypto.randomUUID(), componentId: nextComponentId, quantity }])
    }
    onOpenChange(false)
  }

  return (
    <MobileFilterPicker
      open={open}
      title={editing ? he.leader.edit : he.leader.form.addItem}
      onClose={() => onOpenChange(false)}
      footer={
        <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button type="button" size="touch" className="w-full" onClick={commit}>
            {editing ? he.manager.save : he.leader.form.addComponent}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-foreground">{he.leader.form.system}</span>
          <FilterTriggerControl
            className={fieldClass}
            label={domain?.name ?? he.leader.form.chooseDomain}
            muted={!domain}
            active={Boolean(domainId)}
            resetLabel={he.manager.dashboard.reset}
            onOpen={() => setDomainPickerOpen(true)}
            onReset={() => {
              setDomainId("")
              setComponentId("")
              setMessage(null)
            }}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-foreground">
            {he.leader.form.component}
          </span>
          <FilterTriggerControl
            className={fieldClass}
            label={
              selected?.name ??
              (stored && editing ? stored.name : he.leader.form.chooseComponent)
            }
            muted={!selected && !(stored && editing)}
            active={Boolean(componentId)}
            resetLabel={he.manager.dashboard.reset}
            onOpen={() => {
              if (!domain) {
                setDomainPickerOpen(true)
                return
              }
              setComponentPickerOpen(true)
            }}
            onReset={() => {
              setComponentId("")
              setMessage(null)
            }}
          />
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[11px] font-semibold text-foreground">
            {he.leader.form.quantity}
          </span>
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
            <span className="shrink-0 text-sm text-muted-foreground">{unit}</span>
          </span>
        </label>
        {message ? (
          <p className="text-sm leading-6 text-muted-foreground" aria-live="polite">
            {message === "limit" ? he.leader.form.quantityLimit : he.leader.form.quantityInvalid}
          </p>
        ) : null}
      </div>

      <MobileFilterPicker
        open={domainPickerOpen}
        title={he.leader.form.system}
        onClose={() => setDomainPickerOpen(false)}
      >
        <ul className="px-2 py-2">
          {domains.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={cn(
                  "pressable flex min-h-12 w-full items-center rounded-md px-3 text-start text-sm",
                  item.id === domainId && "bg-muted font-medium"
                )}
                onClick={() => {
                  setDomainId(item.id)
                  setComponentId("")
                  setMessage(null)
                  setDomainPickerOpen(false)
                }}
              >
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      </MobileFilterPicker>

      <MobileFilterPicker
        open={componentPickerOpen}
        title={he.leader.form.component}
        onClose={() => setComponentPickerOpen(false)}
      >
        <ul className="px-2 py-2">
          {domain ? (
            domain.components.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={cn(
                    "pressable flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-3 text-start text-sm",
                    item.id === componentId && "bg-muted font-medium"
                  )}
                  onClick={() => {
                    setComponentId(item.id)
                    setMessage(null)
                    setComponentPickerOpen(false)
                    window.setTimeout(() => quantityRef.current?.focus(), 50)
                  }}
                >
                  <span className="min-w-0 truncate">{item.name}</span>
                  <span className="shrink-0 text-muted-foreground">{item.unit}</span>
                </button>
              </li>
            ))
          ) : (
            <p className="px-3 py-3 text-sm text-muted-foreground">{he.leader.form.chooseDomain}</p>
          )}
        </ul>
      </MobileFilterPicker>
    </MobileFilterPicker>
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
    <SectionShell icon={Info} title={he.leader.form.checksTitle}>
      <ul className="flex flex-col">
        {options.map((option) => {
          const checked = checkedIds.includes(option.checkboxId)
          return (
            <li key={option.checkboxId}>
              <button
                type="button"
                aria-pressed={checked}
                className="flex min-h-10 w-full items-center gap-3 py-1.5 text-start text-sm"
                onClick={() =>
                  onChange(
                    checked
                      ? checkedIds.filter((id) => id !== option.checkboxId)
                      : [...checkedIds, option.checkboxId]
                  )
                }
              >
                <span
                  className={cn(
                    "inline-flex size-4 shrink-0 items-center justify-center rounded-full border",
                    checked ? "border-primary" : "border-muted-foreground/50"
                  )}
                  aria-hidden
                >
                  {checked ? <span className="size-2 rounded-full bg-primary" /> : null}
                </span>
                <span className={cn("min-w-0 flex-1 leading-5", checked && "font-medium")}>
                  {option.label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </SectionShell>
  )
}

function NotesSection({
  notes,
  onChange,
}: {
  notes: string
  onChange: (value: string) => void
}) {
  return (
    <SectionShell icon={MessageSquareText} title={he.leader.form.notesTitle}>
      <textarea
        value={notes}
        maxLength={2000}
        placeholder={he.leader.form.notesPlaceholder}
        className="min-h-24 w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        onChange={(event) => onChange(event.target.value)}
      />
    </SectionShell>
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
        domainName: domain.name,
        componentName: component.name,
        quantity: item.quantity,
        unit: component.unit,
      },
    ]
  })
  const checks = detail.checkboxes.filter((option) =>
    draft.checkedIds.includes(option.checkboxId)
  )
  const notes = draft.notes.trim()

  return (
    <MobileFilterPicker
      open={open}
      title={he.leader.review.title}
      showClose={false}
      onClose={() => onOpenChange(false)}
      footer={
        <div className="flex shrink-0 flex-col gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p className="text-sm leading-6 text-muted-foreground">{he.leader.review.warning}</p>
          {submitError ? (
            <p className="text-sm leading-6 text-muted-foreground">{he.leader.review.invalid}</p>
          ) : null}
          <Button type="button" size="touch" className="w-full" onClick={onConfirm}>
            {he.leader.review.confirm}
          </Button>
          <Button
            type="button"
            size="touch"
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            {he.leader.review.cancel}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6 px-4 py-3 text-sm">
        <div className="grid grid-cols-[1rem_minmax(0,1fr)] items-center gap-x-2">
          <FileText className="size-4 justify-self-center text-muted-foreground" aria-hidden />
          <p className="truncate text-sm font-semibold text-foreground">
            {formatWorkDate(detail.workDate)}
          </p>
        </div>

        <ul className="flex flex-col gap-2.5">
          <FactRow icon={MapPin} label={he.leader.form.site} value={detail.siteName || "—"} />
          <FactRow icon={Layers3} label={he.leader.form.subSite} value={detail.subSiteName || "—"} />
          <FactRow
            icon={FolderKanban}
            label={he.manager.diaries.project}
            value={detail.projectName || "—"}
          />
        </ul>

        <SectionDivider />

        <SectionShell icon={Users} title={he.leader.form.workersTitle}>
          {workers.length === 0 ? (
            <p className="text-xs text-muted-foreground">{he.leader.review.noWorkers}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {workers.map((name, index) => (
                <li key={`${name}-${index}`} className="py-1 text-sm leading-5">
                  {name}
                </li>
              ))}
            </ul>
          )}
        </SectionShell>

        <SectionDivider />

        <SectionShell icon={Cable} title={he.leader.form.workTitle}>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">{he.leader.review.noItems}</p>
          ) : (
            <div className="overflow-hidden rounded-sm border border-border/60">
              <table className="w-full table-fixed border-collapse text-xs">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[30%]" />
                  <col className="w-[20%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground">
                    <th className="px-2 py-1.5 text-start font-medium">{he.leader.form.system}</th>
                    <th className="px-2 py-1.5 text-start font-medium">
                      {he.leader.form.component}
                    </th>
                    <th className="px-2 py-1.5 text-start font-medium">
                      {he.leader.form.quantity}
                    </th>
                    <th className="px-2 py-1.5 text-start font-medium">{he.leader.form.units}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-border/40 last:border-b-0">
                      <td className="truncate px-2 py-2">{item.domainName}</td>
                      <td className="truncate px-2 py-2">{item.componentName}</td>
                      <td className="truncate px-2 py-2 tabular-nums">
                        {formatQuantity(item.quantity)}
                      </td>
                      <td className="truncate px-2 py-2">{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionShell>

        <SectionDivider />

        <SectionShell icon={Info} title={he.leader.form.checksTitle}>
          {checks.length === 0 ? (
            <p className="text-xs text-muted-foreground">{he.leader.review.noChecks}</p>
          ) : (
            <ul className="flex flex-col">
              {checks.map((option) => (
                <li
                  key={option.checkboxId}
                  className="flex min-h-10 items-center gap-3 py-1.5 text-sm"
                >
                  <span
                    className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-primary"
                    aria-hidden
                  >
                    <span className="size-2 rounded-full bg-primary" />
                  </span>
                  <span className="min-w-0 flex-1 leading-5 font-medium">{option.label}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionShell>

        <SectionDivider />

        <SectionShell icon={MessageSquareText} title={he.leader.form.notesTitle}>
          <p className="text-sm leading-5">{notes || he.leader.review.noNotes}</p>
        </SectionShell>
      </div>
    </MobileFilterPicker>
  )
}

function ReadOnlyDiary({ detail }: { detail: LeaderDiaryDetail }) {
  const checks = detail.checkboxes.filter((option) => option.checked)
  const cancelled = detail.status === "cancelled"
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelHeader detail={detail} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="flex flex-col gap-6 text-sm">
          <div
            className={cn(
              "rounded-md border px-3 py-2.5 text-center text-sm leading-6",
              cancelled
                ? "border-border bg-muted text-muted-foreground"
                : "border-emerald-500/25 bg-emerald-500/10 text-emerald-500"
            )}
          >
            <p>
              {cancelled ? he.leader.form.cancelledBanner : he.leader.form.submittedBanner}
            </p>
            {detail.submittedAt ? (
              <p>
                {he.leader.form.submittedOn} - {formatDateTime(detail.submittedAt)}
              </p>
            ) : null}
          </div>
          <AssignmentFacts detail={detail} />
          <SectionDivider />
          <SectionShell icon={Users} title={he.leader.form.workersTitle}>
            {detail.workers.length === 0 ? (
              <p className="text-xs text-muted-foreground">{he.leader.form.readOnlyWorkers}</p>
            ) : (
              <p className="text-sm leading-5">
                {detail.workers.map((worker, index) => (
                  <span key={worker.id}>
                    {index > 0 ? (
                      <span className="mx-1.5 text-muted-foreground">·</span>
                    ) : null}
                    {worker.fullName}
                  </span>
                ))}
              </p>
            )}
          </SectionShell>
          <SectionDivider />
          <SectionShell icon={Cable} title={he.leader.form.workTitle}>
            {detail.items.length === 0 ? (
              <p className="text-xs text-muted-foreground">{he.leader.form.readOnlyItems}</p>
            ) : (
              <div className="overflow-hidden rounded-sm border border-border/60">
                <table className="w-full table-fixed border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground">
                      <th className="px-2 py-1.5 text-start font-medium">
                        {he.leader.form.system}
                      </th>
                      <th className="px-2 py-1.5 text-start font-medium">
                        {he.leader.form.component}
                      </th>
                      <th className="px-2 py-1.5 text-start font-medium">
                        {he.leader.form.quantity}
                      </th>
                      <th className="px-2 py-1.5 text-start font-medium">
                        {he.leader.form.units}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item) => (
                      <tr key={item.id} className="border-b border-border/40 last:border-b-0">
                        <td className="truncate px-2 py-2">{item.domainName}</td>
                        <td className="truncate px-2 py-2">{item.componentName}</td>
                        <td className="truncate px-2 py-2 tabular-nums">
                          {formatQuantity(item.quantity)}
                        </td>
                        <td className="truncate px-2 py-2">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionShell>
          <SectionDivider />
          <SectionShell icon={Info} title={he.leader.form.checksTitle}>
            {checks.length === 0 ? (
              <p className="text-xs text-muted-foreground">{he.leader.form.readOnlyChecks}</p>
            ) : (
              <p className="text-sm leading-5">
                {checks.map((option, index) => (
                  <span key={option.checkboxId}>
                    {index > 0 ? (
                      <span className="mx-1.5 text-muted-foreground">·</span>
                    ) : null}
                    {option.label}
                  </span>
                ))}
              </p>
            )}
          </SectionShell>
          <SectionDivider />
          <SectionShell icon={MessageSquareText} title={he.leader.form.notesTitle}>
            <p className="text-sm leading-5">
              {detail.notes.trim() || he.leader.form.readOnlyNotes}
            </p>
          </SectionShell>
        </div>
      </div>
    </div>
  )
}

function SectionShell({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: LucideIcon
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <h3 className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-wide text-muted-foreground">
          {title}
        </h3>
        {action}
      </div>
      <div className="min-w-0 ps-[calc(0.875rem+0.5rem)]">{children}</div>
    </section>
  )
}

function SectionDivider() {
  return <div className="mx-8 my-1 h-px bg-border/40" aria-hidden />
}

const sectionAddClass =
  "pressable inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground outline-none"

function FieldLead({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="relative inline-flex size-4 shrink-0 items-center justify-center justify-self-center">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
    </span>
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
