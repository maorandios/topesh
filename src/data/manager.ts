import type { DiaryStatus, User } from "@/domain/types"
import { findCompany, findComponent, findCustomer, findDomain, findSite, findUser } from "@/data/lookups"
import { applyDiaryDraft, type DiaryDraft, type LeaderDiaryItemView } from "@/data/repository"
import type { MockDb } from "@/data/seed"
import { addCalendarDays, jerusalemDay, jerusalemToday } from "@/lib/format"

export type DiaryAssignmentInput = {
  teamLeaderId: string
  workDate: string
  companyId: string
  customerId: string
  siteId: string
  subSiteName: string
  projectName: string
  workOrderNumber: string
}

export type ManagerDiarySummary = DiaryAssignmentInput & {
  id: string
  teamLeaderName: string
  companyId: string
  companyName: string
  customerId: string
  customerName: string
  siteName: string
  status: DiaryStatus
  createdAt: string
  submittedAt: string | null
  cancelledAt: string | null
  duplicatedFromId: string | null
}

export type ManagerDiaryDetail = ManagerDiarySummary & {
  notes: string
  workers: { id: string; fullName: string }[]
  items: LeaderDiaryItemView[]
  checkboxes: { checkboxId: string; label: string; checked: boolean }[]
}

export type DiaryFilters = {
  query: string
  status: "all" | DiaryStatus
  from: string
  to: string
  teamLeaderId: string
  companyId: string
  customerId: string
  siteId: string
}

export type TeamLeaderInput = {
  fullName: string
  identityNumber: string
  phone: string
  companyId: string
}

export type ManagerUserInput = {
  fullName: string
  identityNumber: string
  email: string
  companyId: string
}

export type CustomerInput = {
  name: string
  companyId: string
}

export type SiteInput = {
  name: string
  customerId: string
}

export type DeleteBlockedReason =
  | "not-found"
  | "has-diaries"
  | "has-components"
  | "last-manager"

const NAME_LIMIT = 80

export function listManagerDiaries(db: MockDb): ManagerDiarySummary[] {
  return db.diaries
    .map((diary) => summarize(db, diary))
    .filter((diary): diary is ManagerDiarySummary => diary !== null)
    .sort(compareDiaries)
}

export function getManagerDiary(db: MockDb, diaryId: string): ManagerDiaryDetail | null {
  const diary = db.diaries.find((item) => item.id === diaryId)
  const summary = diary ? summarize(db, diary) : null
  if (!diary || !summary) return null
  const selected = new Set(
    db.checks
      .filter((check) => check.diaryId === diary.id && check.checked)
      .map((check) => check.checkboxId)
  )
  return {
    ...summary,
    notes: diary.notes,
    workers: db.workers
      .filter((worker) => worker.diaryId === diary.id)
      .map((worker) => ({ id: worker.id, fullName: worker.fullName })),
    items: db.items.flatMap((item) => {
      if (item.diaryId !== diary.id) return []
      const component = findComponent(db, item.componentId)
      const domain = component ? findDomain(db, component.domainId) : null
      if (!component || !domain) return []
      return [
        {
          id: item.id,
          componentId: component.id,
          domainId: domain.id,
          domainName: domain.name,
          componentName: component.name,
          unit: component.unit,
          quantity: item.quantity,
        },
      ]
    }),
    checkboxes: db.checkboxDefinitions
      .filter((definition) => definition.isActive || selected.has(definition.id))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((definition) => ({
        checkboxId: definition.id,
        label: definition.label,
        checked: selected.has(definition.id),
      })),
  }
}

export function filterManagerDiaries(db: MockDb, filters: DiaryFilters): ManagerDiarySummary[] {
  const query = filters.query.trim()
  return listManagerDiaries(db).filter((diary) => {
    if (filters.status !== "all" && diary.status !== filters.status) return false
    if (filters.from && diary.workDate < filters.from) return false
    if (filters.to && diary.workDate > filters.to) return false
    if (filters.teamLeaderId && diary.teamLeaderId !== filters.teamLeaderId) return false
    if (filters.companyId && diary.companyId !== filters.companyId) return false
    if (filters.customerId && diary.customerId !== filters.customerId) return false
    if (filters.siteId && diary.siteId !== filters.siteId) return false
    if (!query) return true
    return [
      diary.workOrderNumber,
      diary.teamLeaderName,
      diary.companyName,
      diary.customerName,
      diary.siteName,
      diary.subSiteName,
      diary.projectName,
    ].some((value) => value.includes(query))
  })
}

