"use client"

import { useState, useSyncExternalStore, type ReactNode } from "react"
import {
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Files,
  Filter,
  MapPin,
  Search,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { PageFrame } from "@/components/motion/page-frame"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { duplicateManagerDiary, useManagerDb } from "@/data/browser-store"
import {
  emptyWorkDiarySearchFilters,
  filterManagerDiaries,
  getManagerDiary,
  listManagerDiaries,
  workDiarySearchOptions,
  type ManagerDiarySummary,
  type WorkDiarySearchFilters,
} from "@/data/manager"
import type { MockDb } from "@/data/seed"
import { LeaderLoading, LeaderStoreError } from "@/features/leader/leader-states"
import { useManagerCreate } from "@/features/manager/manager-create-provider"
import { DiaryPanel, diaryStatusLabel } from "@/features/manager/diary-panel"
import {
  FilterTriggerControl,
  MobileFilterPicker,
} from "@/features/manager/mobile-filters/picker-overlay"
import { he } from "@/i18n/he"
import {
  formatMonthTitle,
  formatWorkDate,
  formatWorkDateNumeric,
  jerusalemDay,
  jerusalemSpan,
  jerusalemToday,
  parseIsoDate,
  toIsoDate,
} from "@/lib/format"
import { BidiText } from "@/lib/bidi"
import { cn } from "cn"

type DatePreset = "today" | "week" | "month"
type QuickFilter = DatePreset | "pending" | "submitted" | "cancelled"

type AdvancedFilters = {
  workDate: string
  companyIds: string[]
  customerIds: string[]
  siteIds: string[]
  teamLeaderIds: string[]
  period: "" | "month"
  status: "" | "cancelled"
}

const emptyAdvanced = (): AdvancedFilters => ({
  workDate: "",
  companyIds: [],
  customerIds: [],
  siteIds: [],
  teamLeaderIds: [],
  period: "",
  status: "",
})

function toOrgSearchFilters(filters: AdvancedFilters): WorkDiarySearchFilters {
  return {
    ...emptyWorkDiarySearchFilters(),
    from: filters.workDate,
    to: filters.workDate,
    companyIds: filters.companyIds,
    customerIds: filters.customerIds,
    siteIds: filters.siteIds,
    teamLeaderIds: filters.teamLeaderIds,
  }
}

export function DashboardScreen() {
  const query = useManagerDb()
  const { openCreate } = useManagerCreate()
  const [quickFilter, setQuickFilter] = useState<QuickFilter | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [workDate, setWorkDate] = useState("")
  const [companyIds, setCompanyIds] = useState<string[]>([])
  const [customerIds, setCustomerIds] = useState<string[]>([])
  const [siteIds, setSiteIds] = useState<string[]>([])
  const [teamLeaderIds, setTeamLeaderIds] = useState<string[]>([])
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState<AdvancedFilters>(emptyAdvanced)
  const [loaded, setLoaded] = useState({ key: "", extra: 0 })
  if (query.status === "loading") return <LeaderLoading />
  if (query.status === "error") return <LeaderStoreError />

  const db = query.db
  const today = jerusalemToday()
  const all = listManagerDiaries(db)
  const metrics = he.manager.dashboard.metrics
  const cards = [
    {
      key: "createdToday",
      label: metrics.createdToday.label,
      hint: metrics.createdToday.hint,
      value: all.filter((diary) => jerusalemDay(diary.createdAt) === today).length,
    },
    {
      key: "pending",
      label: metrics.pending.label,
      hint: metrics.pending.hint,
      value: all.filter((diary) => diary.status === "pending").length,
    },
    {
      key: "submitted",
      label: metrics.submitted.label,
      hint: metrics.submitted.hint,
      value: all.filter((diary) => diary.status === "submitted").length,
    },
    {
      key: "total",
      label: metrics.total.label,
      hint: metrics.total.hint,
      value: all.length,
    },
  ] as const
  const datePreset =
    quickFilter === "today" || quickFilter === "week" || quickFilter === "month" ? quickFilter : null
  const status =
    quickFilter === "pending" || quickFilter === "submitted" || quickFilter === "cancelled"
      ? quickFilter
      : "all"
  const range = datePreset ? jerusalemSpan(datePreset) : { from: workDate, to: workDate }
  const diaries = filterManagerDiaries(db, {
    query: search,
    status,
    from: range.from,
    to: range.to,
    teamLeaderIds,
    companyIds,
    customerIds,
    siteIds,
  })
  const filterKey = [
    search,
    quickFilter ?? "",
    workDate,
    companyIds.join(","),
    customerIds.join(","),
    siteIds.join(","),
    teamLeaderIds.join(","),
  ].join("|")
  const extra = loaded.key === filterKey ? loaded.extra : 0
  const visibleDiaries = diaries.slice(0, 30 + extra)
  const openDiary = openId ? getManagerDiary(db, openId) : null
  const appliedAdvanced: AdvancedFilters = {
    workDate,
    companyIds,
    customerIds,
    siteIds,
    teamLeaderIds,
    period: quickFilter === "month" ? "month" : "",
    status: quickFilter === "cancelled" ? "cancelled" : "",
  }
  const options = workDiarySearchOptions(db, toOrgSearchFilters(appliedAdvanced))
  const draftOptions = workDiarySearchOptions(db, toOrgSearchFilters(draftFilters))
  const hasActiveSheetFilters = Boolean(
    workDate ||
      companyIds.length > 0 ||
      customerIds.length > 0 ||
      siteIds.length > 0 ||
      teamLeaderIds.length > 0 ||
      quickFilter === "month" ||
      quickFilter === "cancelled"
  )
  const desktopQuickFilterOptions: Array<[QuickFilter, string]> = [
    ["today", he.manager.dashboard.quick.today],
    ["week", he.manager.dashboard.quick.week],
    ["month", he.manager.dashboard.quick.month],
    ["pending", he.manager.dashboard.quick.pending],
    ["submitted", he.manager.dashboard.quick.submitted],
    ["cancelled", he.manager.dashboard.quick.cancelled],
  ]
  const mobileQuickFilterOptions: Array<[QuickFilter, string]> = [
    ["today", he.manager.dashboard.quick.today],
    ["week", he.manager.dashboard.quick.week],
    ["pending", he.manager.dashboard.metrics.pending.label],
    ["submitted", he.manager.dashboard.quick.submitted],
  ]

  const patchFilters = (patch: Partial<AdvancedFilters>) => {
    const next = normalizeCascade(db, {
      ...appliedAdvanced,
      ...patch,
    })
    setWorkDate(next.workDate)
    setCompanyIds(next.companyIds)
    setCustomerIds(next.customerIds)
    setSiteIds(next.siteIds)
    setTeamLeaderIds(next.teamLeaderIds)
    if (patch.workDate) setQuickFilter(null)
  }

  const patchDraft = (patch: Partial<AdvancedFilters>) => {
    setDraftFilters((prev) => normalizeCascade(db, { ...prev, ...patch }))
  }

  const resetFilters = () => {
    setQuickFilter(null)
    setSearch("")
    setWorkDate("")
    setCompanyIds([])
    setCustomerIds([])
    setSiteIds([])
    setTeamLeaderIds([])
    setDraftFilters(emptyAdvanced())
    setLoaded({ key: "", extra: 0 })
  }

  const openMobileFilters = () => {
    setDraftFilters(appliedAdvanced)
    setMobileFiltersOpen(true)
  }

  const applyMobileFilters = () => {
    const next = normalizeCascade(db, draftFilters)
    setWorkDate(next.workDate)
    setCompanyIds(next.companyIds)
    setCustomerIds(next.customerIds)
    setSiteIds(next.siteIds)
    setTeamLeaderIds(next.teamLeaderIds)
    setQuickFilter((prev) => {
      if (next.period === "month") return "month"
      if (next.status === "cancelled") return "cancelled"
      if (next.workDate) return null
      if (prev === "month" || prev === "cancelled") return null
      return prev
    })
    setMobileFiltersOpen(false)
  }

  const clearSheetFilters = () => {
    if (quickFilter === "month" || quickFilter === "cancelled") setQuickFilter(null)
    setWorkDate("")
    setCompanyIds([])
    setCustomerIds([])
    setSiteIds([])
    setTeamLeaderIds([])
    setDraftFilters(emptyAdvanced())
  }

  const renderQuickFilters = (
    options: Array<[QuickFilter, string]>,
    size: "default" | "mobile" = "default"
  ) => (
    <div
      role="radiogroup"
      aria-label={he.manager.dashboard.filterTitle}
      className={cn(
        size === "mobile"
          ? "flex w-full items-stretch gap-1"
          : "inline-flex max-w-full overflow-x-auto rounded-md border border-border bg-card"
      )}
    >
      {options.map(([value, label]) => (
        <FilterSegment
          key={value}
          pressed={quickFilter === value}
          label={label}
          size={size}
          onClick={() => {
            setQuickFilter(value)
            setWorkDate("")
          }}
        />
      ))}
      <FilterSegment
        pressed={false}
        label={he.manager.dashboard.reset}
        size={size}
        onClick={resetFilters}
      />
    </div>
  )
  const desktopQuickFilters = renderQuickFilters(desktopQuickFilterOptions)
  const mobileQuickFilters = renderQuickFilters(mobileQuickFilterOptions, "mobile")

  return (
    <PageFrame>
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-6">
        <div className="grid grid-cols-2 gap-2.5 lg:gap-3 xl:grid-cols-5">
          {cards.map((card) => (
            <div
              key={card.key}
              className="flex flex-col gap-2 rounded-md border border-border bg-card px-3.5 py-3 lg:gap-3 lg:px-4 lg:py-3.5"
            >
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-start text-2xl font-semibold tabular-nums tracking-tight text-foreground lg:text-3xl">
                {card.value}
              </p>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                <span>{card.hint}</span>
              </p>
            </div>
          ))}
          <button
            type="button"
            className="pressable hidden flex-col gap-3 rounded-md border border-primary bg-primary px-4 py-3.5 text-start text-primary-foreground lg:flex"
            onClick={() => {
              setOpenId(null)
              openCreate()
            }}
          >
            <span className="text-sm text-primary-foreground/80">{metrics.newDiary.label}</span>
            <span className="text-3xl font-semibold tracking-tight">{metrics.newDiary.title}</span>
            <span className="flex items-center gap-2 text-xs text-primary-foreground/80">
              <span className="size-1.5 shrink-0 rounded-full bg-primary-foreground" aria-hidden />
              <span>{metrics.newDiary.hint}</span>
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              placeholder={he.manager.dashboard.searchFree}
              className="h-[calc(2.25rem*1.1*1.1)] rounded-md border-border bg-card pe-3 ps-9 text-sm shadow-none"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="default"
            className={cn(
              "h-[calc(2.25rem*1.1*1.1)] shrink-0",
              hasActiveSheetFilters && "border-primary text-foreground"
            )}
            onClick={openMobileFilters}
          >
            <Filter className="size-4" aria-hidden />
            {he.manager.reports.filters}
          </Button>
          {hasActiveSheetFilters ? (
            <Button
              type="button"
              variant="outline"
              size="default"
              className="h-[calc(2.25rem*1.1*1.1)] shrink-0 border-primary text-foreground"
              onClick={clearSheetFilters}
            >
              <X className="size-4" aria-hidden />
              {he.manager.reports.exportCancel}
            </Button>
          ) : null}
        </div>

        <section className="hidden overflow-x-auto rounded-md border border-border bg-muted/40 px-4 py-4 sm:px-5 lg:block">
          <div className="grid min-w-[56rem] grid-cols-6 gap-3">
            <FilterField label={he.manager.dashboard.searchFree} icon={Search}>
              <Input
                value={search}
                placeholder={he.manager.dashboard.searchFree}
                className={filterControlClass}
                onChange={(event) => setSearch(event.target.value)}
              />
            </FilterField>
            <FilterField label={he.manager.dashboard.date} icon={CalendarDays}>
              <FilterDate
                title={he.manager.dashboard.date}
                value={workDate}
                placeholder={he.manager.dashboard.pickDate}
                onValueChange={(value) => patchFilters({ workDate: value, period: "", status: "" })}
              />
            </FilterField>
            <FilterField label={he.manager.dashboard.columns.company} icon={Building2}>
              <MultiFilterSelect
                title={he.manager.dashboard.columns.company}
                values={companyIds}
                options={options.companies}
                onValuesChange={(next) => patchFilters({ companyIds: next })}
              />
            </FilterField>
            <FilterField label={he.manager.dashboard.columns.customer} icon={Users}>
              <MultiFilterSelect
                title={he.manager.dashboard.columns.customer}
                values={customerIds}
                options={options.customers}
                onValuesChange={(next) => patchFilters({ customerIds: next })}
              />
            </FilterField>
            <FilterField label={he.manager.dashboard.columns.site} icon={MapPin}>
              <MultiFilterSelect
                title={he.manager.dashboard.columns.site}
                values={siteIds}
                options={options.sites}
                onValuesChange={(next) => patchFilters({ siteIds: next })}
              />
            </FilterField>
            <FilterField label={he.manager.dashboard.columns.leader} icon={UserRound}>
              <MultiFilterSelect
                title={he.manager.dashboard.columns.leader}
                values={teamLeaderIds}
                options={options.leaders}
                onValuesChange={(next) => patchFilters({ teamLeaderIds: next })}
              />
            </FilterField>
          </div>
        </section>
        <DiaryTable
          diaries={visibleDiaries}
          empty={diaries.length === 0}
          toolbar={desktopQuickFilters}
          onOpen={(id) => {
            setOpenId(id)
          }}
        />
        <div className="flex flex-col gap-3 lg:hidden">
          <div
            className={cn(
              "app-sticky-bar sticky z-20 -mx-4 border-b border-border px-4 py-2",
              "top-[calc(3.5rem+env(safe-area-inset-top))]"
            )}
          >
            <div className="rounded-md border border-border bg-card px-2 py-2">
              {mobileQuickFilters}
            </div>
          </div>
          <div className="rounded-md border border-border bg-card">
            {diaries.length === 0 ? null : (
              <ul>
                {visibleDiaries.map((diary) => (
                  <li key={diary.id} className="border-b border-border last:border-b-0">
                    <DiaryRow diary={diary} onOpen={setOpenId} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          {diaries.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
              {he.manager.empty}
            </div>
          ) : visibleDiaries.length < diaries.length ? (
            <Button
              type="button"
              size="touch"
              variant="outline"
              className="self-center"
              onClick={() => setLoaded({ key: filterKey, extra: extra + 50 })}
            >
              {he.manager.dashboard.loadMore}
            </Button>
          ) : null}
        </div>
      </div>

      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <SheetContent
          side="bottom"
          className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-t-2xl p-0"
        >
          <SheetHeader className="shrink-0 border-b border-border px-4 py-3">
            <SheetTitle>{he.manager.reports.filters}</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <div className="flex flex-col gap-3">
              <FilterField label={he.manager.dashboard.date} icon={CalendarDays}>
                <FilterDate
                  title={he.manager.dashboard.date}
                  value={draftFilters.workDate}
                  placeholder={he.manager.dashboard.pickDate}
                  onValueChange={(value) => patchDraft({ workDate: value, period: "" })}
                />
              </FilterField>
              <FilterField label={he.manager.dashboard.quick.month} icon={CalendarDays}>
                <FilterSelect
                  title={he.manager.dashboard.quick.month}
                  value={draftFilters.period}
                  options={[
                    { value: "", label: he.manager.all },
                    { value: "month", label: he.manager.dashboard.quick.month },
                  ]}
                  onValueChange={(value) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      period: value === "month" ? "month" : "",
                      workDate: value === "month" ? "" : prev.workDate,
                      status: value === "month" ? "" : prev.status,
                    }))
                  }
                />
              </FilterField>
              <FilterField label={he.manager.dashboard.columns.status} icon={Files}>
                <FilterSelect
                  title={he.manager.dashboard.columns.status}
                  value={draftFilters.status}
                  options={[
                    { value: "", label: he.manager.all },
                    { value: "cancelled", label: he.manager.dashboard.quick.cancelled },
                  ]}
                  onValueChange={(value) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      status: value === "cancelled" ? "cancelled" : "",
                      period: value === "cancelled" ? "" : prev.period,
                    }))
                  }
                />
              </FilterField>
              <FilterField label={he.manager.dashboard.columns.company} icon={Building2}>
                <MultiFilterSelect
                  title={he.manager.dashboard.columns.company}
                  values={draftFilters.companyIds}
                  options={draftOptions.companies}
                  onValuesChange={(companyIds) => patchDraft({ companyIds })}
                />
              </FilterField>
              <FilterField label={he.manager.dashboard.columns.customer} icon={Users}>
                <MultiFilterSelect
                  title={he.manager.dashboard.columns.customer}
                  values={draftFilters.customerIds}
                  options={draftOptions.customers}
                  onValuesChange={(customerIds) => patchDraft({ customerIds })}
                />
              </FilterField>
              <FilterField label={he.manager.dashboard.columns.site} icon={MapPin}>
                <MultiFilterSelect
                  title={he.manager.dashboard.columns.site}
                  values={draftFilters.siteIds}
                  options={draftOptions.sites}
                  onValuesChange={(siteIds) => patchDraft({ siteIds })}
                />
              </FilterField>
              <FilterField label={he.manager.dashboard.columns.leader} icon={UserRound}>
                <MultiFilterSelect
                  title={he.manager.dashboard.columns.leader}
                  values={draftFilters.teamLeaderIds}
                  options={draftOptions.leaders}
                  onValuesChange={(teamLeaderIds) => patchDraft({ teamLeaderIds })}
                />
              </FilterField>
            </div>
          </div>
          <SheetFooter className="shrink-0 flex-row gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-[calc(2.25rem*1.1*1.1)] w-[30%]"
              onClick={() => setDraftFilters(emptyAdvanced())}
            >
              {he.nav.clearFilters}
            </Button>
            <Button type="button" className="h-[calc(2.25rem*1.1*1.1)] w-[70%]" onClick={applyMobileFilters}>
              {he.nav.applyFilters}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <DiaryPanel db={db} diary={openDiary} onOpenChange={(open) => { if (!open) setOpenId(null) }} />
    </PageFrame>
  )
}

