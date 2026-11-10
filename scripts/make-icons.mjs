import sharp from 'sharp'
import { readFileSync } from 'node:fs'
const svg = readFileSync(new URL('../public/icon.svg', import.meta.url))
const out = (n) => new URL(`../public/${n}`, import.meta.url).pathname
await sharp(svg).resize(192, 192).png().toFile(out('icon-192.png'))
await sharp(svg).resize(512, 512).png().toFile(out('icon-512.png'))
await sharp(svg).resize(180, 180).flatten({ background: '#0A84FF' }).png().toFile(out('apple-touch-icon.png'))
// maskable: full-bleed background with the glyph inside the safe zone
const square = svg.toString().replace('rx="114"', 'rx="0"')
await sharp(Buffer.from(square)).resize(512, 512).png().toFile(out('icon-512-maskable.png'))
console.log('icons written')
