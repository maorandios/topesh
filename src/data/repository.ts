import { findComponent, findDomain, findSite, findSubSite } from "@/data/lookups"
import { parseDatabase } from "@/data/migrate"
import { addQuantities, normalizeQuantity } from "@/data/quantity"
import { createSeed, type MockDb } from "@/data/seed"
import type { DiaryStatus, TeamLeaderDiary } from "@/domain/types"

export const MOCK_DB_KEY = "work-diary:mock-db:v1"

export type KeyValueStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export type LeaderDiarySummary = {
  id: string
  workDate: string
  siteName: string
  subSiteName: string
  status: DiaryStatus
}

export type LeaderDiaryItemView = {
  id: string
  componentId: string
  domainId: string
  domainName: string
  componentName: string
  unit: string
  quantity: number
}

export type LeaderCheckboxView = {
  checkboxId: string
  label: string
  checked: boolean
}

export type LeaderDiaryDetail = TeamLeaderDiary & {
  siteName: string
  subSiteName: string
  workers: { id: string; fullName: string }[]
  items: LeaderDiaryItemView[]
  checkboxes: LeaderCheckboxView[]
}

export type DiaryDraft = {
  workers: { id: string; fullName: string }[]
  items: { id: string; componentId: string; quantity: number }[]
  checkedIds: string[]
  notes: string
}

export type RepoResult<T> =
  | { ok: true; unchanged: boolean; data: T }
  | { ok: false; reason: "not-found" | "invalid" | "locked" }

export type RepositorySnapshot =
  | { status: "ready"; db: MockDb }
  | { status: "error" }

const NOTES_LIMIT = 2000
const NAME_LIMIT = 80

export function createMemoryStorage(initial?: Record<string, string>): KeyValueStorage {
  const values = new Map(Object.entries(initial ?? {}))
  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
}

export function listForLeader(db: MockDb, teamLeaderId: string): LeaderDiarySummary[] {
  return db.diaries
    .filter((diary) => diary.teamLeaderId === teamLeaderId && diary.status !== "cancelled")
    .map((diary) => ({
      id: diary.id,
      workDate: diary.workDate,
      siteName: findSite(db, diary.siteId)?.name ?? "",
      subSiteName: findSubSite(db, diary.subSiteId)?.name ?? "",
      status: diary.status,
    }))
    .sort(compareSummaries)
}

export function detailForLeader(
  db: MockDb,
  teamLeaderId: string,
  diaryId: string
): LeaderDiaryDetail | null {
  const diary = db.diaries.find((item) => item.id === diaryId)
  if (!diary || diary.teamLeaderId !== teamLeaderId) return null
  return toDetail(db, diary)
}

export function createTeamLeaderRepository(
  storage: KeyValueStorage,
  onChange?: () => void
) {
  let snapshot = readSnapshot(storage)

  const publish = (next: RepositorySnapshot) => {
    snapshot = next
    onChange?.()
  }

  const writeReady = (db: MockDb) => {
    storage.setItem(MOCK_DB_KEY, JSON.stringify(db))
    publish({ status: "ready", db })
  }

  return {
    getSnapshot(): RepositorySnapshot {
      return snapshot
    },
    reload() {
      publish(readSnapshot(storage))
    },
    reset() {
      writeReady(createSeed())
    },
    readDb(): MockDb | null {
      return snapshot.status === "ready" ? snapshot.db : null
    },
    replace(db: MockDb) {
      writeReady(db)
    },
    list(teamLeaderId: string): LeaderDiarySummary[] {
      if (snapshot.status !== "ready") return []
      return listForLeader(snapshot.db, teamLeaderId)
    },
    get(teamLeaderId: string, diaryId: string): LeaderDiaryDetail | null {
      if (snapshot.status !== "ready") return null
      return detailForLeader(snapshot.db, teamLeaderId, diaryId)
    },
    saveDraft(
      teamLeaderId: string,
      diaryId: string,
      draft: DiaryDraft
    ): RepoResult<LeaderDiaryDetail> {
      if (snapshot.status !== "ready") return { ok: false, reason: "not-found" }
      const current = snapshot.db.diaries.find((item) => item.id === diaryId)
      if (!current || current.teamLeaderId !== teamLeaderId) {
        return { ok: false, reason: "not-found" }
      }
      if (current.status !== "pending") {
        return { ok: true, unchanged: true, data: toDetail(snapshot.db, current) }
      }
      const applied = applyDraft(snapshot.db, diaryId, draft)
      if (!applied) return { ok: false, reason: "invalid" }
      writeReady(applied)
      const detail = detailForLeader(applied, teamLeaderId, diaryId)
      if (!detail) return { ok: false, reason: "not-found" }
      return { ok: true, unchanged: false, data: detail }
    },
    submit(
      teamLeaderId: string,
      diaryId: string,
      draft: DiaryDraft,
      submittedAt: string
    ): RepoResult<LeaderDiaryDetail> {
      if (snapshot.status !== "ready") return { ok: false, reason: "not-found" }
      const current = snapshot.db.diaries.find((item) => item.id === diaryId)
      if (!current || current.teamLeaderId !== teamLeaderId) {
        return { ok: false, reason: "not-found" }
      }
      if (current.status !== "pending") {
        return { ok: true, unchanged: true, data: toDetail(snapshot.db, current) }
      }
      const applied = applyDraft(snapshot.db, diaryId, draft)
      if (!applied) return { ok: false, reason: "invalid" }
      const locked: MockDb = {
        ...applied,
        diaries: applied.diaries.map((diary) =>
          diary.id === diaryId
            ? { ...diary, status: "submitted", submittedAt }
            : diary
        ),
      }
      writeReady(locked)
      const detail = detailForLeader(locked, teamLeaderId, diaryId)
      if (!detail) return { ok: false, reason: "not-found" }
      return { ok: true, unchanged: false, data: detail }
    },
  }
}

