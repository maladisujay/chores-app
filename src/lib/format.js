export const pad = (n) => String(n).padStart(2, '0')

export function dayKey(d) {
  const x = new Date(d)
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
}
export function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
export function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
export function startOfWeek(d, weekStart = 1) {
  const x = startOfDay(d)
  const diff = (x.getDay() - weekStart + 7) % 7
  return addDays(x, -diff)
}
export function startOfMonth(d) {
  const x = startOfDay(d)
  x.setDate(1)
  return x
}
export function toDateInput(d) {
  const x = new Date(d)
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
}
export function toTimeInput(d) {
  const x = new Date(d)
  return `${pad(x.getHours())}:${pad(x.getMinutes())}`
}
export function fromInputs(date, time) {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = (time || '00:00').split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, 0, 0)
}

const tf = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const df = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
const dfy = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
const shortDf = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

export const fmtTime = (d) => tf.format(new Date(d))
export const fmtShortDate = (d) => shortDf.format(new Date(d))

export function fmtDayLabel(d) {
  const x = startOfDay(d)
  const today = startOfDay(new Date())
  const diff = Math.round((today - x) / 864e5)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (x.getFullYear() !== today.getFullYear()) return dfy.format(x)
  return df.format(x)
}
export function fmtWhen(d) {
  const label = fmtDayLabel(d)
  return `${label} · ${fmtTime(d)}`
}
export function relTime(d) {
  const s = (Date.now() - new Date(d)) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`
  return fmtShortDate(d)
}
export function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Up late'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
export const plural = (n, w, p = w + 's') => `${n} ${n === 1 ? w : p}`
