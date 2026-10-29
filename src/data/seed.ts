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
  companies,
  company,
  components,
  customers,
  domains,
  sites,
  subSites,
  teamLeaders,
  users,
} from "@/data/catalog"

export type MockDb = {
  version: 7
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

const subSiteNames = [
  "קומה 1",
  "קומה 2",
  "חניון",
  "חדר משאבות",
  "בניין א",
  "בניין ב",
  "אגף מערבי",
  "אגף מזרחי",
  "גג מבנה",
  "חדר מכונות",
  "לובי ראשי",
  "מחסן טכני",
]

const projectNames = [
  "שדרוג גילוי אש",
  "התקנת מצלמות",
  "תחזוקה שוטפת",
  "התקנת גלאים",
  "בדיקות תקופתיות",
  "מערכת כריזה",
  "החלפת כבלים",
  "בקרת כניסה",
  "שדרוג רשת",
  "הרחבת מערכת",
]

const workerNames = [
  "יוסי לוי",
  "מאיה פרץ",
  "רועי דהן",
  "דנה שמש",
  "עמית כץ",
  "נועם אזולאי",
  "טל מזרחי",
  "הילה ברק",
  "אבישי גולן",
]

const richComponentSets = [
  [
    "fire-detector",
    "fire-button",
    "fire-cable",
    "cctv-dome",
    "cctv-cable",
    "pa-speaker",
    "access-reader",
    "net-cable",
  ],
  [
    "cctv-dome",
    "cctv-bullet",
    "cctv-cable",
    "net-switch",
    "net-cable",
    "access-lock",
    "pa-amp",
    "pa-cable",
  ],
  [
    "fire-detector",
    "fire-cable",
    "cctv-bullet",
    "pa-speaker",
    "pa-amp",
    "access-reader",
    "access-lock",
    "net-switch",
  ],
] as const

function padDate(dayOffset: number) {
  const base = Date.UTC(2026, 9, 29)
  const date = new Date(base - dayOffset * 24 * 60 * 60 * 1000)
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  const d = String(date.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function buildDemoBundle() {
  const diaries: WorkDiary[] = [
    {
      id: "diary-uri-floor",
      teamLeaderId: "dev-team-leader",
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
      cancelledAt: null,
    },
    {
      id: "diary-uri-parking",
      teamLeaderId: "dev-team-leader",
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
      cancelledAt: null,
    },
    {
      id: "diary-uri-pumps",
      teamLeaderId: "dev-team-leader",
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
      cancelledAt: null,
    },
    {
      id: "diary-uri-building",
      teamLeaderId: "dev-team-leader",
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
      cancelledAt: null,
    },
    {
      id: "diary-noa-pumps",
      teamLeaderId: "dev-team-leader-2",
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
      cancelledAt: null,
    },
    {
      id: "diary-noa-parking",
      teamLeaderId: "dev-team-leader-2",
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
      cancelledAt: null,
    },
  ]

  const richDiaries: WorkDiary[] = [
    {
      id: "diary-rich-azrieli",
      teamLeaderId: "dev-team-leader",
      workDate: "2026-10-30",
      companyId: "company-secure-net",
      customerId: "customer-hadar",
      siteId: "site-hadar",
      subSiteName: "קומה 12",
      projectName: "שדרוג מערכות משולב",
      workOrderNumber: "WO-4101",
      status: "submitted",
      notes: "התקנה מלאה במסדרון וחדרי שרתים.",
      createdAt: "2026-10-29T07:30:00.000Z",
      submittedAt: "2026-10-30T15:40:00.000Z",
      cancelledAt: null,
    },
    {
      id: "diary-rich-campus",
      teamLeaderId: "dev-team-leader-2",
      workDate: "2026-10-29",
      companyId: "company-fireline",
      customerId: "customer-sharon",
      siteId: "site-sharon",
      subSiteName: "בניין מעבדות",
      projectName: "פריסת אבטחה ותקשורת",
      workOrderNumber: "WO-4102",
      status: "submitted",
      notes: "בוצעו התקנות במקביל לשתי קומות.",
      createdAt: "2026-10-28T08:10:00.000Z",
      submittedAt: "2026-10-29T16:20:00.000Z",
      cancelledAt: null,
    },
    {
      id: "diary-rich-mall",
      teamLeaderId: teamLeaders[2]!.id,
      workDate: "2026-10-27",
      companyId: "company-vision",
      customerId: "customer-3",
      siteId: "site-3",
      subSiteName: "אולם אירועים",
      projectName: "התקנת כריזה ומצלמות",
      workOrderNumber: "WO-4103",
      status: "submitted",
      notes: "נדרשה עבודה בגובה באולם הראשי.",
      createdAt: "2026-10-26T09:00:00.000Z",
      submittedAt: "2026-10-27T14:55:00.000Z",
      cancelledAt: null,
    },
  ]

  diaries.push(...richDiaries)

  const workers: DiaryWorker[] = [
    { id: "worker-uri-1", diaryId: "diary-uri-building", fullName: "יוסי לוי" },
    { id: "worker-uri-2", diaryId: "diary-uri-building", fullName: "מאיה פרץ" },
    { id: "worker-noa-1", diaryId: "diary-noa-parking", fullName: "רועי דהן" },
    { id: "worker-rich-azrieli-1", diaryId: "diary-rich-azrieli", fullName: "דנה שמש" },
    { id: "worker-rich-azrieli-2", diaryId: "diary-rich-azrieli", fullName: "עמית כץ" },
    { id: "worker-rich-azrieli-3", diaryId: "diary-rich-azrieli", fullName: "טל מזרחי" },
    { id: "worker-rich-campus-1", diaryId: "diary-rich-campus", fullName: "נועם אזולאי" },
    { id: "worker-rich-campus-2", diaryId: "diary-rich-campus", fullName: "הילה ברק" },
    { id: "worker-rich-campus-3", diaryId: "diary-rich-campus", fullName: "יוסי לוי" },
    { id: "worker-rich-mall-1", diaryId: "diary-rich-mall", fullName: "אבישי גולן" },
    { id: "worker-rich-mall-2", diaryId: "diary-rich-mall", fullName: "רועי דהן" },
    { id: "worker-rich-mall-3", diaryId: "diary-rich-mall", fullName: "מאיה פרץ" },
  ]
  const items: DiaryItem[] = [
    { id: "item-uri-1", diaryId: "diary-uri-building", componentId: "fire-detector", quantity: 12 },
    { id: "item-uri-2", diaryId: "diary-uri-building", componentId: "cctv-cable", quantity: 40.5 },
    { id: "item-noa-1", diaryId: "diary-noa-parking", componentId: "pa-speaker", quantity: 6 },
  ]

  richComponentSets.forEach((set, diaryIndex) => {
    const diaryId = richDiaries[diaryIndex]!.id
    set.forEach((componentId, itemIndex) => {
      items.push({
        id: `item-${diaryId}-${itemIndex + 1}`,
        diaryId,
        componentId,
        quantity: 2 + itemIndex * 3 + (itemIndex % 2 === 0 ? 0.5 : 0),
      })
    })
  })

  const checks: DiaryCheckbox[] = [
    {
      id: "diary-uri-building:check-height",
      diaryId: "diary-uri-building",
      checkboxId: "check-height",
      checked: true,
    },
    {
      id: "diary-rich-azrieli:check-height",
      diaryId: "diary-rich-azrieli",
      checkboxId: "check-height",
      checked: true,
    },
    {
      id: "diary-rich-azrieli:check-hot",
      diaryId: "diary-rich-azrieli",
      checkboxId: "check-hot",
      checked: true,
    },
    {
      id: "diary-rich-campus:check-night",
      diaryId: "diary-rich-campus",
      checkboxId: "check-night",
      checked: true,
    },
    {
      id: "diary-rich-mall:check-height",
      diaryId: "diary-rich-mall",
      checkboxId: "check-height",
      checked: true,
    },
    {
      id: "diary-rich-mall:check-confined",
      diaryId: "diary-rich-mall",
      checkboxId: "check-confined",
      checked: true,
    },
  ]

  const componentIds = components.map((item) => item.id)

  const extraLeaders = teamLeaders.slice(2)
  for (let index = 6; index < 50; index += 1) {
    const leader = extraLeaders[(index - 6) % extraLeaders.length]!
    const customer = customers[index % customers.length]!
    const site = sites[index % sites.length]!
    const companyRow = companies[index % companies.length]!
    const status: WorkDiary["status"] =
      index % 11 === 0 ? "cancelled" : index % 3 === 0 ? "submitted" : "pending"
    const workDate = padDate(index % 40)
    const createdDay = padDate((index % 40) + 1)
    const id = `diary-demo-${index + 1}`

    diaries.push({
      id,
      teamLeaderId: leader.id,
      workDate,
      companyId: companyRow.id,
      customerId: customer.id,
      siteId: site.id,
      subSiteName: subSiteNames[index % subSiteNames.length]!,
      projectName: projectNames[index % projectNames.length]!,
      workOrderNumber: `WO-${3000 + index}`,
      status,
      notes: status === "submitted" ? "בוצע לפי תוכנית העבודה." : "",
      createdAt: `${createdDay}T08:${String(index % 60).padStart(2, "0")}:00.000Z`,
      submittedAt: status === "submitted" ? `${workDate}T16:00:00.000Z` : null,
      cancelledAt: status === "cancelled" ? `${workDate}T11:00:00.000Z` : null,
    })

    if (status === "submitted") {
      const workerCount = 1 + (index % 3)
      for (let w = 0; w < workerCount; w += 1) {
        workers.push({
          id: `worker-${id}-${w + 1}`,
          diaryId: id,
          fullName: workerNames[(index + w) % workerNames.length]!,
        })
      }
      const itemCount = 1 + (index % 3)
      for (let i = 0; i < itemCount; i += 1) {
        items.push({
          id: `item-${id}-${i + 1}`,
          diaryId: id,
          componentId: componentIds[(index + i) % componentIds.length]!,
          quantity: ((index + 1) * (i + 1)) % 40 + 1 + (i === 1 ? 0.5 : 0),
        })
      }
      if (index % 2 === 0) {
        checks.push({
          id: `${id}:check-height`,
          diaryId: id,
          checkboxId: "check-height",
          checked: true,
        })
      }
      if (index % 3 === 0) {
        checks.push({
          id: `${id}:check-night`,
          diaryId: id,
          checkboxId: "check-night",
          checked: true,
        })
      }
    }
  }

  return { diaries, workers, items, checks }
}

export function createSeed(): MockDb {
  const { diaries, workers, items, checks } = buildDemoBundle()
  return {
    version: 7,
    companies,
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
