import puppeteer from "puppeteer-core"

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--lang=he"],
})
const page = await browser.newPage()
page.setDefaultTimeout(20000)
try {
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" })
  await page.waitForFunction(() => document.body.innerText.includes("דנה אלמוג"))
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 600)))
  await page.evaluate(() => {
    ;[...document.querySelectorAll("button")].find((node) => node.textContent?.includes("דנה אלמוג"))?.click()
  })
  await page.waitForFunction(() => location.pathname.startsWith("/manager"))
  await page.waitForFunction(() => document.body.innerText.includes("השבוע"))
  const labels = await page.evaluate(() => document.body.innerText)
  for (const expected of ["היום", "השבוע", "החודש", "ממתינים לדיווח", "הוגשו", "שכפול"]) {
    if (!labels.includes(expected)) throw new Error(`Missing ${expected}`)
  }
  const headers = await page.evaluate(() => [...document.querySelectorAll("th")].map((node) => node.textContent?.trim()))
  if (headers.includes("צפייה")) throw new Error("View column is still present")
  if (!headers.includes("שכפול")) throw new Error("Duplicate column is missing")
  const before = await page.evaluate(() => document.querySelectorAll("tbody tr").length)
  await page.evaluate(() => {
    const cell = document.querySelector("tbody td")
    if (cell instanceof HTMLElement) cell.click()
  })
  await page.waitForSelector("[data-slot='sheet-content'][data-side='left']")
  await page.evaluate(() => document.querySelector("[data-slot='sheet-close']")?.dispatchEvent(new MouseEvent("click", { bubbles: true })))
  await page.evaluate(() => document.querySelector("tbody button")?.click())
  await page.waitForFunction((count) => document.querySelectorAll("tbody tr").length > count, {}, before)

  await page.setViewport({ width: 390, height: 844 })
  await page.evaluate(() => {
    ;[...document.querySelectorAll("button")].find((node) => node.textContent?.includes("קומה") || node.textContent?.includes("חניון") || node.textContent?.includes("בניין"))?.click()
  })
  await page.waitForSelector("[data-slot='drawer-popup']")
  console.log("dashboard interactions ok")
} catch (error) {
  const text = await page.evaluate(() => document.body?.innerText?.slice(0, 700) ?? "")
  console.log("PAGE", text)
  console.log("URL", page.url())
  throw error
} finally {
  await browser.close()
}
