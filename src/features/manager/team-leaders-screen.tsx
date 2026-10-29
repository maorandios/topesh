"use client"

import { useState } from "react"
import { PageFrame } from "@/components/motion/page-frame"
import { AppLink } from "@/components/shell/app-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { saveManagerTeamLeader, useManagerDb } from "@/data/browser-store"
import { LeaderLoading, LeaderStoreError } from "@/features/leader/leader-states"
import { Field, fieldClass } from "@/features/manager/fields"
import { he } from "@/i18n/he"
import { cn } from "cn"

type Editor = {
  id: string | null
  fullName: string
  identityNumber: string
  phone: string
  companyId: string
  isActive: boolean
}

export function TeamLeadersScreen() {
  const query = useManagerDb()
  const [editor, setEditor] = useState<Editor | null>(null)
  const [error, setError] = useState(false)
  if (query.status === "loading") return <LeaderLoading />
  if (query.status === "error") return <LeaderStoreError />
  const db = query.db
  const leaders = db.users.filter((user) => user.role === "teamLeader")

  const save = () => {
    if (!editor) return
    const result = saveManagerTeamLeader(editor.id, editor)
    if (!result.ok) {
      setError(true)
      return
    }
    setError(false)
    setEditor(null)
  }

  return (
    <PageFrame>
      <div className="flex flex-col gap-5 px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{he.manager.teamLeaders.title}</h1>
          <Button
            type="button"
            size="touch"
            onClick={() => {
              setError(false)
              setEditor({ id: null, fullName: "", identityNumber: "", phone: "", companyId: db.companies[0]?.id ?? "", isActive: true })
            }}
          >
            {he.manager.add}
          </Button>
        </div>
        <ul className="flex flex-col gap-3">
          {leaders.map((leader) => (
            <li key={leader.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{leader.fullName}</p>
                <p className="text-muted-foreground" dir="ltr">{leader.identityNumber}</p>
                <p className="text-muted-foreground" dir="ltr">{leader.phone}</p>
                <p className="text-muted-foreground">{leader.isActive ? he.manager.active : he.manager.inactive}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <AppLink href={`/manager/diaries?leader=${leader.id}`} className="pressable inline-flex min-h-11 items-center rounded-xl border border-border px-4">
                  {he.manager.teamLeaders.diaries}
                </AppLink>
                <Button
                  type="button"
                  size="touch"
                  variant="outline"
                  onClick={() => setEditor({
                    id: leader.id,
                    fullName: leader.fullName,
                    identityNumber: leader.identityNumber,
                    phone: leader.phone ?? "",
                    companyId: leader.companyId,
                    isActive: leader.isActive,
                  })}
                >
                  {he.manager.edit}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <Dialog open={editor !== null} onOpenChange={(open) => { if (!open) setEditor(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{he.manager.teamLeaders.title}</DialogTitle>
          </DialogHeader>
          {editor ? (
            <div className="grid gap-3">
              <Field label={he.manager.teamLeaders.name}>
                <Input value={editor.fullName} className="h-11 text-base md:text-base" onChange={(event) => setEditor({ ...editor, fullName: event.target.value })} />
              </Field>
              <Field label={he.manager.teamLeaders.identity}>
                <Input dir="ltr" value={editor.identityNumber} className="h-11 text-base md:text-base" onChange={(event) => setEditor({ ...editor, identityNumber: event.target.value })} />
                <span className="text-sm leading-6 text-muted-foreground">{he.manager.teamLeaders.identityInvalid}</span>
              </Field>
              <Field label={he.manager.teamLeaders.phone}>
                <Input dir="ltr" value={editor.phone} className="h-11 text-base md:text-base" onChange={(event) => setEditor({ ...editor, phone: event.target.value })} />
              </Field>
              <Field label={he.manager.teamLeaders.company}>
                <select className={fieldClass} value={editor.companyId} onChange={(event) => setEditor({ ...editor, companyId: event.target.value })}>
                  {db.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                </select>
              </Field>
              <button
                type="button"
                aria-pressed={editor.isActive}
                className={cn("min-h-11 rounded-xl border px-4 text-start text-sm", editor.isActive ? "border-foreground bg-muted font-medium" : "border-border")}
                onClick={() => setEditor({ ...editor, isActive: !editor.isActive })}
              >
                {editor.isActive ? he.manager.active : he.manager.inactive}
              </button>
              {error ? <p className="text-sm leading-6 text-muted-foreground">{he.manager.invalid}</p> : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" size="touch" onClick={save}>{he.manager.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageFrame>
  )
}
