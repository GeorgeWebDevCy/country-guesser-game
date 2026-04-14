/**
 * Generates build/icon.ico — a 256×256 globe icon in the game's teal/orange theme.
 * Run once: node build/generate-icon.js
 * No external dependencies — uses only Node built-ins.
 */

'use strict'
const zlib = require('zlib')
const fs   = require('fs')
const path = require('path')

// ── CRC32 (required by PNG format) ─────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  CRC_TABLE[i] = c
}
function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

// ── PNG builder ─────────────────────────────────────────────────────────────
function pngChunk(type, data) {
  const t   = Buffer.from(type, 'ascii')
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length)
  const crc = Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}

function makePNG(size, pixelFn) {
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8]  = 8 // 8-bit depth
  ihdr[9]  = 6 // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.allocUnsafe(1 + size * 4)
    row[0] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y, size)
      const o = 1 + x * 4
      row[o] = r; row[o+1] = g; row[o+2] = b; row[o+3] = a
    }
    rows.push(row)
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Icon pixel function ─────────────────────────────────────────────────────
// Theme: teal interior (#134e5e), white outlines, orange centre dot (#ff6b35)
// Transparent background so the ICO shell colour shows through at small sizes.

function globePixel(x, y, S) {
  const cx = S / 2, cy = S / 2
  const dx = x - cx, dy = y - cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  const R   = S * 0.46        // outer globe radius
  const Ri  = R - S * 0.025  // inner edge of white ring

  // Outside globe — transparent
  if (dist >= R) return [0, 0, 0, 0]

  // White ring (globe outline)
  if (dist >= Ri) return [255, 255, 255, 255]

  // Orange centre dot
  const dotR = S * 0.07
  if (dist < dotR) return [255, 107, 53, 255]

  // Globe interior — teal fill
  const [TR, TG, TB] = [19, 78, 94] // #134e5e

  // White equator line
  const equatorW = S * 0.012
  if (Math.abs(dy) <= equatorW) return [255, 255, 255, 255]

  // White prime meridian
  const meridW = S * 0.012
  if (Math.abs(dx) <= meridW) return [255, 255, 255, 255]

  // White tropic lines (±30° latitude — roughly ±R*0.36)
  const tropicY = Ri * 0.38
  const tropicW = S * 0.008
  if (Math.abs(Math.abs(dy) - tropicY) <= tropicW) return [255, 255, 255, 200]

  // Curved secondary meridians (±60° longitude)
  // A meridian at longitude L projected orthographically:
  // x = Ri·sin(L)·cos(lat), y = Ri·sin(lat)
  // Expressed as an ellipse: (x / (Ri·sin(L)))² + (y / Ri)² = 1
  const sinL = Math.sin(Math.PI / 3) // sin(60°) ≈ 0.866
  const a = Ri * sinL
  const ellipseVal = (dx * dx) / (a * a) + (dy * dy) / (Ri * Ri)
  const curvW = 0.06
  if (Math.abs(ellipseVal - 1) < curvW) return [255, 255, 255, 220]

  return [TR, TG, TB, 255]
}

// ── ICO wrapper ─────────────────────────────────────────────────────────────
// ICO format: ICONDIR header + one ICONDIRENTRY + embedded PNG data.
// Embedding PNG directly (Vista+ style) — simpler than BMP and lossless.

function makeICO(pngData) {
  const ICONDIR = Buffer.allocUnsafe(6)
  ICONDIR.writeUInt16LE(0, 0)    // reserved
  ICONDIR.writeUInt16LE(1, 2)    // type: 1 = icon
  ICONDIR.writeUInt16LE(1, 4)    // image count

  const ENTRY = Buffer.allocUnsafe(16)
  ENTRY[0]  = 0                  // width: 0 = 256
  ENTRY[1]  = 0                  // height: 0 = 256
  ENTRY[2]  = 0                  // colour count (0 = >256)
  ENTRY[3]  = 0                  // reserved
  ENTRY.writeUInt16LE(1, 4)      // colour planes
  ENTRY.writeUInt16LE(32, 6)     // bits per pixel
  ENTRY.writeUInt32LE(pngData.length, 8)
  ENTRY.writeUInt32LE(6 + 16, 12) // offset to image data

  return Buffer.concat([ICONDIR, ENTRY, pngData])
}

// ── Write files ─────────────────────────────────────────────────────────────
const buildDir = path.join(__dirname)
const pngPath  = path.join(buildDir, 'icon.png')
const icoPath  = path.join(buildDir, 'icon.ico')

const png = makePNG(256, globePixel)
const ico = makeICO(png)

fs.writeFileSync(pngPath, png)
fs.writeFileSync(icoPath, ico)

console.log(`icon.png  — ${png.length} bytes`)
console.log(`icon.ico  — ${ico.length} bytes`)
console.log('Done.')
