"use client"

import { useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import {
  Building2,
  CalendarDays,
  ChevronDown,
  FileText,
  FolderKanban,
  Layers3,
  MapPin,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
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
import { HebrewDatePicker } from "@/components/hebrew-date-picker"
import { PanelNoticeBanner, PanelNoticeProvider, usePanelNotice } from "@/components/panel-notice"
import { panelSurfaceClass, panelSurfaceStyle } from "@/components/shell/panel-surface"
import { createManagerDiary } from "@/data/browser-store"
import type { MockDb } from "@/data/seed"
import { he } from "@/i18n/he"
import { jerusalemToday } from "@/lib/format"
import { sortSelectOptions } from "@/lib/sort"
import { cn } from "cn"

const editorInputClass =
  "h-10 w-full min-w-0 rounded-md border border-border bg-muted px-4 text-right text-sm text-foreground shadow-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-[#222228]"

type CreateField =
  | "leader"
  | "workDate"
  | "company"
  | "customer"
  | "site"
  | "project"
  | "subSite"
  | "workOrder"

export function DiaryCreatePanel({
  db,
  open,
  onOpenChange,
}: {
  db: MockDb
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const desktop = useDesktop()
  const title = he.manager.panel.createDiary
  const body = open ? (
    <PanelNoticeProvider>
      <CreateForm key={String(open)} db={db} />
    </PanelNoticeProvider>
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

function CreateForm({ db }: { db: MockDb }) {
  const notice = usePanelNotice()
  const leaders = db.users.filter((user) => user.role === "teamLeader" && user.isActive)
  const companies = db.companies.filter((item) => item.isActive)
  const customers = db.customers.filter((item) => item.isActive)
  const sites = db.sites.filter((item) => item.isActive)
  const orderRef = useRef<HTMLInputElement>(null)
  const [leaderId, setLeaderId] = useState("")
  const [workDate, setWorkDate] = useState(jerusalemToday())
  const [companyId, setCompanyId] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [siteId, setSiteId] = useState("")
  const [subSiteName, setSubSiteName] = useState("")
  const [projectName, setProjectName] = useState("")
  const [workOrder, setWorkOrder] = useState("")
  const [showMissing, setShowMissing] = useState(false)

  const missing = createMissingFields({
    leaderId,
    workDate,
    companyId,
    customerId,
    siteId,
    projectName,
    subSiteName,
    workOrder,
  })
  const highlighted = showMissing ? new Set(missing) : new Set<CreateField>()

  const save = () => {
    const currentMissing = createMissingFields({
      leaderId,
      workDate,
      companyId,
      customerId,
      siteId,
      projectName,
      subSiteName,
      workOrder,
    })
    if (currentMissing.length > 0) {
      setShowMissing(true)
      notice.error(he.manager.fillRequired)
      return
    }
    const result = createManagerDiary({
      teamLeaderId: leaderId,
      workDate,
      companyId,
      customerId,
      siteId,
      subSiteName,
      projectName,
      workOrderNumber: workOrder,
    })
    if (!result.ok || !("id" in result) || !result.id) {
      setShowMissing(true)
      notice.error(he.manager.invalid)
      return
    }
    setShowMissing(false)
    setLeaderId("")
    setCompanyId("")
    setCustomerId("")
    setSiteId("")
    setWorkOrder("")
    setSubSiteName("")
    setProjectName("")
    setWorkDate(jerusalemToday())
    notice.success(he.manager.created)
    orderRef.current?.focus()
  }

  return (
    <>
      <div className="shrink-0 px-4 py-3">
        <div className="grid grid-cols-[1rem_minmax(0,1fr)] items-center gap-x-2">
          <FileText className="size-4 justify-self-center text-muted-foreground" aria-hidden />
          <p className="text-sm font-semibold text-foreground">{he.manager.panel.createDiary}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="flex flex-col gap-4 text-sm">
          <EditorField icon={UserRound} label={he.manager.diaries.leader} missing={highlighted.has("leader")}>
            <CreateSelect
              value={leaderId}
              placeholder={he.manager.select}
              missing={highlighted.has("leader")}
              options={sortSelectOptions(leaders.map((leader) => ({ value: leader.id, label: leader.fullName })))}
              onValueChange={setLeaderId}
            />
          </EditorField>
          <EditorField icon={CalendarDays} label={he.manager.diaries.date} missing={highlighted.has("workDate")}>
            <HebrewDatePicker
              value={workDate}
              placeholder={he.manager.dashboard.pickDate}
              triggerClassName={cn(editorInputClass, highlighted.has("workDate") && "border-red-300")}
              onValueChange={setWorkDate}
            />
          </EditorField>
          <EditorField icon={Building2} label={he.manager.diaries.company} missing={highlighted.has("company")}>
            <CreateSelect
              value={companyId}
              placeholder={he.manager.select}
              missing={highlighted.has("company")}
              options={sortSelectOptions(companies.map((company) => ({ value: company.id, label: company.name })))}
              onValueChange={setCompanyId}
            />
          </EditorField>
          <EditorField icon={Users} label={he.manager.diaries.customer} missing={highlighted.has("customer")}>
            <CreateSelect
              value={customerId}
              placeholder={he.manager.select}
              missing={highlighted.has("customer")}
              options={sortSelectOptions(customers.map((customer) => ({ value: customer.id, label: customer.name })))}
              onValueChange={setCustomerId}
            />
          </EditorField>
          <EditorField icon={MapPin} label={he.manager.diaries.site} missing={highlighted.has("site")}>
            <CreateSelect
              value={siteId}
              placeholder={he.manager.select}
              missing={highlighted.has("site")}
              options={sortSelectOptions(sites.map((site) => ({ value: site.id, label: site.name })))}
              onValueChange={setSiteId}
            />
          </EditorField>
          <EditorField icon={FolderKanban} label={he.manager.diaries.project} missing={highlighted.has("project")}>
            <Input
              value={projectName}
              className={cn(editorInputClass, highlighted.has("project") && "border-red-300")}
              onChange={(event) => setProjectName(event.target.value)}
            />
          </EditorField>
          <EditorField icon={Layers3} label={he.manager.diaries.subSite} missing={highlighted.has("subSite")}>
            <Input
              value={subSiteName}
              className={cn(editorInputClass, highlighted.has("subSite") && "border-red-300")}
              onChange={(event) => setSubSiteName(event.target.value)}
            />
          </EditorField>
          <EditorField icon={FileText} label={he.manager.diaries.workOrder} missing={highlighted.has("workOrder")}>
            <Input
              ref={orderRef}
              dir="ltr"
              value={workOrder}
              className={cn(editorInputClass, "text-start", highlighted.has("workOrder") && "border-red-300")}
              onChange={(event) => setWorkOrder(event.target.value)}
            />
          </EditorField>
        </div>
      </div>

      <PanelNoticeBanner />
      <div className="shrink-0 border-t border-border/70 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="button" size="default" className="h-9 w-full" onClick={save}>
          {he.manager.save}
        </Button>
      </div>
    </>
  )
}

function createMissingFields(values: {
  leaderId: string
  workDate: string
  companyId: string
  customerId: string
  siteId: string
  projectName: string
  subSiteName: string
  workOrder: string
}): CreateField[] {
  const missing: CreateField[] = []
  if (!values.leaderId) missing.push("leader")
  if (!values.workDate) missing.push("workDate")
  if (!values.companyId) missing.push("company")
  if (!values.customerId) missing.push("customer")
  if (!values.siteId) missing.push("site")
  if (!values.projectName.trim()) missing.push("project")
  if (!values.subSiteName.trim()) missing.push("subSite")
  if (!values.workOrder.trim()) missing.push("workOrder")
  return missing
}

function EditorField({
  icon: Icon,
  label,
  missing,
  children,
}: {
  icon: LucideIcon
  label: string
  missing?: boolean
  children: ReactNode
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="inline-flex items-center text-[11px] font-semibold tracking-wide text-muted-foreground" style={{ gap: 8 }}>
        <span className="inline-flex shrink-0 items-center" style={{ gap: 6 }}>
          {missing ? (
            <span
              className="inline-block shrink-0 rounded-full"
              style={{ width: 7, height: 7, backgroundColor: "#ef4444" }}
              aria-hidden
            />
          ) : null}
          <Icon className="size-3.5 shrink-0" aria-hidden />
        </span>
        {label}
      </span>
      {children}
    </label>
  )
}

function CreateSelect({
  value,
  options,
  placeholder,
  missing,
  onValueChange,
}: {
  value: string
  options: Array<{ value: string; label: string }>
  placeholder: string
  missing?: boolean
  onValueChange: (value: string) => void
}) {
  const selected = options.find((option) => option.value === value)?.label ?? placeholder

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          editorInputClass,
          "relative flex cursor-pointer items-center pe-9 ps-4 text-start",
          missing && "border-red-300"
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate text-right", !value && "text-muted-foreground")}>
          {selected}
        </span>
        <ChevronDown className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="max-h-52 min-w-(--anchor-width) rounded-md p-1.5"
      >
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