function FilterSegment({
  pressed,
  label,
  onClick,
  size = "default",
}: {
  pressed: boolean
  label: string
  onClick: () => void
  size?: "default" | "mobile"
}) {
  if (size === "mobile") {
    return (
      <button
        type="button"
        role="radio"
        aria-checked={pressed}
        className={cn(
          "pressable relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center px-1.5 text-center text-sm transition-colors",
          pressed ? "font-medium text-foreground" : "text-foreground/80 hover:text-foreground"
        )}
        onClick={onClick}
      >
        <span className="whitespace-nowrap">{label}</span>
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute bottom-1.5 h-0.5 w-6 rounded-full transition-opacity",
            pressed
              ? "bg-primary opacity-100 shadow-[0_0_8px_2px_rgb(255_51_0_/_0.55)]"
              : "opacity-0"
          )}
        />
      </button>
    )
  }

  return (
    <button
      type="button"
      role="radio"
      aria-checked={pressed}
      className={cn(
        "pressable h-8 shrink-0 whitespace-nowrap px-3 text-xs transition-colors",
        pressed
          ? "bg-primary font-medium text-primary-foreground"
          : "bg-transparent text-foreground hover:bg-muted/70 dark:hover:bg-white/10"
      )}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function duplicateNextDay(diary: ManagerDiarySummary) {
  const result = duplicateManagerDiary(diary.id)
  if (result.ok) toast.success(he.manager.created)
  else toast.info(he.manager.invalid)
}

function isUpcomingWorkDate(workDate: string) {
  return workDate > jerusalemToday()
}

function DiaryTable({
  diaries,
  empty,
  toolbar,
  onOpen,
}: {
  diaries: ManagerDiarySummary[]
  empty: boolean
  toolbar: ReactNode
  onOpen: (id: string) => void
}) {
  const columns = he.manager.dashboard.columns
  const headers: Array<{ key: string; label: string }> = [
    { key: "index", label: columns.index },
    { key: "date", label: columns.date },
    { key: "company", label: columns.company },
    { key: "customer", label: columns.customer },
    { key: "project", label: columns.project },
    { key: "site", label: columns.site },
    { key: "subSite", label: columns.subSite },
    { key: "leader", label: columns.leader },
    { key: "workOrder", label: columns.workOrder },
    { key: "status", label: columns.status },
    { key: "duplicate", label: columns.duplicate },
  ]

  return (
    <div className="hidden rounded-md border border-border bg-card lg:block">
      <table className="w-full min-w-[74rem] table-fixed border-collapse text-[11px] leading-4">
        <colgroup>
          <col className="w-10" />
          <col className="w-[7rem]" />
          <col />
          <col />
          <col />
          <col />
          <col />
          <col />
          <col className="w-[6.5rem]" />
          <col className="w-[7.5rem]" />
          <col className="w-[5.5rem]" />
        </colgroup>
        <thead className="app-sticky-bar sticky top-0 z-30">
          <tr className="text-foreground">
            <th colSpan={headers.length} className="px-3 pt-3 pb-1.5 font-normal">
              <div className="flex justify-end">{toolbar}</div>
            </th>
          </tr>
          <tr className="border-b border-border text-foreground">
            {headers.map((header) => (
              <th
                key={header.key}
                className="px-2 pt-1.5 pb-2.5 text-center font-medium whitespace-nowrap first:ps-3 last:pe-3"
              >
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {empty ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-6 text-center text-sm text-muted-foreground">
                {he.manager.dashboard.recentEmpty}
              </td>
            </tr>
          ) : (
            diaries.map((diary, index) => (
              <tr
                key={diary.id}
                tabIndex={0}
                className={cn(
                  "cursor-pointer border-b border-border/80 last:border-b-0 hover:bg-muted/40",
                  diary.status === "cancelled" && "text-muted-foreground [&>td:not(:last-child)]:line-through"
                )}
                onClick={() => onOpen(diary.id)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return
                  if (event.key !== "Enter" && event.key !== " ") return
                  event.preventDefault()
                  onOpen(diary.id)
                }}
              >
                <Cell className="tabular-nums text-muted-foreground">{index + 1}</Cell>
                <Cell className="whitespace-nowrap">
                  <span className="relative inline-block">
                    <BidiText>{formatWorkDateNumeric(diary.workDate)}</BidiText>
                    {isUpcomingWorkDate(diary.workDate) ? (
                      <span
                        className="absolute top-1/2 end-full me-1.5 size-1.5 -translate-y-1/2 rounded-full bg-emerald-500"
                        aria-hidden
                      />
                    ) : null}
                  </span>
                </Cell>
                <Cell value={diary.companyName} />
                <Cell value={diary.customerName} />
                <Cell value={diary.projectName || "—"} />
                <Cell value={diary.siteName} />
                <Cell value={diary.subSiteName} />
                <Cell value={diary.teamLeaderName} />
                <Cell className="whitespace-nowrap">
                  <BidiText>{diary.workOrderNumber}</BidiText>
                </Cell>
                <Cell className="whitespace-nowrap">{diaryStatusLabel(diary.status)}</Cell>
                <Cell>
                  <DuplicateButton diary={diary} />
                </Cell>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

const filterControlClass =
  "h-[calc(2.25rem*1.1*1.1)] w-full min-w-0 rounded-md border border-border bg-card px-4 text-sm text-foreground shadow-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-card"

const HEBREW_WEEKDAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"] as const
const EMPTY_FILTER = "__all__"

function FilterField({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="inline-flex items-center gap-1 text-start text-[11px] font-semibold text-foreground">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        {label}
      </span>
      <div className="w-full">{children}</div>
    </div>
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

function MultiFilterSelect({
  title,
  values,
  options,
  onValuesChange,
}: {
  title: string
  values: string[]
  options: Array<{ value: string; label: string }>
  onValuesChange: (values: string[]) => void
}) {
  const desktop = useDesktop()
  const [open, setOpen] = useState(false)
  const selectedLabels = options.filter((option) => values.includes(option.value)).map((option) => option.label)
  const hasSelection = values.length > 0
  const summary =
    selectedLabels.length === 0
      ? he.manager.all
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} ${he.manager.reports.selectedOptions}`

  const toggle = (value: string, checked: boolean) => {
    if (checked) onValuesChange([...values, value])
    else onValuesChange(values.filter((item) => item !== value))
  }

  const triggerClass = cn(
    filterControlClass,
    "relative flex cursor-pointer items-center pe-9 ps-4 text-start"
  )

  if (!desktop) {
    return (
      <>
        <FilterTriggerControl
          className={filterControlClass}
          label={summary}
          active={hasSelection}
          resetLabel={he.manager.dashboard.reset}
          onOpen={() => setOpen(true)}
          onReset={() => onValuesChange([])}
        />
        <MobileFilterPicker
          open={open}
          title={title}
          onClose={() => setOpen(false)}
          footer={
            <div className="border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Button
                type="button"
                className="h-[calc(2.25rem*1.1*1.1)] w-full"
                onClick={() => setOpen(false)}
              >
                {he.close}
              </Button>
            </div>
          }
        >
          <div className="px-2 pb-2">
            {options.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {he.manager.reports.emptyOptions}
              </p>
            ) : (
              <ul className="flex flex-col">
                {options.map((option) => {
                  const checked = values.includes(option.value)
                  return (
                    <li key={option.value} className="border-b border-border/60 last:border-b-0">
                      <div className="flex items-center gap-3 px-3 py-3.5">
                        <button
                          type="button"
                          className="pressable min-w-0 flex-1 text-start text-sm font-medium"
                          onClick={() => toggle(option.value, !checked)}
                        >
                          <span className="truncate">{option.label}</span>
                        </button>
                        <RowCheckbox
                          checked={checked}
                          round
                          ariaLabel={option.label}
                          onChange={(next) => toggle(option.value, next)}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </MobileFilterPicker>
      </>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClass}>
        <span className="min-w-0 flex-1 truncate">{summary}</span>
        <ChevronDown className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="max-h-52 min-w-48 rounded-md p-1.5">
        {options.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">{he.manager.reports.emptyOptions}</div>
        ) : (
          options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={values.includes(option.value)}
              className="rounded-md px-3 py-2"
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(checked) => toggle(option.value, checked === true)}
            >
              <span className="truncate">{option.label}</span>
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function RowCheckbox({
  checked,
  round = false,
  ariaLabel,
  onChange,
}: {
  checked: boolean
  round?: boolean
  ariaLabel: string
  onChange: (checked: boolean) => void
}) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-[1.125rem] shrink-0 cursor-pointer appearance-none border border-border bg-background checked:border-primary checked:bg-primary checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2016%2016%22%20fill=%22none%22%20stroke=%22white%22%20stroke-width=%222.2%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%3E%3Cpath%20d=%22M3.5%208.5%206.5%2011.5%2012.5%204.5%22/%3E%3C/svg%3E')] checked:bg-center checked:bg-no-repeat accent-primary",
        round ? "rounded-full" : "rounded-[4px]"
      )}
      checked={checked}
      aria-label={ariaLabel}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onChange(event.target.checked)}
    />
  )
}

function normalizeCascade(db: MockDb, filters: AdvancedFilters): AdvancedFilters {
  let next = { ...filters }
  if (next.companyIds.length > 0) {
    next = {
      ...next,
      customerIds: next.customerIds.filter((id) => {
        const customer = db.customers.find((item) => item.id === id)
        if (customer?.companyId && next.companyIds.includes(customer.companyId)) return true
        return db.diaries.some(
          (diary) => diary.customerId === id && next.companyIds.includes(diary.companyId)
        )
      }),
    }
  }
  if (next.siteIds.length > 0) {
    next = {
      ...next,
      siteIds: next.siteIds.filter((id) => {
        const site = db.sites.find((item) => item.id === id)
        if (next.customerIds.length > 0) {
          if (site?.customerId && next.customerIds.includes(site.customerId)) return true
          return db.diaries.some(
            (diary) => diary.siteId === id && next.customerIds.includes(diary.customerId)
          )
        }
        if (next.companyIds.length > 0) {
          if (site?.customerId) {
            const customer = db.customers.find((item) => item.id === site.customerId)
            if (customer?.companyId && next.companyIds.includes(customer.companyId)) return true
          }
          return db.diaries.some(
            (diary) => diary.siteId === id && next.companyIds.includes(diary.companyId)
          )
        }
        return Boolean(site)
      }),
    }
  }
  return next
}

function FilterSelect({
  title,
  value,
  options,
  onValueChange,
}: {
  title: string
  value: string
  options: Array<{ value: string; label: string }>
  onValueChange: (value: string) => void
}) {
  const desktop = useDesktop()
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)?.label ?? he.manager.all
  const hasSelection = Boolean(value)
  const triggerClass = cn(
    filterControlClass,
    "relative flex cursor-pointer items-center pe-9 ps-4 text-start"
  )

  if (!desktop) {
    return (
      <>
        <FilterTriggerControl
          className={filterControlClass}
          label={selected}
          active={hasSelection}
          resetLabel={he.manager.dashboard.reset}
          onOpen={() => setOpen(true)}
          onReset={() => onValueChange("")}
        />
        <MobileFilterPicker open={open} title={title} onClose={() => setOpen(false)}>
          <div className="px-2 pb-2">
            <ul className="flex flex-col">
              {options.map((option) => {
                const active = (option.value || "") === (value || "")
                return (
                  <li key={option.value || EMPTY_FILTER} className="border-b border-border/60 last:border-b-0">
                    <button
                      type="button"
                      className={cn(
                        "pressable flex w-full items-center px-3 py-3.5 text-start text-sm font-medium",
                        active && "text-primary"
                      )}
                      onClick={() => {
                        onValueChange(option.value)
                        setOpen(false)
                      }}
                    >
                      <span className="truncate">{option.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </MobileFilterPicker>
      </>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClass}>
        <span className="min-w-0 flex-1 truncate">{selected}</span>
        <ChevronDown className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="max-h-52 rounded-md p-1.5">
        <DropdownMenuRadioGroup
          value={value || EMPTY_FILTER}
          onValueChange={(next) => onValueChange(next === EMPTY_FILTER ? "" : next)}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value || EMPTY_FILTER}
              value={option.value || EMPTY_FILTER}
              className="rounded-md px-3 py-2"
            >
              <span className="truncate">{option.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FilterDate({
  title,
  value,
  placeholder,
  onValueChange,
}: {
  title: string
  value: string
  placeholder: string
  onValueChange: (value: string) => void
}) {
  const desktop = useDesktop()
  const [open, setOpen] = useState(false)
  const triggerClass = cn(
    filterControlClass,
    "relative flex cursor-pointer items-center pe-9 ps-4 text-start"
  )
  const displayLabel = value ? formatWorkDate(value) : placeholder
  const calendar = (
    <>
      <HebrewCalendar
        value={value}
        onSelect={(next) => {
          onValueChange(next)
          setOpen(false)
        }}
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 h-8 w-full text-xs"
          onClick={() => {
            onValueChange("")
            setOpen(false)
          }}
        >
          {he.manager.dashboard.clearDate}
        </Button>
      ) : null}
    </>
  )

  if (!desktop) {
    return (
      <>
        <FilterTriggerControl
          className={filterControlClass}
          label={displayLabel}
          muted={!value}
          active={Boolean(value)}
          resetLabel={he.manager.dashboard.reset}
          onOpen={() => setOpen(true)}
          onReset={() => onValueChange("")}
        />
        <MobileFilterPicker open={open} title={title} onClose={() => setOpen(false)}>
          <div className="flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">
            {calendar}
          </div>
        </MobileFilterPicker>
      </>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className={triggerClass}>
        <span className={cn("min-w-0 flex-1 truncate", !value && "text-muted-foreground")}>
          {displayLabel}
        </span>
        <ChevronDown className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="w-auto rounded-md p-3">
        {calendar}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function HebrewCalendar({
  value,
  onSelect,
}: {
  value: string
  onSelect: (value: string) => void
}) {
  const selected = parseIsoDate(value)
  const initial = selected ?? parseIsoDate(jerusalemToday()) ?? new Date()
  const [cursor, setCursor] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1))
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, index) => {
    if (index < firstDay) return null
    return index - firstDay + 1
  })

  return (
    <div className="w-[16.5rem]" dir="rtl">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          aria-label="חודש הבא"
        >
          <ChevronRight className="size-4" />
        </button>
        <p className="text-sm font-semibold">{formatMonthTitle(year, month)}</p>
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          aria-label="חודש קודם"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {HEBREW_WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} />
          const iso = toIsoDate(new Date(year, month, day))
          const active = value === iso
          return (
            <button
              key={iso}
              type="button"
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-full text-sm tabular-nums hover:bg-muted",
                active && "bg-primary text-primary-foreground hover:bg-primary"
              )}
              onClick={() => onSelect(iso)}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DuplicateButton({ diary }: { diary: ManagerDiarySummary }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="size-7 text-muted-foreground hover:bg-transparent hover:text-foreground"
      aria-label={he.manager.dashboard.columns.duplicate}
      title={he.manager.dashboard.columns.duplicate}
      onClick={(event) => {
        event.stopPropagation()
        duplicateNextDay(diary)
      }}
    >
      <Files className="size-3.5" />
    </Button>
  )
}

function Cell({
  value,
  children,
  className,
}: {
  value?: string
  children?: ReactNode
  className?: string
}) {
  return (
    <td className={cn("px-2 py-2 text-center first:ps-3 last:pe-3", className)}>
      {children ?? (
        <span className="mx-auto block max-w-full truncate text-center" title={value}>
          {value}
        </span>
      )}
    </td>
  )
}

function DiaryRow({
  diary,
  onOpen,
}: {
  diary: ManagerDiarySummary
  onOpen: (id: string) => void
}) {
  const place = [diary.siteName, diary.subSiteName].filter(Boolean).join(" · ")
  const statusDot = diary.duplicatedFromId
    ? "bg-sky-500"
    : diary.status === "pending"
      ? "bg-orange-500"
      : diary.status === "submitted"
        ? "bg-emerald-500"
        : diary.status === "cancelled"
          ? "bg-zinc-500"
          : null
  return (
    <button
      type="button"
      className={cn(
        "flex w-full min-w-0 flex-col gap-1 px-3 py-2.5 text-start text-sm",
        diary.status === "cancelled" && "text-muted-foreground line-through"
      )}
      onClick={() => onOpen(diary.id)}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-2 truncate font-medium">
          {statusDot ? (
            <span className={cn("size-2 shrink-0 rounded-full", statusDot)} aria-hidden />
          ) : null}
          <span className="truncate">{formatWorkDate(diary.workDate)}</span>
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">{diaryStatusLabel(diary.status)}</span>
      </span>
      <span className="truncate text-xs text-muted-foreground">{place}</span>
      <span className="truncate text-xs text-muted-foreground">{diary.teamLeaderName}</span>
    </button>
  )
}

