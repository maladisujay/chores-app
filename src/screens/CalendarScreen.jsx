import { useMemo, useRef, useState } from 'react'
import { useHouse } from '../store.jsx'
import { Avatar, Empty } from '../components/ui.jsx'
import LogRow from '../components/LogRow.jsx'
import Icon from '../icons/Icon.jsx'
import { addDays, dayKey, fmtDayLabel, startOfMonth, startOfWeek } from '../lib/format.js'
import { groupByDay, logScore } from '../lib/stats.js'
import { haptic } from '../lib/haptics.js'

const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })

export default function CalendarScreen({ onOpenLog }) {
  const { logs, memberById, house, activeMembers } = useHouse()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(() => dayKey(new Date()))
  const [only, setOnly] = useState(null)
  const touch = useRef(null)

  const byDay = useMemo(() => groupByDay(only ? logs.filter((l) => l.member_id === only) : logs), [logs, only])
  const weekStart = house.week_start
  const gridStart = startOfWeek(month, weekStart)
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const rows = days[35].getMonth() !== month.getMonth() ? days.slice(0, 35) : days
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(addDays(gridStart, i)),
  )
  const todayKey = dayKey(new Date())
  const isCurrentMonth = month.getMonth() === new Date().getMonth() && month.getFullYear() === new Date().getFullYear()

  const shift = (n) => {
    haptic()
    const m = new Date(month)
    m.setMonth(m.getMonth() + n)
    setMonth(m)
  }

  const monthTotals = useMemo(() => {
    const t = new Map()
    for (const [k, items] of byDay) {
      const d = new Date(k + 'T00:00:00')
      if (d.getMonth() !== month.getMonth() || d.getFullYear() !== month.getFullYear()) continue
      for (const l of items) t.set(l.member_id, (t.get(l.member_id) || 0) + logScore(l))
    }
    return [...t.entries()].sort((a, b) => b[1] - a[1])
  }, [byDay, month])

  const dayItems = byDay.get(selected) || []
  const dayPeople = [...new Set(dayItems.map((l) => l.member_id))]

  return (
    <div>
      <header className="large-header">
        <div>
          <p className="eyebrow">Who did what, when</p>
          <h1 className="large-title">Calendar</h1>
        </div>
        {!isCurrentMonth && (
          <button className="pill-btn glass" onClick={() => { setMonth(startOfMonth(new Date())); setSelected(todayKey) }}>Today</button>
        )}
      </header>

      <div className="chips h-scroll">
        <button className={`chip ${!only ? 'on' : ''}`} onClick={() => setOnly(null)}>Everyone</button>
        {activeMembers.filter((m) => m.claimed).map((m) => (
          <button key={m.id} className={`chip ${only === m.id ? 'on' : ''}`} style={{ '--c': m.color }} onClick={() => setOnly(only === m.id ? null : m.id)}>
            <span className="chip-dot" /> {m.name}
          </button>
        ))}
      </div>

      <section
        className="cal glass-heavy"
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          if (!touch.current) return
          const dx = e.changedTouches[0].clientX - touch.current.x
          const dy = e.changedTouches[0].clientY - touch.current.y
          touch.current = null
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) shift(dx < 0 ? 1 : -1)
        }}
      >
        <div className="cal-head">
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month"><Icon name="chevronL" size={20} stroke={2.4} /></button>
          <h2>{monthFmt.format(month)}</h2>
          <button className="icon-btn" onClick={() => shift(1)} aria-label="Next month"><Icon name="chevronR" size={20} stroke={2.4} /></button>
        </div>
        <div className="cal-grid cal-weekdays">
          {weekdays.map((w, i) => <span key={i}>{w}</span>)}
        </div>
        <div className="cal-grid">
          {rows.map((d) => {
            const k = dayKey(d)
            const items = byDay.get(k) || []
            const people = [...new Set(items.filter((l) => !l.voided).map((l) => l.member_id))]
            const out = d.getMonth() !== month.getMonth()
            const future = d > new Date()
            return (
              <button
                key={k}
                className={`cal-day ${out ? 'out' : ''} ${k === todayKey ? 'today' : ''} ${k === selected ? 'sel' : ''} ${future ? 'future' : ''}`}
                onClick={() => {
                  haptic()
                  setSelected(k)
                  if (out) setMonth(startOfMonth(d))
                }}
              >
                <span className="cal-num">{d.getDate()}</span>
                <span className="cal-dots">
                  {people.slice(0, 4).map((id) => (
                    <i key={id} style={{ background: memberById[id]?.color || '#999' }} />
                  ))}
                  {people.length > 4 && <i className="more">+</i>}
                </span>
              </button>
            )
          })}
        </div>
        {monthTotals.length > 0 && (
          <div className="cal-legend">
            {monthTotals.map(([id, pts]) => (
              <span key={id} className="legend-item">
                <i style={{ background: memberById[id]?.color }} /> {memberById[id]?.name} <b>{pts}</b>
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>{fmtDayLabel(selected + 'T12:00:00')}</h2>
          <div className="stack-avatars">
            {dayPeople.slice(0, 5).map((id) => <Avatar key={id} member={memberById[id]} size={24} />)}
          </div>
        </div>
        {dayItems.length === 0 ? (
          <Empty icon="sofa" title="A quiet day">No chores logged on this day.</Empty>
        ) : (
          <>
            <div className="day-summary">
              {dayPeople.map((id) => {
                const its = dayItems.filter((l) => l.member_id === id)
                return (
                  <span key={id} className="day-person glass" style={{ '--c': memberById[id]?.color }}>
                    <Avatar member={memberById[id]} size={22} />
                    <span>{memberById[id]?.name}</span>
                    <b>{its.reduce((s, l) => s + logScore(l), 0)} pts</b>
                  </span>
                )
              })}
            </div>
            <div className="glass list">
              {dayItems.map((l) => <LogRow key={l.id} log={l} onClick={onOpenLog} />)}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