export type WorkDiarySearchFilters = {
  from: string
  to: string
  companyIds: string[]
  customerIds: string[]
  siteIds: string[]
  workOrderNumber: string
  teamLeaderIds: string[]
  statuses: DiaryStatus[]
}

export const emptyWorkDiarySearchFilters = (): WorkDiarySearchFilters => ({
  from: "",
  to: "",
  companyIds: [],
  customerIds: [],
  siteIds: [],
  workOrderNumber: "",
  teamLeaderIds: [],
  statuses: [],
})

export function validateWorkDiarySearchDates(from: string, to: string): string | null {
  if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) return "invalid-from"
  if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) return "invalid-to"
  if (from && to && from > to) return "range"
  return null
}

/** AND-filter Work Diaries for the Manager reports search screen. */
export function searchWorkDiaries(db: MockDb, filters: WorkDiarySearchFilters): ManagerDiarySummary[] {
  if (validateWorkDiarySearchDates(filters.from, filters.to)) return []
  const workOrderQuery = filters.workOrderNumber.trim()
  return listManagerDiaries(db).filter((diary) => {
    if (filters.statuses.length > 0 && !filters.statuses.includes(diary.status)) return false
    if (filters.from && diary.workDate < filters.from) return false
    if (filters.to && diary.workDate > filters.to) return false
    if (filters.companyIds.length > 0 && !filters.companyIds.includes(diary.companyId)) return false
    if (filters.customerIds.length > 0 && !filters.customerIds.includes(diary.customerId)) return false
    if (filters.siteIds.length > 0 && !filters.siteIds.includes(diary.siteId)) return false
    if (filters.teamLeaderIds.length > 0 && !filters.teamLeaderIds.includes(diary.teamLeaderId)) return false
    if (workOrderQuery && !diary.workOrderNumber.includes(workOrderQuery)) return false
    return true
  })
}

export function workDiarySearchOptions(db: MockDb, filters: WorkDiarySearchFilters) {
  const diaries = listManagerDiaries(db)
  const scoped = (omit: Partial<Record<keyof WorkDiarySearchFilters, true>>) =>
    diaries.filter((diary) => diaryMatchesSearchFilters(diary, filters, omit))

  const companies = uniqueOptions(
    scoped({ companyIds: true }).map((diary) => ({
      value: diary.companyId,
      label: diary.companyName,
    })),
    filters.companyIds.map((id) => ({
      value: id,
      label: findCompany(db, id)?.name ?? id,
    })),
    db.companies.map((item) => ({ value: item.id, label: item.name }))
  )

  const customers = uniqueOptions(
    scoped({ customerIds: true }).map((diary) => ({
      value: diary.customerId,
      label: diary.customerName,
    })),
    filters.customerIds.map((id) => ({
      value: id,
      label: findCustomer(db, id)?.name ?? id,
    })),
    // Keep org-linked customers available when companies are chosen, even if no diary match yet.
    db.customers
      .filter((item) => filters.companyIds.length === 0 || filters.companyIds.includes(item.companyId))
      .map((item) => ({ value: item.id, label: item.name }))
  )

  const sites = uniqueOptions(
    scoped({ siteIds: true }).map((diary) => ({
      value: diary.siteId,
      label: diary.siteName,
    })),
    filters.siteIds.map((id) => ({
      value: id,
      label: findSite(db, id)?.name ?? id,
    })),
    db.sites
      .filter((item) => {
        if (filters.customerIds.length > 0) return filters.customerIds.includes(item.customerId)
        if (filters.companyIds.length > 0) {
          const customer = findCustomer(db, item.customerId)
          return Boolean(customer && filters.companyIds.includes(customer.companyId))
        }
        return true
      })
      .map((item) => ({ value: item.id, label: item.name }))
  )

  const leaders = uniqueOptions(
    scoped({ teamLeaderIds: true }).map((diary) => ({
      value: diary.teamLeaderId,
      label: diary.teamLeaderName,
    })),
    filters.teamLeaderIds.map((id) => ({
      value: id,
      label: findUser(db, id)?.fullName ?? id,
    })),
    db.users
      .filter((user) => user.role === "teamLeader")
      .map((user) => ({ value: user.id, label: user.fullName }))
  )

  return { companies, customers, sites, leaders }
}

