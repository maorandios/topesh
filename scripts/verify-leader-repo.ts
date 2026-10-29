import assert from "node:assert/strict"
import { noaUser, uriUser } from "@/data/catalog"
import {
  createMemoryStorage,
  createTeamLeaderRepository,
  type DiaryDraft,
} from "@/data/repository"

const storage = createMemoryStorage()
const repo = createTeamLeaderRepository(storage)
const uriDiaries = repo.list(uriUser.id)
const noaDiaries = repo.list(noaUser.id)

assert.equal(uriDiaries.length, 4)
assert.equal(
  uriDiaries.filter((diary) => diary.workDate === "2026-10-28").length,
  2
)
assert.equal(noaDiaries.some((diary) => diary.id.startsWith("diary-uri")), false)
assert.equal(repo.get(noaUser.id, "diary-uri-floor"), null)

const pending = repo.get(uriUser.id, "diary-uri-floor")
assert.ok(pending)
assert.equal(pending.status, "pending")
assertNoWorkOrder(pending)
assertNoWorkOrder(uriDiaries)
assertNoWorkOrder(noaDiaries)

const draft: DiaryDraft = {
  workers: [
    { id: "worker-a", fullName: "  דנה כהן  " },
    { id: "worker-b", fullName: "   " },
    { id: "worker-c", fullName: "יוסי לוי" },
  ],
  items: [
    { id: "item-a", componentId: "fire-detector", quantity: 2 },
    { id: "item-b", componentId: "cctv-cable", quantity: 3.5 },
    { id: "item-c", componentId: "pa-speaker", quantity: 1 },
  ],
  checkedIds: ["check-height", "check-night"],
  notes: "  בדיקת התקנה  ",
}

const saved = repo.saveDraft(uriUser.id, "diary-uri-floor", draft)
assert.equal(saved.ok, true)
if (!saved.ok) throw new Error("save failed")
assert.deepEqual(
  saved.data.workers.map((worker) => worker.fullName),
  ["דנה כהן", "יוסי לוי"]
)
assert.equal(saved.data.items.length, 3)
assert.equal(saved.data.notes, "בדיקת התקנה")
assert.equal(saved.data.checkboxes.filter((item) => item.checked).length, 2)
assertNoWorkOrder(saved.data)

const reloaded = createTeamLeaderRepository(storage).get(uriUser.id, "diary-uri-floor")
assert.ok(reloaded)
assert.equal(reloaded.workers.length, 2)
assert.equal(reloaded.notes, "בדיקת התקנה")

const submitted = repo.submit(
  uriUser.id,
  "diary-uri-floor",
  {
    ...draft,
    workers: [...draft.workers, { id: "worker-d", fullName: "לא אמור להישמר" }],
  },
  "2026-10-28T12:00:00.000Z"
)
assert.equal(submitted.ok, true)
if (!submitted.ok) throw new Error("submit failed")
assert.equal(submitted.unchanged, false)
assert.equal(submitted.data.status, "submitted")
assert.equal(submitted.data.submittedAt, "2026-10-28T12:00:00.000Z")
assertNoWorkOrder(submitted.data)

const again = repo.submit(
  uriUser.id,
  "diary-uri-floor",
  {
    workers: [{ id: "worker-extra", fullName: "כפילות" }],
    items: [{ id: "item-extra", componentId: "fire-button", quantity: 9 }],
    checkedIds: [],
    notes: "כפילות",
  },
  "2026-10-28T13:00:00.000Z"
)
assert.equal(again.ok, true)
if (!again.ok) throw new Error("second submit failed")
assert.equal(again.unchanged, true)
assert.equal(again.data.workers.length, submitted.data.workers.length)
assert.equal(again.data.items.length, submitted.data.items.length)
assert.equal(again.data.submittedAt, "2026-10-28T12:00:00.000Z")
assert.equal(again.data.notes, "בדיקת התקנה")

const locked = repo.saveDraft(uriUser.id, "diary-uri-floor", {
  workers: [],
  items: [],
  checkedIds: [],
  notes: "שינוי אחרי הגשה",
})
assert.equal(locked.ok, true)
if (!locked.ok) throw new Error("locked save failed")
assert.equal(locked.unchanged, true)
assert.equal(locked.data.notes, "בדיקת התקנה")

const invalid = repo.saveDraft(uriUser.id, "diary-uri-parking", {
  workers: [],
  items: [{ id: "bad", componentId: "fire-detector", quantity: 1.256 }],
  checkedIds: [],
  notes: "",
})
assert.deepEqual(invalid, { ok: false, reason: "invalid" })

const hidden = createTeamLeaderRepository(storage).get(noaUser.id, "diary-uri-floor")
assert.equal(hidden, null)

console.log("leader repository checks passed")

function assertNoWorkOrder(value: unknown) {
  const serialized = JSON.stringify(value)
  assert.equal(serialized.includes("workOrderNumber"), false)
  assert.equal(serialized.includes("WO-"), false)
  if (value && typeof value === "object") {
    assert.equal("workOrderNumber" in value, false)
    for (const nested of Object.values(value)) {
      if (nested && typeof nested === "object") assertNoWorkOrder(nested)
    }
  }
}
