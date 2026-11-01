import type { DiaryStatus } from "@/domain/types"
import { findCompany, findComponent, findCustomer, findDomain, findSite, findUser } from "@/data/lookups"
import { getManagerDiary, listManagerDiaries, type ManagerDiarySummary } from "@/data/manager"
import type { MockDb } from "@/data/seed"
import { sortSelectOptions } from "@/lib/sort"

export type ReportType = "workOrder" | "site" | "components" | "diaries"

export type ReportFilters = {
  from: string
  to: string
  companyId: string
  customerId: string
  siteId: string
  workOrderNumber: string
  teamLeaderId: string
  domainId: string
  componentId: string
  status: "all" | DiaryStatus
  checkboxId: string
}

export type ExecutionSummaryRow = {
  domainId: string
  domainName: string
  componentId: string
  componentName: string
  unit: string
  totalQuantity: number
}

export type ExecutionDetailRow = {
  diaryId: string
  workDate: string
  companyName: string
  customerName: string
  siteName: string
  subSiteName: string
  teamLeaderName: string
  workOrderNumber: string
  domainId: string
  domainName: string
  componentId: string
  componentName: string
  quantity: number
  unit: string
}

export type ReportResult = {
  type: ReportType
  filters: ReportFilters
  matchingDiaryCount: number
  diaries: ManagerDiarySummary[]
  summary: ExecutionSummaryRow[]
  details: ExecutionDetailRow[]
  dateRangeError: string | null
}

export type ReportFilterLabels = {
  from: string
  to: string
  company: string
  customer: string
  site: string
  workOrderNumber: string
  teamLeader: string
  domain: string
  component: string
  status: ReportFilters["status"]
  checkbox: string
}

export const emptyReportFilters = (): ReportFilters => ({
  from: "",
  to: "",
  companyId: "",
  customerId: "",
  siteId: "",
  workOrderNumber: "",
  teamLeaderId: "",
  domainId: "",
  componentId: "",
  status: "all",
  checkboxId: "",
})

export function validateReportDates(from: string, to: string): string | null {
  if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) return "invalid-from"
  if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) return "invalid-to"
  if (from && to && from > to) return "range"
  return null
}

export function buildReport(db: MockDb, type: ReportType, filters: ReportFilters): ReportResult {
  const dateRangeError = validateReportDates(filters.from, filters.to)
  if (dateRangeError) {
    return {
      type,
      filters,
      matchingDiaryCount: 0,
      diaries: [],
      summary: [],
      details: [],
      dateRangeError,
    }
  }

  const diaries = filterReportDiaries(db, type, filters)
  const details = type === "diaries" ? [] : buildExecutionDetails(db, diaries, filters)
  const summary = type === "diaries" ? [] : aggregateExecution(details)

  return {
    type,
    filters,
    matchingDiaryCount: diaries.length,
    diaries,
    summary,
    details,
    dateRangeError: null,
  }
}

export function filterOptions(db: MockDb, filters: ReportFilters) {
  const companies = sortSelectOptions(
    db.companies.map((item) => ({ value: item.id, label: item.name }))
  )
  const customers = sortSelectOptions(
    db.customers
      .filter((item) => !filters.companyId || item.companyId === filters.companyId)
      .map((item) => ({ value: item.id, label: item.name }))
  )
  const sites = sortSelectOptions(
    db.sites
      .filter((item) => {
        if (filters.customerId) return item.customerId === filters.customerId
        if (filters.companyId) {
          const customer = findCustomer(db, item.customerId)
          return customer?.companyId === filters.companyId
        }
        return true
      })
      .map((item) => ({ value: item.id, label: item.name }))
  )
  const leaders = sortSelectOptions(
    db.users
      .filter((user) => user.role === "teamLeader")
      .map((user) => ({ value: user.id, label: user.fullName }))
  )
  const domains = sortSelectOptions(
    db.domains.map((item) => ({ value: item.id, label: item.name }))
  )
  const components = sortSelectOptions(
    db.components
      .filter((item) => !filters.domainId || item.domainId === filters.domainId)
      .map((item) => ({ value: item.id, label: item.name }))
  )
  const checkboxes = db.checkboxDefinitions
    .filter((item) => item.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({ value: item.id, label: item.label }))
  return { companies, customers, sites, leaders, domains, components, checkboxes }
}

export function resolveFilterLabels(db: MockDb, filters: ReportFilters): ReportFilterLabels {
  return {
    from: filters.from,
    to: filters.to,
    company: filters.companyId ? findCompany(db, filters.companyId)?.name ?? "" : "",
    customer: filters.customerId ? findCustomer(db, filters.customerId)?.name ?? "" : "",
    site: filters.siteId ? findSite(db, filters.siteId)?.name ?? "" : "",
    workOrderNumber: filters.workOrderNumber.trim(),
    teamLeader: filters.teamLeaderId ? findUser(db, filters.teamLeaderId)?.fullName ?? "" : "",
    domain: filters.domainId ? findDomain(db, filters.domainId)?.name ?? "" : "",
    component: filters.componentId ? findComponent(db, filters.componentId)?.name ?? "" : "",
    status: filters.status,
    checkbox:
      filters.checkboxId
        ? db.checkboxDefinitions.find((item) => item.id === filters.checkboxId)?.label ?? ""
        : "",
  }
}

