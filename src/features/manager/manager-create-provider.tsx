"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useManagerDb } from "@/data/browser-store"
import { DiaryCreatePanel } from "@/features/manager/diary-create-panel"

type ManagerCreateContextValue = {
  open: boolean
  openCreate: () => void
  closeCreate: () => void
}

const ManagerCreateContext = createContext<ManagerCreateContextValue | null>(null)

export function ManagerCreateProvider({ children }: { children: ReactNode }) {
  const [userOpen, setUserOpen] = useState(false)
  const query = useManagerDb()
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const createRequested = params.get("create") === "1"
  const open = userOpen || createRequested

  const openCreate = useCallback(() => setUserOpen(true), [])
  const closeCreate = useCallback(() => {
    setUserOpen(false)
    if (params.get("create") === "1") {
      router.replace(pathname, { scroll: false })
    }
  }, [params, pathname, router])

  const onOpenChange = useCallback(
    (next: boolean) => {
      setUserOpen(next)
      if (!next && params.get("create") === "1") {
        router.replace(pathname, { scroll: false })
      }
    },
    [params, pathname, router]
  )

  const value = useMemo(
    () => ({ open, openCreate, closeCreate }),
    [open, openCreate, closeCreate]
  )

  return (
    <ManagerCreateContext.Provider value={value}>
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
