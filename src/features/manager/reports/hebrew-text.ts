import bidiFactory from "bidi-js"

const bidi = bidiFactory()

/** Visual reorder for jsPDF (canvas draws LTR). */
export function shapeRtl(text: string): string {
  if (!text) return ""
  const embedding = bidi.getEmbeddingLevels(text, "rtl")
  const chars = Array.from(text)
  const flips = bidi.getReorderSegments(text, embedding)
  for (const range of flips) {
    const start = range[0]
    const end = range[1]
    if (start === undefined || end === undefined) continue
    const slice = chars.slice(start, end + 1).reverse()
    for (let i = 0; i < slice.length; i++) chars[start + i] = slice[i]!
  }
  return chars.join("")
}

export function pdfCell(text: string | number): string {
  return shapeRtl(String(text ?? ""))
}
