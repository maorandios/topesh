import assert from "node:assert/strict"
import { uriUser } from "@/data/catalog"
import {
  assignDiary,
  cancelDiary,
  deleteCompany,
  deleteSite,
  deleteUser,
  duplicateDiary,
  getManagerDiary,
  saveCompany,
  saveComponent,
  saveCustomer,
  saveDomain,
  saveManagerUser,
  saveSite,
  saveTeamLeader,
  setCompanyActive,
  setCustomerActive,
  setSiteActive,
  setUserActive,
  updateAssignment,
} from "@/data/manager"
import { parseDatabase } from "@/data/migrate"
import {
  createMemoryStorage,
  createTeamLeaderRepository,
  MOCK_DB_KEY,
  type DiaryDraft,
} from "@/data/repository"
import { createSeed } from "@/data/seed"

const pending = {
  id: "migrate-pending",
  teamLeaderId: uriUser.id,
  workDate: "2026-10-28",
  siteId: "site-hadar",
  subSiteId: "subsite-hadar-floor",
  workOrderNumber: "WO-MIG-1",
  status: "pending" as const,
  notes: "הערת ממתינה לשימור",
  createdAt: "2026-10-27T08:00:00.000Z",
  submittedAt: null,
}
const submitted = {
  id: "migrate-submitted",
  teamLeaderId: uriUser.id,
  workDate: "2026-10-20",
  siteId: "site-sharon",
  subSiteId: "subsite-sharon-a",
  workOrderNumber: "WO-MIG-2",
  status: "submitted" as const,
  notes: "הערת יומן שהוגש",
  createdAt: "2026-10-19T08:00:00.000Z",
  submittedAt: "2026-10-20T15:00:00.000Z",
}
const v1 = {
  version: 1,
  diaries: [pending, submitted],
  workers: [
    { id: "migrate-worker-p", diaryId: pending.id, fullName: "עובד ממתין" },
    { id: "migrate-worker-s", diaryId: submitted.id, fullName: "עובד שהוגש" },
  ],
  items: [
    { id: "migrate-item-p", diaryId: pending.id, componentId: "fire-detector", quantity: 3.5 },
    { id: "migrate-item-s", diaryId: submitted.id, componentId: "cctv-cable", quantity: 12 },
  ],
  checks: [
    { id: "migrate-check", diaryId: submitted.id, checkboxId: "check-night", checked: true },
  ],
}

const migrated = parseDatabase(v1)
assert.ok(migrated)
assert.equal(migrated.version, 7)
assert.equal(migrated.companies[0]?.isActive, true)
assert.equal(migrated.customers[0]?.isActive, true)
assert.equal(migrated.sites[0]?.isActive, true)
assert.equal(migrated.diaries.length, 2)
assert.equal(migrated.companies.length > 0, true)
const migratedPending = migrated.diaries.find((diary) => diary.id === pending.id)
const migratedSubmitted = migrated.diaries.find((diary) => diary.id === submitted.id)
assert.ok(migratedPending?.companyId)
assert.ok(migratedPending?.customerId)
assert.equal(migratedPending?.subSiteName, "קומה 1")
assert.equal(migratedPending?.projectName, "")
assert.equal(migratedPending?.notes, pending.notes)
assert.equal(migratedPending?.status, "pending")
assert.equal(migratedPending?.submittedAt, null)
assert.equal(migratedSubmitted?.notes, submitted.notes)
assert.equal(migratedSubmitted?.status, "submitted")
assert.equal(migratedSubmitted?.submittedAt, submitted.submittedAt)
assert.equal(migrated.workers.find((worker) => worker.diaryId === pending.id)?.fullName, "עובד ממתין")
assert.equal(migrated.workers.find((worker) => worker.diaryId === submitted.id)?.fullName, "עובד שהוגש")
assert.equal(migrated.items.find((item) => item.diaryId === pending.id)?.quantity, 3.5)
assert.equal(migrated.items.find((item) => item.diaryId === submitted.id)?.quantity, 12)
assert.equal(migrated.checks.find((check) => check.diaryId === submitted.id)?.checkboxId, "check-night")

