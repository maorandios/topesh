"use client"

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react"
import {
  Building2,
  Cable,
  CheckCircle2,
  FileText,
  Files,
  FolderKanban,
  Info,
  Layers3,
  MapPin,
  MessageSquareText,
  Pencil,
  Plus,
  Settings,
  Trash2,
  UserRound,
  Users,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PanelNoticeBanner, PanelNoticeProvider, usePanelNotice } from "@/components/panel-notice"
import { panelSurfaceClass, panelSurfaceStyle } from "@/components/shell/panel-surface"
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
  duplicateManagerDiary,
  editManagerDiary,
  markManagerDiaryCancelled,
  markManagerDiarySubmitted,
} from "@/data/browser-store"
import { findCompany, findCustomer, findSite, findUser, activeDomainsFrom } from "@/data/lookups"
import { diarySubmitMissing, getManagerDiary, type DiarySubmitField } from "@/data/manager"
import { parseQuantityInput } from "@/data/quantity"
import type { MockDb } from "@/data/seed"
import type { DiaryStatus } from "@/domain/types"
import { useDevSession } from "@/features/dev-role/dev-session"
import { MobileFilterPicker } from "@/features/manager/mobile-filters/picker-overlay"
import { exportDiaryPdf } from "@/features/manager/reports/export-diary-pdf"
import { he } from "@/i18n/he"
import { formatDateTime, formatQuantity, formatWorkDate } from "@/lib/format"
import { BidiText } from "@/lib/bidi"
import { compareHebrew, sortSelectOptions } from "@/lib/sort"
import { cn } from "cn"


type PanelDiary = NonNullable<ReturnType<typeof getManagerDiary>>
type DraftItem = {
  id: string
  componentId: string
  domainId: string
  domainName: string
  componentName: string
  unit: string
  quantity: string
}

type DomainOption = {
  id: string
  name: string
  components: Array<{ id: string; name: string; unit: string }>
}

