import ExcelJS from "exceljs"

async function main() {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile("tmp/reports/sample-work-order.xlsx")
  console.log(
    wb.worksheets.map((sheet) => ({
      name: sheet.name,
      rtl: sheet.views?.[0]?.rightToLeft,
      rows: sheet.rowCount,
    }))
  )
  const summary = wb.getWorksheet("סיכום ביצוע")
  if (!summary) throw new Error("missing summary sheet")
  const rows: unknown[] = []
  summary.eachRow((row, index) => {
    if (index >= 15) rows.push(row.values)
  })
  console.log(JSON.stringify(rows.slice(0, 6), null, 2))
}

main()
