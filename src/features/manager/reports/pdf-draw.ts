import fontkit from "@pdf-lib/fontkit"
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import { loadHebrewFontBytes } from "@/features/manager/reports/pdf-font"
export const PAGE = { width: 595.28, height: 841.89 }
export const MARGIN = 40
export const COLORS = {
  ink: rgb(0.07, 0.09, 0.15),
  muted: rgb(0.35, 0.4, 0.48),
  line: rgb(0.82, 0.84, 0.86),
  header: rgb(0.9, 0.91, 0.925),
  band: rgb(0.95, 0.96, 0.97),
  alt: rgb(0.98, 0.98, 0.99),
}

export type PdfCtx = {
  doc: PDFDocument
  font: PDFFont
  fontBold: PDFFont
  latin: PDFFont
  latinBold: PDFFont
  page: PDFPage
  pageIndex: number
  y: number
}

type Run = { text: string; hebrew: boolean }

/** Split so Hebrew uses Noto and Latin/digits use Helvetica; spaces stay with the prior run. */
function splitRuns(text: string): Run[] {
  const runs: Run[] = []
  let current = ""
  let hebrew: boolean | null = null
  for (const char of text) {
    const isHebrew = /[\u0590-\u05FF]/.test(char)
    const isSpace = /\s/.test(char)
    if (hebrew === null) {
      hebrew = isHebrew
      current = char
      continue
    }
    if (isSpace || isHebrew === hebrew) {
      current += char
      continue
    }
    runs.push({ text: current, hebrew })
    current = char
    hebrew = isHebrew
  }
  if (current) runs.push({ text: current, hebrew: Boolean(hebrew) })
  return runs
}

export async function createHebrewPdf() {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const fonts = await loadHebrewFontBytes()
  const font = await doc.embedFont(fonts.regular, { subset: false })
  const fontBold = await doc.embedFont(fonts.bold, { subset: false })
  const latin = await doc.embedFont(StandardFonts.Helvetica)
  const latinBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const page = doc.addPage([PAGE.width, PAGE.height])
  return { doc, font, fontBold, latin, latinBold, page, pageIndex: 0, y: PAGE.height - MARGIN } satisfies PdfCtx
}

export function ensureSpace(ctx: PdfCtx, needed: number) {
  if (ctx.y - needed >= MARGIN + 24) return
  ctx.page = ctx.doc.addPage([PAGE.width, PAGE.height])
  ctx.pageIndex += 1
  ctx.y = PAGE.height - MARGIN
}

export function finalizePages(ctx: PdfCtx) {
  const pages = ctx.doc.getPages()
  pages.forEach((page, index) => {
    const label = `עמוד ${index + 1} מתוך ${pages.length}`
    const width = measureMixed(ctx, label, 8, false)
    drawMixedAt(ctx, page, label, PAGE.width / 2 - width / 2, 18, 8, false)
  })
}

function fontFor(ctx: PdfCtx, hebrew: boolean, bold: boolean) {
  if (hebrew) return bold ? ctx.fontBold : ctx.font
  return bold ? ctx.latinBold : ctx.latin
}

/**
 * Paint logical runs right→left so the first logical segment sits nearest the
 * right margin (RTL line layout) while each run’s glyphs stay in readable order.
 */
function measureMixed(ctx: PdfCtx, text: string, size: number, bold: boolean) {
  return splitRuns(text).reduce((sum, run) => {
    return sum + fontFor(ctx, run.hebrew, bold).widthOfTextAtSize(run.text, size)
  }, 0)
}

function drawMixedAt(
  ctx: PdfCtx,
  page: PDFPage,
  text: string,
  xLeft: number,
  y: number,
  size: number,
  bold: boolean
) {
  const runs = splitRuns(text)
  const widths = runs.map((run) => fontFor(ctx, run.hebrew, bold).widthOfTextAtSize(run.text, size))
  const total = widths.reduce((sum, w) => sum + w, 0)
  let x = xLeft + total
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i]!
    const width = widths[i]!
    x -= width
    const font = fontFor(ctx, run.hebrew, bold)
    page.drawText(run.text, { x, y, size, font, color: COLORS.ink })
  }
}

