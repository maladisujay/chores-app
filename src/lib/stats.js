import { dayKey, startOfDay, addDays, startOfWeek, startOfMonth } from './format.js'

// A voided ("not done properly") log is worth −50% of its points:
// the points are taken back and a 50% penalty is applied.
export const logScore = (l) => (l.voided ? -Math.round(l.points * 0.5) : l.points)
export const penaltyOf = (l) => Math.round(l.points * 0.5)

export function periodStart(period, weekStart) {
  const now = new Date()
  if (period === 'week') return startOfWeek(now, weekStart)
  if (period === 'month') return startOfMonth(now)
  return null
}

export function leaderboard(logs, members, period, weekStart) {
  const from = periodStart(period, weekStart)
  const rows = new Map()
  for (const m of members) {
    if (m.status === 'active' && m.claimed) rows.set(m.id, { member: m, points: 0, count: 0, penalties: 0 })
  }
  for (const l of logs) {
    if (from && new Date(l.done_at) < from) continue
    let r = rows.get(l.member_id)
    if (!r) {
      const m = members.find((x) => x.id === l.member_id)
      if (!m) continue
      r = { member: m, points: 0, count: 0, penalties: 0 }
      rows.set(m.id, r)
    }
    r.points += logScore(l)
    if (l.voided) r.penalties += 1
    else r.count += 1
  }
  const list = [...rows.values()]
  list.sort((a, b) => b.points - a.points || b.count - a.count || a.member.name.localeCompare(b.member.name))
  let rank = 0, prev = null
  list.forEach((r, i) => {
    if (prev === null || r.points !== prev) rank = i + 1
    r.rank = rank
    prev = r.points
  })
  return list
}

export function streak(logs, memberId) {
  const days = new Set(logs.filter((l) => l.member_id === memberId && !l.voided).map((l) => dayKey(l.done_at)))
  let d = startOfDay(new Date())
  if (!days.has(dayKey(d))) d = addDays(d, -1) // today not done yet doesn't break the streak
  let n = 0
  while (days.has(dayKey(d))) {
    n++
    d = addDays(d, -1)
  }
  return n
}

export function bestStreak(logs, memberId) {
  const days = [...new Set(logs.filter((l) => l.member_id === memberId && !l.voided).map((l) => dayKey(l.done_at)))].sort()
  let best = 0, cur = 0, prev = null
  for (const k of days) {
    const d = new Date(k + 'T00:00:00')
    cur = prev && Math.round((d - prev) / 864e5) === 1 ? cur + 1 : 1
    best = Math.max(best, cur)
    prev = d
  }
  return best
}

export function groupByDay(logs) {
  const map = new Map()
  for (const l of logs) {
    const k = dayKey(l.done_at)
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(l)
  }
  return map
}

export function topChores(logs, memberId, n = 3) {
  const c = new Map()
  for (const l of logs) {
    if (l.member_id !== memberId || l.voided) continue
    const k = l.task_name
    const e = c.get(k) || { name: k, icon: l.task_icon, count: 0, points: 0 }
    e.count++
    e.points += l.points
    c.set(k, e)
  }
  return [...c.values()].sort((a, b) => b.count - a.count).slice(0, n)
}

// Which chores have gone the longest without anyone doing them.
export function staleChores(tasks, logs) {
  const last = new Map()
  for (const l of logs) {
    if (l.voided || !l.task_id) continue
    const t = new Date(l.done_at).getTime()
    if (!last.has(l.task_id) || last.get(l.task_id) < t) last.set(l.task_id, t)
  }
  return tasks
    .map((t) => ({ task: t, last: last.get(t.id) || null }))
    .sort((a, b) => (a.last ?? 0) - (b.last ?? 0))
}
