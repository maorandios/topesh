"use client"

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useManagerDb } from "@/data/browser-store"
import { DiaryCreatePanel } from "@/features/manager/diary-create-panel"

type ManagerCreateContextValue = {
  open: boolean
  openCreate: () => void
  closeCreate: () => void
}

const ManagerCreateContext = createContext<ManagerCreateContextValue | null>(null)

function clearCreateFromUrl(router: ReturnType<typeof useRouter>) {
  const url = new URL(window.location.href)
  if (!url.searchParams.has("create")) return
  url.searchParams.delete("create")
  const next = `${url.pathname}${url.search}${url.hash}`
  router.replace(next, { scroll: false })
}

/** Keeps useSearchParams inside Suspense so layout chrome never unmounts. */
function CreateQueryBridge({
  onFlagChange,
}: {
  onFlagChange: (createRequested: boolean) => void
}) {
  const params = useSearchParams()
  const createRequested = params.get("create") === "1"

  useEffect(() => {
    onFlagChange(createRequested)
  }, [createRequested, onFlagChange])

  return null
}

export function ManagerCreateProvider({ children }: { children: ReactNode }) {
  const [userOpen, setUserOpen] = useState(false)
  const [urlCreate, setUrlCreate] = useState(false)
  const query = useManagerDb()
  const router = useRouter()
  const open = userOpen || urlCreate

  const openCreate = useCallback(() => setUserOpen(true), [])
  const closeCreate = useCallback(() => {
    setUserOpen(false)
    setUrlCreate(false)
    clearCreateFromUrl(router)
  }, [router])

  const onOpenChange = useCallback(
    (next: boolean) => {
      setUserOpen(next)
      if (!next) {
        setUrlCreate(false)
        clearCreateFromUrl(router)
      }
    },
    [router]
  )

  const value = useMemo(
    () => ({ open, openCreate, closeCreate }),
    [open, openCreate, closeCreate]
  )

  return (
    <ManagerCreateContext.Provider value={value}>
      <Suspense fallback={null}>
        <CreateQueryBridge onFlagChange={setUrlCreate} />
      </Suspense>
      {children}
      {query.status === "ready" ? (
        <DiaryCreatePanel db={query.db} open={open} onOpenChange={onOpenChange} />
      ) : null}
    </ManagerCreateContext.Provider>
  )
}

export function useManagerCreate() {
  const ctx = useContext(ManagerCreateContext)
  if (!ctx) {
    throw new Error("useManagerCreate must be used within ManagerCreateProvider")
  }
  return ctx
}
