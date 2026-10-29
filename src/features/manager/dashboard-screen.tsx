"use client"

import { useState, type ReactNode } from "react"
import {
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Files,
  MapPin,
  Search,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { PageFrame } from "@/components/motion/page-frame"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { createManagerDiary, useManagerDb } from "@/data/browser-store"
import { filterManagerDiaries, getManagerDiary, listManagerDiaries, type ManagerDiarySummary } from "@/data/manager"
import { LeaderLoading, LeaderStoreError } from "@/features/leader/leader-states"
import { DiaryCreatePanel } from "@/features/manager/diary-create-panel"
import { DiaryPanel, diaryStatusLabel } from "@/features/manager/diary-panel"
import { he } from "@/i18n/he"
import {
  addCalendarDays,
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

export function DashboardScreen() {
  const query = useManagerDb()
  const [quickFilter, setQuickFilter] = useState<QuickFilter | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [workDate, setWorkDate] = useState("")
  const [companyId, setCompanyId] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [siteId, setSiteId] = useState("")
  const [teamLeaderId, setTeamLeaderId] = useState("")
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
    teamLeaderId,
    companyId,
    customerId,
    siteId,
  })
  const filterKey = [search, quickFilter ?? "", workDate, companyId, customerId, siteId, teamLeaderId].join("|")
  const extra = loaded.key === filterKey ? loaded.extra : 0
  const visibleDiaries = diaries.slice(0, 30 + extra)
  const openDiary = openId ? getManagerDiary(db, openId) : null
  const customers = db.customers
  const sites = db.sites
  const leaders = db.users.filter((user) => user.role === "teamLeader")
  const quickFilterOptions: Array<[QuickFilter, string]> = [
    ["today", he.manager.dashboard.quick.today],
    ["week", he.manager.dashboard.quick.week],
    ["month", he.manager.dashboard.quick.month],
    ["pending", he.manager.dashboard.quick.pending],
    ["submitted", he.manager.dashboard.quick.submitted],
    ["cancelled", he.manager.dashboard.quick.cancelled],
  ]
  const resetFilters = () => {
    setQuickFilter(null)
    setSearch("")
    setWorkDate("")
    setCompanyId("")
    setCustomerId("")
    setSiteId("")
    setTeamLeaderId("")
    setLoaded({ key: "", extra: 0 })
  }
  const quickFilters = (
    <div
      role="radiogroup"
      aria-label={he.manager.dashboard.filterTitle}
      className="inline-flex max-w-full overflow-x-auto rounded-md border border-border bg-white"
    >
      {quickFilterOptions.map(([value, label]) => (
        <FilterSegment
          key={value}
          pressed={quickFilter === value}
          label={label}
          onClick={() => {
            setQuickFilter(value)
            setWorkDate("")
          }}
        />
      ))}
      <FilterSegment
        pressed={false}
        label={he.manager.dashboard.reset}
        onClick={resetFilters}
      />
    </div>
  )

  return (
    <PageFrame>
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-6">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          {cards.map((card) => (
            <div
              key={card.key}
              className="flex flex-col gap-3 rounded-md border border-border bg-card px-4 py-3.5"
            >
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-start text-3xl font-semibold tabular-nums tracking-tight text-foreground">
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
            className="pressable flex flex-col gap-3 rounded-md border border-foreground bg-foreground px-4 py-3.5 text-start text-background"
            onClick={() => {
              setOpenId(null)
              setCreateOpen(true)
            }}
          >
            <span className="text-sm text-background/70">{metrics.newDiary.label}</span>
            <span className="text-3xl font-semibold tracking-tight">{metrics.newDiary.title}</span>
            <span className="flex items-center gap-2 text-xs text-background/70">
              <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
              <span>{metrics.newDiary.hint}</span>
            </span>
          </button>
        </div>
        <section className="overflow-x-auto rounded-md border border-border bg-muted/40 px-4 py-4 sm:px-5">
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
                value={workDate}
                placeholder={he.manager.dashboard.pickDate}
                onValueChange={(value) => {
                  setWorkDate(value)
                  setQuickFilter(null)
                }}
              />
            </FilterField>
            <FilterField label={he.manager.dashboard.columns.company} icon={Building2}>
              <FilterSelect
                value={companyId}
                options={[
                  { value: "", label: he.manager.all },
                  ...db.companies.map((company) => ({ value: company.id, label: company.name })),
                ]}
                onValueChange={(value) => {
                  setCompanyId(value)
                  setCustomerId("")
                  setSiteId("")
                }}
              />
            </FilterField>
            <FilterField label={he.manager.dashboard.columns.customer} icon={Users}>
              <FilterSelect
                value={customerId}
                options={[
                  { value: "", label: he.manager.all },
                  ...customers.map((customer) => ({ value: customer.id, label: customer.name })),
                ]}
                onValueChange={(value) => {
                  setCustomerId(value)
                  setSiteId("")
                }}
              />
            </FilterField>
            <FilterField label={he.manager.dashboard.columns.site} icon={MapPin}>
              <FilterSelect
                value={siteId}
                options={[
                  { value: "", label: he.manager.all },
                  ...sites.map((site) => ({ value: site.id, label: site.name })),
                ]}
                onValueChange={setSiteId}
              />
            </FilterField>
            <FilterField label={he.manager.dashboard.columns.leader} icon={UserRound}>
              <FilterSelect
                value={teamLeaderId}
                options={[
                  { value: "", label: he.manager.all },
                  ...leaders.map((leader) => ({ value: leader.id, label: leader.fullName })),
                ]}
                onValueChange={setTeamLeaderId}
              />
            </FilterField>
          </div>
        </section>
        <DiaryTable
          diaries={visibleDiaries}
          empty={diaries.length === 0}
          toolbar={quickFilters}
          onOpen={(id) => {
            setCreateOpen(false)
            setOpenId(id)
          }}
        />
        {diaries.length === 0 ? null : (
          <>
            <ul className="overflow-hidden rounded-md border border-border bg-card lg:hidden">
              <li className="flex justify-end border-b border-border bg-muted/70 px-3 py-2.5">
                {quickFilters}
              </li>
              {visibleDiaries.map((diary) => (
                <li key={diary.id} className="border-b border-border last:border-b-0">
                  <DiaryRow
                    diary={diary}
                    onOpen={(id) => {
                      setCreateOpen(false)
                      setOpenId(id)
                    }}
                  />
                </li>
              ))}
            </ul>
            {visibleDiaries.length < diaries.length ? (
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
          </>
        )}
      </div>
      <DiaryPanel db={db} diary={openDiary} onOpenChange={(open) => { if (!open) setOpenId(null) }} />
      <DiaryCreatePanel db={db} open={createOpen} onOpenChange={setCreateOpen} />
    </PageFrame>
  )
}

function FilterSegment({
  pressed,
  label,
  onClick,
}: {
  pressed: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={pressed}
      className={cn(
        "pressable h-8 shrink-0 px-3 text-xs whitespace-nowrap transition-colors",
        pressed
          ? "bg-[#13776D] font-medium text-white"
          : "bg-transparent text-foreground hover:bg-muted/70"
      )}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function duplicateNextDay(diary: ManagerDiarySummary) {
  const result = createManagerDiary({
    teamLeaderId: diary.teamLeaderId,
    workDate: addCalendarDays(jerusalemToday(), 1),
    companyId: diary.companyId,
    customerId: diary.customerId,
    siteId: diary.siteId,
    subSiteName: diary.subSiteName,
    projectName: diary.projectName,
    workOrderNumber: diary.workOrderNumber,
  })
  if (result.ok) toast.success(he.manager.created)
  else toast(he.manager.invalid)
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
        <thead className="sticky top-0 z-30 bg-muted">
          <tr className="bg-muted text-foreground">
            <th colSpan={headers.length} className="bg-muted px-3 pt-3 pb-1.5 font-normal">
              <div className="flex justify-end">{toolbar}</div>
            </th>
          </tr>
          <tr className="border-b border-border bg-muted text-foreground">
            {headers.map((header) => (
              <th
                key={header.key}
                className="bg-muted px-2 pt-1.5 pb-2.5 text-center font-medium whitespace-nowrap first:ps-3 last:pe-3"
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
  "h-10 w-full min-w-0 rounded-md border border-border bg-white px-4 text-sm text-foreground shadow-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-card"

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

function FilterSelect({
  value,
  options,
  onValueChange,
}: {
  value: string
  options: Array<{ value: string; label: string }>
  onValueChange: (value: string) => void
}) {
  const selected = options.find((option) => option.value === value)?.label ?? he.manager.all

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          filterControlClass,
          "relative flex cursor-pointer items-center pe-9 ps-4 text-start"
        )}
      >
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
  value,
  placeholder,
  onValueChange,
}: {
  value: string
  placeholder: string
  onValueChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(filterControlClass, "relative flex cursor-pointer items-center pe-9 ps-4 text-start")}
      >
        <span className={cn("min-w-0 flex-1 truncate", !value && "text-muted-foreground")}>
          {value ? formatWorkDate(value) : placeholder}
        </span>
        <ChevronDown className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="w-auto rounded-md p-3">
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
  return (
    <div className="flex min-h-11 items-center gap-2 px-3 py-1 text-sm">
      <button
        type="button"
        className={cn(
          "min-w-0 flex-1 py-2 text-start",
          diary.status === "cancelled" && "text-muted-foreground line-through"
        )}
        onClick={() => onOpen(diary.id)}
      >
        <span className="block truncate font-medium">{diary.subSiteName}</span>
        <span className="relative block truncate text-xs text-muted-foreground">
          {isUpcomingWorkDate(diary.workDate) ? (
            <span
              className="absolute top-1/2 end-full me-1.5 size-1.5 -translate-y-1/2 rounded-full bg-emerald-500"
              aria-hidden
            />
          ) : null}
          {formatWorkDate(diary.workDate)} · {diary.teamLeaderName} · {diary.siteName}
        </span>
      </button>
      <DuplicateButton diary={diary} />
    </div>
  )
}

