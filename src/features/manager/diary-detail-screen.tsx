"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageFrame } from "@/components/motion/page-frame"
import { AppLink } from "@/components/shell/app-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  cancelManagerDiary,
  duplicateManagerDiary,
  updateManagerDiary,
  useManagerDb,
} from "@/data/browser-store"
import { getManagerDiary } from "@/data/manager"
import { findCustomer } from "@/data/lookups"
import { LeaderLoading, LeaderStoreError } from "@/features/leader/leader-states"
import { Field, fieldClass } from "@/features/manager/fields"
import { he } from "@/i18n/he"
import { formatDateTime, formatQuantity, formatWorkDate } from "@/lib/format"
import { BidiText } from "@/lib/bidi"

export function ManagerDiaryScreen({ diaryId }: { diaryId: string }) {
  const query = useManagerDb()
  if (query.status === "loading") return <LeaderLoading />
  if (query.status === "error") return <LeaderStoreError />
  const diary = getManagerDiary(query.db, diaryId)
  if (!diary) {
    return (
      <PageFrame>
        <div className="flex flex-col gap-3 px-4 py-5">
          <AppLink href="/manager/diaries" direction="back" className="pressable inline-flex min-h-11 items-center self-start text-sm text-muted-foreground">
            {he.manager.back}
          </AppLink>
          <h1 className="text-xl font-semibold">{he.leader.notFoundTitle}</h1>
          <p className="text-sm leading-6 text-muted-foreground">{he.leader.notFoundBody}</p>
        </div>
      </PageFrame>
    )
  }
  return <DiaryDetail db={query.db} diary={diary} />
}

