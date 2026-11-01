type FontBytes = ArrayBuffer | Uint8Array

let regularCache: FontBytes | null = null
let boldCache: FontBytes | null = null

export function seedHebrewFontBytes(regular: FontBytes, bold: FontBytes) {
  regularCache = regular
  boldCache = bold
}

async function loadFontBytes(path: string): Promise<ArrayBuffer> {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`Failed to load font: ${path}`)
  return response.arrayBuffer()
}

export async function loadHebrewFontBytes() {
  if (!regularCache) regularCache = await loadFontBytes("/fonts/NotoSansHebrew-Regular.ttf")
  if (!boldCache) boldCache = await loadFontBytes("/fonts/NotoSansHebrew-Bold.ttf")
  return { regular: regularCache, bold: boldCache }
}
