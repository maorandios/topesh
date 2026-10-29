import type {
  CheckboxDefinition,
  Company,
  ComponentItem,
  Customer,
  DiaryCheckbox,
  DiaryItem,
  DiaryWorker,
  Domain,
  Site,
  SubSite,
  User,
  WorkDiary,
} from "@/domain/types"
import {
  checkboxDefinitions,
  company,
  components,
  customers,
  domains,
  noaUser,
  sites,
  subSites,
  uriUser,
  users,
} from "@/data/catalog"

export type MockDb = {
  version: 5
  companies: Company[]
  customers: Customer[]
  sites: Site[]
  subSites: SubSite[]
  users: User[]
  domains: Domain[]
  components: ComponentItem[]
  checkboxDefinitions: CheckboxDefinition[]
  diaries: WorkDiary[]
  workers: DiaryWorker[]
  items: DiaryItem[]
  checks: DiaryCheckbox[]
}

export function createSeed(): MockDb {
  const diaries: WorkDiary[] = [
    {
      id: "diary-uri-floor",
      teamLeaderId: uriUser.id,
      workDate: "2026-10-28",
      companyId: company.id,
      customerId: "customer-hadar",
      siteId: "site-hadar",
      subSiteName: "קומה 1",
      projectName: "שדרוג גילוי אש",
      workOrderNumber: "WO-1001",
      status: "pending",
      notes: "",
      createdAt: "2026-10-27T08:00:00.000Z",
      submittedAt: null,
    },
    {
      id: "diary-uri-parking",
      teamLeaderId: uriUser.id,
      workDate: "2026-10-28",
      companyId: company.id,
      customerId: "customer-hadar",
      siteId: "site-hadar",
      subSiteName: "חניון",
      projectName: "התקנת מצלמות",
      workOrderNumber: "WO-1002",
      status: "pending",
      notes: "",
      createdAt: "2026-10-27T08:05:00.000Z",
      submittedAt: null,
    },
    {
      id: "diary-uri-pumps",
      teamLeaderId: uriUser.id,
      workDate: "2026-10-26",
      companyId: company.id,
      customerId: "customer-sharon",
      siteId: "site-sharon",
      subSiteName: "חדר משאבות",
      projectName: "תחזוקה שוטפת",
      workOrderNumber: "WO-1004",
      status: "pending",
      notes: "",
      createdAt: "2026-10-25T08:00:00.000Z",
      submittedAt: null,
    },
    {
      id: "diary-uri-building",
      teamLeaderId: uriUser.id,
      workDate: "2026-10-21",
      companyId: company.id,
      customerId: "customer-sharon",
      siteId: "site-sharon",
      subSiteName: "בניין א",
      projectName: "התקנת גלאים",
      workOrderNumber: "WO-1003",
      status: "submitted",
      notes: "הותקנו גלאים במסדרון המזרחי.",
      createdAt: "2026-10-20T08:00:00.000Z",
      submittedAt: "2026-10-21T14:00:00.000Z",
    },
    {
      id: "diary-noa-pumps",
      teamLeaderId: noaUser.id,
      workDate: "2026-10-28",
      companyId: company.id,
      customerId: "customer-sharon",
      siteId: "site-sharon",
      subSiteName: "חדר משאבות",
      projectName: "בדיקות תקופתיות",
      workOrderNumber: "WO-2001",
      status: "pending",
      notes: "",
      createdAt: "2026-10-27T09:00:00.000Z",
      submittedAt: null,
    },
    {
      id: "diary-noa-parking",
      teamLeaderId: noaUser.id,
      workDate: "2026-10-15",
      companyId: company.id,
      customerId: "customer-hadar",
      siteId: "site-hadar",
      subSiteName: "חניון",
      projectName: "מערכת כריזה",
      workOrderNumber: "WO-2002",
      status: "submitted",
      notes: "כריזה בחניון.",
      createdAt: "2026-10-14T09:00:00.000Z",
      submittedAt: "2026-10-15T13:30:00.000Z",
    },
  ]

  const workers: DiaryWorker[] = [
    { id: "worker-uri-1", diaryId: "diary-uri-building", fullName: "יוסי לוי" },
    { id: "worker-uri-2", diaryId: "diary-uri-building", fullName: "מאיה פרץ" },
    { id: "worker-noa-1", diaryId: "diary-noa-parking", fullName: "רועי דהן" },
  ]

  const items: DiaryItem[] = [
    { id: "item-uri-1", diaryId: "diary-uri-building", componentId: "fire-detector", quantity: 12 },
    { id: "item-uri-2", diaryId: "diary-uri-building", componentId: "cctv-cable", quantity: 40.5 },
    { id: "item-noa-1", diaryId: "diary-noa-parking", componentId: "pa-speaker", quantity: 6 },
  ]

  const checks: DiaryCheckbox[] = [
    {
      id: "diary-uri-building:check-height",
      diaryId: "diary-uri-building",
      checkboxId: "check-height",
      checked: true,
    },
  ]

  return {
    version: 5,
    companies: [company],
    customers,
    sites,
    subSites,
    users,
    domains,
    components,
    checkboxDefinitions,
    diaries,
    workers,
    items,
    checks,
  }
}