function diaryMatchesSearchFilters(
  diary: ManagerDiarySummary,
  filters: WorkDiarySearchFilters,
  omit: Partial<Record<keyof WorkDiarySearchFilters, true>> = {}
) {
  if (!omit.statuses && filters.statuses.length > 0 && !filters.statuses.includes(diary.status)) {
    return false
  }
  if (!omit.from && filters.from && diary.workDate < filters.from) return false
  if (!omit.to && filters.to && diary.workDate > filters.to) return false
  if (!omit.companyIds && filters.companyIds.length > 0 && !filters.companyIds.includes(diary.companyId)) {
    return false
  }
  if (!omit.customerIds && filters.customerIds.length > 0 && !filters.customerIds.includes(diary.customerId)) {
    return false
  }
  if (!omit.siteIds && filters.siteIds.length > 0 && !filters.siteIds.includes(diary.siteId)) {
    return false
  }
  if (
    !omit.teamLeaderIds &&
    filters.teamLeaderIds.length > 0 &&
    !filters.teamLeaderIds.includes(diary.teamLeaderId)
  ) {
    return false
  }
  const workOrderQuery = filters.workOrderNumber.trim()
  if (!omit.workOrderNumber && workOrderQuery && !diary.workOrderNumber.includes(workOrderQuery)) {
    return false
  }
  return true
}

function uniqueOptions(
  ...groups: Array<Array<{ value: string; label: string }>>
): Array<{ value: string; label: string }> {
  const map = new Map<string, string>()
  for (const group of groups) {
    for (const item of group) {
      if (!item.value || map.has(item.value)) continue
      map.set(item.value, item.label || item.value)
    }
  }
  return Array.from(map, ([value, label]) => ({ value, label })).sort((a, b) =>
    a.label.localeCompare(b.label, "he")
  )
}

export function dashboardStats(db: MockDb, today: string) {
  return {
    createdToday: db.diaries.filter((diary) => jerusalemDay(diary.createdAt) === today).length,
    pending: db.diaries.filter((diary) => diary.status === "pending").length,
    submitted: db.diaries.filter((diary) => diary.status === "submitted").length,
    activeLeaders: db.users.filter((user) => user.role === "teamLeader" && user.isActive).length,
  }
}

export function recentDiaries(db: MockDb, limit = 5): ManagerDiarySummary[] {
  return listManagerDiaries(db)
    .sort((a, b) => activityTime(b).localeCompare(activityTime(a)))
    .slice(0, limit)
}

export function assignDiary(
  db: MockDb,
  input: DiaryAssignmentInput,
  createdAt: string,
  options?: { duplicatedFromId?: string | null }
): { db: MockDb; id: string } | null {
  const assignment = cleanAssignment(db, input)
  if (!assignment) return null
  const id = crypto.randomUUID()
  return {
    id,
    db: {
      ...db,
      diaries: [
        {
          id,
          ...assignment,
          status: "pending",
          notes: "",
          createdAt,
          submittedAt: null,
          cancelledAt: null,
          duplicatedFromId: options?.duplicatedFromId ?? null,
        },
        ...db.diaries,
      ],
    },
  }
}

export function updateAssignment(
  db: MockDb,
  diaryId: string,
  input: DiaryAssignmentInput
): MockDb | null {
  const current = db.diaries.find((diary) => diary.id === diaryId)
  if (!current || current.status !== "pending") return null
  const assignment = cleanAssignment(db, input, {
    leaderId: current.teamLeaderId,
    siteId: current.siteId,
    companyId: current.companyId,
    customerId: current.customerId,
  })
  if (!assignment) return null
  return {
    ...db,
    diaries: db.diaries.map((diary) =>
      diary.id === diaryId ? { ...diary, ...assignment } : diary
    ),
  }
}

