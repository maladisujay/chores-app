import { useMemo, useState } from 'react'
import { useHouse } from '../store.jsx'
import { Avatar, ChoreIcon, Empty } from '../components/ui.jsx'
import LogRow from '../components/LogRow.jsx'
import ReportRow from '../components/ReportRow.jsx'
import Icon from '../icons/Icon.jsx'
import { greeting, fmtDayLabel, relTime, plural } from '../lib/format.js'
import { groupByDay, leaderboard, streak, staleChores, logScore } from '../lib/stats.js'
import { haptic } from '../lib/haptics.js'

export default function HomeScreen({ onOpenLog, onGo, onQuickLog, onOpenReport, onAllReports, onNewReport }) {
  const h = useHouse()
  const { me, logs, house, activeMembers, isOwner, pendingRequests, requests } = h
  const [filter, setFilter] = useState('all')
  const [limit, setLimit] = useState(40)

  const week = useMemo(() => leaderboard(logs, h.members, 'week', house.week_start), [logs, h.members, house.week_start])
  const mine = week.find((r) => r.member.id === me.id) || { points: 0, count: 0, rank: '–' }
  const myStreak = useMemo(() => streak(logs, me.id), [logs, me.id])
  const todayCount = useMemo(() => {
    const d = new Date().toDateString()
    return logs.filter((l) => new Date(l.done_at).toDateString() === d && !l.voided).length
  }, [logs])
  const stale = useMemo(() => staleChores(h.tasks, logs).slice(0, 8), [h.tasks, logs])
  const myPending = requests.filter((r) => r.member_id === me.id && r.status === 'pending')
  const recentResolved = requests.filter(
    (r) => r.member_id === me.id && (r.status === 'approved' || r.status === 'rejected') && Date.now() - new Date(r.resolved_at) < 3 * 864e5,
  )

  const filtered = useMemo(() => {
    const f = filter === 'all' ? logs : logs.filter((l) => l.member_id === (filter === 'me' ? me.id : filter))
    return f.slice(0, limit)
  }, [logs, filter, limit, me.id])
  const total = filter === 'all' ? logs.length : logs.filter((l) => l.member_id === (filter === 'me' ? me.id : filter)).length
  const groups = useMemo(() => [...groupByDay(filtered).entries()], [filtered])
  const leader = week[0]

  return (
    <div className="home">
      <header className="large-header">
        <div>
          <p className="eyebrow">{greeting()}, {me.name.split(' ')[0]}</p>
          <h1 className="large-title">{house.name}</h1>
        </div>
        <button className="avatar-btn" onClick={() => onGo('house')} aria-label="Your profile">
          <Avatar member={me} size={42} ring />
        </button>
      </header>

      <section className="summary glass-heavy">
        <div className="summary-main">
          <span className="summary-label">Your points this week</span>
          <span className="summary-num">{mine.points}</span>
          <span className="summary-sub">
            {mine.count || mine.penalties
              ? `${plural(mine.count, 'chore')}${mine.penalties ? ` · ${plural(mine.penalties, 'penalty', 'penalties')}` : ''} · #${mine.rank} of ${week.length}`
              : 'Log a chore to get on the board'}
          </span>
        </div>
        <div className="summary-side">
          <div className="stat-pill">
            <Icon name="flame" size={18} className={myStreak ? 'flame-on' : ''} />
            <b>{myStreak}</b>
            <span>day streak</span>
          </div>
          <div className="stat-pill">
            <Icon name="check" size={18} stroke={2.6} />
            <b>{todayCount}</b>
            <span>done today</span>
          </div>
        </div>
        {week.length > 1 && (
          <button className="mini-board" onClick={() => onGo('ranks')}>
            {week.slice(0, 5).map((r) => (
              <span key={r.member.id} className={`mini-entry ${r.member.id === me.id ? 'me' : ''}`}>
                <Avatar member={r.member} size={30} ring={r.rank === 1 && r.points > 0} />
                <span>{r.points}</span>
              </span>
            ))}
            <Icon name="chevronR" size={16} stroke={2.4} className="mini-chev" />
          </button>
        )}
        {leader && leader.points > 0 && leader.member.id !== me.id && (
          <p className="summary-foot">{leader.member.name} leads with {leader.points} pts{mine.points < leader.points ? ` — ${leader.points - mine.points} to catch up` : ''}</p>
        )}
      </section>

      {isOwner && pendingRequests.length > 0 && (
        <button className="banner glass" onClick={() => onGo('house')}>
          <span className="banner-ico" style={{ background: '#FF9F0A' }}><Icon name="inbox" size={18} stroke={2.2} /></span>
          <span className="banner-text"><b>{plural(pendingRequests.length, 'request')} to review</b><span>Edits and deletions waiting for your approval</span></span>
          <Icon name="chevronR" size={16} stroke={2.4} />
        </button>
      )}
      {myPending.length > 0 && (
        <div className="banner glass">
          <span className="banner-ico" style={{ background: '#0A84FF' }}><Icon name="hourglass" size={18} stroke={2.2} /></span>
          <span className="banner-text"><b>{plural(myPending.length, 'request')} pending</b><span>Waiting for the owner to approve</span></span>
        </div>
      )}
      {recentResolved.slice(0, 2).map((r) => (
        <div key={r.id} className="banner glass">
          <span className="banner-ico" style={{ background: r.status === 'approved' ? '#30D158' : '#FF453A' }}>
            <Icon name={r.status === 'approved' ? 'check' : 'x'} size={18} stroke={2.6} />
          </span>
          <span className="banner-text">
            <b>Your {r.kind} request was {r.status}</b>
            <span>{relTime(r.resolved_at)}</span>
          </span>
        </div>
      ))}

      <section className="section">
        <div className="section-head">
          <h2>Reports</h2>
          {h.reports.length > 0 && <button className="see-all" onClick={onAllReports}>See all</button>}
        </div>
        {h.openReports.length > 0 && (
          <div className="glass list">
            {h.openReports.slice(0, 3).map((r) => <ReportRow key={r.id} report={r} onClick={onOpenReport} />)}
            {h.openReports.length > 3 && (
              <button className="row tappable more-row" onClick={onAllReports}>
                <span className="row-main"><span className="row-label accent">{h.openReports.length - 3} more open</span></span>
                <Icon name="chevronR" size={16} className="row-chev" stroke={2.4} />
              </button>
            )}
          </div>
        )}
        <button className="report-cta glass" onClick={onNewReport}>
          <span className="report-cat" style={{ '--cat': '#E8590C' }}><Icon name="megaphone" size={20} stroke={2.2} /></span>
          <span className="banner-text">
            <b>{h.openReports.length ? 'Report something else' : 'Spotted something sus?'}</b>
            <span>Report an undone chore, a mess or damage, with photos. You can stay anonymous.</span>
          </span>
          <Icon name="chevronR" size={16} stroke={2.4} />
        </button>
      </section>

      {stale.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Needs some love</h2>
            <span className="muted small">Longest since done</span>
          </div>
          <div className="h-scroll">
            {stale.map(({ task, last }) => (
              <button key={task.id} className="stale-card glass" onClick={() => { haptic(); onQuickLog(task.id) }}>
                <ChoreIcon icon={task.icon} size={44} />
                <span className="stale-name">{task.name}</span>
                <span className={`stale-when ${!last || Date.now() - last > 7 * 864e5 ? 'old' : ''}`}>{last ? relTime(last) : 'Never done'}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2>Activity</h2>
          <span className="muted small">{plural(total, 'chore')}</span>
        </div>
        <div className="chips h-scroll">
          <button className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>Everyone</button>
          <button className={`chip ${filter === 'me' ? 'on' : ''}`} onClick={() => setFilter('me')}>Me</button>
          {activeMembers.filter((m) => m.id !== me.id && m.claimed).map((m) => (
            <button key={m.id} className={`chip ${filter === m.id ? 'on' : ''}`} style={{ '--c': m.color }} onClick={() => setFilter(m.id)}>
              <span className="chip-dot" /> {m.name}
            </button>
          ))}
        </div>

        {groups.length === 0 ? (
          <Empty icon="broom" title={logs.length ? 'Nothing here yet' : 'No chores logged yet'}>
            Tap the <b>+</b> button below to log the first one.
          </Empty>
        ) : (
          groups.map(([day, items]) => (
            <div key={day} className="day-group">
              <div className="day-head">
                <span>{fmtDayLabel(items[0].done_at)}</span>
                <span className="muted">{items.reduce((s, l) => s + logScore(l), 0)} pts</span>
              </div>
              <div className="glass list">
                {items.map((l) => <LogRow key={l.id} log={l} onClick={onOpenLog} />)}
              </div>
            </div>
          ))
        )}
        {total > limit && (
          <button className="ghost-link center" onClick={() => setLimit(limit + 60)}>Show more</button>
        )}
      </section>
    </div>
  )
}
