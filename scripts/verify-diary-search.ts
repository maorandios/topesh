import assert from "node:assert/strict"
import {
  emptyWorkDiarySearchFilters,
  searchWorkDiaries,
  validateWorkDiarySearchDates,
  workDiarySearchOptions,
} from "@/data/manager"
import { createSeed } from "@/data/seed"

const db = createSeed()
const all = searchWorkDiaries(db, emptyWorkDiarySearchFilters())
assert.equal(all.length, db.diaries.length, "no filters returns all diaries")
assert.ok(all.every((diary, index) => {
  if (index === 0) return true
  const prev = all[index - 1]!
  if (prev.workDate !== diary.workDate) return prev.workDate > diary.workDate
  return prev.createdAt >= diary.createdAt
}), "sorted by work date desc then createdAt desc")

assert.equal(validateWorkDiarySearchDates("2026-10-20", "2026-10-10"), "range")
assert.equal(validateWorkDiarySearchDates("2026-10-10", "2026-10-20"), null)

const byRange = searchWorkDiaries(db, {
  ...emptyWorkDiarySearchFilters(),
  from: "2026-10-15",
  to: "2026-10-30",
})
assert.ok(byRange.length > 0)
assert.ok(byRange.every((diary) => diary.workDate >= "2026-10-15" && diary.workDate <= "2026-10-30"))

const byCustomer = searchWorkDiaries(db, {
  ...emptyWorkDiarySearchFilters(),
  customerIds: ["customer-hadar"],
})
assert.ok(byCustomer.length > 0)
assert.ok(byCustomer.every((diary) => diary.customerId === "customer-hadar"))

const byCompanies = searchWorkDiaries(db, {
  ...emptyWorkDiarySearchFilters(),
  companyIds: ["company-secure-net", "company-fireline"],
})
assert.ok(byCompanies.length > 0)
assert.ok(
  byCompanies.every(
    (diary) => diary.companyId === "company-secure-net" || diary.companyId === "company-fireline"
  )
)

const bySite = searchWorkDiaries(db, {
  ...emptyWorkDiarySearchFilters(),
  siteIds: ["site-sharon"],
})
assert.ok(bySite.length > 0)
assert.ok(bySite.every((diary) => diary.siteId === "site-sharon"))

const byFullWo = searchWorkDiaries(db, {
  ...emptyWorkDiarySearchFilters(),
  workOrderNumber: "WO-4101",
})
assert.equal(byFullWo.length, 1)
assert.equal(byFullWo[0]?.workOrderNumber, "WO-4101")

const byPartialWo = searchWorkDiaries(db, {
  ...emptyWorkDiarySearchFilters(),
  workOrderNumber: "410",
})
assert.ok(byPartialWo.length >= 1)
assert.ok(byPartialWo.every((diary) => diary.workOrderNumber.includes("410")))

const byLeader = searchWorkDiaries(db, {
  ...emptyWorkDiarySearchFilters(),
  teamLeaderIds: ["dev-team-leader"],
})
assert.ok(byLeader.length > 0)
assert.ok(byLeader.every((diary) => diary.teamLeaderId === "dev-team-leader"))

const bySubmitted = searchWorkDiaries(db, {
  ...emptyWorkDiarySearchFilters(),
  statuses: ["submitted"],
})
assert.ok(bySubmitted.length > 0)
assert.ok(bySubmitted.every((diary) => diary.status === "submitted"))

const byPending = searchWorkDiaries(db, {
  ...emptyWorkDiarySearchFilters(),
  statuses: ["pending"],
})
assert.ok(byPending.length > 0)
assert.ok(byPending.every((diary) => diary.status === "pending"))

const byStatuses = searchWorkDiaries(db, {
  ...emptyWorkDiarySearchFilters(),
  statuses: ["pending", "submitted"],
})
assert.ok(byStatuses.length > 0)
assert.ok(byStatuses.every((diary) => diary.status === "pending" || diary.status === "submitted"))

const combined = searchWorkDiaries(db, {
  ...emptyWorkDiarySearchFilters(),
  from: "2026-10-01",
  to: "2026-10-31",
  customerIds: ["customer-hadar"],
  workOrderNumber: "WO-4101",
  statuses: ["submitted"],
})
assert.equal(combined.length, 1)
assert.equal(combined[0]?.id, "diary-rich-azrieli")

const cleared = searchWorkDiaries(db, emptyWorkDiarySearchFilters())
assert.equal(cleared.length, all.length)

const invalidRange = searchWorkDiaries(db, {
  ...emptyWorkDiarySearchFilters(),
  from: "2026-11-01",
  to: "2026-10-01",
})
assert.equal(invalidRange.length, 0)

const options = workDiarySearchOptions(db, {
  ...emptyWorkDiarySearchFilters(),
  companyIds: ["company-secure-net"],
})
assert.ok(options.customers.length > 0, "company filter keeps customer options")
const leaderOptions = workDiarySearchOptions(db, {
  ...emptyWorkDiarySearchFilters(),
  teamLeaderIds: ["dev-team-leader"],
})
assert.ok(leaderOptions.customers.length > 0, "team leader filter keeps customer options")

const siteOnly = workDiarySearchOptions(db, emptyWorkDiarySearchFilters())
assert.ok(siteOnly.sites.length >= db.sites.length || siteOnly.sites.length === db.sites.length)

assert.ok(all.every((diary) => typeof diary.subSiteName === "string"))

console.log(
  JSON.stringify(
    {
      ok: true,
      all: all.length,
      byRange: byRange.length,
      byCustomer: byCustomer.length,
      bySite: bySite.length,
      byFullWo: byFullWo.length,
      byPartialWo: byPartialWo.length,
      byLeader: byLeader.length,
      bySubmitted: bySubmitted.length,
      byPending: byPending.length,
      combined: combined.length,
    },
    null,
    2
  )
)
