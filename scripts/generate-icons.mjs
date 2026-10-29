import { mkdir } from "node:fs/promises"
import sharp from "sharp"

function icon(size, inset, maskable) {
  const page = inset
  const pageSize = size - inset * 2
  const line = Math.max(4, Math.round(size * 0.035))
  const x = page + Math.round(pageSize * 0.18)
  const width = Math.round(pageSize * 0.64)
  const y1 = page + Math.round(pageSize * 0.24)
  const gap = Math.round(pageSize * 0.16)
  const radius = maskable ? 0 : Math.round(size * 0.2)
  const pageRadius = Math.round(size * 0.06)
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${radius}" fill="#1C2127"/>
    <rect x="${page}" y="${page}" width="${pageSize}" height="${pageSize}" rx="${pageRadius}" fill="#F4F5F7"/>
    <rect x="${x}" y="${y1}" width="${width}" height="${line}" rx="${line / 2}" fill="#1C2127"/>
    <rect x="${x}" y="${y1 + gap}" width="${width}" height="${line}" rx="${line / 2}" fill="#8B949E"/>
    <rect x="${x}" y="${y1 + gap * 2}" width="${Math.round(width * 0.62)}" height="${line}" rx="${line / 2}" fill="#8B949E"/>
  </svg>`)
}

await mkdir("public/icons", { recursive: true })

const files = [
  ["icon-192.png", 192, 34, false],
  ["icon-512.png", 512, 92, false],
  ["apple-touch-icon.png", 180, 32, false],
  ["icon-maskable-512.png", 512, 118, true],
]

for (const [name, size, inset, maskable] of files) {
  await sharp(icon(size, inset, maskable)).png().toFile(`public/icons/${name}`)
}
