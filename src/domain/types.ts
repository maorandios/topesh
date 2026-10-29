/**
 * Domain entities for the work diary.
 * Several diaries may share the same teamLeaderId and workDate.
 * Leader screens read a mapped payload that omits workOrderNumber.
 */

export type Role = "manager" | "teamLeader"

export type DiaryStatus = "pending" | "submitted" | "cancelled"

export type Company = {
  id: string
  name: string
  isActive: boolean
  createdAt: string
}

export type Customer = {
  id: string
  /** Legacy optional link; new customers are name-only. */
  companyId: string
  name: string
  isActive: boolean
  createdAt: string
}

export type Site = {
  id: string
  /** Legacy optional link; new sites are name-only. */
  customerId: string
  name: string
  isActive: boolean
  createdAt: string
}

export type SubSite = {
  id: string
  siteId: string
  name: string
}

export type User = {
  id: string
  fullName: string
  identityNumber: string
  phone: string | null
  email: string | null
  companyId: string
  role: Role
  isActive: boolean
}

export type Domain = {
  id: string
  name: string
  isActive: boolean
}

export type ComponentItem = {
  id: string
  domainId: string
  name: string
  unit: string
  isActive: boolean
}

export type WorkDiary = {
  id: string
  teamLeaderId: string
  workDate: string
  companyId: string
  customerId: string
  siteId: string
  subSiteName: string
  projectName: string
  workOrderNumber: string
  status: DiaryStatus
  notes: string
  createdAt: string
  submittedAt: string | null
  cancelledAt: string | null
}

/** Team-leader views omit work-order and org assignment IDs. */
export type TeamLeaderDiary = Omit<WorkDiary, "workOrderNumber" | "companyId" | "customerId">

export type DiaryWorker = {
  id: string
  diaryId: string
  fullName: string
}

export type DiaryItem = {
  id: string
  diaryId: string
  componentId: string
  quantity: number
}

export type CheckboxDefinition = {
  id: string
  label: string
  sortOrder: number
  isActive: boolean
}

export type DiaryCheckbox = {
  id: string
  diaryId: string
  checkboxId: string
  checked: boolean
}