const storage = createMemoryStorage({ [MOCK_DB_KEY]: JSON.stringify(v1) })
const repo = createTeamLeaderRepository(storage)
const leaderPending = repo.get(uriUser.id, pending.id)
assert.ok(leaderPending)
assert.equal(leaderPending.notes, pending.notes)
assert.equal(leaderPending.items[0]?.quantity, 3.5)
assertNoWorkOrder(leaderPending)
const leaderSubmitted = repo.get(uriUser.id, submitted.id)
assert.ok(leaderSubmitted)
assert.equal(leaderSubmitted.status, "submitted")
assert.equal(leaderSubmitted.submittedAt, submitted.submittedAt)
assert.equal(leaderSubmitted.workers[0]?.fullName, "עובד שהוגש")
assert.equal(leaderSubmitted.checkboxes.find((item) => item.checkboxId === "check-night")?.checked, true)
assertNoWorkOrder(leaderSubmitted)
const stored = JSON.parse(storage.getItem(MOCK_DB_KEY) ?? "{}") as { version?: number }
assert.equal(stored.version, 7)
const managerMigrated = getManagerDiary(repo.readDb()!, pending.id)
assert.equal(managerMigrated?.workOrderNumber, "WO-MIG-1")

const fresh = createSeed()
let db = fresh
const company = saveCompany(db, null, "חברה חדשה")
assert.ok(company)
db = company
const companyId = db.companies.at(-1)?.id
assert.ok(companyId)
const customer = saveCustomer(db, null, { name: "לקוח חדש", companyId })
assert.ok(customer)
db = customer
const customerId = db.customers.at(-1)?.id
assert.ok(customerId)
assert.equal(db.customers.at(-1)?.companyId, companyId)
const site = saveSite(db, null, { name: "אתר חדש", customerId })
assert.ok(site)
db = site
const siteId = db.sites.at(-1)?.id
assert.ok(siteId)
assert.equal(db.sites.at(-1)?.customerId, customerId)
const domain = saveDomain(db, null, "מערכת חדשה")
assert.ok(domain)
db = domain
const domainId = db.domains.at(-1)?.id
assert.ok(domainId)
const component = saveComponent(db, null, {
  domainId,
  name: "רכיב חדש",
  unit: "יחידות",
})
assert.ok(component)
db = component
const componentId = db.components.at(-1)?.id
assert.ok(componentId)
const leader = saveTeamLeader(db, null, {
  fullName: "ראש צוות חדש",
  identityNumber: "123456789",
  phone: "053-0000000",
  companyId,
})
assert.ok(leader)
db = leader.db
assert.equal(db.users.find((user) => user.id === leader.id)?.companyId, companyId)
const assignment = {
  teamLeaderId: leader.id,
  workDate: "2026-10-28",
  companyId,
  customerId,
  siteId,
  subSiteName: "אתר משנה חדש",
  projectName: "פרויקט חדש",
  workOrderNumber: "WO-NEW-9",
}
const created = assignDiary(db, assignment, "2026-10-28T06:00:00.000Z")
assert.ok(created)
db = created.db
const leaderRepo = createTeamLeaderRepository(createMemoryStorage({ [MOCK_DB_KEY]: JSON.stringify(db) }))
const visible = leaderRepo.list(leader.id)
assert.equal(visible.some((diary) => diary.id === created.id), true)
assertNoWorkOrder(visible)
const draft: DiaryDraft = {
  workers: [{ id: "new-worker", fullName: "עובד בשטח" }],
  items: [{ id: "new-item", componentId, quantity: 4 }],
  checkedIds: ["check-height"],
  notes: "הערה מהשטח",
}
const saved = leaderRepo.saveDraft(leader.id, created.id, draft)
assert.equal(saved.ok, true)
const submittedDiary = leaderRepo.submit(leader.id, created.id, draft, "2026-10-28T18:00:00.000Z")
assert.equal(submittedDiary.ok, true)
if (!submittedDiary.ok) throw new Error("submit failed")
assert.equal(submittedDiary.data.status, "submitted")
const managerView = getManagerDiary(leaderRepo.readDb()!, created.id)
assert.equal(managerView?.status, "submitted")
assert.equal(managerView?.workOrderNumber, "WO-NEW-9")
assert.equal(managerView?.workers[0]?.fullName, "עובד בשטח")
assert.equal(managerView?.items[0]?.componentName, "רכיב חדש")
assert.equal(managerView?.items[0]?.quantity, 4)
assert.equal(managerView?.notes, "הערה מהשטח")
assert.equal(managerView?.checkboxes.find((item) => item.checkboxId === "check-height")?.checked, true)
assert.equal(updateAssignment(leaderRepo.readDb()!, created.id, {
  ...assignment,
  workDate: "2026-10-29",
  workOrderNumber: "WO-CHANGED",
}), null)
assert.equal(cancelDiary(leaderRepo.readDb()!, created.id), null)
const copy = duplicateDiary(leaderRepo.readDb()!, created.id, "2026-10-28T19:00:00.000Z")
assert.ok(copy)
assert.equal(copy.db.workers.some((worker) => worker.diaryId === copy.id), false)
assert.equal(copy.db.items.some((item) => item.diaryId === copy.id), false)
assert.equal(copy.db.diaries.find((diary) => diary.id === copy.id)?.notes, "")
assert.equal(copy.db.diaries.find((diary) => diary.id === copy.id)?.status, "pending")
const inactiveDb = {
  ...db,
  users: db.users.map((user) => (user.id === leader.id ? { ...user, isActive: false } : user)),
}
assert.equal(assignDiary(inactiveDb, {
  ...assignment,
  workOrderNumber: "WO-BLOCKED",
}, "2026-10-28T20:00:00.000Z"), null)

