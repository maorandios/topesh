"use client"

import { useRef, useState } from "react"
import { PageFrame } from "@/components/motion/page-frame"
import { AppLink } from "@/components/shell/app-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createManagerDiary, useManagerDb } from "@/data/browser-store"
import { findCustomer } from "@/data/lookups"
import { LeaderLoading, LeaderStoreError } from "@/features/leader/leader-states"
import { Field, fieldClass } from "@/features/manager/fields"
import { he } from "@/i18n/he"
import { jerusalemToday } from "@/lib/format"

export function DiaryCreateScreen() {
  const query = useManagerDb()
  if (query.status === "loading") return <LeaderLoading />
  if (query.status === "error") return <LeaderStoreError />
  return <CreateForm db={query.db} />
}

function CreateForm({ db }: { db: Extract<ReturnType<typeof useManagerDb>, { status: "ready" }>["db"] }) {
  const leaders = db.users.filter((user) => user.role === "teamLeader" && user.isActive)
  const orderRef = useRef<HTMLInputElement>(null)
  const [leaderId, setLeaderId] = useState(leaders[0]?.id ?? "")
  const [workDate, setWorkDate] = useState(jerusalemToday())
  const [siteId, setSiteId] = useState(db.sites[0]?.id ?? "")
  const [subSiteId, setSubSiteId] = useState(
    db.subSites.find((item) => item.siteId === db.sites[0]?.id)?.id ?? ""
  )
  const [workOrder, setWorkOrder] = useState("")
  const [error, setError] = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const subSites = db.subSites.filter((item) => item.siteId === siteId)

  const chooseSite = (nextSiteId: string) => {
    setSiteId(nextSiteId)
    setSubSiteId(db.subSites.find((item) => item.siteId === nextSiteId)?.id ?? "")
    setCreatedId(null)
  }

  const save = () => {
    const result = createManagerDiary({
      teamLeaderId: leaderId,
      workDate,
      siteId,
      subSiteId,
      workOrderNumber: workOrder,
    })
    if (!result.ok || !("id" in result) || !result.id) {
      setError(true)
      return
    }
    setError(false)
    setCreatedId(result.id)
    setWorkOrder("")
    orderRef.current?.focus()
  }

  return (
    <PageFrame>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-5">
        <AppLink
          href="/manager/diaries"
          direction="back"
          className="pressable inline-flex min-h-11 items-center self-start text-sm text-muted-foreground"
        >
          {he.manager.back}
        </AppLink>
        <h1 className="text-xl font-semibold">{he.manager.newDiary}</h1>
        {createdId ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted p-4">
            <p className="text-sm leading-6">{he.manager.created}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="touch"
                onClick={() => {
                  setCreatedId(null)
                  orderRef.current?.focus()
                }}
              >
                {he.manager.anotherDiary}
              </Button>
              <AppLink
                href={`/manager/diaries/${createdId}`}
                className="pressable inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm"
              >
                {he.manager.openDiary}
              </AppLink>
            </div>
          </div>
        ) : null}
        <Field label={he.manager.diaries.leader}>
          <select className={fieldClass} value={leaderId} onChange={(event) => setLeaderId(event.target.value)}>
            {leaders.map((leader) => (
              <option key={leader.id} value={leader.id}>
                {leader.fullName}
              </option>
            ))}
          </select>
        </Field>
        <Field label={he.manager.diaries.date}>
          <Input type="date" dir="ltr" value={workDate} className="h-11 text-base md:text-base" onChange={(event) => setWorkDate(event.target.value)} />
        </Field>
        <Field label={he.manager.diaries.site}>
          <select className={fieldClass} value={siteId} onChange={(event) => chooseSite(event.target.value)}>
            {db.sites.map((site) => {
              const customer = findCustomer(db, site.customerId)
              return (
                <option key={site.id} value={site.id}>
                  {customer ? `${customer.name} · ${site.name}` : site.name}
                </option>
              )
            })}
          </select>
        </Field>
        <Field label={he.manager.diaries.subSite}>
          <select className={fieldClass} value={subSiteId} onChange={(event) => setSubSiteId(event.target.value)}>
            {subSites.map((subSite) => (
              <option key={subSite.id} value={subSite.id}>
                {subSite.name}
              </option>
            ))}
          </select>
        </Field>
        {subSites.length === 0 ? <p className="text-sm text-muted-foreground">{he.manager.noSubsites}</p> : null}
        <Field label={he.manager.diaries.workOrder}>
          <Input
            ref={orderRef}
            value={workOrder}
            dir="ltr"
            className="h-11 text-base md:text-base"
            onChange={(event) => setWorkOrder(event.target.value)}
          />
        </Field>
        {error ? <p className="text-sm leading-6 text-muted-foreground">{he.manager.invalid}</p> : null}
        <Button type="button" size="touch" onClick={save}>
          {he.manager.save}
        </Button>
      </div>
    </PageFrame>
  )
}