function DiaryDetail({
  db,
  diary,
}: {
  db: Extract<ReturnType<typeof useManagerDb>, { status: "ready" }>["db"]
  diary: NonNullable<ReturnType<typeof getManagerDiary>>
}) {
  const router = useRouter()
  const pending = diary.status === "pending"
  const leaders = db.users.filter((user) => user.role === "teamLeader" && (user.isActive || user.id === diary.teamLeaderId))
  const [leaderId, setLeaderId] = useState(diary.teamLeaderId)
  const [workDate, setWorkDate] = useState(diary.workDate)
  const [siteId, setSiteId] = useState(diary.siteId)
  const [subSiteId, setSubSiteId] = useState(diary.subSiteId)
  const [workOrder, setWorkOrder] = useState(diary.workOrderNumber)
  const [error, setError] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const subSites = db.subSites.filter((item) => item.siteId === siteId)

  const save = () => {
    const result = updateManagerDiary(diary.id, {
      teamLeaderId: leaderId,
      workDate,
      siteId,
      subSiteId,
      workOrderNumber: workOrder,
    })
    setError(!result.ok)
  }

  const duplicate = () => {
    const result = duplicateManagerDiary(diary.id)
    if (result.ok && "id" in result && result.id) router.push(`/manager/diaries/${result.id}`)
  }

  return (
    <PageFrame>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-5 lg:max-w-3xl">
        <AppLink href="/manager/diaries" direction="back" className="pressable inline-flex min-h-11 items-center self-start text-sm text-muted-foreground">
          {he.manager.back}
        </AppLink>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{formatWorkDate(diary.workDate)}</h1>
          <span className="text-sm">
            {diary.status === "pending"
              ? he.leader.status.pending
              : diary.status === "cancelled"
                ? he.leader.status.cancelled
                : he.leader.status.submitted}
          </span>
        </div>
        {pending ? (
          <div className="grid gap-3">
            <Field label={he.manager.diaries.leader}>
              <select className={fieldClass} value={leaderId} onChange={(event) => setLeaderId(event.target.value)}>
                {leaders.map((leader) => (
                  <option key={leader.id} value={leader.id}>{leader.fullName}</option>
                ))}
              </select>
            </Field>
            <Field label={he.manager.diaries.date}>
              <Input type="date" dir="ltr" value={workDate} className="h-11 text-base md:text-base" onChange={(event) => setWorkDate(event.target.value)} />
            </Field>
            <Field label={he.manager.diaries.site}>
              <select
                className={fieldClass}
                value={siteId}
                onChange={(event) => {
                  const next = event.target.value
                  setSiteId(next)
                  setSubSiteId(db.subSites.find((item) => item.siteId === next)?.id ?? "")
                }}
              >
                {db.sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {findCustomer(db, site.customerId)?.name} · {site.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={he.manager.diaries.subSite}>
              <select className={fieldClass} value={subSiteId} onChange={(event) => setSubSiteId(event.target.value)}>
                {subSites.map((subSite) => (
                  <option key={subSite.id} value={subSite.id}>{subSite.name}</option>
                ))}
              </select>
            </Field>
            <Field label={he.manager.diaries.workOrder}>
              <Input dir="ltr" value={workOrder} className="h-11 text-base md:text-base" onChange={(event) => setWorkOrder(event.target.value)} />
            </Field>
            {error ? <p className="text-sm text-muted-foreground">{he.manager.invalid}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="touch" onClick={save}>{he.manager.save}</Button>
              <Button type="button" size="touch" variant="outline" onClick={duplicate}>{he.manager.duplicate}</Button>
              <Button type="button" size="touch" variant="outline" onClick={() => setCancelOpen(true)}>{he.manager.cancelAssignment}</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="rounded-xl border border-border bg-muted px-4 py-3 text-sm leading-6">{he.manager.locked}</p>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{he.manager.diaries.leader}</dt>
              <dd>{diary.teamLeaderName}</dd>
              <dt className="text-muted-foreground">{he.manager.diaries.site}</dt>
              <dd>{diary.siteName}</dd>
              <dt className="text-muted-foreground">{he.manager.diaries.subSite}</dt>
              <dd>{diary.subSiteName}</dd>
              <dt className="text-muted-foreground">{he.manager.diaries.workOrder}</dt>
              <dd><BidiText>{diary.workOrderNumber}</BidiText></dd>
              {diary.submittedAt ? (
                <>
                  <dt className="text-muted-foreground">{he.leader.form.submittedOn}</dt>
                  <dd>{formatDateTime(diary.submittedAt)}</dd>
                </>
              ) : null}
            </dl>
            <Button type="button" size="touch" variant="outline" className="self-start" onClick={duplicate}>
              {he.manager.duplicate}
            </Button>
          </div>
        )}
        <Report diary={diary} />
      </div>
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{he.manager.cancelAssignment}</DialogTitle>
            <DialogDescription>{he.manager.cancelConfirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              size="touch"
              onClick={() => {
                const result = cancelManagerDiary(diary.id)
                if (result.ok) router.push("/manager/diaries")
              }}
            >
              {he.manager.cancelAction}
            </Button>
            <Button type="button" size="touch" variant="outline" onClick={() => setCancelOpen(false)}>
              {he.manager.keep}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageFrame>
  )
}

function Report({ diary }: { diary: NonNullable<ReturnType<typeof getManagerDiary>> }) {
  const checks = diary.checkboxes.filter((item) => item.checked)
  return (
    <div className="flex flex-col gap-4 border-t border-border pt-4">
      <ReadOnlyList title={he.leader.form.workersTitle} empty={he.leader.form.readOnlyWorkers} values={diary.workers.map((worker) => worker.fullName)} />
      <ReadOnlyList
        title={he.leader.form.workTitle}
        empty={he.leader.form.readOnlyItems}
        values={diary.items.map((item) => `${item.domainName}, ${item.componentName} — ${formatQuantity(item.quantity)} ${item.unit}`)}
      />
      <ReadOnlyList title={he.leader.form.checksTitle} empty={he.leader.form.readOnlyChecks} values={checks.map((item) => item.label)} />
      <section className="flex flex-col gap-1">
        <h2 className="text-base font-medium">{he.leader.form.notesTitle}</h2>
        <p className="text-sm leading-6">{diary.notes.trim() || he.leader.form.readOnlyNotes}</p>
      </section>
    </div>
  )
}

function ReadOnlyList({ title, empty, values }: { title: string; empty: string; values: string[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-medium">{title}</h2>
      {values.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {values.map((value, index) => (
            <li key={`${value}-${index}`} className="rounded-xl border border-border bg-card px-3 py-3 text-sm">{value}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