function readSnapshot(storage: KeyValueStorage): RepositorySnapshot {
  const raw = storage.getItem(MOCK_DB_KEY)
  if (!raw) {
    const seeded = createSeed()
    storage.setItem(MOCK_DB_KEY, JSON.stringify(seeded))
    return { status: "ready", db: seeded }
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    const migrated = parseDatabase(parsed)
    if (!migrated) return { status: "error" }
    if (!isCurrentVersion(parsed)) {
      storage.setItem(MOCK_DB_KEY, JSON.stringify(migrated))
    }
    return { status: "ready", db: migrated }
  } catch {
    return { status: "error" }
  }
}

export function applyDiaryDraft(db: MockDb, diaryId: string, draft: DiaryDraft): MockDb | null {
  if (!db.diaries.some((diary) => diary.id === diaryId)) return null
  return applyDraft(db, diaryId, draft)
}

function applyDraft(db: MockDb, diaryId: string, draft: DiaryDraft): MockDb | null {
  const notes = draft.notes.trim()
  if (notes.length > NOTES_LIMIT) return null

  const workers = draft.workers
    .map((worker) => ({ id: worker.id, fullName: worker.fullName.trim() }))
    .filter((worker) => worker.fullName.length > 0)
  if (workers.some((worker) => worker.fullName.length > NAME_LIMIT || !worker.id)) {
    return null
  }

  const merged = new Map<string, { id: string; quantity: number }>()
  for (const item of draft.items) {
    const component = findComponent(db, item.componentId)
    const alreadySaved = db.items.some(
      (saved) => saved.diaryId === diaryId && saved.componentId === item.componentId
    )
    if (!component || !item.id || (!component.isActive && !alreadySaved)) return null
    const quantity = normalizeQuantity(item.quantity)
    if (quantity === null) return null
    const existing = merged.get(item.componentId)
    if (!existing) {
      merged.set(item.componentId, { id: item.id, quantity })
      continue
    }
    const sum = addQuantities(existing.quantity, quantity)
    if (sum === null) return null
    merged.set(item.componentId, { id: existing.id, quantity: sum })
  }

  const activeIds = new Set(
    db.checkboxDefinitions.filter((item) => item.isActive).map((item) => item.id)
  )
  const checkedIds = [...new Set(draft.checkedIds)]
  if (checkedIds.some((id) => !activeIds.has(id))) return null

  return {
    ...db,
    diaries: db.diaries.map((diary) =>
      diary.id === diaryId ? { ...diary, notes } : diary
    ),
    workers: [
      ...db.workers.filter((worker) => worker.diaryId !== diaryId),
      ...workers.map((worker) => ({ ...worker, diaryId })),
    ],
    items: [
      ...db.items.filter((item) => item.diaryId !== diaryId),
      ...[...merged.entries()].map(([componentId, item]) => ({
        id: item.id,
        diaryId,
        componentId,
        quantity: item.quantity,
      })),
    ],
    checks: [
      ...db.checks.filter((check) => check.diaryId !== diaryId),
      ...checkedIds.map((checkboxId) => ({
        id: `${diaryId}:${checkboxId}`,
        diaryId,
        checkboxId,
        checked: true,
      })),
    ],
  }
}

function toDetail(db: MockDb, diary: MockDb["diaries"][number]): LeaderDiaryDetail {
  const selected = new Set(
    db.checks
      .filter((check) => check.diaryId === diary.id && check.checked)
      .map((check) => check.checkboxId)
  )
  const leader: LeaderDiaryDetail = {
    id: diary.id,
    teamLeaderId: diary.teamLeaderId,
    workDate: diary.workDate,
    siteId: diary.siteId,
    subSiteId: diary.subSiteId,
    status: diary.status,
    notes: diary.notes,
    createdAt: diary.createdAt,
    submittedAt: diary.submittedAt,
    siteName: findSite(db, diary.siteId)?.name ?? "",
    subSiteName: findSubSite(db, diary.subSiteId)?.name ?? "",
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
  return leader
}

function compareSummaries(a: LeaderDiarySummary, b: LeaderDiarySummary) {
  if (a.workDate !== b.workDate) return a.workDate < b.workDate ? 1 : -1
  if (a.status !== b.status) return a.status === "pending" ? -1 : 1
  return a.id < b.id ? -1 : 1
}

function isCurrentVersion(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && "version" in value && value.version === 2)
}
