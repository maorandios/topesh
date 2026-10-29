"use client"

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import {
  Building2,
  Cable,
  FileText,
  FolderKanban,
  Info,
  Layers3,
  MapPin,
  MessageSquareText,
  Plus,
  Settings,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { findCompany, findCustomer, findSite, findUser, activeDomainsFrom } from "@/data/lookups"
import { getManagerDiary } from "@/data/manager"
import { parseQuantityInput } from "@/data/quantity"
import type { MockDb } from "@/data/seed"
import type { DiaryStatus } from "@/domain/types"
import { he } from "@/i18n/he"
import { formatDateTime, formatQuantity, formatWorkDate } from "@/lib/format"
import { BidiText } from "@/lib/bidi"
import { cn } from "cn"

const panelSurfaceClass =
  "border-border/40 bg-white/92 shadow-lg backdrop-blur-xl dark:border-border/40 dark:bg-background/90"

const panelSurfaceStyle = {
  backgroundColor: "rgb(255 255 255 / 0.92)",
  WebkitBackdropFilter: "blur(16px)",
  backdropFilter: "blur(16px)",
} as const

type PanelDiary = NonNullable<ReturnType<typeof getManagerDiary>>
type DraftItem = {
  id: string
  componentId: string
  domainName: string
  componentName: string
  unit: string
  quantity: string
}
type PanelDraft = {
  companyId: string
  customerId: string
  siteId: string
  subSiteName: string
  projectName: string
  workOrderNumber: string
  teamLeaderId: string
  workers: { id: string; fullName: string }[]
  items: DraftItem[]
  checkedIds: string[]
  notes: string
}
type ConfirmKind = "cancel" | "delete"
type TextField = "project" | "subSite" | "workOrder" | "notes" | `qty:${string}` | null

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
  const title = diary
    ? `${he.manager.panel.workDiaryForDate} ${formatWorkDate(diary.workDate)}`
    : he.manager.dashboard.title
  const body = diary ? (
    <DiaryBody key={diary.id} db={db} diary={diary} title={title} onClose={() => onOpenChange(false)} />
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

function PanelHeader({
  title,
  diary,
  menu,
}: {
  title: string
  diary: PanelDiary
  menu: ReactNode
}) {
  const statusAt =
    diary.status === "submitted"
      ? diary.submittedAt
      : diary.status === "cancelled"
        ? diary.cancelledAt
        : null

  return (
    <div className="flex items-start gap-2">
      <div className="grid min-w-0 flex-1 grid-cols-[1rem_minmax(0,1fr)] items-center gap-x-2 gap-y-2.5">
        <FileText className="size-4 justify-self-center text-muted-foreground" aria-hidden />
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <span
          className={cn(
            "size-2 justify-self-center rounded-full",
            diary.status === "pending" && "bg-orange-500",
            diary.status === "submitted" && "bg-emerald-500",
            diary.status === "cancelled" && "bg-muted-foreground/50"
          )}
          aria-hidden
        />
        <p className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs leading-none text-muted-foreground">
          <span>{diaryStatusLabel(diary.status)}</span>
          {statusAt ? (
            <>
              <span className="size-1 rounded-full bg-muted-foreground/50" aria-hidden />
              <span>{formatDateTime(statusAt)}</span>
            </>
          ) : null}
        </p>
      </div>
      {menu}
    </div>
  )
}

function createDraft(diary: PanelDiary): PanelDraft {
  return {
    companyId: diary.companyId,
    customerId: diary.customerId,
    siteId: diary.siteId,
    subSiteName: diary.subSiteName,
    projectName: diary.projectName,
    workOrderNumber: diary.workOrderNumber,
    teamLeaderId: diary.teamLeaderId,
    workers: diary.workers.map((worker) => ({ ...worker })),
    items: diary.items.map((item) => ({
      id: item.id,
      componentId: item.componentId,
      domainName: item.domainName,
      componentName: item.componentName,
      unit: item.unit,
      quantity: quantityField(item.quantity),
    })),
    checkedIds: diary.checkboxes.filter((item) => item.checked).map((item) => item.checkboxId),
    notes: diary.notes,
  }
}

function DiaryBody({
  db,
  diary,
  title,
  onClose,
}: {
  db: MockDb
  diary: PanelDiary
  title: string
  onClose: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<PanelDraft | null>(null)
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null)
  const [error, setError] = useState(false)

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

  const save = () => {
    if (!draft) return
    const parsedItems: { id: string; componentId: string; quantity: number }[] = []
    for (const item of draft.items) {
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
        teamLeaderId: draft.teamLeaderId,
        workDate: diary.workDate,
        companyId: draft.companyId,
        customerId: draft.customerId,
        siteId: draft.siteId,
        subSiteName: draft.subSiteName,
        projectName: draft.projectName,
        workOrderNumber: draft.workOrderNumber,
      },
      {
        workers: draft.workers,
        items: parsedItems,
        checkedIds: draft.checkedIds,
        notes: draft.notes,
      }
    )
    setError(!result.ok)
    if (result.ok) {
      toast(he.manager.panel.saved)
      setEditing(false)
      setDraft(null)
    }
  }

  const exitEdit = () => {
    setEditing(false)
    setDraft(null)
    setError(false)
  }

  const headerActions = (
    <div className="flex shrink-0 items-center gap-1.5">
      {editing ? (
        <Badge
          variant="outline"
          render={
            <button
              type="button"
              onClick={exitEdit}
              aria-label={he.manager.panel.cancelEdit}
            />
          }
          className="h-7 cursor-pointer gap-1 rounded-full border-border bg-muted/50 px-2.5 text-xs font-medium text-foreground hover:bg-muted"
        >
          <X data-icon="inline-start" className="size-3.5" aria-hidden />
          {he.manager.panel.cancelEdit}
        </Badge>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground outline-none hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label={he.manager.edit}
        >
          <Settings className="size-4" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="min-w-44 rounded-md p-1.5">
          {editing ? (
            <>
              <DropdownMenuItem className="rounded-md px-3 py-2" onClick={save}>
                {he.manager.save}
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-md px-3 py-2" onClick={exitEdit}>
                {he.manager.panel.cancelEdit}
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem
                className="rounded-md px-3 py-2"
                onClick={() => {
                  setDraft(createDraft(diary))
                  setEditing(true)
                  setError(false)
                }}
              >
                {he.manager.edit}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-md px-3 py-2"
                disabled={diary.status === "cancelled"}
                onClick={() => setConfirm("cancel")}
              >
                {he.manager.panel.cancelDiary}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-md px-3 py-2"
                variant="destructive"
                onClick={() => setConfirm("delete")}
              >
                {he.manager.panel.deleteDiary}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col transition-[filter,opacity] duration-200",
          confirm && "pointer-events-none select-none opacity-45 blur-[3px]"
        )}
        aria-hidden={confirm ? true : undefined}
      >
        <div className="shrink-0 px-4 py-3">
          <PanelHeader title={title} diary={diary} menu={headerActions} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <DiaryView
            db={db}
            diary={diary}
            draft={editing ? draft : null}
            onDraftChange={setDraft}
          />
          {error ? <p className="mt-3 text-sm text-muted-foreground">{he.manager.invalid}</p> : null}
        </div>
      </div>

      {confirm ? (
        <>
          <button
            type="button"
            aria-label={he.manager.panel.abortAction}
            className="absolute inset-0 z-20 border-0 bg-transparent"
            onClick={() => setConfirm(null)}
          />
          <div className="absolute inset-x-0 bottom-0 z-30 animate-in slide-in-from-bottom-4 fade-in duration-200 rounded-t-xl border border-border/50 border-b-0 bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/25" aria-hidden />
            <p className="mb-1 text-sm font-medium text-foreground">
              {confirm === "delete" ? he.manager.panel.deleteDiary : he.manager.panel.cancelDiary}
            </p>
            <p className="mb-4 text-sm leading-5 text-muted-foreground">
              {confirm === "delete" ? he.manager.panel.deleteConfirm : he.manager.panel.cancelConfirm}
            </p>
            <div className="flex w-full gap-2">
              <Button
                type="button"
                size="default"
                variant="outline"
                className="h-10 w-[30%] px-2"
                onClick={() => setConfirm(null)}
              >
                {he.manager.panel.abortAction}
              </Button>
              <Button type="button" size="default" className="h-10 w-[70%] px-2" onClick={runConfirm}>
                {confirm === "delete" ? he.manager.panel.deleteAction : he.manager.panel.cancelAction}
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

function DiaryView({
  db,
  diary,
  draft,
  onDraftChange,
}: {
  db: MockDb
  diary: PanelDiary
  draft: PanelDraft | null
  onDraftChange: (draft: PanelDraft) => void
}) {
  const editing = draft !== null
  const [textField, setTextField] = useState<TextField>(null)
  const companyId = draft?.companyId ?? diary.companyId
  const customerId = draft?.customerId ?? diary.customerId
  const siteId = draft?.siteId ?? diary.siteId
  const teamLeaderId = draft?.teamLeaderId ?? diary.teamLeaderId
  const projectName = draft?.projectName ?? diary.projectName
  const subSiteName = draft?.subSiteName ?? diary.subSiteName
  const workOrderNumber = draft?.workOrderNumber ?? diary.workOrderNumber
  const workers = draft?.workers ?? diary.workers
  const items = draft?.items ?? diary.items.map((item) => ({
    id: item.id,
    componentId: item.componentId,
    domainName: item.domainName,
    componentName: item.componentName,
    unit: item.unit,
    quantity: quantityField(item.quantity),
  }))
  const checkedIds =
    draft?.checkedIds ?? diary.checkboxes.filter((item) => item.checked).map((item) => item.checkboxId)
  const notes = draft?.notes ?? diary.notes

  const companyName = findCompany(db, companyId)?.name ?? diary.companyName
  const customerName = findCustomer(db, customerId)?.name ?? diary.customerName
  const siteName = findSite(db, siteId)?.name ?? diary.siteName
  const teamLeaderName = findUser(db, teamLeaderId)?.fullName ?? diary.teamLeaderName

  const companies = db.companies.filter((item) => item.isActive || item.id === companyId)
  const customers = db.customers.filter((item) => item.isActive || item.id === customerId)
  const sites = db.sites.filter((item) => item.isActive || item.id === siteId)
  const leaders = db.users.filter(
    (user) => user.role === "teamLeader" && (user.isActive || user.id === teamLeaderId)
  )
  const checkDefs = db.checkboxDefinitions
    .filter((item) => item.isActive || checkedIds.includes(item.id))
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const domains = activeDomainsFrom(db)
  const allComponents = domains.flatMap((domain) =>
    domain.components.map((component) => ({
      id: component.id,
      name: component.name,
      unit: component.unit,
      domainName: domain.name,
    }))
  )
  const checkedLabels = checkDefs
    .filter((item) => checkedIds.includes(item.id))
    .map((item) => item.label)

  const update = (patch: Partial<PanelDraft>) => {
    if (!draft) return
    onDraftChange({ ...draft, ...patch })
  }

  useEffect(() => {
    if (!editing) setTextField(null)
  }, [editing])

  return (
    <div className="flex flex-col gap-4 text-sm">
      <ul className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        <FactSelect
          editing={editing}
          icon={Building2}
          label={he.manager.dashboard.columns.company}
          display={companyName}
          value={companyId}
          options={companies.map((item) => ({ value: item.id, label: item.name }))}
          onChange={(value) => update({ companyId: value })}
        />
        <FactSelect
          editing={editing}
          icon={Users}
          label={he.manager.dashboard.columns.customer}
          display={customerName}
          value={customerId}
          options={customers.map((item) => ({ value: item.id, label: item.name }))}
          onChange={(value) => update({ customerId: value })}
        />
        <FactSelect
          editing={editing}
          icon={MapPin}
          label={he.manager.dashboard.columns.site}
          display={siteName}
          value={siteId}
          options={sites.map((item) => ({ value: item.id, label: item.name }))}
          onChange={(value) => update({ siteId: value })}
        />
        <FactText
          editing={editing}
          active={textField === "project"}
          icon={FolderKanban}
          label={he.manager.diaries.project}
          value={projectName || "—"}
          draftValue={projectName}
          onActivate={() => setTextField("project")}
          onChange={(value) => update({ projectName: value })}
          onDone={() => setTextField(null)}
        />
        <FactText
          editing={editing}
          active={textField === "subSite"}
          icon={Layers3}
          label={he.manager.dashboard.columns.subSite}
          value={subSiteName}
          draftValue={subSiteName}
          onActivate={() => setTextField("subSite")}
          onChange={(value) => update({ subSiteName: value })}
          onDone={() => setTextField(null)}
        />
        <FactSelect
          editing={editing}
          icon={UserRound}
          label={he.manager.dashboard.columns.leader}
          display={teamLeaderName}
          value={teamLeaderId}
          options={leaders.map((item) => ({ value: item.id, label: item.fullName }))}
          onChange={(value) => update({ teamLeaderId: value })}
        />
        <FactText
          editing={editing}
          active={textField === "workOrder"}
          icon={FileText}
          label={he.manager.diaries.workOrder}
          value={<BidiText>{workOrderNumber}</BidiText>}
          draftValue={workOrderNumber}
          dir="ltr"
          onActivate={() => setTextField("workOrder")}
          onChange={(value) => update({ workOrderNumber: value })}
          onDone={() => setTextField(null)}
        />
      </ul>

      <SectionDivider />
      <WorkersSection
        editing={editing}
        workers={workers}
        onChange={(next) => update({ workers: next })}
      />
      <SectionDivider />
      <InstallationsTable
        editing={editing}
        items={items}
        components={allComponents}
        textField={textField}
        onActivateQty={(id) => setTextField(`qty:${id}`)}
        onDoneQty={() => setTextField(null)}
        onChange={(next) => update({ items: next })}
      />
      <SectionDivider />
      <SafetySection
        editing={editing}
        labels={checkedLabels}
        options={checkDefs}
        checkedIds={checkedIds}
        onChange={(next) => update({ checkedIds: next })}
      />
      <SectionDivider />
      <NotesSection
        editing={editing}
        active={textField === "notes"}
        notes={notes}
        onActivate={() => setTextField("notes")}
        onChange={(value) => update({ notes: value })}
        onDone={() => setTextField(null)}
      />
    </div>
  )
}

function FactSelect({
  editing,
  icon: Icon,
  label,
  display,
  value,
  options,
  onChange,
}: {
  editing: boolean
  icon: LucideIcon
  label: string
  display: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  const body = (
    <>
      <div className="mb-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="size-3 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <p className="truncate ps-4 text-sm font-medium">{display}</p>
    </>
  )
  if (!editing) return <li className="min-w-0">{body}</li>
  return (
    <li className="min-w-0">
      <DropdownMenu>
        <DropdownMenuTrigger className={editTriggerClass}>{body}</DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={6} className="max-h-52 min-w-44 rounded-md p-1.5">
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value} className="rounded-md px-3 py-2">
                <span className="truncate">{option.label}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}

function FactText({
  editing,
  active,
  icon: Icon,
  label,
  value,
  draftValue,
  dir,
  onActivate,
  onChange,
  onDone,
}: {
  editing: boolean
  active: boolean
  icon: LucideIcon
  label: string
  value: ReactNode
  draftValue: string
  dir?: "ltr" | "rtl"
  onActivate: () => void
  onChange: (value: string) => void
  onDone: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (active) inputRef.current?.focus()
  }, [active])

  if (!editing) {
    return (
      <li className="min-w-0">
        <div className="mb-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Icon className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{label}</span>
        </div>
        <p className="truncate ps-4 text-sm font-medium">{value}</p>
      </li>
    )
  }

  if (active) {
    return (
      <li className="min-w-0">
        <div className="mb-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Icon className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{label}</span>
        </div>
        <Input
          ref={inputRef}
          dir={dir}
          value={draftValue}
          className="ms-4 h-7 w-[calc(100%-1rem)] border-0 bg-muted/40 px-1.5 text-sm font-medium shadow-none md:text-sm"
          onChange={(event) => onChange(event.target.value)}
          onBlur={onDone}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Escape") onDone()
          }}
        />
      </li>
    )
  }

  return (
    <li className="min-w-0">
      <button type="button" className={editTriggerClass} onClick={onActivate}>
        <div className="mb-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Icon className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{label}</span>
        </div>
        <p className="truncate ps-4 text-start text-sm font-medium">{value || "—"}</p>
      </button>
    </li>
  )
}

function WorkersSection({
  editing,
  workers,
  onChange,
}: {
  editing: boolean
  workers: PanelDraft["workers"]
  onChange: (workers: PanelDraft["workers"]) => void
}) {
  const names = workers.map((worker) => worker.fullName.trim()).filter(Boolean)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!editing) setOpen(false)
  }, [editing])

  const content =
    names.length === 0 ? (
      <p className="text-xs text-muted-foreground">{he.leader.form.readOnlyWorkers}</p>
    ) : (
      <p className="text-sm leading-5">
        {names.map((name, index) => (
          <span key={`${name}-${index}`}>
            {index > 0 ? <span className="mx-1.5 text-muted-foreground">·</span> : null}
            {name}
          </span>
        ))}
      </p>
    )

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle icon={Users}>{he.leader.form.workersTitle}</SectionTitle>
        {editing ? (
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger className={sectionAddClass}>
              <Plus className="size-3.5" aria-hidden />
              <span className="sr-only">{he.leader.form.addWorker}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="w-72 rounded-md p-2">
              <div className="flex flex-col gap-2">
                {(workers.length > 0 ? workers : [{ id: crypto.randomUUID(), fullName: "" }]).map((worker) => (
                  <div key={worker.id} className="flex items-center gap-1.5">
                    <Input
                      value={worker.fullName}
                      placeholder={he.leader.form.workerName}
                      className="h-9 text-sm md:text-sm"
                      onChange={(event) => {
                        const exists = workers.some((item) => item.id === worker.id)
                        const next = exists
                          ? workers.map((item) =>
                              item.id === worker.id ? { ...item, fullName: event.target.value } : item
                            )
                          : [...workers, { ...worker, fullName: event.target.value }]
                        onChange(next)
                      }}
                    />
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => onChange(workers.filter((item) => item.id !== worker.id))}
                    >
                      <X className="size-3.5" />
                      <span className="sr-only">{he.leader.remove}</span>
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="self-start"
                  onClick={() => onChange([...workers, { id: crypto.randomUUID(), fullName: "" }])}
                >
                  <Plus className="size-3.5" />
                  {he.leader.form.addWorker}
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      {content}
    </section>
  )
}

function InstallationsTable({
  editing,
  items,
  components,
  textField,
  onActivateQty,
  onDoneQty,
  onChange,
}: {
  editing: boolean
  items: DraftItem[]
  components: Array<{ id: string; name: string; unit: string; domainName: string }>
  textField: TextField
  onActivateQty: (id: string) => void
  onDoneQty: () => void
  onChange: (items: DraftItem[]) => void
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle icon={Cable}>{he.leader.form.workTitle}</SectionTitle>
        {editing ? (
          <DropdownMenu>
            <DropdownMenuTrigger className={sectionAddClass}>
              <Plus className="size-3.5" aria-hidden />
              <span className="sr-only">{he.leader.form.addItem}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="max-h-52 min-w-52 rounded-md p-1.5">
              {components.map((component) => (
                <DropdownMenuItem
                  key={component.id}
                  className="rounded-md px-3 py-2"
                  onClick={() => {
                    const existing = items.find((item) => item.componentId === component.id)
                    if (existing) return
                    onChange([
                      ...items,
                      {
                        id: crypto.randomUUID(),
                        componentId: component.id,
                        domainName: component.domainName,
                        componentName: component.name,
                        unit: component.unit,
                        quantity: "1",
                      },
                    ])
                  }}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{component.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{component.domainName}</span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      {items.length === 0 ? (
        editing ? (
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(editTriggerClass, "text-start")}>
              <p className="text-xs text-muted-foreground">{he.leader.form.readOnlyItems}</p>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={6} className="max-h-52 min-w-52 rounded-md p-1.5">
              {components.map((component) => (
                <DropdownMenuItem
                  key={component.id}
                  className="rounded-md px-3 py-2"
                  onClick={() => {
                    onChange([
                      {
                        id: crypto.randomUUID(),
                        componentId: component.id,
                        domainName: component.domainName,
                        componentName: component.name,
                        unit: component.unit,
                        quantity: "1",
                      },
                    ])
                  }}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{component.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{component.domainName}</span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <p className="text-xs text-muted-foreground">{he.leader.form.readOnlyItems}</p>
        )
      ) : (
        <div className="overflow-hidden rounded-sm border border-border/60">
          <table className="w-full table-fixed border-collapse text-xs">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[28%]" />
              <col className="w-[22%]" />
              <col className="w-[22%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground">
                <th className="px-2.5 py-1.5 text-start font-medium">{he.leader.form.system}</th>
                <th className="px-2.5 py-1.5 text-start font-medium">{he.leader.form.component}</th>
                <th className="px-2.5 py-1.5 text-start font-medium">{he.leader.form.quantity}</th>
                <th className="px-2.5 py-1.5 text-start font-medium">{he.leader.form.units}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const qtyActive = textField === `qty:${item.id}`
                return (
                  <tr key={item.id} className="group/row border-b border-border/40 last:border-b-0">
                    <td className="truncate px-2.5 py-1.5">
                      {editing ? (
                        <ComponentPicker
                          item={item}
                          components={components}
                          onPick={(component) =>
                            onChange(
                              items.map((entry) =>
                                entry.id === item.id
                                  ? {
                                      ...entry,
                                      componentId: component.id,
                                      domainName: component.domainName,
                                      componentName: component.name,
                                      unit: component.unit,
                                    }
                                  : entry
                              )
                            )
                          }
                        >
                          <span className="block truncate">{item.domainName}</span>
                        </ComponentPicker>
                      ) : (
                        item.domainName
                      )}
                    </td>
                    <td className="relative truncate px-2.5 py-1.5">
                      {editing ? (
                        <>
                          <ComponentPicker
                            item={item}
                            components={components}
                            onPick={(component) =>
                              onChange(
                                items.map((entry) =>
                                  entry.id === item.id
                                    ? {
                                        ...entry,
                                        componentId: component.id,
                                        domainName: component.domainName,
                                        componentName: component.name,
                                        unit: component.unit,
                                      }
                                    : entry
                                )
                              )
                            }
                          >
                            <span className="block truncate">{item.componentName}</span>
                          </ComponentPicker>
                          <button
                            type="button"
                            className="absolute end-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover/row:opacity-100"
                            onClick={() => onChange(items.filter((entry) => entry.id !== item.id))}
                          >
                            <X className="size-3" />
                            <span className="sr-only">{he.leader.remove}</span>
                          </button>
                        </>
                      ) : (
                        item.componentName
                      )}
                    </td>
                    <td className="truncate px-2.5 py-1.5 tabular-nums">
                      {editing && qtyActive ? (
                        <InlineQtyInput
                          value={item.quantity}
                          onChange={(value) =>
                            onChange(
                              items.map((entry) =>
                                entry.id === item.id ? { ...entry, quantity: value } : entry
                              )
                            )
                          }
                          onDone={onDoneQty}
                        />
                      ) : editing ? (
                        <button
                          type="button"
                          className={editTriggerClass}
                          onClick={() => onActivateQty(item.id)}
                        >
                          <span className="truncate">{formatQuantity(Number(item.quantity) || 0)}</span>
                        </button>
                      ) : (
                        formatQuantity(Number(item.quantity) || 0)
                      )}
                    </td>
                    <td className="truncate px-2.5 py-1.5">{item.unit}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function ComponentPicker({
  item,
  components,
  onPick,
  children,
}: {
  item: DraftItem
  components: Array<{ id: string; name: string; unit: string; domainName: string }>
  onPick: (component: { id: string; name: string; unit: string; domainName: string }) => void
  children: ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={editTriggerClass}>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="max-h-52 min-w-52 rounded-md p-1.5">
        <DropdownMenuRadioGroup
          value={item.componentId}
          onValueChange={(value) => {
            const component = components.find((entry) => entry.id === value)
            if (component) onPick(component)
          }}
        >
          {components.map((component) => (
            <DropdownMenuRadioItem key={component.id} value={component.id} className="rounded-md px-3 py-2">
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{component.name}</span>
                <span className="truncate text-xs text-muted-foreground">{component.domainName}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function InlineQtyInput({
  value,
  onChange,
  onDone,
}: {
  value: string
  onChange: (value: string) => void
  onDone: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])
  return (
    <Input
      ref={ref}
      dir="ltr"
      inputMode="decimal"
      value={value}
      className="h-7 w-full min-w-0 border-0 bg-muted/40 px-1 text-xs shadow-none md:text-xs"
      onChange={(event) => onChange(event.target.value)}
      onBlur={onDone}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === "Escape") onDone()
      }}
    />
  )
}

function SafetySection({
  editing,
  labels,
  options,
  checkedIds,
  onChange,
}: {
  editing: boolean
  labels: string[]
  options: MockDb["checkboxDefinitions"]
  checkedIds: string[]
  onChange: (ids: string[]) => void
}) {
  const content =
    labels.length === 0 ? (
      <p className="text-xs text-muted-foreground">{he.leader.form.readOnlyChecks}</p>
    ) : (
      <p className="text-sm leading-5">
        {labels.map((label, index) => (
          <span key={`${label}-${index}`}>
            {index > 0 ? <span className="mx-1.5 text-muted-foreground">·</span> : null}
            {label}
          </span>
        ))}
      </p>
    )

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle icon={Info}>{he.leader.form.checksTitle}</SectionTitle>
        {editing ? (
          <DropdownMenu>
            <DropdownMenuTrigger className={sectionAddClass}>
              <Plus className="size-3.5" aria-hidden />
              <span className="sr-only">{he.leader.form.checksTitle}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="min-w-52 rounded-md p-1.5">
              {options.map((option) => {
                const checked = checkedIds.includes(option.id)
                return (
                  <DropdownMenuCheckboxItem
                    key={option.id}
                    checked={checked}
                    className="rounded-md px-3 py-2"
                    onCheckedChange={(next) =>
                      onChange(next ? [...checkedIds, option.id] : checkedIds.filter((id) => id !== option.id))
                    }
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      {content}
    </section>
  )
}

function NotesSection({
  editing,
  active,
  notes,
  onActivate,
  onChange,
  onDone,
}: {
  editing: boolean
  active: boolean
  notes: string
  onActivate: () => void
  onChange: (value: string) => void
  onDone: () => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (active) ref.current?.focus()
  }, [active])

  return (
    <section className="flex flex-col gap-1.5">
      <SectionTitle icon={MessageSquareText}>{he.leader.form.notesTitle}</SectionTitle>
      {!editing ? (
        notes.trim() ? (
          <p className="text-sm leading-5">{notes.trim()}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{he.leader.form.readOnlyNotes}</p>
        )
      ) : active ? (
        <textarea
          ref={ref}
          value={notes}
          maxLength={2000}
          placeholder={he.leader.form.notesPlaceholder}
          className="min-h-20 w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          onChange={(event) => onChange(event.target.value)}
          onBlur={onDone}
        />
      ) : (
        <button type="button" className={editTriggerClass} onClick={onActivate}>
          {notes.trim() ? (
            <p className="text-sm leading-5">{notes.trim()}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{he.leader.form.readOnlyNotes}</p>
          )}
        </button>
      )}
    </section>
  )
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground">
      <Icon className="size-3" aria-hidden />
      {children}
    </h3>
  )
}

function SectionDivider() {
  return <div className="mx-8 h-px bg-border/40" aria-hidden />
}

const editTriggerClass = cn(
  "m-0 box-border flex w-full min-w-0 cursor-pointer flex-col items-stretch border-0 bg-transparent p-0",
  "text-start text-sm font-normal leading-5 text-foreground shadow-none outline-none",
  "rounded-md hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/40"
)

const sectionAddClass =
  "inline-flex size-7 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground shadow-none outline-none hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"

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
