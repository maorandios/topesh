"use client"

import { useSyncExternalStore } from "react"
import { useDevSession, useHasHydrated } from "@/features/dev-role/dev-session"
import {
  assignDiary,
  cancelDiary,
  deleteDiary,
  duplicateDiary,
  editDiary,
  markDiaryCancelled,
  saveCompany,
  saveComponent,
  saveCustomer,
  saveDomain,
  saveSite,
  saveSubSite,
  saveTeamLeader,
  updateAssignment,
  type DiaryAssignmentInput,
  type TeamLeaderInput,
} from "@/data/manager"
import {
  createTeamLeaderRepository,
  detailForLeader,
  listForLeader,
  type DiaryDraft,
  type LeaderDiaryDetail,
  type LeaderDiarySummary,
  type RepositorySnapshot,
} from "@/data/repository"
import type { MockDb } from "@/data/seed"

const EVENT = "work-diary-db"
const SERVER_SNAPSHOT: RepositorySnapshot = { status: "error" }
const LOADING = { status: "loading" } as const

let repository: ReturnType<typeof createTeamLeaderRepository> | null = null
let cached: RepositorySnapshot | null = null

function subscribe(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== "work-diary:mock-db:v1") return
    repository?.reload()
    cached = repository?.getSnapshot() ?? null
    onStoreChange()
  }
  window.addEventListener(EVENT, onStoreChange)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(EVENT, onStoreChange)
    window.removeEventListener("storage", onStorage)
  }
}

function ensureRepository() {
  if (repository) return repository
  repository = createTeamLeaderRepository(window.localStorage, () => {
    cached = repository?.getSnapshot() ?? null
    window.dispatchEvent(new Event(EVENT))
  })
  cached = repository.getSnapshot()
  return repository
}

function getClientSnapshot(): RepositorySnapshot {
  ensureRepository()
  return cached ?? { status: "error" }
}

export function useRepositorySnapshot() {
  return useSyncExternalStore(subscribe, getClientSnapshot, () => SERVER_SNAPSHOT)
}

export function resetLeaderStore() {
  ensureRepository().reset()
}

export function saveLeaderDraft(
  teamLeaderId: string,
  diaryId: string,
  draft: DiaryDraft
) {
  return ensureRepository().saveDraft(teamLeaderId, diaryId, draft)
}

export function submitLeaderDiary(
  teamLeaderId: string,
  diaryId: string,
  draft: DiaryDraft
) {
  return ensureRepository().submit(
    teamLeaderId,
    diaryId,
    draft,
    new Date().toISOString()
  )
}

type LeaderQuery<T> =
  | typeof LOADING
  | { status: "error" }
  | { status: "ready"; teamLeaderId: string; data: T }

function useLeaderContext() {
  const session = useDevSession()
  const hydrated = useHasHydrated()
  const snapshot = useRepositorySnapshot()
  const teamLeaderId = session.user?.role === "teamLeader" ? session.user.id : null
  return { hydrated, snapshot, teamLeaderId }
}

function settle<T>(
  context: ReturnType<typeof useLeaderContext>,
  select: (teamLeaderId: string, snapshot: Extract<RepositorySnapshot, { status: "ready" }>) => T
): LeaderQuery<T> {
  if (
    !context.hydrated ||
    !context.teamLeaderId ||
    context.snapshot === SERVER_SNAPSHOT
  ) {
    return LOADING
  }
  if (context.snapshot.status !== "ready") return { status: "error" }
  return {
    status: "ready",
    teamLeaderId: context.teamLeaderId,
    data: select(context.teamLeaderId, context.snapshot),
  }
}

function mutate(next: MockDb | null | { db: MockDb; id: string }) {
  const repo = ensureRepository()
  if (!next) return { ok: false as const }
  if ("id" in next) {
    repo.replace(next.db)
    return { ok: true as const, id: next.id }
  }
  repo.replace(next)
  return { ok: true as const }
}

