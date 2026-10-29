"use client"

import { useRef, useState, useSyncExternalStore } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { createManagerDiary } from "@/data/browser-store"
import type { MockDb } from "@/data/seed"
import { Field, fieldClass } from "@/features/manager/fields"
import { he } from "@/i18n/he"
import { jerusalemToday } from "@/lib/format"

export function DiaryCreatePanel({
  db,
  open,
  onOpenChange,
}: {
  db: MockDb
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const desktop = useDesktop()
  const body = open ? <CreateForm key={String(open)} db={db} /> : null
  if (desktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-full data-[side=left]:max-w-xl">
          <SheetHeader className="pe-12">
            <SheetTitle>{he.manager.newDiary}</SheetTitle>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
    )
  }
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle swipeDirection="down">
      <DrawerContent className="overflow-hidden">
        <DrawerHeader className="text-start group-data-[swipe-axis=y]/drawer-popup:text-start">
          <DrawerTitle>{he.manager.newDiary}</DrawerTitle>
        </DrawerHeader>
        {body}
      </DrawerContent>
    </Drawer>
  )
}

function CreateForm({ db }: { db: MockDb }) {
  const leaders = db.users.filter((user) => user.role === "teamLeader" && user.isActive)
  const companies = db.companies
  const customers = db.customers
  const sites = db.sites
  const orderRef = useRef<HTMLInputElement>(null)
  const [leaderId, setLeaderId] = useState(leaders[0]?.id ?? "")
  const [workDate, setWorkDate] = useState(jerusalemToday())
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "")
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "")
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "")
  const [subSiteName, setSubSiteName] = useState("")
  const [projectName, setProjectName] = useState("")
  const [workOrder, setWorkOrder] = useState("")
  const [error, setError] = useState(false)

  const save = () => {
    const result = createManagerDiary({
      teamLeaderId: leaderId,
      workDate,
      companyId,
      customerId,
      siteId,
      subSiteName,
      projectName,
      workOrderNumber: workOrder,
    })
    if (!result.ok || !("id" in result) || !result.id) {
      setError(true)
      return
    }
    setError(false)
    setWorkOrder("")
    setSubSiteName("")
    setProjectName("")
    toast(he.manager.created)
    orderRef.current?.focus()
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex flex-col gap-4 text-sm">
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
            <Input
              type="date"
              dir="ltr"
              value={workDate}
              className="h-11 text-base md:text-base"
              onChange={(event) => setWorkDate(event.target.value)}
            />
          </Field>
          <Field label={he.manager.diaries.company}>
            <select className={fieldClass} value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={he.manager.diaries.customer}>
            <select className={fieldClass} value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={he.manager.diaries.site}>
            <select className={fieldClass} value={siteId} onChange={(event) => setSiteId(event.target.value)}>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={he.manager.diaries.project}>
            <Input
              value={projectName}
              className="h-11 text-base md:text-base"
              onChange={(event) => setProjectName(event.target.value)}
            />
          </Field>
          <Field label={he.manager.diaries.subSite}>
            <Input
              value={subSiteName}
              className="h-11 text-base md:text-base"
              onChange={(event) => setSubSiteName(event.target.value)}
            />
          </Field>
          <Field label={he.manager.diaries.workOrder}>
            <Input
              ref={orderRef}
              dir="ltr"
              value={workOrder}
              className="h-11 text-base md:text-base"
              onChange={(event) => setWorkOrder(event.target.value)}
            />
          </Field>
          {error ? <p className="text-muted-foreground">{he.manager.invalid}</p> : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="button" size="touch" onClick={save}>
          {he.manager.save}
        </Button>
      </div>
    </>
  )
}

function useDesktop() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const query = window.matchMedia("(min-width: 1024px)")
      query.addEventListener("change", onStoreChange)
      return () => query.removeEventListener("change", onStoreChange)
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false
  )
}
