import type {
  CheckboxDefinition,
  Company,
  ComponentItem,
  Customer,
  Domain,
  Site,
  SubSite,
  User,
} from "@/domain/types"

export const company: Company = {
  id: "company-or-tech",
  name: "אור-טק מערכות בע״מ",
  isActive: true,
}

export const managerUser: User = {
  id: "dev-manager",
  fullName: "דנה אלמוג",
  identityNumber: "",
  phone: null,
  email: "manager@example.test",
  companyId: "",
  role: "manager",
  isActive: true,
}

export const uriUser: User = {
  id: "dev-team-leader",
  fullName: "אורי בדיקה",
  identityNumber: "000000000",
  phone: "050-0000000",
  email: null,
  companyId: "",
  role: "teamLeader",
  isActive: true,
}

export const noaUser: User = {
  id: "dev-team-leader-2",
  fullName: "נועה שגיא",
  identityNumber: "000000001",
  phone: "052-0000000",
  email: null,
  companyId: "",
  role: "teamLeader",
  isActive: true,
}

export const managerUser2: User = {
  id: "dev-manager-2",
  fullName: "יעל כהן",
  identityNumber: "",
  phone: null,
  email: "manager2@example.test",
  companyId: "",
  role: "manager",
  isActive: true,
}

export const users: User[] = [managerUser, managerUser2, uriUser, noaUser]

export const customers: Customer[] = [
  { id: "customer-hadar", companyId: "", name: "קניון הדר", isActive: true },
  { id: "customer-sharon", companyId: "", name: "בית חולים השרון", isActive: true },
]

export const sites: Site[] = [
  { id: "site-hadar", customerId: "", name: "קניון הדר", isActive: true },
  { id: "site-sharon", customerId: "", name: "בית חולים השרון", isActive: true },
]

export const subSites: SubSite[] = [
  { id: "subsite-hadar-floor", siteId: "site-hadar", name: "קומה 1" },
  { id: "subsite-hadar-parking", siteId: "site-hadar", name: "חניון" },
  { id: "subsite-sharon-a", siteId: "site-sharon", name: "בניין א" },
  { id: "subsite-sharon-pumps", siteId: "site-sharon", name: "חדר משאבות" },
]

export const domains: Domain[] = [
  { id: "domain-fire", name: "גילוי אש", isActive: true },
  { id: "domain-cctv", name: "מצלמות", isActive: true },
  { id: "domain-pa", name: "כריזה", isActive: true },
]

export const components: ComponentItem[] = [
  { id: "fire-detector", domainId: "domain-fire", name: "גלאי עשן", unit: "יח׳", isActive: true },
  { id: "fire-button", domainId: "domain-fire", name: "לחצן אזעקה", unit: "יח׳", isActive: true },
  { id: "fire-cable", domainId: "domain-fire", name: "כבל גילוי", unit: "מ׳", isActive: true },
  { id: "cctv-dome", domainId: "domain-cctv", name: "מצלמת כיפה", unit: "יח׳", isActive: true },
  { id: "cctv-bullet", domainId: "domain-cctv", name: "מצלמת צינור", unit: "יח׳", isActive: true },
  { id: "cctv-cable", domainId: "domain-cctv", name: "כבל רשת", unit: "מ׳", isActive: true },
  { id: "pa-speaker", domainId: "domain-pa", name: "רמקול תקרה", unit: "יח׳", isActive: true },
  { id: "pa-amp", domainId: "domain-pa", name: "מגבר", unit: "יח׳", isActive: true },
  { id: "pa-cable", domainId: "domain-pa", name: "כבל רמקול", unit: "מ׳", isActive: true },
]

export const checkboxDefinitions: CheckboxDefinition[] = [
  { id: "check-height", label: "עבודה בגובה", sortOrder: 1, isActive: true },
  { id: "check-night", label: "עבודת לילה", sortOrder: 2, isActive: true },
]

export function activeDomains() {
  return domains
    .filter((domain) => domain.isActive)
    .map((domain) => ({
      ...domain,
      components: components.filter(
        (item) => item.domainId === domain.id && item.isActive
      ),
    }))
}

export function findComponent(componentId: string) {
  return components.find((item) => item.id === componentId) ?? null
}

export function findDomain(domainId: string) {
  return domains.find((domain) => domain.id === domainId) ?? null
}

export function findSite(siteId: string) {
  return sites.find((site) => site.id === siteId) ?? null
}

export function findSubSite(subSiteId: string) {
  return subSites.find((subSite) => subSite.id === subSiteId) ?? null
}