export function editDiary(
  db: MockDb,
  diaryId: string,
  input: DiaryAssignmentInput,
  draft: DiaryDraft
): MockDb | null {
  const current = db.diaries.find((diary) => diary.id === diaryId)
  if (!current) return null
  const assignment = cleanAssignment(db, input, {
    leaderId: current.teamLeaderId,
    siteId: current.siteId,
    companyId: current.companyId,
    customerId: current.customerId,
  })
  if (!assignment) return null
  const withAssignment: MockDb = {
    ...db,
    diaries: db.diaries.map((diary) =>
      diary.id === diaryId ? { ...diary, ...assignment } : diary
    ),
  }
  return applyDiaryDraft(withAssignment, diaryId, draft)
}

export function deleteDiary(db: MockDb, diaryId: string): MockDb | null {
  if (!db.diaries.some((diary) => diary.id === diaryId)) return null
  return {
    ...db,
    diaries: db.diaries.filter((diary) => diary.id !== diaryId),
    workers: db.workers.filter((worker) => worker.diaryId !== diaryId),
    items: db.items.filter((item) => item.diaryId !== diaryId),
    checks: db.checks.filter((check) => check.diaryId !== diaryId),
  }
}

export function markDiaryCancelled(
  db: MockDb,
  diaryId: string,
  cancelledAt = new Date().toISOString()
): MockDb | null {
  const current = db.diaries.find((diary) => diary.id === diaryId)
  if (!current || current.status === "cancelled") return null
  return {
    ...db,
    diaries: db.diaries.map((diary) =>
      diary.id === diaryId ? { ...diary, status: "cancelled", cancelledAt } : diary
    ),
  }
}

export type DiarySubmitField =
  | "company"
  | "customer"
  | "site"
  | "project"
  | "subSite"
  | "leader"
  | "workOrder"
  | "items"

/** Essential fields required before a pending diary can become submitted. */
export function diarySubmitMissing(detail: {
  companyId: string
  customerId: string
  siteId: string
  projectName: string
  subSiteName: string
  teamLeaderId: string
  workOrderNumber: string
  items: { componentId: string }[]
}): DiarySubmitField[] {
  const missing: DiarySubmitField[] = []
  if (!detail.companyId) missing.push("company")
  if (!detail.customerId) missing.push("customer")
  if (!detail.siteId) missing.push("site")
  if (!detail.projectName.trim()) missing.push("project")
  if (!detail.subSiteName.trim()) missing.push("subSite")
  if (!detail.teamLeaderId) missing.push("leader")
  if (!detail.workOrderNumber.trim()) missing.push("workOrder")
  if (!detail.items.some((item) => Boolean(item.componentId))) missing.push("items")
  return missing
}

export function diaryReadyToSubmit(
  detail: Parameters<typeof diarySubmitMissing>[0]
): boolean {
  return diarySubmitMissing(detail).length === 0
}

export function markDiarySubmitted(
  db: MockDb,
  diaryId: string,
  submittedAt = new Date().toISOString()
): MockDb | null {
  const detail = getManagerDiary(db, diaryId)
  if (!detail || detail.status !== "pending") return null
  if (!diaryReadyToSubmit(detail)) return null
  return {
    ...db,
    diaries: db.diaries.map((diary) =>
      diary.id === diaryId ? { ...diary, status: "submitted", submittedAt } : diary
    ),
  }
}

export function cancelDiary(db: MockDb, diaryId: string): MockDb | null {
  const current = db.diaries.find((diary) => diary.id === diaryId)
  if (!current || current.status !== "pending") return null
  return {
    ...db,
    diaries: db.diaries.filter((diary) => diary.id !== diaryId),
    workers: db.workers.filter((worker) => worker.diaryId !== diaryId),
    items: db.items.filter((item) => item.diaryId !== diaryId),
    checks: db.checks.filter((check) => check.diaryId !== diaryId),
  }
}

export function duplicateDiary(
  db: MockDb,
  diaryId: string,
  createdAt: string
): { db: MockDb; id: string } | null {
  const current = db.diaries.find((diary) => diary.id === diaryId)
  if (!current) return null
  return assignDiary(
    db,
    {
      teamLeaderId: current.teamLeaderId,
      workDate: addCalendarDays(jerusalemToday(), 1),
      companyId: current.companyId,
      customerId: current.customerId,
      siteId: current.siteId,
      subSiteName: current.subSiteName,
      projectName: current.projectName,
      workOrderNumber: current.workOrderNumber,
    },
    createdAt,
    { duplicatedFromId: current.id }
  )
}

