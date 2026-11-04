import sharp from "sharp"
import fs from "fs"
import path from "path"

const brand = "#FF3300"
const bg = "#121417"
const flamePath =
  "M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"

function iconSvg(size, { maskable = false } = {}) {
  // Maskable icons need more safe-area padding for adaptive cropping.
  const padRatio = maskable ? 0.22 : 0.18
  const pad = size * padRatio
  const inner = size - pad * 2
  const scale = inner / 24
  const stroke = 2.35
  const rx = size * 0.22
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="${bg}"/>
  <g transform="translate(${pad} ${pad}) scale(${scale})">
    <path d="${flamePath}" fill="none" stroke="${brand}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`
}

function buildIco(entries) {
  const count = entries.length
  const headerSize = 6 + count * 16
  let dataOffset = headerSize
  const dir = Buffer.alloc(headerSize)
  const parts = []
  dir.writeUInt16LE(0, 0)
  dir.writeUInt16LE(1, 2)
  dir.writeUInt16LE(count, 4)
  let o = 6
  for (const e of entries) {
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o++)
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o++)
    dir.writeUInt8(0, o++)
    dir.writeUInt8(0, o++)
    dir.writeUInt16LE(1, o)
    o += 2
    dir.writeUInt16LE(32, o)
    o += 2
    dir.writeUInt32LE(e.png.length, o)
    o += 4
    dir.writeUInt32LE(dataOffset, o)
    o += 4
    parts.push(e.png)
    dataOffset += e.png.length
  }
  return Buffer.concat([dir, ...parts])
}

const root = path.resolve(import.meta.dirname, "..")
const outIcons = path.join(root, "public", "icons")
const outApp = path.join(root, "src", "app")
fs.mkdirSync(outIcons, { recursive: true })

const jobs = [
  { file: path.join(outIcons, "icon-192.png"), size: 192 },
  { file: path.join(outIcons, "icon-512.png"), size: 512 },
  { file: path.join(outIcons, "apple-touch-icon.png"), size: 180 },
  { file: path.join(outIcons, "icon-maskable-512.png"), size: 512, maskable: true },
  { file: path.join(outApp, "icon.png"), size: 32 },
  { file: path.join(outApp, "apple-icon.png"), size: 180 },
]

for (const job of jobs) {
  const svg = iconSvg(job.size, { maskable: Boolean(job.maskable) })
  await sharp(Buffer.from(svg)).png().toFile(job.file)
  console.log("wrote", path.relative(root, job.file))
}

const icoEntries = []
for (const size of [16, 32, 48]) {
  const png = await sharp(Buffer.from(iconSvg(size))).png().toBuffer()
  icoEntries.push({ size, png })
}
fs.writeFileSync(path.join(outApp, "favicon.ico"), buildIco(icoEntries))
console.log("wrote src/app/favicon.ico")
