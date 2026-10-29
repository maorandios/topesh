import { company as catalogCompany, subSites as catalogSubSites } from "@/data/catalog"
import { createSeed, type MockDb } from "@/data/seed"
import type { Company, Customer, Site, WorkDiary } from "@/domain/types"

type LegacyDiary = {
  id: string
  teamLeaderId: string
  workDate: string
  companyId?: string
  customerId?: string
  siteId: string
  subSiteId?: string
  subSiteName?: string
  projectName?: string
  workOrderNumber: string
  status: WorkDiary["status"]
  notes: string
  createdAt: string
  submittedAt: string | null
}

type LegacyOrgCompany = { id: string; name: string; isActive?: boolean }
type LegacyOrgCustomer = { id: string; companyId?: string; name: string; isActive?: boolean }
type LegacyOrgSite = { id: string; customerId?: string; name: string; isActive?: boolean }

type LegacyDb = {
  version: 1 | 2 | 3 | 4 | 5
  companies?: LegacyOrgCompany[]
  customers?: LegacyOrgCustomer[]
  sites?: LegacyOrgSite[]
  subSites?: MockDb["subSites"]
  users?: MockDb["users"]
  domains?: MockDb["domains"]
  components?: MockDb["components"]
  checkboxDefinitions?: MockDb["checkboxDefinitions"]
  diaries: LegacyDiary[]
  workers: MockDb["workers"]
  items: MockDb["items"]
  checks: MockDb["checks"]
}

export function parseDatabase(value: unknown): MockDb | null {
  if (isV7(value)) {
    return {
      ...value,
      diaries: value.diaries.map((diary) => ({
        ...diary,
        cancelledAt:
          diary.cancelledAt ??
          (diary.status === "cancelled" ? diary.createdAt : null),
      })),
    }
  }
  // Refresh v5/v6 browser demos to the richer seed diaries.
  if (isV6(value) || isV5(value)) return createSeed()
  if (isV4(value) || isV3(value) || isV2(value)) return toV5(value)
  if (!isV1(value)) return null
  const seed = createSeed()
  return toV5({
    version: 2,
    companies: seed.companies,
    customers: seed.customers,
    sites: seed.sites,
    subSites: seed.subSites,
    users: seed.users,
    domains: seed.domains,
    components: seed.components,
    checkboxDefinitions: seed.checkboxDefinitions,
    diaries: value.diaries,
    workers: value.workers,
    items: value.items,
    checks: value.checks,
  })
}

function toV5(value: LegacyDb): MockDb {
  const seed = createSeed()
  const companies = withActiveCompanies(value.companies ?? seed.companies)
  const customers = withActiveCustomers(value.customers ?? seed.customers)
  const sites = withActiveSites(value.sites ?? seed.sites)
  const names = new Map(
    [...catalogSubSites, ...(value.subSites ?? []), ...seed.subSites].map((item) => [item.id, item.name])
  )
  const siteCustomer = new Map(sites.map((item) => [item.id, item.customerId]))
  const customerCompany = new Map(customers.map((item) => [item.id, item.companyId]))
  const fallbackCompany = companies[0]?.id ?? catalogCompany.id
  return {
    version: 7,
    companies,
    customers,
    sites,
    subSites: value.subSites ?? seed.subSites,
    users: value.users ?? seed.users,
    domains: value.domains ?? seed.domains,
    components: value.components ?? seed.components,
    checkboxDefinitions: value.checkboxDefinitions ?? seed.checkboxDefinitions,
    diaries: value.diaries
      .map((diary) => migrateDiary(diary, names, siteCustomer, customerCompany, fallbackCompany))
      .filter((diary): diary is WorkDiary => diary !== null),
    workers: value.workers,
    items: value.items,
    checks: value.checks,
  }
}

function withActiveCompanies(items: LegacyOrgCompany[]): Company[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    isActive: typeof item.isActive === "boolean" ? item.isActive : true,
  }))
}

function withActiveCustomers(items: LegacyOrgCustomer[]): Customer[] {
  return items.map((item) => ({
    id: item.id,
    companyId: typeof item.companyId === "string" ? item.companyId : "",
    name: item.name,
    isActive: typeof item.isActive === "boolean" ? item.isActive : true,
  }))
}

function withActiveSites(items: LegacyOrgSite[]): Site[] {
  return items.map((item) => ({
    id: item.id,
    customerId: typeof item.customerId === "string" ? item.customerId : "",
    name: item.name,
    isActive: typeof item.isActive === "boolean" ? item.isActive : true,
  }))
}

