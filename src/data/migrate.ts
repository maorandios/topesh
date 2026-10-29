import { createSeed, type MockDb } from "@/data/seed"

type V1Db = {
  version: 1
  diaries: MockDb["diaries"]
  workers: MockDb["workers"]
  items: MockDb["items"]
  checks: MockDb["checks"]
}

export function parseDatabase(value: unknown): MockDb | null {
  if (isV2(value)) return value
  if (!isV1(value)) return null
  const seed = createSeed()
  return {
    ...seed,
    diaries: value.diaries,
    workers: value.workers,
    items: value.items,
    checks: value.checks,
  }
}

function isV2(value: unknown): value is MockDb {
  if (!value || typeof value !== "object") return false
  const record = value as MockDb
  return (
    record.version === 2 &&
    record.companies?.every(hasIdName) &&
    record.customers?.every(hasIdName) &&
    record.sites?.every(hasIdName) &&
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

function isV1(value: unknown): value is V1Db {
  if (!value || typeof value !== "object") return false
  const record = value as V1Db
  return (
    record.version === 1 &&
    Array.isArray(record.diaries) &&
    Array.isArray(record.workers) &&
    Array.isArray(record.items) &&
    Array.isArray(record.checks) &&
    record.diaries.every(isDiary) &&
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
  const diary = value as MockDb["diaries"][number]
  return (
    typeof diary.id === "string" &&
    typeof diary.teamLeaderId === "string" &&
    typeof diary.workDate === "string" &&
    typeof diary.siteId === "string" &&
    typeof diary.subSiteId === "string" &&
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
