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

/** Bold Hebrew label on the right, regular value to its left — avoids RTL/digit collisions. */
export function drawLabelValue(
  ctx: PdfCtx,
  label: string,
  value: string,
  xRight: number,
  y: number,
  size = 9
) {
  const labelText = `${label}:`
  const labelWidth = measureMixed(ctx, labelText, size, true)
  const gap = 8
  const valueWidth = measureMixed(ctx, value, size, false)
  // Reserve a stable label column so digits never collide into Hebrew labels.
  const labelColumn = Math.max(labelWidth, size * 7)
  drawMixedAt(ctx, ctx.page, labelText, xRight - labelWidth, y, size, true)
  drawMixedAt(
    ctx,
    ctx.page,
    value,
    xRight - labelColumn - gap - valueWidth,
    y,
    size,
    false
  )
}

export function drawHairline(ctx: PdfCtx, strong = false) {
  ensureSpace(ctx, 10)
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y + 4 },
    end: { x: PAGE.width - MARGIN, y: ctx.y + 4 },
    thickness: strong ? 0.9 : 0.45,
    color: strong ? COLORS.ink : COLORS.line,
  })
  ctx.y -= 12
}

/**
 * Two-column definition grid: label above value, full page width.
 * First field in each pair sits on the right (RTL).
 */
export function drawFieldGrid(
  ctx: PdfCtx,
  fields: { label: string; value: string }[],
  options?: { columns?: 1 | 2 }
) {
  const columns = options?.columns ?? 2
  const colGap = 16
  const contentWidth = PAGE.width - MARGIN * 2
  const colWidth = (contentWidth - colGap * (columns - 1)) / columns
  const blockHeight = 30

  for (let i = 0; i < fields.length; i += columns) {
    ensureSpace(ctx, blockHeight + 6)
    const top = ctx.y
    for (let c = 0; c < columns; c++) {
      const field = fields[i + c]
      if (!field) continue
      const colRight = PAGE.width - MARGIN - c * (colWidth + colGap)
      drawRightText(ctx, field.label, colRight, top, 7.5, true)
      let value = field.value || "—"
      while (value.length > 1 && measureMixed(ctx, value, 9.5, false) > colWidth - 2) {
        value = value.slice(0, -1)
      }
      if (value !== (field.value || "—")) value = `${value}…`
      drawRightText(ctx, value, colRight, top - 13, 9.5, false)
    }
    ctx.y = top - blockHeight
    ctx.page.drawLine({
      start: { x: MARGIN, y: ctx.y + 8 },
      end: { x: PAGE.width - MARGIN, y: ctx.y + 8 },
      thickness: 0.4,
      color: COLORS.line,
    })
    ctx.y -= 2
  }
}

/** Clean company document header: title, subtitle, hairline, meta grid. */
export function drawDocumentHeader(
  ctx: PdfCtx,
  options: {
    title: string
    subtitle: string
    meta: { label: string; value: string }[]
  }
) {
  drawRightText(ctx, options.title, PAGE.width - MARGIN, ctx.y, 18, true)
  ctx.y -= 22
  drawRightText(ctx, options.subtitle, PAGE.width - MARGIN, ctx.y, 12, true)
  ctx.y -= 14
  drawHairline(ctx, true)
  if (options.meta.length > 0) {
    drawFieldGrid(ctx, options.meta, { columns: Math.min(2, options.meta.length) as 1 | 2 })
    ctx.y -= 4
  }
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
  ensureSpace(ctx, 42)
  ctx.y -= 10
  drawRightText(ctx, title, PAGE.width - MARGIN, ctx.y, 11, true)
  ctx.y -= 8
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y + 2 },
    end: { x: PAGE.width - MARGIN, y: ctx.y + 2 },
    thickness: 0.7,
    color: COLORS.ink,
  })
  ctx.y -= 14
}

export type TableColumn = { key: string; label: string; width: number }

function tableTextBaseline(cursorY: number, rowHeight: number, size: number) {
  // Cell top is cursorY + 4; center text optically within the row.
  return cursorY + 4 - rowHeight / 2 - size * 0.32
}

export function drawTable(
  ctx: PdfCtx,
  columns: TableColumn[],
  rows: Record<string, string>[],
  options?: { emptyText?: string; fitPageWidth?: boolean }
) {
  const available = PAGE.width - MARGIN * 2
  const baseWidth = columns.reduce((sum, col) => sum + col.width, 0)
  const scale = options?.fitPageWidth && baseWidth > 0 ? available / baseWidth : 1
  const cols = columns.map((col) => ({ ...col, width: col.width * scale }))
  const totalWidth = options?.fitPageWidth ? available : baseWidth
  const startX = PAGE.width - MARGIN - totalWidth
  const rowHeight = 24
  const headerHeight = 26
  const headerSize = 8
  const bodySize = 8

  const paintHeader = () => {
    ensureSpace(ctx, headerHeight + 8)
    ctx.page.drawRectangle({
      x: startX,
      y: ctx.y - headerHeight + 4,
      width: totalWidth,
      height: headerHeight,
      color: COLORS.header,
    })
    const textY = tableTextBaseline(ctx.y, headerHeight, headerSize)
    let x = PAGE.width - MARGIN
    for (const col of cols) {
      x -= col.width
      const width = measureMixed(ctx, col.label, headerSize, true)
      drawMixedAt(ctx, ctx.page, col.label, x + col.width - 4 - width, textY, headerSize, true)
    }
    ctx.y -= headerHeight
  }

  paintHeader()

  const body = rows.length
    ? rows
    : [{ [cols[0]!.key]: options?.emptyText ?? "אין נתונים" }]

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
    const textY = tableTextBaseline(ctx.y, rowHeight, bodySize)
    let x = PAGE.width - MARGIN
    for (const col of cols) {
      x -= col.width
      let value = row[col.key] ?? ""
      while (value.length > 1 && measureMixed(ctx, value, bodySize, false) > col.width - 6) {
        value = value.slice(0, -1)
      }
      if (value !== (row[col.key] ?? "")) value = `${value}…`
      const width = measureMixed(ctx, value, bodySize, false)
      drawMixedAt(ctx, ctx.page, value, x + col.width - 3 - width, textY, bodySize, false)
    }
    ctx.y -= rowHeight
  })
  ctx.y -= 12
}

export async function pdfBytes(ctx: PdfCtx) {
  finalizePages(ctx)
  return ctx.doc.save()
}
