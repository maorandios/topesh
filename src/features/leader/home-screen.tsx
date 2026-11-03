"use client"

import { useEffect, useState, type ReactNode } from "react"
import { CalendarDays, Filter, Search, X, type LucideIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { PageFrame } from "@/components/motion/page-frame"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { HebrewCalendar } from "@/components/hebrew-date-picker"
import {
  FilterTriggerControl,
  MobileFilterPicker,
} from "@/features/manager/mobile-filters/picker-overlay"
import { useLeaderDiaries } from "@/data/browser-store"
import type { LeaderDiarySummary } from "@/data/repository"
import type { DiaryStatus } from "@/domain/types"
import { DiaryCard } from "@/features/leader/diary-card"
import { LeaderDiaryPanel } from "@/features/leader/leader-diary-panel"
import { LeaderLoading, LeaderStoreError } from "@/features/leader/leader-states"
import { he } from "@/i18n/he"
import { formatWorkDate } from "@/lib/format"
import { cn } from "cn"

type QuickFilter = DiaryStatus

type DateFilters = {
  from: string
  to: string
}

const emptyDates = (): DateFilters => ({ from: "", to: "" })

const filterControlClass =
  "h-[calc(2.25rem*1.1*1.1)] w-full min-w-0 rounded-md border border-border bg-card px-4 text-sm text-foreground shadow-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-card"

const quickFilterOptions: Array<[QuickFilter, string]> = [
  ["submitted", he.leader.status.submitted],
  ["pending", he.leader.status.pending],
  ["cancelled", he.leader.status.cancelled],
]

function filterDiaries(
  diaries: LeaderDiarySummary[],
  search: string,
  quickFilter: QuickFilter | null,
  dateFilters: DateFilters
) {
  const needle = search.trim().toLowerCase()
  const rangeInvalid = Boolean(
    dateFilters.from && dateFilters.to && dateFilters.from > dateFilters.to
  )
  if (rangeInvalid) return []

  return diaries.filter((diary) => {
    if (quickFilter && diary.status !== quickFilter) return false
    if (dateFilters.from && diary.workDate < dateFilters.from) return false
    if (dateFilters.to && diary.workDate > dateFilters.to) return false
    if (!needle) return true
    const haystack = [diary.siteName, diary.subSiteName, diary.projectName, diary.workDate]
      .join(" ")
      .toLowerCase()
    return haystack.includes(needle)
  })
}

export function LeaderHomeScreen() {
  const query = useLeaderDiaries()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState("")
  const [quickFilter, setQuickFilter] = useState<QuickFilter | null>(null)
  const [dateFilters, setDateFilters] = useState<DateFilters>(emptyDates())
  const [draftFilters, setDraftFilters] = useState<DateFilters>(emptyDates())
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    const diaryId = searchParams.get("diary")
    if (diaryId) setOpenId(diaryId)
  }, [searchParams])

  if (query.status === "loading") return <LeaderLoading />
  if (query.status === "error") return <LeaderStoreError />

  const openDiary = (id: string) => {
    setOpenId(id)
    const params = new URLSearchParams(searchParams.toString())
    params.set("diary", id)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const closeDiary = () => {
    setOpenId(null)
    const params = new URLSearchParams(searchParams.toString())
    params.delete("diary")
    const queryString = params.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }

  const hasActiveDateFilters = Boolean(dateFilters.from || dateFilters.to)
  const filtered = filterDiaries(query.data, search, quickFilter, dateFilters)
  const submittedCount = query.data.filter((diary) => diary.status === "submitted").length
  const pendingCount = query.data.filter((diary) => diary.status === "pending").length
  const totalCount = query.data.length
  const metricCards = [
    {
      key: "submitted",
      label: he.leader.home.submittedTotal,
      value: submittedCount,
      dot: "bg-emerald-500",
    },
    {
      key: "pending",
      label: he.leader.home.pendingTotal,
      value: pendingCount,
      dot: "bg-orange-500",
    },
    {
      key: "total",
      label: he.leader.home.diariesTotal,
      value: totalCount,
      dot: "bg-zinc-500",
    },
  ] as const

  const openMobileFilters = () => {
    setDraftFilters(dateFilters)
    setMobileFiltersOpen(true)
  }

  const applyMobileFilters = () => {
    setDateFilters(draftFilters)
    setMobileFiltersOpen(false)
  }

  const clearDateFilters = () => {
    setDateFilters(emptyDates())
    setDraftFilters(emptyDates())
  }

  const resetAll = () => {
    setQuickFilter(null)
    setSearch("")
    clearDateFilters()
  }

  return (
    <PageFrame>
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-6">
        <div className="grid grid-cols-3 gap-2.5">
          {metricCards.map((card) => (
            <div
              key={card.key}
              className="flex aspect-square min-w-0 flex-col rounded-md border border-border bg-card p-2.5 sm:p-3"
            >
              <p className="inline-flex shrink-0 items-center gap-1.5 text-balance text-[11px] leading-4 text-muted-foreground sm:text-sm sm:leading-5">
                <span className={cn("size-1.5 shrink-0 rounded-full", card.dot)} aria-hidden />
                <span>{card.label}</span>
              </p>
              <p className="flex min-h-0 flex-1 items-center justify-center text-4xl font-semibold tabular-nums tracking-tight text-foreground sm:text-5xl">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
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
              hasActiveDateFilters && "border-primary text-foreground"
            )}
            onClick={openMobileFilters}
          >
            <Filter className="size-4" aria-hidden />
            {he.manager.reports.filters}
          </Button>
          {hasActiveDateFilters ? (
            <Button
              type="button"
              variant="outline"
              size="default"
              className="h-[calc(2.25rem*1.1*1.1)] shrink-0 border-primary text-foreground"
              onClick={clearDateFilters}
            >
              <X className="size-4" aria-hidden />
              {he.manager.reports.exportCancel}
            </Button>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-md border border-border bg-card">
          <div className="border-b border-border bg-muted/70 px-2 py-2">
            <div
              role="radiogroup"
              aria-label={he.manager.dashboard.filterTitle}
              className="flex w-full items-stretch gap-1"
            >
              {quickFilterOptions.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={quickFilter === value}
                  className={cn(
                    "pressable relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center px-1.5 text-center text-sm transition-colors",
                    quickFilter === value
                      ? "font-medium text-foreground"
                      : "text-foreground/80 hover:text-foreground"
                  )}
                  onClick={() => setQuickFilter(value)}
                >
                  <span className="whitespace-nowrap">{label}</span>
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute bottom-1.5 h-0.5 w-6 rounded-full transition-opacity",
                      quickFilter === value
                        ? "bg-primary opacity-100 shadow-[0_0_8px_2px_rgb(255_51_0_/_0.55)]"
                        : "opacity-0"
                    )}
                  />
                </button>
              ))}
              <button
                type="button"
                role="radio"
                aria-checked={false}
                className="pressable relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center px-1.5 text-center text-sm text-foreground/80 transition-colors hover:text-foreground"
                onClick={resetAll}
              >
                <span className="whitespace-nowrap">{he.manager.dashboard.reset}</span>
              </button>
            </div>
          </div>

          {query.data.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{he.leader.home.emptyTitle}</p>
              <p className="mt-1">{he.leader.home.emptyBody}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{he.leader.history.emptyTitle}</p>
              <p className="mt-1">{he.leader.history.emptyBody}</p>
            </div>
          ) : (
            <ul>
              {filtered.map((diary) => (
                <li key={diary.id} className="border-b border-border last:border-b-0">
                  <DiaryCard diary={diary} onOpen={openDiary} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <LeaderDiaryPanel
        diaryId={openId}
        open={Boolean(openId)}
        onOpenChange={(next) => {
          if (!next) closeDiary()
        }}
      />

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
              <FilterField label={he.manager.dashboard.dateFrom} icon={CalendarDays}>
                <MobileFilterDate
                  title={he.manager.dashboard.dateFrom}
                  value={draftFilters.from}
                  placeholder={he.manager.dashboard.pickDate}
                  onValueChange={(from) => setDraftFilters((prev) => ({ ...prev, from }))}
                />
              </FilterField>
              <FilterField label={he.manager.dashboard.dateTo} icon={CalendarDays}>
                <MobileFilterDate
                  title={he.manager.dashboard.dateTo}
                  value={draftFilters.to}
                  placeholder={he.manager.dashboard.pickDate}
                  onValueChange={(to) => setDraftFilters((prev) => ({ ...prev, to }))}
                />
              </FilterField>
            </div>
          </div>
          <SheetFooter className="shrink-0 flex-row gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-[calc(2.25rem*1.1*1.1)] w-[30%]"
              onClick={() => setDraftFilters(emptyDates())}
            >
              {he.nav.clearFilters}
            </Button>
            <Button
              type="button"
              className="h-[calc(2.25rem*1.1*1.1)] w-[70%]"
              onClick={applyMobileFilters}
            >
              {he.nav.applyFilters}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageFrame>
  )
}

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

function MobileFilterDate({
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
  const [open, setOpen] = useState(false)
  const displayLabel = value ? formatWorkDate(value) : placeholder

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
          <div className="flex flex-col items-center">
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
          </div>
        </div>
      </MobileFilterPicker>
    </>
  )
}
