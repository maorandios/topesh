import type {
  ExecutionDetailRow,
  ExecutionSummaryRow,
  ReportFilterLabels,
} from "@/data/reports"
import { sumQuantityCents } from "@/data/reports"
import { getManagerDiary, type ManagerDiarySummary } from "@/data/manager"
import type { MockDb } from "@/data/seed"

/** Piece-count units (יח׳ / יחידה) are treated as endpoint devices; length units are excluded. */
export function isEndpointUnit(unit: string) {
  const normalized = unit.trim().replace(/['׳"״]/g, "")
  return /^יח/.test(normalized)
}

export type EndpointReport = {
  diaries: ManagerDiarySummary[]
  matchingDiaryCount: number
  summary: ExecutionSummaryRow[]
  details: ExecutionDetailRow[]
}

export type EndpointReportFilters = {
  domainIds?: string[]
  componentIds?: string[]
}

export function buildEndpointReport(
  db: MockDb,
  diaries: ManagerDiarySummary[],
  filters: EndpointReportFilters = {}
): EndpointReport {
  const domainIds = filters.domainIds ?? []
  const componentIds = filters.componentIds ?? []
  const details: ExecutionDetailRow[] = []
  for (const diary of diaries) {
    const detail = getManagerDiary(db, diary.id)
    if (!detail) continue
    for (const item of detail.items) {
      if (!isEndpointUnit(item.unit)) continue
      if (componentIds.length > 0 && !componentIds.includes(item.componentId)) continue
      if (domainIds.length > 0 && !domainIds.includes(item.domainId)) continue
      details.push({
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

  details.sort((a, b) => {
    if (a.workDate !== b.workDate) return a.workDate < b.workDate ? 1 : -1
    if (a.workOrderNumber !== b.workOrderNumber) {
      return a.workOrderNumber.localeCompare(b.workOrderNumber, "he")
    }
    return a.componentName.localeCompare(b.componentName, "he")
  })

  return {
    diaries,
    matchingDiaryCount: diaries.length,
    summary: aggregateEndpointSummary(details),
    details,
  }
}

export function emptyEndpointFilterLabels(): ReportFilterLabels {
  return {
    from: "",
    to: "",
    company: "",
    customer: "",
    site: "",
    workOrderNumber: "",
    teamLeader: "",
    domain: "",
    component: "",
    status: "all",
    checkbox: "",
  }
}

function aggregateEndpointSummary(details: ExecutionDetailRow[]): ExecutionSummaryRow[] {
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
