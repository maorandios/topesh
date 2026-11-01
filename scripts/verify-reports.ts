import assert from "node:assert/strict"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import {
  buildReport,
  emptyReportFilters,
  executionTotalsMatch,
  resolveFilterLabels,
  validateReportDates,
} from "@/data/reports"
import { getManagerDiary } from "@/data/manager"
import { createSeed } from "@/data/seed"
import { buildReportExcelBuffer } from "@/features/manager/reports/export-excel"
import { buildReportPdfBytes } from "@/features/manager/reports/export-pdf"
import { seedHebrewFontBytes } from "@/features/manager/reports/pdf-font"

const outDir = path.join(process.cwd(), "tmp", "reports")
mkdirSync(outDir, { recursive: true })

const regular = readFileSync(path.join(process.cwd(), "public/fonts/NotoSansHebrew-Regular.ttf"))
const bold = readFileSync(path.join(process.cwd(), "public/fonts/NotoSansHebrew-Bold.ttf"))
seedHebrewFontBytes(regular, bold)

const db = createSeed()

assert.equal(validateReportDates("2026-10-20", "2026-10-10"), "range")
assert.equal(validateReportDates("2026-10-10", "2026-10-20"), null)

const customRange = buildReport(db, "workOrder", {
  ...emptyReportFilters(),
  from: "2026-10-15",
  to: "2026-10-30",
})
assert.ok(customRange.matchingDiaryCount > 0, "custom date range should match diaries")
assert.ok(customRange.summary.length > 0, "execution summary expected")
assert.ok(executionTotalsMatch(customRange.summary, customRange.details), "summary must equal details")

const byCustomer = buildReport(db, "site", {
  ...emptyReportFilters(),
  customerId: "customer-hadar",
})
assert.ok(byCustomer.diaries.every((diary) => diary.customerId === "customer-hadar"))
assert.ok(byCustomer.diaries.every((diary) => diary.status === "submitted"))

const bySite = buildReport(db, "components", {
  ...emptyReportFilters(),
  siteId: "site-sharon",
})
assert.ok(bySite.diaries.every((diary) => diary.siteId === "site-sharon"))

const byWorkOrder = buildReport(db, "workOrder", {
  ...emptyReportFilters(),
  workOrderNumber: "410",
})
assert.ok(byWorkOrder.matchingDiaryCount >= 1)
assert.ok(byWorkOrder.diaries.every((diary) => diary.workOrderNumber.includes("410")))

const combined = buildReport(db, "workOrder", {
  ...emptyReportFilters(),
  from: "2026-10-01",
  to: "2026-10-31",
  companyId: "company-secure-net",
  workOrderNumber: "WO-4101",
})
assert.equal(combined.matchingDiaryCount, 1)
assert.ok(executionTotalsMatch(combined.summary, combined.details))

const cleared = buildReport(db, "workOrder", emptyReportFilters())
assert.ok(cleared.matchingDiaryCount >= combined.matchingDiaryCount)

const diariesReport = buildReport(db, "diaries", {
  ...emptyReportFilters(),
  status: "pending",
})
assert.ok(diariesReport.diaries.every((diary) => diary.status === "pending"))
assert.equal(diariesReport.summary.length, 0)
assert.equal(diariesReport.details.length, 0)

const pendingExcluded = buildReport(db, "components", emptyReportFilters())
assert.ok(pendingExcluded.diaries.every((diary) => diary.status === "submitted"))
for (const diary of db.diaries.filter((item) => item.status === "pending")) {
  assert.ok(!pendingExcluded.details.some((row) => row.diaryId === diary.id))
}

const empty = buildReport(db, "workOrder", {
  ...emptyReportFilters(),
  workOrderNumber: "NO-SUCH-WO",
})
assert.equal(empty.matchingDiaryCount, 0)
assert.equal(empty.details.length, 0)

async function main() {
  const labels = resolveFilterLabels(db, combined.filters)
  const excelBuffer = await buildReportExcelBuffer(combined, labels)
  assert.ok(excelBuffer.byteLength > 1000, "xlsx should be a real binary workbook")
  const excelPath = path.join(outDir, "sample-work-order.xlsx")
  writeFileSync(excelPath, Buffer.from(excelBuffer))

  const pdfBytes = await buildReportPdfBytes(combined, labels)
  const pdfBuffer = Buffer.from(pdfBytes)
  assert.ok(pdfBuffer.subarray(0, 4).toString() === "%PDF", "pdf magic header")
  assert.ok(pdfBuffer.byteLength > 2000, "pdf should contain content")
  const pdfPath = path.join(outDir, "sample-work-order.pdf")
  writeFileSync(pdfPath, pdfBuffer)

  const diary = getManagerDiary(db, "diary-rich-azrieli")
  assert.ok(diary)

  console.log(
    JSON.stringify(
      {
        ok: true,
        customRangeDiaries: customRange.matchingDiaryCount,
        workOrderPartial: byWorkOrder.matchingDiaryCount,
        combinedSummary: combined.summary,
        combinedDetails: combined.details.length,
        pendingDiaries: diariesReport.matchingDiaryCount,
        emptyMatches: empty.matchingDiaryCount,
        excelPath,
        pdfPath,
        excelBytes: excelBuffer.byteLength,
        pdfBytes: pdfBuffer.byteLength,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