export function drawRightText(
  ctx: PdfCtx,
  text: string,
  xRight: number,
  y: number,
  size: number,
  bold = false
) {
  const width = measureMixed(ctx, text, size, bold)
  drawMixedAt(ctx, ctx.page, text, xRight - width, y, size, bold)
  return width
}

export function drawHeaderBand(ctx: PdfCtx, title: string, subtitle: string) {
  ctx.page.drawRectangle({
    x: 0,
    y: PAGE.height - 72,
    width: PAGE.width,
    height: 72,
    color: COLORS.band,
  })
  drawRightText(ctx, title, PAGE.width - MARGIN, PAGE.height - 36, 16, true)
  drawRightText(ctx, subtitle, PAGE.width - MARGIN, PAGE.height - 56, 10, false)
  ctx.y = PAGE.height - 88
}

export function drawMetaLines(ctx: PdfCtx, lines: string[]) {
  for (const line of lines) {
    ensureSpace(ctx, 14)
    drawRightText(ctx, line, PAGE.width - MARGIN, ctx.y, 9, false)
    ctx.y -= 14
  }
  ctx.y -= 6
}

export function drawSectionTitle(ctx: PdfCtx, title: string) {
  ensureSpace(ctx, 28)
  drawRightText(ctx, title, PAGE.width - MARGIN, ctx.y, 12, true)
  ctx.y -= 18
}

export type TableColumn = { key: string; label: string; width: number }

export function drawTable(
  ctx: PdfCtx,
  columns: TableColumn[],
  rows: Record<string, string>[],
  options?: { emptyText?: string }
) {
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0)
  const startX = PAGE.width - MARGIN - totalWidth
  const rowHeight = 18
  const headerHeight = 20

  const paintHeader = () => {
    ensureSpace(ctx, headerHeight + 8)
    ctx.page.drawRectangle({
      x: startX,
      y: ctx.y - headerHeight + 4,
      width: totalWidth,
      height: headerHeight,
      color: COLORS.header,
    })
    let x = PAGE.width - MARGIN
    for (const col of columns) {
      x -= col.width
      const width = measureMixed(ctx, col.label, 8, true)
      drawMixedAt(ctx, ctx.page, col.label, x + col.width - 4 - width, ctx.y - 10, 8, true)
    }
    ctx.y -= headerHeight
  }

  paintHeader()

  const body = rows.length
    ? rows
    : [{ [columns[0]!.key]: options?.emptyText ?? "אין נתונים" }]

  body.forEach((row, index) => {
    if (ctx.y - rowHeight < MARGIN + 28) {
      ctx.page = ctx.doc.addPage([PAGE.width, PAGE.height])
      ctx.pageIndex += 1
      ctx.y = PAGE.height - MARGIN
      paintHeader()
    }
    if (index % 2 === 1) {
      ctx.page.drawRectangle({
        x: startX,
        y: ctx.y - rowHeight + 4,
        width: totalWidth,
        height: rowHeight,
        color: COLORS.alt,
      })
    }
    ctx.page.drawRectangle({
      x: startX,
      y: ctx.y - rowHeight + 4,
      width: totalWidth,
      height: rowHeight,
      borderColor: COLORS.line,
      borderWidth: 0.4,
    })
    let x = PAGE.width - MARGIN
    for (const col of columns) {
      x -= col.width
      let value = row[col.key] ?? ""
      const size = 7.5
      while (value.length > 1 && measureMixed(ctx, value, size, false) > col.width - 6) {
        value = value.slice(0, -1)
      }
      if (value !== (row[col.key] ?? "")) value = `${value}…`
      const width = measureMixed(ctx, value, size, false)
      drawMixedAt(ctx, ctx.page, value, x + col.width - 3 - width, ctx.y - 10, size, false)
    }
    ctx.y -= rowHeight
  })
  ctx.y -= 10
}

export async function pdfBytes(ctx: PdfCtx) {
  finalizePages(ctx)
  return ctx.doc.save()
}
