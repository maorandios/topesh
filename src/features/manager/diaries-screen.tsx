"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { PageFrame } from "@/components/motion/page-frame"
import { AppLink } from "@/components/shell/app-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useManagerDb } from "@/data/browser-store"
import { filterManagerDiaries, type DiaryFilters, type ManagerDiarySummary } from "@/data/manager"
import { LeaderLoading, LeaderStoreError } from "@/features/leader/leader-states"
import { Field, fieldClass, NewDiaryLink } from "@/features/manager/fields"
import { he } from "@/i18n/he"
import { formatWorkDate, formatWorkDateNumeric } from "@/lib/format"
import { BidiText } from "@/lib/bidi"

const emptyFilters = (leaderId = ""): DiaryFilters => ({
  query: "",
  status: "all",
  from: "",
  to: "",
  teamLeaderId: leaderId,
  companyId: "",
  customerId: "",
  siteId: "",
  subSiteId: "",
})

export function DiariesScreen() {
  const params = useSearchParams()
  const query = useManagerDb()
  const [filters, setFilters] = useState(() => emptyFilters(params.get("leader") ?? ""))
  const [filtersOpen, setFiltersOpen] = useState(false)
  if (query.status === "loading") return <LeaderLoading />
  if (query.status === "error") return <LeaderStoreError />

  const rows = filterManagerDiaries(query.db, filters)
  const filtering = JSON.stringify(filters) !== JSON.stringify(emptyFilters())

  return (
    <PageFrame>
      <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{he.manager.diaries.title}</h1>
          <NewDiaryLink />
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            value={filters.query}
            placeholder={he.manager.search}
            className="h-11 max-w-md text-base md:text-base"
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
          />
          <Button type="button" variant="outline" size="touch" className="lg:hidden" onClick={() => setFiltersOpen(true)}>
            {he.manager.filter}
          </Button>
          {filtering ? (
            <Button type="button" variant="outline" size="touch" onClick={() => setFilters(emptyFilters())}>
              {he.manager.clear}
            </Button>
          ) : null}
        </div>
        <div className="hidden lg:block">
          <DiaryFiltersForm db={query.db} filters={filters} onChange={setFilters} />
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{he.manager.diaries.empty}</p>
        ) : (
          <>
            <DiaryTable rows={rows} />
            <ul className="flex flex-col gap-3 lg:hidden">
              {rows.map((diary) => (
                <li key={diary.id}>
                  <DiaryCard diary={diary} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <Drawer open={filtersOpen} onOpenChange={setFiltersOpen} swipeDirection="down">
        <DrawerContent>
          <DrawerHeader className="text-start group-data-[swipe-axis=y]/drawer-popup:text-start">
            <DrawerTitle>{he.manager.filter}</DrawerTitle>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
            <DiaryFiltersForm db={query.db} filters={filters} onChange={setFilters} />
            <Button type="button" size="touch" onClick={() => setFiltersOpen(false)}>
              {he.manager.save}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </PageFrame>
  )
}

function DiaryFiltersForm({
  db,
  filters,
  onChange,
}: {
  db: Extract<ReturnType<typeof useManagerDb>, { status: "ready" }>["db"]
  filters: DiaryFilters
  onChange: (filters: DiaryFilters) => void
}) {
  const customers = db.customers.filter((item) => !filters.companyId || item.companyId === filters.companyId)
  const sites = db.sites.filter((item) => !filters.customerId || item.customerId === filters.customerId)
  const subSites = db.subSites.filter((item) => !filters.siteId || item.siteId === filters.siteId)
  const set = (patch: Partial<DiaryFilters>) => onChange({ ...filters, ...patch })
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Field label={he.manager.status}>
        <select
          className={fieldClass}
          value={filters.status}
          onChange={(event) => set({ status: event.target.value as DiaryFilters["status"] })}
        >
          <option value="all">{he.manager.all}</option>
          <option value="pending">{he.leader.status.pending}</option>
          <option value="submitted">{he.leader.status.submitted}</option>
        </select>
      </Field>
      <Field label={he.manager.diaries.leader}>
        <select className={fieldClass} value={filters.teamLeaderId} onChange={(event) => set({ teamLeaderId: event.target.value })}>
          <option value="">{he.manager.all}</option>
          {db.users.filter((user) => user.role === "teamLeader").map((leader) => (
            <option key={leader.id} value={leader.id}>{leader.fullName}</option>
          ))}
        </select>
      </Field>
      <Field label={he.manager.diaries.company}>
        <select className={fieldClass} value={filters.companyId} onChange={(event) => set({ companyId: event.target.value, customerId: "", siteId: "", subSiteId: "" })}>
          <option value="">{he.manager.all}</option>
          {db.companies.map((company) => (
            <option key={company.id} value={company.id}>{company.name}</option>
          ))}
        </select>
      </Field>
      <Field label={he.manager.diaries.customer}>
        <select className={fieldClass} value={filters.customerId} onChange={(event) => set({ customerId: event.target.value, siteId: "", subSiteId: "" })}>
          <option value="">{he.manager.all}</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>{customer.name}</option>
          ))}
        </select>
      </Field>
      <Field label={he.manager.diaries.site}>
        <select className={fieldClass} value={filters.siteId} onChange={(event) => set({ siteId: event.target.value, subSiteId: "" })}>
          <option value="">{he.manager.all}</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>{site.name}</option>
          ))}
        </select>
      </Field>
      <Field label={he.manager.diaries.subSite}>
        <select className={fieldClass} value={filters.subSiteId} onChange={(event) => set({ subSiteId: event.target.value })}>
          <option value="">{he.manager.all}</option>
          {subSites.map((subSite) => (
            <option key={subSite.id} value={subSite.id}>{subSite.name}</option>
          ))}
        </select>
      </Field>
      <Field label={he.manager.diaries.from}>
        <Input type="date" dir="ltr" value={filters.from} className="h-11 text-base md:text-base" onChange={(event) => set({ from: event.target.value })} />
      </Field>
      <Field label={he.manager.diaries.to}>
        <Input type="date" dir="ltr" value={filters.to} className="h-11 text-base md:text-base" onChange={(event) => set({ to: event.target.value })} />
      </Field>
    </div>
  )
}

