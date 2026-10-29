"use client"

import { useState } from "react"
import { toast } from "sonner"
import { PageFrame } from "@/components/motion/page-frame"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createManagerDiary, useManagerDb } from "@/data/browser-store"
import { filterManagerDiaries, getManagerDiary, listManagerDiaries, type ManagerDiarySummary } from "@/data/manager"
import { LeaderLoading, LeaderStoreError } from "@/features/leader/leader-states"
import { DiaryPanel, diaryStatusLabel } from "@/features/manager/diary-panel"
import { Field, fieldClass, NewDiaryLink } from "@/features/manager/fields"
import { he } from "@/i18n/he"
import { addCalendarDays, formatWorkDate, formatWorkDateNumeric, jerusalemDay, jerusalemSpan, jerusalemToday } from "@/lib/format"
import { BidiText } from "@/lib/bidi"
import { cn } from "cn"

type StatusFilter = "all" | "pending" | "submitted"
type DatePreset = "today" | "week" | "month"

export function DashboardScreen() {
  const query = useManagerDb()
  const [status, setStatus] = useState<StatusFilter>("all")
  const [datePreset, setDatePreset] = useState<DatePreset | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [workDate, setWorkDate] = useState("")
  const [companyId, setCompanyId] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [siteId, setSiteId] = useState("")
  const [teamLeaderId, setTeamLeaderId] = useState("")
  if (query.status === "loading") return <LeaderLoading />
  if (query.status === "error") return <LeaderStoreError />

  const db = query.db
  const today = jerusalemToday()
  const all = listManagerDiaries(db)
  const cards = [
    [he.manager.dashboard.createdToday, all.filter((diary) => jerusalemDay(diary.createdAt) === today).length],
    [he.manager.dashboard.pendingTotal, all.filter((diary) => diary.status === "pending").length],
    [he.manager.dashboard.submittedTotal, all.filter((diary) => diary.status === "submitted").length],
    [he.manager.dashboard.createdTotal, all.length],
  ] as const
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
    subSiteId: "",
  })
  const openDiary = openId ? getManagerDiary(db, openId) : null
  const customers = db.customers.filter((item) => !companyId || item.companyId === companyId)
  const sites = db.sites.filter((item) => {
    if (customerId) return item.customerId === customerId
    if (!companyId) return true
    return customers.some((customer) => customer.id === item.customerId)
  })
  const leaders = db.users.filter((user) => user.role === "teamLeader")
  const dateFilters: Array<[DatePreset, string]> = [
    ["today", he.manager.dashboard.quick.today],
    ["week", he.manager.dashboard.quick.week],
    ["month", he.manager.dashboard.quick.month],
  ]
  const statusFilters: Array<["pending" | "submitted", string]> = [
    ["pending", he.manager.dashboard.quick.pending],
    ["submitted", he.manager.dashboard.quick.submitted],
  ]

  return (
    <PageFrame>
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{he.manager.dashboard.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <NewDiaryLink />
            <div className="flex flex-wrap gap-1.5">
              {dateFilters.map(([value, label]) => (
                <FilterChip
                  key={value}
                  pressed={datePreset === value}
                  label={label}
                  onClick={() => {
                    setDatePreset((current) => (current === value ? null : value))
                    setWorkDate("")
                  }}
                />
              ))}
              {statusFilters.map(([value, label]) => (
                <FilterChip
                  key={value}
                  pressed={status === value}
                  label={label}
                  onClick={() => setStatus((current) => (current === value ? "all" : value))}
                />
              ))}
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          {cards.map(([label, value]) => (
            <div key={label} className="flex min-h-16 flex-col justify-center gap-0.5 rounded-xl border border-border bg-card px-3 py-2">
              <dd className="text-xl font-semibold tabular-nums leading-none">{value}</dd>
              <dt className="text-sm leading-5 text-muted-foreground">{label}</dt>
            </div>
          ))}
        </dl>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <Field label={he.manager.dashboard.searchFree}>
            <Input
              value={search}
              placeholder={he.manager.dashboard.searchFree}
              className="h-11 text-base md:text-base"
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          <Field label={he.leader.form.date}>
            <Input
              type="date"
              dir="ltr"
              value={workDate}
              className="h-11 text-base md:text-base"
              onChange={(event) => {
                setWorkDate(event.target.value)
                setDatePreset(null)
              }}
            />
          </Field>
          <Field label={he.manager.dashboard.columns.company}>
            <select
              className={fieldClass}
              value={companyId}
              onChange={(event) => {
                setCompanyId(event.target.value)
                setCustomerId("")
                setSiteId("")
              }}
            >
              <option value="">{he.manager.all}</option>
              {db.companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </Field>
          <Field label={he.manager.dashboard.columns.customer}>
            <select
              className={fieldClass}
              value={customerId}
              onChange={(event) => {
                setCustomerId(event.target.value)
                setSiteId("")
              }}
            >
              <option value="">{he.manager.all}</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </Field>
          <Field label={he.manager.dashboard.columns.site}>
            <select className={fieldClass} value={siteId} onChange={(event) => setSiteId(event.target.value)}>
              <option value="">{he.manager.all}</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </Field>
          <Field label={he.manager.dashboard.columns.leader}>
            <select className={fieldClass} value={teamLeaderId} onChange={(event) => setTeamLeaderId(event.target.value)}>
              <option value="">{he.manager.all}</option>
              {leaders.map((leader) => (
                <option key={leader.id} value={leader.id}>{leader.fullName}</option>
              ))}
            </select>
          </Field>
        </section>
        <h2 className="text-sm font-medium">{he.manager.dashboard.recent}</h2>
        {diaries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{he.manager.dashboard.recentEmpty}</p>
        ) : (
          <>
            <DiaryTable diaries={diaries} onOpen={setOpenId} />
            <ul className="overflow-hidden rounded-xl border border-border bg-card lg:hidden">
              {diaries.map((diary) => (
                <li key={diary.id} className="border-b border-border last:border-b-0">
                  <DiaryRow diary={diary} onOpen={setOpenId} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <DiaryPanel db={db} diary={openDiary} onOpenChange={(open) => { if (!open) setOpenId(null) }} />
    </PageFrame>
  )
}

function FilterChip({
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
      aria-pressed={pressed}
      className={cn(
        "pressable min-h-11 rounded-xl border px-3 text-sm",
        pressed ? "border-foreground bg-muted font-medium" : "border-border bg-card text-muted-foreground"
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
    workDate: addCalendarDays(diary.workDate, 1),
    siteId: diary.siteId,
    subSiteId: diary.subSiteId,
    workOrderNumber: diary.workOrderNumber,
  })
  if (result.ok) toast.success(he.manager.created)
  else toast(he.manager.invalid)
}

function DiaryTable({
  diaries,
  onOpen,
}: {
  diaries: ManagerDiarySummary[]
  onOpen: (id: string) => void
}) {
  const columns = he.manager.dashboard.columns
  const headers = [
    columns.index,
    columns.date,
    columns.company,
    columns.customer,
    columns.site,
    columns.subSite,
    columns.leader,
    columns.workOrder,
    columns.status,
    columns.duplicate,
  ]

  return (
    <div className="hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
      <table className="w-full min-w-[76rem] table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-12" />
          <col className="w-44" />
          <col />
          <col />
          <col />
          <col />
          <col />
          <col className="w-28" />
          <col className="w-32" />
          <col className="w-24" />
        </colgroup>
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 text-start font-medium whitespace-nowrap">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {diaries.map((diary, index) => (
            <tr
              key={diary.id}
              tabIndex={0}
              className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted"
              onClick={() => onOpen(diary.id)}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return
                if (event.key !== "Enter" && event.key !== " ") return
                event.preventDefault()
                onOpen(diary.id)
              }}
            >
              <td className="px-3 py-2 tabular-nums text-muted-foreground">{index + 1}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                <BidiText>{formatWorkDateNumeric(diary.workDate)}</BidiText>
              </td>
              <Cell value={diary.companyName} />
              <Cell value={diary.customerName} />
              <Cell value={diary.siteName} />
              <Cell value={diary.subSiteName} />
              <Cell value={diary.teamLeaderName} />
              <td className="px-3 py-2 whitespace-nowrap">
                <BidiText>{diary.workOrderNumber}</BidiText>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {diaryStatusLabel(diary.status)}
              </td>
              <td className="px-2 py-1">
                <DuplicateButton diary={diary} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DuplicateButton({ diary }: { diary: ManagerDiarySummary }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 px-3 text-sm"
      onClick={(event) => {
        event.stopPropagation()
        duplicateNextDay(diary)
      }}
    >
      {he.manager.dashboard.columns.duplicate}
    </Button>
  )
}

function Cell({ value }: { value: string }) {
  return (
    <td className="px-3 py-2">
      <span className="block truncate" title={value}>
        {value}
      </span>
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
      <button type="button" className="min-w-0 flex-1 py-2 text-start" onClick={() => onOpen(diary.id)}>
        <span className="block truncate font-medium">{diary.subSiteName}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {formatWorkDate(diary.workDate)} · {diary.teamLeaderName} · {diary.siteName}
        </span>
      </button>
      <DuplicateButton diary={diary} />
    </div>
  )
}

