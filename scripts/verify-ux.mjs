import puppeteer from "puppeteer-core"
import { mkdir } from "node:fs/promises"

const out = "C:\\TOPESH\\tmp-ux"
await mkdir(out, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--lang=he"],
})
const page = await browser.newPage()
page.setDefaultTimeout(15000)
page.setDefaultNavigationTimeout(20000)
const errors = []
page.on("pageerror", (error) => errors.push(String(error)))

async function open(url) {
  await page.goto(url, { waitUntil: "networkidle2" })
}

async function clickLabel(label) {
  const clicked = await page.evaluate((wanted) => {
    const dialog = document.querySelector("[data-slot='drawer-popup'], [data-slot='dialog-content']")
    const root = dialog ?? document
    const nodes = [...root.querySelectorAll("button, a")].filter((node) => node.textContent?.includes(wanted))
    nodes.sort((a, b) => (a.textContent?.length ?? 0) - (b.textContent?.length ?? 0))
    const node = nodes[0]
    if (!(node instanceof HTMLElement)) return false
    node.click()
    return true
  }, label)
  if (!clicked) throw new Error(`Could not click ${label}`)
}

async function shot(name) {
  await page.screenshot({ path: `${out}\\${name}.png` })
}

try {
  await page.setViewport({ width: 390, height: 844 })
  await open("http://localhost:3000/")
  await page.waitForFunction(() => document.body.innerText.includes("אורי בדיקה"))
  await page.evaluate(() => {
    ;[...document.querySelectorAll("button")].find((node) => node.textContent?.trim() === "לא עכשיו")?.click()
  })
  await clickLabel("אורי בדיקה")
  await page.waitForFunction(() => document.body.innerText.includes("קומה 1"))
  const homeNav = await page.evaluate(() => Boolean(document.querySelector("nav")))
  if (!homeNav) throw new Error("Bottom navigation is missing on the diary list")
  await clickLabel("קומה 1")
  await page.waitForFunction(() => document.body.innerText.includes("הוסף רכיב"))
  const filling = await page.evaluate(() => ({
    nav: Boolean(document.querySelector("nav")),
    domains: document.body.innerText.includes("גילוי אש"),
    helper: document.body.innerText.includes("כל שדה הוא אדם אחד"),
    addWorker: document.body.innerText.includes("+ הוסף עובד"),
    addItem: document.body.innerText.includes("+ הוסף רכיב"),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }))
  if (filling.nav) throw new Error("Bottom navigation is visible while filling a diary")
  if (filling.domains) throw new Error("Domain picker is visible before opening the sheet")
  if (filling.helper) throw new Error("Worker helper text is still visible")
  if (!filling.addWorker || !filling.addItem || filling.overflow) throw new Error(JSON.stringify(filling))

  await clickLabel("הוסף עובד")
  await page.waitForSelector("input[placeholder='שם מלא']")
  await page.type("input[placeholder='שם מלא']", "דנה כהן")
  await clickLabel("הוסף רכיב")
  await page.waitForFunction(() => document.body.innerText.includes("גלאי עשן"))
  await shot("diary-sheet-390")
  await clickLabel("גלאי עשן")
  await page.type("input[inputmode='decimal']", "4")
  await clickLabel("הוספה")
  await page.waitForFunction(() => !document.querySelector("[data-slot='drawer-popup']"))
  await page.waitForFunction(() => document.body.innerText.includes("גלאי עשן"))
  await shot("diary-form-390")

  await clickLabel("עריכה")
  await page.waitForSelector("input[inputmode='decimal']")
  const edited = await page.evaluate(() => {
    const input = document.querySelector("input[inputmode='decimal']")
    if (!(input instanceof HTMLInputElement)) return false
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
    setter?.call(input, "5")
    input.dispatchEvent(new Event("input", { bubbles: true }))
    return true
  })
  if (!edited) throw new Error("Could not edit quantity")
  await clickLabel("שמירה")
  await page.waitForFunction(() => document.body.innerText.includes("5"))
  const removed = await page.evaluate(() => {
    const row = [...document.querySelectorAll("li")].find((item) => item.textContent?.includes("גלאי עשן"))
    const button = [...(row?.querySelectorAll("button") ?? [])].find((item) => item.textContent?.includes("הסרה"))
    if (!(button instanceof HTMLElement)) return false
    button.click()
    return true
  })
  if (!removed) throw new Error("Could not remove the component")
  await page.waitForFunction(() => !document.body.innerText.includes("גלאי עשן"))
  await clickLabel("הוסף רכיב")
  await page.waitForFunction(() => document.body.innerText.includes("גלאי עשן"))
  await clickLabel("גלאי עשן")
  await page.type("input[inputmode='decimal']", "4")
  await clickLabel("הוספה")
  await page.waitForFunction(() => document.body.innerText.includes("גלאי עשן"))
  await clickLabel("עבודה בגובה")
  await page.type("textarea", "הערת מסך")
  await new Promise((resolve) => setTimeout(resolve, 500))
  await page.reload({ waitUntil: "networkidle2" })
  await page.waitForFunction(() => document.body.innerText.includes("דנה כהן"))
  const persisted = await page.evaluate(() => document.body.innerText)
  if (!persisted.includes("גלאי עשן") || !persisted.includes("הערת מסך")) {
    throw new Error("Draft did not persist")
  }
  await clickLabel("הגשת יומן")
  await page.waitForFunction(() => document.body.innerText.includes("לאחר האישור"))
  await clickLabel("אישור והגשה")
  await page.waitForFunction(() => document.body.innerText.includes("היומן הוגש ואינו ניתן לעריכה"))
  const locked = await page.evaluate(() => ({
    inputs: document.querySelectorAll("input, textarea").length,
    text: document.body.innerText,
  }))
  if (locked.inputs !== 0) throw new Error("Submitted diary still has inputs")
  if (!locked.text.includes("דנה כהן") || !locked.text.includes("גלאי עשן")) {
    throw new Error("Submitted diary is missing the report")
  }

  await page.setViewport({ width: 320, height: 700 })
  await open("http://localhost:3000/leader")
  await page.waitForFunction(() => document.body.innerText.includes("חניון"))
  const narrow = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    dir: document.documentElement.dir,
  }))
  if (narrow.overflow || narrow.dir !== "rtl") throw new Error(`320 layout ${JSON.stringify(narrow)}`)

  await page.setViewport({ width: 1280, height: 800 })
  await open("http://localhost:3000/")
  await clickLabel("דנה אלמוג")
  await page.waitForFunction(() => document.body.innerText.includes("לוח בקרה"))
  await page.waitForFunction(() => document.body.innerText.includes("קומה 1"))
  const desk = await page.evaluate(() => {
    const aside = document.querySelector("aside")?.getBoundingClientRect()
    return {
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      asideRight: aside ? Math.round(aside.right) : null,
      asideWidth: aside ? Math.round(aside.width) : null,
      table: Boolean(document.querySelector("a.grid, a[class*='grid-cols']")),
    }
  })
  console.log("1280", JSON.stringify(desk))
  if (desk.overflow || desk.asideRight !== 1280) throw new Error(`Dashboard layout ${JSON.stringify(desk)}`)
  await shot("dashboard-1280")
  await clickLabel("הוגש")
  await page.waitForFunction(() => document.body.innerText.includes("הוגש"))
  await clickLabel("הכל")
  await clickLabel("קומה 1")
  await page.waitForFunction(() => document.body.innerText.includes("יומן שהוגש נעול") || document.body.innerText.includes("ממתין"))

  await page.setViewport({ width: 1800, height: 1000 })
  await open("http://localhost:3000/manager")
  await page.waitForFunction(() => document.body.innerText.includes("לוח בקרה"))
  const wide = await page.evaluate(() => {
    const aside = document.querySelector("aside")?.getBoundingClientRect()
    return {
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      asideRight: aside ? Math.round(aside.right) : null,
      width: document.documentElement.clientWidth,
    }
  })
  console.log("1800", JSON.stringify(wide))
  if (wide.overflow || wide.asideRight !== 1800) throw new Error(`Wide dashboard ${JSON.stringify(wide)}`)
  await shot("dashboard-1800")

  if (errors.length) throw new Error(errors.join("\n"))
  console.log("ux checks passed")
} catch (error) {
  const text = await page.evaluate(() => document.body?.innerText?.slice(0, 1200) ?? "")
  console.log("PAGE", text)
  console.log("ERRORS", errors)
  await shot("failure")
  throw error
} finally {
  await browser.close()
}