export function useManagerDb():
  | typeof LOADING
  | { status: "error" }
  | { status: "ready"; db: MockDb } {
  const hydrated = useHasHydrated()
  const snapshot = useRepositorySnapshot()
  if (!hydrated || snapshot === SERVER_SNAPSHOT) return LOADING
  if (snapshot.status !== "ready") return { status: "error" }
  return { status: "ready", db: snapshot.db }
}

export function createManagerDiary(input: DiaryAssignmentInput) {
  const db = ensureRepository().readDb()
  if (!db) return { ok: false as const }
  return mutate(assignDiary(db, input, new Date().toISOString()))
}

export function updateManagerDiary(diaryId: string, input: DiaryAssignmentInput) {
  const db = ensureRepository().readDb()
  if (!db) return { ok: false as const }
  return mutate(updateAssignment(db, diaryId, input))
}

export function cancelManagerDiary(diaryId: string) {
  const db = ensureRepository().readDb()
  if (!db) return { ok: false as const }
  return mutate(cancelDiary(db, diaryId))
}

export function editManagerDiary(
  diaryId: string,
  input: DiaryAssignmentInput,
  draft: DiaryDraft
) {
  const db = ensureRepository().readDb()
  if (!db) return { ok: false as const }
  return mutate(editDiary(db, diaryId, input, draft))
}

export function deleteManagerDiary(diaryId: string) {
  const db = ensureRepository().readDb()
  if (!db) return { ok: false as const }
  return mutate(deleteDiary(db, diaryId))
}

export function markManagerDiaryCancelled(diaryId: string) {
  const db = ensureRepository().readDb()
  if (!db) return { ok: false as const }
  return mutate(markDiaryCancelled(db, diaryId))
}

export function duplicateManagerDiary(diaryId: string) {
  const db = ensureRepository().readDb()
  if (!db) return { ok: false as const }
  return mutate(duplicateDiary(db, diaryId, new Date().toISOString()))
}

export function saveManagerCompany(id: string | null, name: string) {
  const db = ensureRepository().readDb()
  return db ? mutate(saveCompany(db, id, name)) : { ok: false as const }
}

export function saveManagerCustomer(id: string | null, companyId: string, name: string) {
  const db = ensureRepository().readDb()
  return db ? mutate(saveCustomer(db, id, companyId, name)) : { ok: false as const }
}

export function saveManagerSite(id: string | null, customerId: string, name: string) {
  const db = ensureRepository().readDb()
  return db ? mutate(saveSite(db, id, customerId, name)) : { ok: false as const }
}

export function saveManagerSubSite(id: string | null, siteId: string, name: string) {
  const db = ensureRepository().readDb()
  return db ? mutate(saveSubSite(db, id, siteId, name)) : { ok: false as const }
}

export function saveManagerDomain(id: string | null, name: string, isActive: boolean) {
  const db = ensureRepository().readDb()
  return db ? mutate(saveDomain(db, id, name, isActive)) : { ok: false as const }
}

export function saveManagerComponent(
  id: string | null,
  input: { domainId: string; name: string; unit: string; isActive: boolean }
) {
  const db = ensureRepository().readDb()
  return db ? mutate(saveComponent(db, id, input)) : { ok: false as const }
}

export function saveManagerTeamLeader(id: string | null, input: TeamLeaderInput) {
  const db = ensureRepository().readDb()
  return db ? mutate(saveTeamLeader(db, id, input)) : { ok: false as const }
}

export function useLeaderDiaries(): LeaderQuery<LeaderDiarySummary[]> {
  const context = useLeaderContext()
  return settle(context, (teamLeaderId, snapshot) =>
    listForLeader(snapshot.db, teamLeaderId)
  )
}

export function useLeaderDiary(diaryId: string): LeaderQuery<LeaderDiaryDetail | null> {
  const context = useLeaderContext()
  return settle(context, (teamLeaderId, snapshot) =>
    detailForLeader(snapshot.db, teamLeaderId, diaryId)
  )
}