const manager = saveManagerUser(db, null, {
  fullName: "מנהל חדש",
  identityNumber: "987654321",
  email: "new-manager@example.test",
  companyId,
})
assert.ok(manager)
db = manager.db
const inactiveCompany = setCompanyActive(db, companyId, false)
assert.ok(inactiveCompany)
assert.equal(
  assignDiary(
    inactiveCompany,
    { ...assignment, workOrderNumber: "WO-INACTIVE-CO" },
    "2026-10-28T20:30:00.000Z"
  ),
  null
)
db = setCompanyActive(inactiveCompany, companyId, true)!
const inactiveCustomer = setCustomerActive(db, customerId, false)
assert.ok(inactiveCustomer)
assert.equal(
  assignDiary(
    inactiveCustomer,
    { ...assignment, workOrderNumber: "WO-INACTIVE-CU" },
    "2026-10-28T20:31:00.000Z"
  ),
  null
)
db = setCustomerActive(inactiveCustomer, customerId, true)!
const inactiveSite = setSiteActive(db, siteId, false)
assert.ok(inactiveSite)
assert.equal(
  assignDiary(
    inactiveSite,
    { ...assignment, workOrderNumber: "WO-INACTIVE-SI" },
    "2026-10-28T20:32:00.000Z"
  ),
  null
)
db = setSiteActive(inactiveSite, siteId, true)!
const blockedSiteDelete = deleteSite(db, siteId)
assert.equal("reason" in blockedSiteDelete && blockedSiteDelete.reason, "has-diaries")
const emptyCompany = saveCompany(db, null, "חברה למחיקה")
assert.ok(emptyCompany)
db = emptyCompany
const emptyCompanyId = db.companies.at(-1)?.id
assert.ok(emptyCompanyId)
const deletedCompany = deleteCompany(db, emptyCompanyId)
assert.ok("db" in deletedCompany)
if ("db" in deletedCompany) db = deletedCompany.db
assert.equal(db.companies.some((item) => item.id === emptyCompanyId), false)
const leaderDeleteBlocked = deleteUser(db, leader.id)
assert.equal("reason" in leaderDeleteBlocked && leaderDeleteBlocked.reason, "has-diaries")
const solo = createSeed()
const onlyManager = solo.users.find((user) => user.role === "manager" && user.isActive)
assert.ok(onlyManager)
const pruned = {
  ...solo,
  users: solo.users.filter((user) => user.role !== "manager" || user.id === onlyManager.id),
}
assert.equal(pruned.users.filter((user) => user.role === "manager" && user.isActive).length, 1)
const lastManagerDelete = deleteUser(pruned, onlyManager.id)
assert.equal("reason" in lastManagerDelete && lastManagerDelete.reason, "last-manager")
const lastManagerDeactivate = setUserActive(pruned, onlyManager.id, false)
assert.equal("reason" in lastManagerDeactivate && lastManagerDeactivate.reason, "last-manager")
assert.ok(createSeed().diaries.every((diary) => typeof diary.subSiteName === "string"))
assert.equal(
  createSeed().customers.every((item) => typeof item.companyId === "string" && item.companyId.length > 0),
  true
)
assert.equal(
  createSeed().sites.every((item) => typeof item.customerId === "string" && item.customerId.length > 0),
  true
)

console.log("phase 3.6 checks passed")

function assertNoWorkOrder(value: unknown) {
  const serialized = JSON.stringify(value)
  assert.equal(serialized.includes("workOrderNumber"), false)
  assert.equal(serialized.includes("WO-"), false)
}
