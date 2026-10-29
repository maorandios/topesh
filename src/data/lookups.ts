import type { MockDb } from "@/data/seed"

export function activeDomainsFrom(db: MockDb) {
  return db.domains
    .filter((domain) => domain.isActive)
    .map((domain) => ({
      ...domain,
      components: db.components.filter(
        (item) => item.domainId === domain.id && item.isActive
      ),
    }))
}

export function findCompany(db: MockDb, id: string) {
  return db.companies.find((item) => item.id === id) ?? null
}

export function findCustomer(db: MockDb, id: string) {
  return db.customers.find((item) => item.id === id) ?? null
}

export function findSite(db: MockDb, id: string) {
  return db.sites.find((item) => item.id === id) ?? null
}

export function findSubSite(db: MockDb, id: string) {
  return db.subSites.find((item) => item.id === id) ?? null
}

export function findDomain(db: MockDb, id: string) {
  return db.domains.find((item) => item.id === id) ?? null
}

export function findComponent(db: MockDb, id: string) {
  return db.components.find((item) => item.id === id) ?? null
}

export function findUser(db: MockDb, id: string) {
  return db.users.find((item) => item.id === id) ?? null
}
