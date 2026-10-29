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
}

export type ManagerUserInput = {
  fullName: string
  email: string
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
  createdAt: string
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
  const assignment = cleanAssignment(db, input)
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
  const assignment = cleanAssignment(db, input, current.teamLeaderId, current.siteId)
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
    createdAt
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

export function saveCustomer(db: MockDb, id: string | null, name: string): MockDb | null {
  const clean = cleanName(name)
  if (!clean) return null
  if (!id) {
    return {
      ...db,
      customers: [
        ...db.customers,
        {
          id: crypto.randomUUID(),
          companyId: "",
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
    customers: db.customers.map((item) => (item.id === id ? { ...item, name: clean } : item)),
  }
}

export function saveSite(db: MockDb, id: string | null, name: string): MockDb | null {
  const clean = cleanName(name)
  if (!clean) return null
  if (!id) {
    return {
      ...db,
      sites: [
        ...db.sites,
        {
          id: crypto.randomUUID(),
          customerId: "",
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
    sites: db.sites.map((item) => (item.id === id ? { ...item, name: clean } : item)),
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
  if (!fullName || phone.length < 7 || phone.length > 20 || !/^\d{5,9}$/.test(identityNumber)) {
    return null
  }
  if (db.users.some((user) => user.identityNumber === identityNumber && user.id !== id)) return null
  if (!id) {
    const nextId = crypto.randomUUID()
    const user: User = {
      id: nextId,
      fullName,
      identityNumber,
      phone,
      email: null,
      companyId: "",
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
        user.id === id ? { ...user, fullName, identityNumber, phone } : user
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
  if (!fullName || !isValidEmail(email)) return null
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
      identityNumber: "",
      phone: null,
      email,
      companyId: "",
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
        user.id === id ? { ...user, fullName, email } : user
      ),
    },
  }
}

function cleanAssignment(
  db: MockDb,
  input: DiaryAssignmentInput,
  allowInactiveLeaderId = "",
  allowInactiveSiteId = ""
): DiaryAssignmentInput | null {
  const leader = findUser(db, input.teamLeaderId)
  const company = findCompany(db, input.companyId)
  const customer = findCustomer(db, input.customerId)
  const site = findSite(db, input.siteId)
  const subSiteName = input.subSiteName.trim()
  const projectName = input.projectName.trim()
  const workOrderNumber = input.workOrderNumber.trim()
  if (!leader || leader.role !== "teamLeader") return null
  if (!leader.isActive && leader.id !== allowInactiveLeaderId) return null
  if (!company || !customer || !site) return null
  if (!site.isActive && site.id !== allowInactiveSiteId) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.workDate)) return null
  if (!subSiteName || subSiteName.length > NAME_LIMIT) return null
  if (projectName.length > NAME_LIMIT) return null
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