export function sumQuantityCents(values: number[]): number {
  let cents = 0
  for (const value of values) cents += Math.round(value * 100)
  return cents / 100
}

export function executionTotalsMatch(summary: ExecutionSummaryRow[], details: ExecutionDetailRow[]) {
  const fromSummary = new Map(summary.map((row) => [`${row.componentId}::${row.unit}`, row.totalQuantity]))
  const fromDetails = new Map<string, number>()
  for (const row of details) {
    const key = `${row.componentId}::${row.unit}`
    fromDetails.set(key, sumQuantityCents([fromDetails.get(key) ?? 0, row.quantity]))
  }
  if (fromSummary.size !== fromDetails.size) return false
  for (const [key, total] of fromSummary) {
    if (fromDetails.get(key) !== total) return false
  }
  return true
}

function filterReportDiaries(db: MockDb, type: ReportType, filters: ReportFilters): ManagerDiarySummary[] {
  const workOrderQuery = filters.workOrderNumber.trim()
  const executionOnly = type !== "diaries"

  return listManagerDiaries(db).filter((diary) => {
    if (executionOnly && diary.status !== "submitted") return false
    if (!executionOnly && filters.status !== "all" && diary.status !== filters.status) return false
    if (filters.from && diary.workDate < filters.from) return false
    if (filters.to && diary.workDate > filters.to) return false
    if (filters.companyId && diary.companyId !== filters.companyId) return false
    if (filters.customerId && diary.customerId !== filters.customerId) return false
    if (filters.siteId && diary.siteId !== filters.siteId) return false
    if (filters.teamLeaderId && diary.teamLeaderId !== filters.teamLeaderId) return false
    if (workOrderQuery && !diary.workOrderNumber.includes(workOrderQuery)) return false
    if (filters.checkboxId) {
      const checked = db.checks.some(
        (check) => check.diaryId === diary.id && check.checkboxId === filters.checkboxId && check.checked
      )
      if (!checked) return false
    }
    if (filters.domainId || filters.componentId) {
      const detail = getManagerDiary(db, diary.id)
      if (!detail) return false
      const hasItem = detail.items.some((item) => {
        if (filters.componentId && item.componentId !== filters.componentId) return false
        if (filters.domainId && item.domainId !== filters.domainId) return false
        return true
      })
      if (!hasItem) return false
    }
    return true
  })
}

function buildExecutionDetails(
  db: MockDb,
  diaries: ManagerDiarySummary[],
  filters: ReportFilters
): ExecutionDetailRow[] {
  const rows: ExecutionDetailRow[] = []
  for (const diary of diaries) {
    if (diary.status !== "submitted") continue
    const detail = getManagerDiary(db, diary.id)
    if (!detail) continue
    for (const item of detail.items) {
      if (filters.componentId && item.componentId !== filters.componentId) continue
      if (filters.domainId && item.domainId !== filters.domainId) continue
      rows.push({
        diaryId: diary.id,
        workDate: diary.workDate,
        companyName: diary.companyName,
        customerName: diary.customerName,
        siteName: diary.siteName,
        subSiteName: diary.subSiteName,
        teamLeaderName: diary.teamLeaderName,
        workOrderNumber: diary.workOrderNumber,
        domainId: item.domainId,
        domainName: item.domainName,
        componentId: item.componentId,
        componentName: item.componentName,
        quantity: item.quantity,
        unit: item.unit,
      })
    }
  }
  return rows.sort((a, b) => {
    if (a.workDate !== b.workDate) return a.workDate < b.workDate ? 1 : -1
    if (a.workOrderNumber !== b.workOrderNumber) return a.workOrderNumber.localeCompare(b.workOrderNumber, "he")
    return a.componentName.localeCompare(b.componentName, "he")
  })
}

function aggregateExecution(details: ExecutionDetailRow[]): ExecutionSummaryRow[] {
  const map = new Map<string, ExecutionSummaryRow & { quantities: number[] }>()
  for (const row of details) {
    const key = `${row.componentId}::${row.unit}`
    const current = map.get(key)
    if (!current) {
      map.set(key, {
        domainId: row.domainId,
        domainName: row.domainName,
        componentId: row.componentId,
        componentName: row.componentName,
        unit: row.unit,
        totalQuantity: row.quantity,
        quantities: [row.quantity],
      })
      continue
    }
    current.quantities.push(row.quantity)
    current.totalQuantity = sumQuantityCents(current.quantities)
  }
  return [...map.values()]
    .map((row) => ({
      domainId: row.domainId,
      domainName: row.domainName,
      componentId: row.componentId,
      componentName: row.componentName,
      unit: row.unit,
      totalQuantity: row.totalQuantity,
    }))
    .sort(
      (a, b) =>
        a.domainName.localeCompare(b.domainName, "he") ||
        a.componentName.localeCompare(b.componentName, "he")
    )
}
