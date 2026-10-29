const MAX_QUANTITY = 9999

export function parseQuantityInput(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".")
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(trimmed)) return null
  return normalizeQuantity(Number(trimmed))
}

export function normalizeQuantity(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0 || value > MAX_QUANTITY) return null
  const cents = Math.round(value * 100)
  const normalized = cents / 100
  if (Math.abs(normalized - value) > 1e-6) return null
  return normalized
}

export function addQuantities(left: number, right: number): number | null {
  const a = normalizeQuantity(left)
  const b = normalizeQuantity(right)
  if (a === null || b === null) return null
  return normalizeQuantity((Math.round(a * 100) + Math.round(b * 100)) / 100)
}