export function saveCompany(db: MockDb, id: string | null, name: string): MockDb | null {
  const clean = cleanName(name)
  if (!clean) return null
  if (!id) {
    return {
      ...db,
      companies: [
        ...db.companies,
        { id: crypto.randomUUID(), name: clean, isActive: true, createdAt: new Date().toISOString() },
      ],
    }
  }
  if (!db.companies.some((item) => item.id === id)) return null
  return {
    ...db,
    companies: db.companies.map((item) => (item.id === id ? { ...item, name: clean } : item)),
  }
}

export function saveCustomer(db: MockDb, id: string | null, input: CustomerInput): MockDb | null {
  const clean = cleanName(input.name)
  if (!clean) return null
  if (!db.companies.some((item) => item.id === input.companyId)) return null
  if (!id) {
    return {
      ...db,
      customers: [
        ...db.customers,
        {
          id: crypto.randomUUID(),
          companyId: input.companyId,
          name: clean,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ],
    }
  }
  if (!db.customers.some((item) => item.id === id)) return null
  return {
    ...db,
    customers: db.customers.map((item) =>
      item.id === id ? { ...item, name: clean, companyId: input.companyId } : item
    ),
  }
}

export function saveSite(db: MockDb, id: string | null, input: SiteInput): MockDb | null {
  const clean = cleanName(input.name)
  if (!clean) return null
  if (!db.customers.some((item) => item.id === input.customerId)) return null
  if (!id) {
    return {
      ...db,
      sites: [
        ...db.sites,
        {
          id: crypto.randomUUID(),
          customerId: input.customerId,
          name: clean,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ],
    }
  }
  if (!db.sites.some((item) => item.id === id)) return null
  return {
    ...db,
    sites: db.sites.map((item) =>
      item.id === id ? { ...item, name: clean, customerId: input.customerId } : item
    ),
  }
}

export function setCompanyActive(db: MockDb, id: string, isActive: boolean): MockDb | null {
  if (!db.companies.some((item) => item.id === id)) return null
  return {
    ...db,
    companies: db.companies.map((item) => (item.id === id ? { ...item, isActive } : item)),
  }
}

export function setCustomerActive(db: MockDb, id: string, isActive: boolean): MockDb | null {
  if (!db.customers.some((item) => item.id === id)) return null
  return {
    ...db,
    customers: db.customers.map((item) => (item.id === id ? { ...item, isActive } : item)),
  }
}

export function setSiteActive(db: MockDb, id: string, isActive: boolean): MockDb | null {
  if (!db.sites.some((item) => item.id === id)) return null
  return {
    ...db,
    sites: db.sites.map((item) => (item.id === id ? { ...item, isActive } : item)),
  }
}

export function setUserActive(
  db: MockDb,
  id: string,
  isActive: boolean
): { db: MockDb } | { reason: DeleteBlockedReason } {
  const current = db.users.find((user) => user.id === id)
  if (!current) return { reason: "not-found" }
  if (
    current.role === "manager" &&
    current.isActive &&
    !isActive &&
    db.users.filter((user) => user.role === "manager" && user.isActive && user.id !== id).length === 0
  ) {
    return { reason: "last-manager" }
  }
  return {
    db: {
      ...db,
      users: db.users.map((user) => (user.id === id ? { ...user, isActive } : user)),
    },
  }
}

export function deleteCompany(db: MockDb, id: string): { db: MockDb } | { reason: DeleteBlockedReason } {
  if (!db.companies.some((item) => item.id === id)) return { reason: "not-found" }
  if (db.diaries.some((diary) => diary.companyId === id)) return { reason: "has-diaries" }
  return { db: { ...db, companies: db.companies.filter((item) => item.id !== id) } }
}

export function deleteCustomer(db: MockDb, id: string): { db: MockDb } | { reason: DeleteBlockedReason } {
  if (!db.customers.some((item) => item.id === id)) return { reason: "not-found" }
  if (db.diaries.some((diary) => diary.customerId === id)) return { reason: "has-diaries" }
  return { db: { ...db, customers: db.customers.filter((item) => item.id !== id) } }
}

export function deleteSite(db: MockDb, id: string): { db: MockDb } | { reason: DeleteBlockedReason } {
  if (!db.sites.some((item) => item.id === id)) return { reason: "not-found" }
  if (db.diaries.some((diary) => diary.siteId === id)) return { reason: "has-diaries" }
  return {
    db: {
      ...db,
      sites: db.sites.filter((item) => item.id !== id),
      subSites: db.subSites.filter((item) => item.siteId !== id),
    },
  }
}

export function deleteUser(db: MockDb, id: string): { db: MockDb } | { reason: DeleteBlockedReason } {
  const current = db.users.find((user) => user.id === id)
  if (!current) return { reason: "not-found" }
  if (current.role === "teamLeader" && db.diaries.some((diary) => diary.teamLeaderId === id)) {
    return { reason: "has-diaries" }
  }
  if (
    current.role === "manager" &&
    current.isActive &&
    db.users.filter((user) => user.role === "manager" && user.isActive && user.id !== id).length === 0
  ) {
    return { reason: "last-manager" }
  }
  return { db: { ...db, users: db.users.filter((user) => user.id !== id) } }
}

export function saveDomain(db: MockDb, id: string | null, name: string): MockDb | null {
  const clean = cleanName(name)
  if (!clean) return null
  if (!id) {
    return {
      ...db,
      domains: [...db.domains, { id: crypto.randomUUID(), name: clean, isActive: true }],
    }
  }
  if (!db.domains.some((item) => item.id === id)) return null
  return {
    ...db,
    domains: db.domains.map((item) => (item.id === id ? { ...item, name: clean } : item)),
  }
}

export function saveComponent(
  db: MockDb,
  id: string | null,
  input: { domainId: string; name: string; unit: string }
): MockDb | null {
  const name = cleanName(input.name)
  const unit = cleanName(input.unit, 20)
  if (!name || !unit || !db.domains.some((item) => item.id === input.domainId)) return null
  if (!id) {
    return {
      ...db,
      components: [
        ...db.components,
        { id: crypto.randomUUID(), domainId: input.domainId, name, unit, isActive: true },
      ],
    }
  }
  if (!db.components.some((item) => item.id === id)) return null
  return {
    ...db,
    components: db.components.map((item) =>
      item.id === id ? { ...item, domainId: input.domainId, name, unit } : item
    ),
  }
}

export function deleteDomain(db: MockDb, id: string): { db: MockDb } | { reason: DeleteBlockedReason } {
  if (!db.domains.some((item) => item.id === id)) return { reason: "not-found" }
  if (db.components.some((item) => item.domainId === id)) return { reason: "has-components" }
  return { db: { ...db, domains: db.domains.filter((item) => item.id !== id) } }
}

export function deleteComponent(db: MockDb, id: string): { db: MockDb } | { reason: DeleteBlockedReason } {
  if (!db.components.some((item) => item.id === id)) return { reason: "not-found" }
  if (db.items.some((item) => item.componentId === id)) return { reason: "has-diaries" }
  return { db: { ...db, components: db.components.filter((item) => item.id !== id) } }
}

export function saveTeamLeader(
  db: MockDb,
  id: string | null,
  input: TeamLeaderInput
): { db: MockDb; id: string } | null {
  const fullName = cleanName(input.fullName)
  const phone = input.phone.trim()
  const identityNumber = input.identityNumber.trim()
  const companyId = input.companyId.trim()
  if (!fullName || phone.length < 7 || phone.length > 20 || !/^\d{5,9}$/.test(identityNumber)) {
    return null
  }
  if (companyId && !db.companies.some((item) => item.id === companyId)) return null
  if (db.users.some((user) => user.identityNumber === identityNumber && user.id !== id)) return null
  if (!id) {
    const nextId = crypto.randomUUID()
    const user: User = {
      id: nextId,
      fullName,
      identityNumber,
      phone,
      email: null,
      companyId,
      role: "teamLeader",
      isActive: true,
    }
    return { id: nextId, db: { ...db, users: [...db.users, user] } }
  }
  const current = db.users.find((user) => user.id === id && user.role === "teamLeader")
  if (!current) return null
  return {
    id,
    db: {
      ...db,
      users: db.users.map((user) =>
        user.id === id ? { ...user, fullName, identityNumber, phone, companyId } : user
      ),
    },
  }
}

export function saveManagerUser(
  db: MockDb,
  id: string | null,
  input: ManagerUserInput
): { db: MockDb; id: string } | null {
  const fullName = cleanName(input.fullName)
  const email = input.email.trim().toLowerCase()
  const identityNumber = input.identityNumber.trim()
  const companyId = input.companyId.trim()
  if (!fullName || !isValidEmail(email) || !/^\d{5,9}$/.test(identityNumber)) return null
  if (companyId && !db.companies.some((item) => item.id === companyId)) return null
  if (db.users.some((user) => user.identityNumber === identityNumber && user.id !== id)) return null
  if (
    db.users.some(
      (user) => user.role === "manager" && (user.email ?? "").toLowerCase() === email && user.id !== id
    )
  ) {
    return null
  }
  if (!id) {
    const nextId = crypto.randomUUID()
    const user: User = {
      id: nextId,
      fullName,
      identityNumber,
      phone: null,
      email,
      companyId,
      role: "manager",
      isActive: true,
    }
    return { id: nextId, db: { ...db, users: [...db.users, user] } }
  }
  const current = db.users.find((user) => user.id === id && user.role === "manager")
  if (!current) return null
  return {
    id,
    db: {
      ...db,
      users: db.users.map((user) =>
        user.id === id ? { ...user, fullName, identityNumber, email, companyId } : user
      ),
    },
  }
}

function cleanAssignment(
  db: MockDb,
  input: DiaryAssignmentInput,
  allowInactive: {
    leaderId?: string
    siteId?: string
    companyId?: string
    customerId?: string
  } = {}
): DiaryAssignmentInput | null {
  const leader = findUser(db, input.teamLeaderId)
  const company = findCompany(db, input.companyId)
  const customer = findCustomer(db, input.customerId)
  const site = findSite(db, input.siteId)
  const subSiteName = input.subSiteName.trim()
  const projectName = input.projectName.trim()
  const workOrderNumber = input.workOrderNumber.trim()
  if (!leader || leader.role !== "teamLeader") return null
  if (!leader.isActive && leader.id !== allowInactive.leaderId) return null
  if (!company || !customer || !site) return null
  if (!company.isActive && company.id !== allowInactive.companyId) return null
  if (!customer.isActive && customer.id !== allowInactive.customerId) return null
  if (!site.isActive && site.id !== allowInactive.siteId) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.workDate)) return null
  if (!subSiteName || subSiteName.length > NAME_LIMIT) return null
  if (!projectName || projectName.length > NAME_LIMIT) return null
  if (!workOrderNumber || workOrderNumber.length > 40) return null
  return {
    teamLeaderId: leader.id,
    workDate: input.workDate,
    companyId: company.id,
    customerId: customer.id,
    siteId: site.id,
    subSiteName,
    projectName,
    workOrderNumber,
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 120
}

function summarize(db: MockDb, diary: MockDb["diaries"][number]): ManagerDiarySummary | null {
  const leader = findUser(db, diary.teamLeaderId)
  const site = findSite(db, diary.siteId)
  const customer = findCustomer(db, diary.customerId)
  const company = findCompany(db, diary.companyId)
  if (!leader || !site || !customer || !company) return null
  return {
    id: diary.id,
    teamLeaderId: leader.id,
    teamLeaderName: leader.fullName,
    workDate: diary.workDate,
    companyId: company.id,
    companyName: company.name,
    customerId: customer.id,
    customerName: customer.name,
    siteId: site.id,
    siteName: site.name,
    subSiteName: diary.subSiteName,
    projectName: diary.projectName,
    workOrderNumber: diary.workOrderNumber,
    status: diary.status,
    createdAt: diary.createdAt,
    submittedAt: diary.submittedAt,
    cancelledAt: diary.cancelledAt,
    duplicatedFromId: diary.duplicatedFromId ?? null,
  }
}

function compareDiaries(a: ManagerDiarySummary, b: ManagerDiarySummary) {
  if (a.workDate !== b.workDate) return a.workDate < b.workDate ? 1 : -1
  return a.createdAt < b.createdAt ? 1 : -1
}

function activityTime(diary: ManagerDiarySummary) {
  return diary.submittedAt && diary.submittedAt > diary.createdAt ? diary.submittedAt : diary.createdAt
}

function cleanName(value: string, max = NAME_LIMIT): string | null {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > max) return null
  return trimmed
}
