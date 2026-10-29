"use client"

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import type { Role, User } from "@/domain/types"
import { MOCK_DB_KEY } from "@/data/repository"
import { uriUser } from "@/data/catalog"
import {
  DEV_ROLE_STORAGE_KEY,
  DEV_USER_STORAGE_KEY,
  devManager,
  devTeamLeaders,
} from "@/features/dev-role/users"

const ROLE_EVENT = "work-diary-role"
const DB_EVENT = "work-diary-db"
let storeRevision = 0

type DevSession = {
  role: Role | null
  user: User | null
  setManager: () => void
  setTeamLeader: (userId: string) => void
  clearRole: () => void
}

const DevSessionContext = createContext<DevSession | null>(null)

function subscribe(onStoreChange: () => void) {
  const onDb = () => {
    storeRevision += 1
    onStoreChange()
  }
  window.addEventListener(ROLE_EVENT, onStoreChange)
  window.addEventListener(DB_EVENT, onDb)
  window.addEventListener("storage", onStoreChange)
  return () => {
    window.removeEventListener(ROLE_EVENT, onStoreChange)
    window.removeEventListener(DB_EVENT, onDb)
    window.removeEventListener("storage", onStoreChange)
  }
}

function readSessionToken() {
  const role = window.localStorage.getItem(DEV_ROLE_STORAGE_KEY) ?? ""
  const userId = window.localStorage.getItem(DEV_USER_STORAGE_KEY) ?? ""
  if (role !== "manager" && role !== "teamLeader") return ""
  return `${role}|${userId}|${storeRevision}`
}

function writeSession(role: Role | null, userId: string | null) {
  if (role) window.localStorage.setItem(DEV_ROLE_STORAGE_KEY, role)
  else window.localStorage.removeItem(DEV_ROLE_STORAGE_KEY)
  if (userId) window.localStorage.setItem(DEV_USER_STORAGE_KEY, userId)
  else window.localStorage.removeItem(DEV_USER_STORAGE_KEY)
  window.dispatchEvent(new Event(ROLE_EVENT))
}

function resolveLeader(userId: string | undefined): User {
  if (!userId) return uriUser
  const stored = readStoredLeader(userId)
  return stored ?? devTeamLeaders.find((leader) => leader.id === userId) ?? uriUser
}

function readStoredLeader(userId: string): User | null {
  try {
    const raw = window.localStorage.getItem(MOCK_DB_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || !("users" in parsed)) return null
    const users = (parsed as { users?: unknown }).users
    if (!Array.isArray(users)) return null
    const match = users.find(
      (user) =>
        user &&
        typeof user === "object" &&
        "id" in user &&
        user.id === userId &&
        "role" in user &&
        user.role === "teamLeader"
    )
    return isStoredUser(match) ? match : null
  } catch {
    return null
  }
}

function isStoredUser(value: unknown): value is User {
  if (!value || typeof value !== "object") return false
  const user = value as User
  return (
    typeof user.id === "string" &&
    typeof user.fullName === "string" &&
    typeof user.identityNumber === "string" &&
    typeof user.companyId === "string" &&
    typeof user.isActive === "boolean"
  )
}

function resolveSession(token: string): { role: Role | null; user: User | null } {
  const [role, userId] = token.split("|")
  if (role === "manager") return { role, user: devManager }
  if (role === "teamLeader") {
    return { role, user: resolveLeader(userId) }
  }
  return { role: null, user: null }
}

export function DevSessionProvider({ children }: { children: ReactNode }) {
  const token = useSyncExternalStore(subscribe, readSessionToken, () => "")
  const value = useMemo<DevSession>(() => {
    const session = resolveSession(token)
    return {
      role: session.role,
      user: session.user,
      setManager: () => writeSession("manager", devManager.id),
      setTeamLeader: (userId) => writeSession("teamLeader", userId),
      clearRole: () => writeSession(null, null),
    }
  }, [token])

  return (
    <DevSessionContext.Provider value={value}>
      {children}
    </DevSessionContext.Provider>
  )
}

export function useDevSession() {
  const session = useContext(DevSessionContext)
  if (!session) {
    throw new Error("useDevSession must be used within DevSessionProvider")
  }
  return session
}

export function useHasHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}
