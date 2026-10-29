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
}

export type Customer = {
  id: string
  companyId: string
  name: string
}

export type Site = {
  id: string
  customerId: string
  name: string
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
  siteId: string
  subSiteId: string
  workOrderNumber: string
  status: DiaryStatus
  notes: string
  createdAt: string
  submittedAt: string | null
}

/** Team-leader views must not include the work order number. */
export type TeamLeaderDiary = Omit<WorkDiary, "workOrderNumber">

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