function migrateDiary(
  diary: LegacyDiary,
  names: Map<string, string>,
  siteCustomer: Map<string, string>,
  customerCompany: Map<string, string>,
  fallbackCompany: string
): WorkDiary | null {
  if (!isLegacyDiary(diary)) return null
  const subSiteName =
    typeof diary.subSiteName === "string" && diary.subSiteName.trim()
      ? diary.subSiteName.trim()
      : typeof diary.subSiteId === "string"
        ? names.get(diary.subSiteId)?.trim() ?? ""
        : ""
  if (!subSiteName) return null
  const linkedCustomer =
    typeof diary.customerId === "string" && diary.customerId
      ? diary.customerId
      : siteCustomer.get(diary.siteId) ?? ""
  const linkedCompany =
    typeof diary.companyId === "string" && diary.companyId
      ? diary.companyId
      : customerCompany.get(linkedCustomer) || fallbackCompany
  return {
    id: diary.id,
    teamLeaderId: diary.teamLeaderId,
    workDate: diary.workDate,
    companyId: linkedCompany,
    customerId: linkedCustomer || "customer-hadar",
    siteId: diary.siteId,
    subSiteName,
    projectName: typeof diary.projectName === "string" ? diary.projectName.trim() : "",
    workOrderNumber: diary.workOrderNumber,
    status: diary.status,
    notes: diary.notes,
    createdAt: diary.createdAt,
    submittedAt: diary.submittedAt,
    cancelledAt:
      diary.status === "cancelled"
        ? typeof (diary as { cancelledAt?: string | null }).cancelledAt === "string"
          ? (diary as { cancelledAt: string }).cancelledAt
          : diary.createdAt
        : null,
  }
}

function isCurrentSeedShape(value: unknown): value is MockDb {
  if (!value || typeof value !== "object") return false
  const record = value as MockDb
  return (
    record.companies?.every(isActiveNamed) &&
    record.customers?.every(isActiveCustomer) &&
    record.sites?.every(isActiveSite) &&
    record.subSites?.every(hasIdName) &&
    record.users?.every(isUser) &&
    record.domains?.every(isNamedActive) &&
    record.components?.every(isComponent) &&
    record.checkboxDefinitions?.every(isCheckbox) &&
    record.diaries?.every(isDiary) &&
    record.workers?.every(isWorker) &&
    record.items?.every(isItem) &&
    record.checks?.every(isCheck)
  )
}

function isV7(value: unknown): value is MockDb {
  return isCurrentSeedShape(value) && (value as MockDb).version === 7
}

function isV6(value: unknown): boolean {
  return isCurrentSeedShape(value) && (value as { version?: number }).version === 6
}

function isV5(value: unknown): value is LegacyDb {
  if (!value || typeof value !== "object") return false
  const record = value as LegacyDb & { version?: number }
  return Boolean(
    record.version === 5 &&
      Array.isArray(record.diaries) &&
      record.diaries.every(isLegacyDiary) &&
      record.workers?.every(isWorker) &&
      record.items?.every(isItem) &&
      record.checks?.every(isCheck)
  )
}

function isV4(value: unknown): value is LegacyDb {
  if (!value || typeof value !== "object") return false
  const record = value as LegacyDb
  return Boolean(
    record.version === 4 &&
      record.companies?.every(isActiveNamed) &&
      record.customers?.every(isActiveCustomer) &&
      record.sites?.every(isActiveSite) &&
      Array.isArray(record.diaries) &&
      record.diaries.every(isLegacyDiary) &&
      record.workers?.every(isWorker) &&
      record.items?.every(isItem) &&
      record.checks?.every(isCheck)
  )
}

function isV3(value: unknown): value is LegacyDb {
  if (!value || typeof value !== "object") return false
  const record = value as LegacyDb
  return Boolean(
    record.version === 3 &&
      record.companies?.every(hasIdName) &&
      record.customers?.every(hasIdName) &&
      record.sites?.every(hasIdName) &&
      Array.isArray(record.diaries) &&
      record.diaries.every(isLegacyDiary) &&
      record.workers?.every(isWorker) &&
      record.items?.every(isItem) &&
      record.checks?.every(isCheck)
  )
}

function isV2(value: unknown): value is LegacyDb {
  if (!value || typeof value !== "object") return false
  const record = value as LegacyDb
  return Boolean(
    record.version === 2 &&
      record.companies?.every(hasIdName) &&
      record.customers?.every(hasIdName) &&
      record.sites?.every(hasIdName) &&
      Array.isArray(record.diaries) &&
      record.diaries.every(isLegacyDiary) &&
      record.workers?.every(isWorker) &&
      record.items?.every(isItem) &&
      record.checks?.every(isCheck)
  )
}

