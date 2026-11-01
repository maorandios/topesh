/** Hebrew alphabetical order for labels and entity names. */
export function compareHebrew(a: string, b: string) {
  return a.localeCompare(b, "he")
}

export function sortByHebrewName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => compareHebrew(a.name, b.name))
}

export function sortSelectOptions<T extends { label: string }>(options: T[]): T[] {
  return [...options].sort((a, b) => compareHebrew(a.label, b.label))
}
