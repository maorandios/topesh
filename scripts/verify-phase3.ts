import assert from "node:assert/strict"
import { uriUser } from "@/data/catalog"
import {
  assignDiary,
  cancelDiary,
  duplicateDiary,
  getManagerDiary,
  saveCompany,
  saveComponent,
  saveCustomer,
  saveDomain,
  saveSite,
  saveSubSite,
  saveTeamLeader,
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
assert.equal(migrated.version, 2)
assert.equal(migrated.diaries.length, 2)
assert.equal(migrated.companies.length > 0, true)
const migratedPending = migrated.diaries.find((diary) => diary.id === pending.id)
const migratedSubmitted = migrated.diaries.find((diary) => diary.id === submitted.id)
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
assert.equal(stored.version, 2)
const managerMigrated = getManagerDiary(repo.readDb()!, pending.id)
assert.equal(managerMigrated?.workOrderNumber, "WO-MIG-1")

const fresh = createSeed()
let db = fresh
const company = saveCompany(db, null, "חברה חדשה")
assert.ok(company)
db = company
const companyId = db.companies.at(-1)?.id
assert.ok(companyId)
const customer = saveCustomer(db, null, companyId, "לקוח חדש")
assert.ok(customer)
db = customer
const customerId = db.customers.at(-1)?.id
assert.ok(customerId)
const site = saveSite(db, null, customerId, "אתר חדש")
assert.ok(site)
db = site
const siteId = db.sites.at(-1)?.id
assert.ok(siteId)
const subSite = saveSubSite(db, null, siteId, "אתר משנה חדש")
assert.ok(subSite)
db = subSite
const subSiteId = db.subSites.at(-1)?.id
assert.ok(subSiteId)
const domain = saveDomain(db, null, "תחום חדש", true)
assert.ok(domain)
db = domain
const domainId = db.domains.at(-1)?.id
assert.ok(domainId)
const component = saveComponent(db, null, {
  domainId,
  name: "רכיב חדש",
  unit: "יח׳",
  isActive: true,
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
  isActive: true,
})
assert.ok(leader)
db = leader.db
const created = assignDiary(
  db,
  {
    teamLeaderId: leader.id,
    workDate: "2026-10-28",
    siteId,
    subSiteId,
    workOrderNumber: "WO-NEW-9",
  },
  "2026-10-28T06:00:00.000Z"
)
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
  teamLeaderId: leader.id,
  workDate: "2026-10-29",
  siteId,
  subSiteId,
  workOrderNumber: "WO-CHANGED",
}), null)
assert.equal(cancelDiary(leaderRepo.readDb()!, created.id), null)
const copy = duplicateDiary(leaderRepo.readDb()!, created.id, "2026-10-28T19:00:00.000Z")
assert.ok(copy)
assert.equal(copy.db.workers.some((worker) => worker.diaryId === copy.id), false)
assert.equal(copy.db.items.some((item) => item.diaryId === copy.id), false)
assert.equal(copy.db.diaries.find((diary) => diary.id === copy.id)?.notes, "")
assert.equal(copy.db.diaries.find((diary) => diary.id === copy.id)?.status, "pending")
const inactive = saveTeamLeader(db, leader.id, {
  fullName: "ראש צוות חדש",
  identityNumber: "123456789",
  phone: "053-0000000",
  companyId,
  isActive: false,
})
assert.ok(inactive)
assert.equal(assignDiary(inactive.db, {
  teamLeaderId: leader.id,
  workDate: "2026-10-28",
  siteId,
  subSiteId,
  workOrderNumber: "WO-BLOCKED",
}, "2026-10-28T20:00:00.000Z"), null)

console.log("phase 3 checks passed")

function assertNoWorkOrder(value: unknown) {
  const serialized = JSON.stringify(value)
  assert.equal(serialized.includes("workOrderNumber"), false)
  assert.equal(serialized.includes("WO-"), false)
}