function isV1(value: unknown): value is LegacyDb {
  if (!value || typeof value !== "object") return false
  const record = value as LegacyDb
  return (
    record.version === 1 &&
    Array.isArray(record.diaries) &&
    Array.isArray(record.workers) &&
    Array.isArray(record.items) &&
    Array.isArray(record.checks) &&
    record.diaries.every(isLegacyDiary) &&
    record.workers.every(isWorker) &&
    record.items.every(isItem) &&
    record.checks.every(isCheck)
  )
}

function hasIdName(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const record = value as { id?: unknown; name?: unknown }
  return typeof record.id === "string" && typeof record.name === "string"
}

function isActiveNamed(value: unknown): boolean {
  if (!hasIdName(value)) return false
  return typeof (value as { isActive?: unknown }).isActive === "boolean"
}

function isActiveCustomer(value: unknown): boolean {
  if (!isActiveNamed(value)) return false
  return typeof (value as { companyId?: unknown }).companyId === "string"
}

function isActiveSite(value: unknown): boolean {
  if (!isActiveNamed(value)) return false
  return typeof (value as { customerId?: unknown }).customerId === "string"
}

function isNamedActive(value: unknown): boolean {
  if (!hasIdName(value)) return false
  return typeof (value as { isActive?: unknown }).isActive === "boolean"
}

function isUser(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const user = value as MockDb["users"][number]
  return (
    typeof user.id === "string" &&
    typeof user.fullName === "string" &&
    typeof user.identityNumber === "string" &&
    (user.phone === null || typeof user.phone === "string") &&
    (user.email === null || typeof user.email === "string") &&
    typeof user.companyId === "string" &&
    (user.role === "manager" || user.role === "teamLeader") &&
    typeof user.isActive === "boolean"
  )
}

function isComponent(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const item = value as MockDb["components"][number]
  return (
    typeof item.id === "string" &&
    typeof item.domainId === "string" &&
    typeof item.name === "string" &&
    typeof item.unit === "string" &&
    typeof item.isActive === "boolean"
  )
}

function isCheckbox(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const item = value as MockDb["checkboxDefinitions"][number]
  return (
    typeof item.id === "string" &&
    typeof item.label === "string" &&
    typeof item.sortOrder === "number" &&
    typeof item.isActive === "boolean"
  )
}

function isDiary(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const diary = value as WorkDiary
  return (
    typeof diary.id === "string" &&
    typeof diary.teamLeaderId === "string" &&
    typeof diary.workDate === "string" &&
    typeof diary.companyId === "string" &&
    typeof diary.customerId === "string" &&
    typeof diary.siteId === "string" &&
    typeof diary.subSiteName === "string" &&
    typeof diary.projectName === "string" &&
    typeof diary.workOrderNumber === "string" &&
    (diary.status === "pending" || diary.status === "submitted" || diary.status === "cancelled") &&
    typeof diary.notes === "string" &&
    typeof diary.createdAt === "string" &&
    (diary.submittedAt === null || typeof diary.submittedAt === "string") &&
    (diary.cancelledAt === null ||
      diary.cancelledAt === undefined ||
      typeof diary.cancelledAt === "string")
  )
}

function isLegacyDiary(value: unknown): value is LegacyDiary {
  if (!value || typeof value !== "object") return false
  const diary = value as LegacyDiary
  return (
    typeof diary.id === "string" &&
    typeof diary.teamLeaderId === "string" &&
    typeof diary.workDate === "string" &&
    typeof diary.siteId === "string" &&
    (typeof diary.subSiteId === "string" || typeof diary.subSiteName === "string") &&
    typeof diary.workOrderNumber === "string" &&
    (diary.status === "pending" || diary.status === "submitted" || diary.status === "cancelled") &&
    typeof diary.notes === "string" &&
    typeof diary.createdAt === "string" &&
    (diary.submittedAt === null || typeof diary.submittedAt === "string")
  )
}

function isWorker(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const worker = value as MockDb["workers"][number]
  return (
    typeof worker.id === "string" &&
    typeof worker.diaryId === "string" &&
    typeof worker.fullName === "string"
  )
}

function isItem(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const item = value as MockDb["items"][number]
  return (
    typeof item.id === "string" &&
    typeof item.diaryId === "string" &&
    typeof item.componentId === "string" &&
    typeof item.quantity === "number"
  )
}

function isCheck(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const check = value as MockDb["checks"][number]
  return (
    typeof check.id === "string" &&
    typeof check.diaryId === "string" &&
    typeof check.checkboxId === "string" &&
    typeof check.checked === "boolean"
  )
}
