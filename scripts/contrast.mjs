// WCAG contrast check for chore-icon tiles and key text tokens in light + dark mode.
import { CHORE_ICONS } from '../src/icons/choreIcons.js'
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const BG = { 'light page #F2F2F7': '#F2F2F7', 'light card #FFFFFF': '#FFFFFF', 'dark page #000000': '#000000', 'dark card #1C1C1E': '#1C1C1E' }
let bad = 0
console.log('Chore tiles (non-text UI, need ≥ 3:1):')
for (const [k, v] of Object.entries(CHORE_ICONS)) {
  const rs = Object.values(BG).map((bg) => ratio(v.tile, bg))
  const min = Math.min(...rs)
  if (min < 3) bad++
  console.log(`  ${k.padEnd(11)} ${v.tile}  min ${min.toFixed(2)}${min < 3 ? '  ✗' : ''}`)
}
const TEXT = [
  ['label on light card', '#000000', '#FFFFFF', 4.5], ['label on dark card', '#FFFFFF', '#1C1C1E', 4.5],
  ['secondary on light card', '#6C6C70', '#FFFFFF', 4.5], ['secondary on dark card', '#98989F', '#1C1C1E', 4.5],
  ['blue tint on light', '#0066D6', '#FFFFFF', 4.5], ['blue tint on dark', '#3B9BFF', '#1C1C1E', 4.5],
  ['points green on light', '#1D7A35', '#E4F5E8', 4.5], ['points green on dark', '#4CD964', '#16301C', 4.5],
  ['danger on light', '#D70015', '#FFFFFF', 4.5], ['danger on dark', '#FF6961', '#1C1C1E', 4.5],
  ['white on button blue', '#FFFFFF', '#0A6CF0', 4.5],
]
console.log('\nText (need ≥ 4.5:1):')
for (const [n, fg, bg, need] of TEXT) {
  const r = ratio(fg, bg)
  if (r < need) bad++
  console.log(`  ${n.padEnd(26)} ${r.toFixed(2)}${r < need ? '  ✗' : ''}`)
}
console.log(bad ? `\n${bad} failing` : '\nAll pass')
process.exit(bad ? 1 : 0)
