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

export const companies: Company[] = [
  company,
  { id: "company-secure-net", name: "סקיוור-נט בע״מ", isActive: true },
  { id: "company-fireline", name: "פיירליין התקנות", isActive: true },
  { id: "company-vision", name: "ויז׳ן מערכות אבטחה", isActive: true },
  { id: "company-audio-pro", name: "אודיו פרו כריזה", isActive: true },
]

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

const leaderNames = [
  "יוסי לוי",
  "מאיה פרץ",
  "רועי דהן",
  "שירה כהן",
  "איתי מזרחי",
  "הדר אברהם",
  "ניר בן דוד",
  "תמר אשכנזי",
  "גיל סלע",
  "ליאור חן",
  "עדי שמעון",
  "ברק נחום",
  "קרן פלד",
  "אלון גבאי",
  "מיכל רוזן",
  "דניאל שטרן",
  "רותם קליין",
  "אופיר ברק",
]

export const teamLeaders: User[] = [
  uriUser,
  noaUser,
  ...leaderNames.map((fullName, index) => {
    const n = index + 3
    return {
      id: `dev-team-leader-${n}`,
      fullName,
      identityNumber: String(100000000 + n).slice(0, 9),
      phone: `05${n % 5}0-${String(1000000 + n * 137).slice(-7)}`,
      email: null,
      companyId: "",
      role: "teamLeader" as const,
      isActive: true,
    }
  }),
]

export const managers: User[] = [
  managerUser,
  managerUser2,
  {
    id: "dev-manager-3",
    fullName: "אמיר לוין",
    identityNumber: "",
    phone: null,
    email: "amir.levin@example.test",
    companyId: "",
    role: "manager",
    isActive: true,
  },
]

export const users: User[] = [...managers, ...teamLeaders]

const customerNames = [
  "קניון הדר",
  "בית חולים השרון",
  "עיריית פתח תקווה",
  "קניון עזריאלי",
  "בית מלון דן",
  "מגדלי עזריאלי",
  "קניון רמת אביב",
  "בית חולים איכילוב",
  "אוניברסיטת תל אביב",
  "נמל אשדוד",
  "שדה התעופה בן גוריון",
  "קניון באר שבע",
  "משרד הביטחון",
  "בית המשפט המחוזי",
  "קניון חוצות המפרץ",
  "מגדל משה אביב",
  "קניון הגלילות",
  "בית חולים שיבא",
  "טכניון חיפה",
  "קניון לב חדרה",
]

export const customers: Customer[] = customerNames.map((name, index) => ({
  id: index === 0 ? "customer-hadar" : index === 1 ? "customer-sharon" : `customer-${index + 1}`,
  companyId: "",
  name,
  isActive: true,
}))

const sitePrefixes = [
  "קניון",
  "מגדל",
  "בניין",
  "מתחם",
  "חניון",
  "אגף",
  "מרכז",
  "קומפלקס",
]

const sitePlaces = [
  "הדר",
  "השרון",
  "עזריאלי",
  "רמת אביב",
  "איכילוב",
  "בן גוריון",
  "הגלילות",
  "שיבא",
  "לב חדרה",
  "המפרץ",
  "הטכניון",
  "האוניברסיטה",
  "הנמל",
  "המשרדים",
  "הצפון",
  "הדרום",
  "המזרח",
  "המערב",
  "המרכז",
  "התעשייה",
]

export const sites: Site[] = Array.from({ length: 50 }, (_, index) => {
  if (index === 0) return { id: "site-hadar", customerId: "", name: "קניון הדר", isActive: true }
  if (index === 1) return { id: "site-sharon", customerId: "", name: "בית חולים השרון", isActive: true }
  const prefix = sitePrefixes[index % sitePrefixes.length]
  const place = sitePlaces[index % sitePlaces.length]
  const suffix = index > 20 ? ` ${Math.floor(index / 10)}` : ""
  return {
    id: `site-${index + 1}`,
    customerId: "",
    name: `${prefix} ${place}${suffix}`.trim(),
    isActive: true,
  }
})

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
  { id: "domain-access", name: "בקרת כניסה", isActive: true },
  { id: "domain-network", name: "תקשורת", isActive: true },
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
  { id: "access-reader", domainId: "domain-access", name: "קורא כרטיסים", unit: "יח׳", isActive: true },
  { id: "access-lock", domainId: "domain-access", name: "מנעול חשמלי", unit: "יח׳", isActive: true },
  { id: "net-switch", domainId: "domain-network", name: "מתג רשת", unit: "יח׳", isActive: true },
  { id: "net-cable", domainId: "domain-network", name: "כבל תקשורת", unit: "מ׳", isActive: true },
]

export const checkboxDefinitions: CheckboxDefinition[] = [
  { id: "check-height", label: "עבודה בגובה", sortOrder: 1, isActive: true },
  { id: "check-night", label: "עבודת לילה", sortOrder: 2, isActive: true },
  { id: "check-hot", label: "עבודה חמה", sortOrder: 3, isActive: true },
  { id: "check-confined", label: "חלל מוקף", sortOrder: 4, isActive: true },
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