function DiaryTable({ rows }: { rows: ManagerDiarySummary[] }) {
  return (
    <div className="hidden lg:block">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="px-2 py-2 text-start font-medium">{he.manager.diaries.date}</th>
            <th className="px-2 py-2 text-start font-medium">{he.manager.diaries.leader}</th>
            <th className="px-2 py-2 text-start font-medium">{he.manager.diaries.site}</th>
            <th className="px-2 py-2 text-start font-medium">{he.manager.diaries.subSite}</th>
            <th className="px-2 py-2 text-start font-medium">{he.manager.diaries.workOrder}</th>
            <th className="px-2 py-2 text-start font-medium">{he.manager.status}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((diary) => (
            <tr key={diary.id} className="border-b border-border">
              <td className="px-2 py-3">
                <AppLink href={`/manager/diaries/${diary.id}`} className="font-medium">
                  <BidiText>{formatWorkDateNumeric(diary.workDate)}</BidiText>
                </AppLink>
              </td>
              <td className="px-2 py-3">{diary.teamLeaderName}</td>
              <td className="px-2 py-3">{diary.siteName}</td>
              <td className="px-2 py-3">{diary.subSiteName}</td>
              <td className="px-2 py-3"><BidiText>{diary.workOrderNumber}</BidiText></td>
              <td className="px-2 py-3">{diary.status === "pending" ? he.leader.status.pending : he.leader.status.submitted}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DiaryCard({ diary }: { diary: ManagerDiarySummary }) {
  return (
    <AppLink href={`/manager/diaries/${diary.id}`} className="pressable flex flex-col gap-1 rounded-2xl border border-border bg-card p-4 text-sm">
      <span className="flex items-center justify-between gap-3">
        <span className="font-medium">{formatWorkDate(diary.workDate)}</span>
        <span>{diary.status === "pending" ? he.leader.status.pending : he.leader.status.submitted}</span>
      </span>
      <span>{diary.teamLeaderName}</span>
      <span className="text-muted-foreground">{diary.siteName} · {diary.subSiteName}</span>
      <BidiText>{diary.workOrderNumber}</BidiText>
    </AppLink>
  )
}