type ComponentOption = {
  id: string
  name: string
  unit: string
  domainId: string
  domainName: string
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
type ConfirmKind = "cancel" | "delete" | "submit"
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
    <PanelNoticeProvider key={diary.id}>
      <DiaryBody db={db} diary={diary} title={title} onClose={() => onOpenChange(false)} />
    </PanelNoticeProvider>
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
      <DrawerContent
        className={cn(
          "h-[100dvh] max-h-[100dvh] overflow-hidden rounded-none border-0",
          panelSurfaceClass
        )}
        style={panelSurfaceStyle}
      >
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
            diary.status === "pending" && "bg-primary",
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
      domainId: item.domainId,
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
  const notice = usePanelNotice()
  const router = useRouter()
  const desktop = useDesktop()
  const session = useDevSession()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<PanelDraft | null>(null)
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null)
  const [error, setError] = useState(false)
  const [showMissing, setShowMissing] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const missingFields = diary.status === "pending" ? diarySubmitMissing(diary) : []
  const canSubmit = diary.status === "pending" && missingFields.length === 0
  const highlightedMissing = showMissing ? missingFields : []

  useEffect(() => {
    if (!showMissing || highlightedMissing.length === 0) return
    const root = scrollRef.current
    if (!root) return
    const target = root.querySelector<HTMLElement>("[data-missing='true']")
    if (!target) return
    // Scroll only inside the panel — never scrollIntoView on the page/drawer
    // (that was clipping the swipe handle and header).
    const rootRect = root.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const nextTop =
      root.scrollTop + (targetRect.top - rootRect.top) - root.clientHeight / 2 + targetRect.height / 2
    root.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" })
  }, [showMissing, highlightedMissing])

  const runConfirm = () => {
    if (confirm === "delete") {
      const result = deleteManagerDiary(diary.id)
      if (!result.ok) return
      notice.show(he.manager.panel.deleted)
      onClose()
      return
    }
    if (confirm === "submit") {
      const result = markManagerDiarySubmitted(diary.id)
      setConfirm(null)
      if (!result.ok) {
        setShowMissing(true)
        return
      }
      setShowMissing(false)
      notice.success(he.manager.panel.submitted)
      return
    }
    const result = markManagerDiaryCancelled(diary.id)
    setConfirm(null)
    if (!result.ok) return
    notice.show(he.manager.panel.cancelled)
  }

  const save = () => {
    if (!draft) return
    const parsedItems: { id: string; componentId: string; quantity: number }[] = []
    for (const item of draft.items) {
      if (!item.componentId) continue
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
      notice.show(he.manager.panel.saved)
      setEditing(false)
      setDraft(null)
    }
  }

  const exitEdit = () => {
    setEditing(false)
    setDraft(null)
    setError(false)
    setShowMissing(false)
  }

  const runAction = (action: () => void) => {
    setActionsOpen(false)
    action()
  }

  const actionItems = [
    {
      key: "edit",
      label: he.manager.edit,
      icon: Pencil,
      onClick: () =>
        runAction(() => {
          setDraft(createDraft(diary))
          setEditing(true)
          setError(false)
          setShowMissing(false)
        }),
    },
    {
      key: "export",
      label: he.manager.panel.exportPdf,
      icon: FileText,
      onClick: () =>
        runAction(() => {
          void exportDiaryPdf(diary, { generatedBy: session.user?.fullName ?? "" })
            .then(() => notice.success(he.manager.panel.exportPdfDone))
            .catch(() => notice.error(he.manager.panel.exportPdfFailed))
        }),
    },
    ...(!desktop
      ? [
          {
            key: "duplicate",
            label: he.manager.panel.duplicateDiary,
            icon: Files,
            onClick: () =>
              runAction(() => {
                const result = duplicateManagerDiary(diary.id)
                if (!result.ok) {
                  toast.error(he.manager.panel.duplicateFailed)
                  return
                }
                toast.success(he.manager.created)
                onClose()
                router.push("/manager")
              }),
          },
        ]
      : []),
    ...(diary.status === "pending"
      ? [
          {
            key: "submit",
            label: he.manager.panel.submitDiary,
            icon: CheckCircle2,
            onClick: () =>
              runAction(() => {
                if (!canSubmit) {
                  setShowMissing(true)
                  return
                }
                setShowMissing(false)
                setConfirm("submit")
              }),
          },
        ]
      : []),
    {
      key: "cancel",
      label: he.manager.panel.cancelDiary,
      icon: XCircle,
      disabled: diary.status === "cancelled",
      onClick: () => runAction(() => setConfirm("cancel")),
    },
    {
      key: "delete",
      label: he.manager.panel.deleteDiary,
      icon: Trash2,
      destructive: true,
      onClick: () => runAction(() => setConfirm("delete")),
    },
  ] as const

  const headerActions = editing ? null : (
    <div className="flex shrink-0 items-center gap-1.5">
      {!desktop ? (
        <>
          <button
            type="button"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground outline-none hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
            aria-label={he.manager.organization.actions}
            onClick={() => setActionsOpen(true)}
          >
            <Settings className="size-4" aria-hidden />
          </button>
          <MobileFilterPicker
            open={actionsOpen}
            title={he.manager.organization.actions}
            onClose={() => setActionsOpen(false)}
          >
            <div className="px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <ul className="flex flex-col">
                {actionItems.map((item) => (
                  <li key={item.key} className="border-b border-border/60 last:border-b-0">
                    <button
                      type="button"
                      disabled={"disabled" in item ? Boolean(item.disabled) : false}
                      className={cn(
                        "pressable flex w-full items-center gap-3 px-3 py-3.5 text-start text-sm font-medium",
                        "destructive" in item && item.destructive && "text-destructive",
                        "disabled" in item && item.disabled && "opacity-40"
                      )}
                      onClick={item.onClick}
                    >
                      <item.icon className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </MobileFilterPicker>
        </>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground outline-none hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
            aria-label={he.manager.organization.actions}
          >
            <Settings className="size-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" sideOffset={6} className="min-w-56 p-1.5">
            {actionItems.map((item) => (
              <DropdownMenuItem
                key={item.key}
                className="rounded-md px-3 py-2.5"
                label={item.label}
                disabled={"disabled" in item ? Boolean(item.disabled) : false}
                variant={"destructive" in item && item.destructive ? "destructive" : undefined}
                onClick={item.onClick}
              >
                <MenuRow icon={item.icon} label={item.label} />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )

  const dismissMissing = () => {
    setShowMissing(false)
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col transition-[filter,opacity] duration-200",
          confirm && "pointer-events-none select-none opacity-45 blur-[3px]"
        )}
        aria-hidden={confirm ? true : undefined}
      >
        <div className="shrink-0 bg-card px-4 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))] dark:bg-[#16161a]">
          <PanelHeader
            title={title}
            diary={diary}
            menu={showMissing && !editing ? null : headerActions}
          />
        </div>
        <div
          ref={scrollRef}
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-4 py-3",
            showMissing && !editing
              ? "pb-[max(8rem,calc(7rem+env(safe-area-inset-bottom)))]"
              : "pb-4"
          )}
        >
          <DiaryView
            db={db}
            diary={diary}
            draft={editing ? draft : null}
            onDraftChange={setDraft}
            missingFields={highlightedMissing}
          />
          {error ? <p className="mt-3 text-sm text-muted-foreground">{he.manager.invalid}</p> : null}
        </div>
        <PanelNoticeBanner />
        {editing ? (
          <div className="shrink-0 border-t border-border/60 bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 dark:bg-[#16161a]">
            <div className="flex w-full gap-2">
              <Button
                type="button"
                size="default"
                variant="outline"
                className="h-10 flex-1 px-2"
                onClick={exitEdit}
              >
                {he.manager.panel.cancelEdit}
              </Button>
              <Button type="button" size="default" className="h-10 flex-1 px-2" onClick={save}>
                {he.manager.panel.saveEdit}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {showMissing && !confirm && !editing && highlightedMissing.length > 0 ? (
        <div className="absolute inset-x-0 bottom-0 z-30 animate-in slide-in-from-bottom-4 fade-in duration-200 rounded-t-xl border border-destructive/40 border-b-0 bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] dark:bg-[#16161a]">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/25" aria-hidden />
          <div className="mb-3 flex items-center" style={{ gap: 10 }}>
            <span
              className="inline-block shrink-0 rounded-full"
              style={{ width: 8, height: 8, backgroundColor: "#ef4444" }}
              aria-hidden
            />
            <p className="text-sm font-medium leading-5" style={{ color: "#dc2626" }}>
              {he.manager.panel.submitIncomplete}
            </p>
          </div>
          <Button
            type="button"
            size="default"
            variant="outline"
            className="h-10 w-full"
            onClick={dismissMissing}
          >
            {he.manager.panel.abortAction}
          </Button>
        </div>
      ) : null}

      {confirm ? (
        <>
          <button
            type="button"
            aria-label={he.manager.panel.abortAction}
            className="absolute inset-0 z-20 border-0 bg-transparent"
            onClick={() => setConfirm(null)}
          />
          <div className="absolute inset-x-0 bottom-0 z-30 animate-in slide-in-from-bottom-4 fade-in duration-200 rounded-t-xl border border-border/50 border-b-0 bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] dark:bg-[#16161a]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/25" aria-hidden />
            <p className="mb-1 text-sm font-medium text-foreground">
              {confirm === "delete"
                ? he.manager.panel.deleteDiary
                : confirm === "submit"
                  ? he.manager.panel.submitDiary
                  : he.manager.panel.cancelDiary}
            </p>
            <p className="mb-4 text-sm leading-5 text-muted-foreground">
              {confirm === "delete"
                ? he.manager.panel.deleteConfirm
                : confirm === "submit"
                  ? he.manager.panel.submitConfirm
                  : he.manager.panel.cancelConfirm}
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
                {confirm === "delete"
                  ? he.manager.panel.deleteAction
                  : confirm === "submit"
                    ? he.manager.panel.submitAction
                    : he.manager.panel.cancelAction}
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
  missingFields = [],
}: {
  db: MockDb
  diary: PanelDiary
  draft: PanelDraft | null
  onDraftChange: (draft: PanelDraft) => void
  missingFields?: DiarySubmitField[]
}) {
  const missing = new Set(missingFields)
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
    domainId: item.domainId,
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
  const allComponents: ComponentOption[] = domains
    .flatMap((domain) =>
      domain.components.map((component) => ({
        id: component.id,
        name: component.name,
        unit: component.unit,
        domainId: domain.id,
        domainName: domain.name,
      }))
    )
    .sort((a, b) => compareHebrew(a.name, b.name))
  const checkedLabels = checkDefs
    .filter((item) => checkedIds.includes(item.id))
    .map((item) => item.label)

  const update = (patch: Partial<PanelDraft>) => {
    if (!draft) return
    onDraftChange({ ...draft, ...patch })
  }

  const activeTextField = editing ? textField : null

  return (
    <div className="flex flex-col gap-4 text-sm">
      <ul className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        <FactSelect
          editing={editing}
          icon={Building2}
          label={he.manager.dashboard.columns.company}
          display={companyName}
          value={companyId}
          missing={missing.has("company")}
          options={sortSelectOptions(companies.map((item) => ({ value: item.id, label: item.name })))}
          onChange={(value) => update({ companyId: value })}
        />
        <FactSelect
          editing={editing}
          icon={Users}
          label={he.manager.dashboard.columns.customer}
          display={customerName}
          value={customerId}
          missing={missing.has("customer")}
          options={sortSelectOptions(customers.map((item) => ({ value: item.id, label: item.name })))}
          onChange={(value) => update({ customerId: value })}
        />
        <FactSelect
          editing={editing}
          icon={MapPin}
          label={he.manager.dashboard.columns.site}
          display={siteName}
          value={siteId}
          missing={missing.has("site")}
          options={sortSelectOptions(sites.map((item) => ({ value: item.id, label: item.name })))}
          onChange={(value) => update({ siteId: value })}
        />
        <FactText
          editing={editing}
          active={activeTextField === "project"}
          icon={FolderKanban}
          label={he.manager.diaries.project}
          value={projectName || "—"}
          draftValue={projectName}
          missing={missing.has("project")}
          onActivate={() => setTextField("project")}
          onChange={(value) => update({ projectName: value })}
          onDone={() => setTextField(null)}
        />
        <FactText
          editing={editing}
          active={activeTextField === "subSite"}
          icon={Layers3}
          label={he.manager.dashboard.columns.subSite}
          value={subSiteName}
          draftValue={subSiteName}
          missing={missing.has("subSite")}
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
          missing={missing.has("leader")}
          options={sortSelectOptions(leaders.map((item) => ({ value: item.id, label: item.fullName })))}
          onChange={(value) => update({ teamLeaderId: value })}
        />
        <FactText
          editing={editing}
          active={activeTextField === "workOrder"}
          icon={FileText}
          label={he.manager.diaries.workOrder}
          value={<BidiText>{workOrderNumber}</BidiText>}
          draftValue={workOrderNumber}
          dir="ltr"
          missing={missing.has("workOrder")}
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
        domains={domains}
        components={allComponents}
        textField={activeTextField}
        missing={missing.has("items")}
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
        notes={notes}
        onChange={(value) => update({ notes: value })}
      />
    </div>
  )
}

function MissingDot({ show, size = 7 }: { show?: boolean; size?: number }) {
  if (!show) return null
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: "#ef4444",
        boxShadow: "0 0 0 2px rgba(239, 68, 68, 0.2)",
      }}
      title={he.manager.panel.submitIncomplete}
      aria-label={he.manager.panel.submitIncomplete}
    />
  )
}

const fieldGridClass = "grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-x-2"

function FieldLead({
  icon: Icon,
  missing,
  iconClassName = "size-3.5",
}: {
  icon: LucideIcon
  missing?: boolean
  iconClassName?: string
}) {
  return (
    <span className="relative inline-flex size-4 shrink-0 items-center justify-center justify-self-center">
      {missing ? (
        <span className="absolute -end-1 -top-0.5">
          <MissingDot show size={7} />
        </span>
      ) : null}
      <Icon className={cn("shrink-0", iconClassName)} aria-hidden />
    </span>
  )
}

function MenuRow({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex min-w-0 items-center" style={{ gap: 12 }}>
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="whitespace-nowrap">{label}</span>
    </span>
  )
}

function FactSelect({
  editing,
  icon: Icon,
  label,
  display,
  value,
  missing,
  options,
  onChange,
}: {
  editing: boolean
  icon: LucideIcon
  label: string
  display: string
  value: string
  missing?: boolean
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  const desktop = useDesktop()
  const [pickerOpen, setPickerOpen] = useState(false)
  const body = (
    <div className={fieldGridClass}>
      <FieldLead icon={Icon} missing={missing} iconClassName="size-3.5" />
      <div className="min-w-0">
        <div className="mb-0.5 truncate text-[11px] text-muted-foreground">{label}</div>
        <p className="truncate text-sm font-medium" style={missing ? { color: "#dc2626" } : undefined}>
          {display}
        </p>
      </div>
    </div>
  )
  if (!editing) {
    return (
      <li
        data-missing={missing ? "true" : undefined}
        className={cn("min-w-0", missing && "rounded-md p-1")}
        style={missing ? { boxShadow: "0 0 0 1px rgba(239, 68, 68, 0.55)" } : undefined}
      >
        {body}
      </li>
    )
  }
  if (!desktop) {
    return (
      <li data-missing={missing ? "true" : undefined} className="min-w-0">
        <button type="button" className={editTriggerClass} onClick={() => setPickerOpen(true)}>
          {body}
        </button>
        <MobileChoiceList
          open={pickerOpen}
          title={label}
          options={options}
          value={value}
          onClose={() => setPickerOpen(false)}
          onSelect={onChange}
        />
      </li>
    )
  }
  return (
    <li data-missing={missing ? "true" : undefined} className="min-w-0">
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
  missing,
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
  missing?: boolean
  onActivate: () => void
  onChange: (value: string) => void
  onDone: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (active) inputRef.current?.focus()
  }, [active])

  const shell = (content: ReactNode) => (
    <div className={fieldGridClass}>
      <FieldLead icon={Icon} missing={missing} iconClassName="size-3.5" />
      <div className="min-w-0">
        <div className="mb-0.5 truncate text-[11px] text-muted-foreground">{label}</div>
        {content}
      </div>
    </div>
  )

  if (!editing) {
    return (
      <li
        data-missing={missing ? "true" : undefined}
        className={cn("min-w-0", missing && "rounded-md p-1")}
        style={missing ? { boxShadow: "0 0 0 1px rgba(239, 68, 68, 0.55)" } : undefined}
      >
        {shell(
          <p className="truncate text-sm font-medium" style={missing ? { color: "#dc2626" } : undefined}>
            {value}
          </p>
        )}
      </li>
    )
  }

  if (active) {
    return (
      <li
        data-missing={missing ? "true" : undefined}
        className={cn("min-w-0", missing && "rounded-md p-1")}
        style={missing ? { boxShadow: "0 0 0 1px rgba(239, 68, 68, 0.55)" } : undefined}
      >
        {shell(
          <Input
            ref={inputRef}
            dir={dir}
            value={draftValue}
            className="h-7 w-full border-0 bg-muted/40 px-1.5 text-sm font-medium shadow-none md:text-sm"
            onChange={(event) => onChange(event.target.value)}
            onBlur={onDone}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "Escape") onDone()
            }}
          />
        )}
      </li>
    )
  }

  return (
    <li className="min-w-0">
      <button type="button" className={editTriggerClass} onClick={onActivate}>
        {shell(<p className="truncate text-start text-sm font-medium">{value || "—"}</p>)}
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
  const rows = workers.length > 0 ? workers : [{ id: "__empty__", fullName: "" }]

  return (
    <SectionShell
      icon={Users}
      title={he.leader.form.workersTitle}
      action={
        editing ? (
          <button
            type="button"
            className={sectionAddClass}
            aria-label={he.leader.form.addWorker}
            onClick={() => {
              if (workers.length === 0) {
                onChange([
                  { id: crypto.randomUUID(), fullName: "" },
                  { id: crypto.randomUUID(), fullName: "" },
                ])
                return
              }
              onChange([...workers, { id: crypto.randomUUID(), fullName: "" }])
            }}
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
        ) : null
      }
    >
      {editing ? (
        <div className="flex flex-col gap-2">
          {rows.map((worker) => (
            <div key={worker.id} className="flex items-center gap-1.5">
              <Input
                value={worker.fullName}
                placeholder={he.leader.form.workerName}
                className="h-9 text-sm md:text-sm"
                onChange={(event) => {
                  if (workers.length === 0) {
                    onChange([{ id: crypto.randomUUID(), fullName: event.target.value }])
                    return
                  }
                  onChange(
                    workers.map((item) =>
                      item.id === worker.id ? { ...item, fullName: event.target.value } : item
                    )
                  )
                }}
              />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="shrink-0"
                disabled={workers.length === 0 && !worker.fullName}
                onClick={() => onChange(workers.filter((item) => item.id !== worker.id))}
              >
                <X className="size-3.5" />
                <span className="sr-only">{he.leader.remove}</span>
              </Button>
            </div>
          ))}
        </div>
      ) : names.length === 0 ? (
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
      )}
    </SectionShell>
  )
}

function InstallationsTable({
  editing,
  items,
  domains,
  components,
  textField,
  missing,
  onActivateQty,
  onDoneQty,
  onChange,
}: {
  editing: boolean
  items: DraftItem[]
  domains: DomainOption[]
  components: ComponentOption[]
  textField: TextField
  missing?: boolean
  onActivateQty: (id: string) => void
  onDoneQty: () => void
  onChange: (items: DraftItem[]) => void
}) {
  const desktop = useDesktop()
  const [addOpen, setAddOpen] = useState(false)
  const [domainPickerId, setDomainPickerId] = useState<string | null>(null)

  const addDomainRow = (domain: DomainOption) => {
    onChange([
      ...items,
      {
        id: crypto.randomUUID(),
        componentId: "",
        domainId: domain.id,
        domainName: domain.name,
        componentName: "",
        unit: "",
        quantity: "1",
      },
    ])
  }

  const domainOptions = domains.map((domain) => ({ value: domain.id, label: domain.name }))

  const addAction = !editing ? null : desktop ? (
    <DropdownMenu>
      <DropdownMenuTrigger className={sectionAddClass}>
        <Plus className="size-3.5" aria-hidden />
        <span className="sr-only">{he.leader.form.addItem}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-auto max-h-52 min-w-44 rounded-md p-1.5">
        {domains.map((domain) => (
          <DropdownMenuItem
            key={domain.id}
            className="rounded-md px-3 py-2"
            onClick={() => addDomainRow(domain)}
          >
            {domain.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <>
      <button
        type="button"
        className={sectionAddClass}
        aria-label={he.leader.form.addItem}
        onClick={() => setAddOpen(true)}
      >
        <Plus className="size-3.5" aria-hidden />
      </button>
      <MobileChoiceList
        open={addOpen}
        title={he.leader.form.addItem}
        options={domainOptions}
        onClose={() => setAddOpen(false)}
        onSelect={(domainId) => {
          const domain = domains.find((entry) => entry.id === domainId)
          if (domain) addDomainRow(domain)
        }}
      />
    </>
  )

  return (
    <SectionShell
      icon={Cable}
      missing={missing}
      title={he.leader.form.workTitle}
      className={cn(missing && "rounded-md px-2 py-2")}
      style={
        missing
          ? {
              boxShadow: "0 0 0 1px rgba(239, 68, 68, 0.45)",
              backgroundColor: "rgba(239, 68, 68, 0.04)",
            }
          : undefined
      }
      action={addAction}
    >
      {items.length === 0 ? (
        <p
          className={cn("text-xs", missing ? "font-medium" : "text-muted-foreground")}
          style={missing ? { color: "#dc2626" } : undefined}
        >
          {he.leader.form.readOnlyItems}
        </p>
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
                const domainComponents = components.filter((entry) => entry.domainId === item.domainId)
                return (
                  <tr key={item.id} className="group/row border-b border-border/40 last:border-b-0">
                    <td className="truncate px-2.5 py-1.5">
                      {editing ? (
                        desktop ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger className={editTriggerClass}>
                              <span className="block truncate">{item.domainName}</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" sideOffset={6} className="max-h-52 min-w-44 rounded-md p-1.5">
                              {domains.map((domain) => (
                                <DropdownMenuItem
                                  key={domain.id}
                                  className="rounded-md px-3 py-2"
                                  onClick={() =>
                                    onChange(
                                      items.map((entry) =>
                                        entry.id === item.id
                                          ? {
                                              ...entry,
                                              domainId: domain.id,
                                              domainName: domain.name,
                                              componentId: "",
                                              componentName: "",
                                              unit: "",
                                            }
                                          : entry
                                      )
                                    )
                                  }
                                >
                                  {domain.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <>
                            <button
                              type="button"
                              className={editTriggerClass}
                              onClick={() => setDomainPickerId(item.id)}
                            >
                              <span className="block truncate text-start">{item.domainName}</span>
                            </button>
                            <MobileChoiceList
                              open={domainPickerId === item.id}
                              title={he.leader.form.system}
                              options={domainOptions}
                              value={item.domainId}
                              onClose={() => setDomainPickerId(null)}
                              onSelect={(domainId) => {
                                const domain = domains.find((entry) => entry.id === domainId)
                                if (!domain) return
                                onChange(
                                  items.map((entry) =>
                                    entry.id === item.id
                                      ? {
                                          ...entry,
                                          domainId: domain.id,
                                          domainName: domain.name,
                                          componentId: "",
                                          componentName: "",
                                          unit: "",
                                        }
                                      : entry
                                  )
                                )
                              }}
                            />
                          </>
                        )
                      ) : (
                        item.domainName
                      )}
                    </td>
                    <td className="relative truncate px-2.5 py-1.5">
                      {editing ? (
                        <>
                          <ComponentPicker
                            item={item}
                            components={domainComponents}
                            onPick={(component) =>
                              onChange(
                                items.map((entry) =>
                                  entry.id === item.id
                                    ? {
                                        ...entry,
                                        componentId: component.id,
                                        domainId: component.domainId,
                                        domainName: component.domainName,
                                        componentName: component.name,
                                        unit: component.unit,
                                      }
                                    : entry
                                )
                              )
                            }
                          />
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
                    <td className="truncate px-2.5 py-1.5">{item.unit || "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionShell>
  )
}

function ComponentPicker({
  item,
  components,
  onPick,
}: {
  item: DraftItem
  components: ComponentOption[]
  onPick: (component: ComponentOption) => void
}) {
  const desktop = useDesktop()
  const [open, setOpen] = useState(false)
  const options = [...components]
    .sort((a, b) => compareHebrew(a.name, b.name))
    .map((component) => ({ value: component.id, label: component.name }))

  const trigger = item.componentName ? (
    <span className="block truncate text-start">{item.componentName}</span>
  ) : (
    <span className="block truncate text-start text-muted-foreground">
      {he.leader.form.chooseComponent}
    </span>
  )

  if (!desktop) {
    return (
      <>
        <button type="button" className={editTriggerClass} onClick={() => setOpen(true)}>
          {trigger}
        </button>
        <MobileChoiceList
          open={open}
          title={he.leader.form.component}
          options={options}
          value={item.componentId}
          emptyText={he.leader.form.chooseDomain}
          onClose={() => setOpen(false)}
          onSelect={(value) => {
            const component = components.find((entry) => entry.id === value)
            if (component) onPick(component)
          }}
        />
      </>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={editTriggerClass}>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="max-h-52 min-w-52 rounded-md p-1.5">
        {components.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">{he.leader.form.chooseDomain}</p>
        ) : (
          <DropdownMenuRadioGroup
            value={item.componentId}
            onValueChange={(value) => {
              const component = components.find((entry) => entry.id === value)
              if (component) onPick(component)
            }}
          >
            {options.map((component) => (
              <DropdownMenuRadioItem
                key={component.value}
                value={component.value}
                className="rounded-md px-3 py-2"
              >
                <span className="truncate">{component.label}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        )}
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
  const desktop = useDesktop()

  const content =
    editing && !desktop ? (
      <ul className="flex flex-col">
        {options.map((option) => {
          const checked = checkedIds.includes(option.id)
          return (
            <li key={option.id}>
              <button
                type="button"
                aria-pressed={checked}
                className="flex min-h-10 w-full items-center gap-3 py-1.5 text-start text-sm"
                onClick={() =>
                  onChange(
                    checked
                      ? checkedIds.filter((id) => id !== option.id)
                      : [...checkedIds, option.id]
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
    ) : labels.length === 0 ? (
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

  const action =
    !editing || !desktop ? null : (
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
    )

  return (
    <SectionShell icon={Info} title={he.leader.form.checksTitle} action={action}>
      {content}
    </SectionShell>
  )
}

function NotesSection({
  editing,
  notes,
  onChange,
}: {
  editing: boolean
  notes: string
  onChange: (value: string) => void
}) {
  return (
    <SectionShell icon={MessageSquareText} title={he.leader.form.notesTitle}>
      {!editing ? (
        notes.trim() ? (
          <p className="text-sm leading-5">{notes.trim()}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{he.leader.form.readOnlyNotes}</p>
        )
      ) : (
        <textarea
          value={notes}
          maxLength={2000}
          placeholder={he.leader.form.notesPlaceholder}
          className="min-h-24 w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </SectionShell>
  )
}

function SectionShell({
  icon: Icon,
  missing,
  title,
  action,
  className,
  style,
  children,
}: {
  icon: LucideIcon
  missing?: boolean
  title: string
  action?: ReactNode
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <section
      data-missing={missing ? "true" : undefined}
      className={cn(fieldGridClass, "gap-y-1.5", className)}
      style={style}
    >
      <FieldLead icon={Icon} iconClassName="size-3.5" />
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h3 className="truncate text-[11px] font-semibold tracking-wide text-muted-foreground">{title}</h3>
        {action}
      </div>
      <div className="col-start-2 min-w-0">{children}</div>
    </section>
  )
}

function SectionDivider() {
  return <div className="mx-8 h-px bg-border/40" aria-hidden />
}

function MobileChoiceList({
  open,
  title,
  options,
  value,
  emptyText,
  onClose,
  onSelect,
}: {
  open: boolean
  title: string
  options: Array<{ value: string; label: string }>
  value?: string
  emptyText?: string
  onClose: () => void
  onSelect: (value: string) => void
}) {
  return (
    <MobileFilterPicker open={open} title={title} onClose={onClose}>
      <div className="px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {options.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">{emptyText ?? he.manager.empty}</p>
        ) : (
          <ul className="flex flex-col">
            {options.map((option) => {
              const active = option.value === value
              return (
                <li key={option.value} className="border-b border-border/60 last:border-b-0">
                  <button
                    type="button"
                    className={cn(
                      "pressable flex w-full items-center px-3 py-3.5 text-start text-sm font-medium",
                      active && "text-primary"
                    )}
                    onClick={() => {
                      onSelect(option.value)
                      onClose()
                    }}
                  >
                    <span className="truncate">{option.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </MobileFilterPicker>
  )
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
