import { useMemo, useState } from 'react'
import { useHouse } from '../store.jsx'
import { Avatar, ChoreIcon, Empty, Segmented } from '../components/ui.jsx'
import Sheet from '../components/Sheet.jsx'
import LogRow from '../components/LogRow.jsx'
import Icon from '../icons/Icon.jsx'
import { leaderboard, streak, bestStreak, topChores, periodStart } from '../lib/stats.js'
import { plural, fmtShortDate } from '../lib/format.js'

const PERIODS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'all', label: 'All time' },
]

export default function LeaderboardScreen({ onOpenLog }) {
  const { logs, members, house, me } = useHouse()
  const [period, setPeriod] = useState('week')
  const [statsFor, setStatsFor] = useState(null)
  const board = useMemo(() => leaderboard(logs, members, period, house.week_start), [logs, members, period, house.week_start])
  const max = Math.max(1, ...board.map((r) => r.points))
  const from = periodStart(period, house.week_start)
  const hasAny = board.some((r) => r.points !== 0 || r.count || r.penalties)
  const podium = hasAny ? [board[1], board[0], board[2]] : []

  return (
    <div>
      <header className="large-header">
        <div>
          <p className="eyebrow">{from ? `Since ${fmtShortDate(from)}` : 'Since the beginning'}</p>
          <h1 className="large-title">Leaderboard</h1>
        </div>
      </header>
      <Segmented value={period} onChange={setPeriod} options={PERIODS} />

      {!hasAny ? (
        <Empty icon="other" title="No points yet">Log chores to start climbing the board.</Empty>
      ) : (
        <>
          <section className="podium">
            {podium.map((r, i) =>
              r ? (
                <button key={r.member.id} className={`podium-col p${r.rank}`} onClick={() => setStatsFor(r.member.id)}>
                  {r.rank === 1 && <Icon name="crown" size={26} className="crown" stroke={2} />}
                  <Avatar member={r.member} size={i === 1 ? 72 : 58} ring />
                  <span className="podium-name">{r.member.name}</span>
                  <span className="podium-pts">{r.points}</span>
                  <span className="podium-block glass-heavy"><span>{r.rank}</span></span>
                </button>
              ) : (
                <span key={i} className="podium-col empty" />
              ),
            )}
          </section>

          <section className="glass list board">
            {board.map((r) => (
              <button key={r.member.id} className={`board-row ${r.member.id === me.id ? 'me' : ''}`} onClick={() => setStatsFor(r.member.id)}>
                <span className="board-rank">{r.rank}</span>
                <Avatar member={r.member} size={38} />
                <span className="board-main">
                  <span className="board-name">{r.member.name}{r.member.id === me.id && <span className="you">You</span>}</span>
                  <span className="board-bar"><i style={{ width: `${Math.max(0, (r.points / max) * 100)}%`, background: r.member.color }} /></span>
                  <span className="board-sub">
                    {plural(r.count, 'chore')}
                    {r.penalties > 0 && <span className="penalty"> · {plural(r.penalties, 'penalty', 'penalties')}</span>}
                  </span>
                </span>
                <span className="board-pts">{r.points}<small>pts</small></span>
              </button>
            ))}
          </section>
          <p className="footnote">
            Chores marked incomplete by more than half the home lose their points plus a 50% penalty.
          </p>
        </>
      )}
      <MemberStatsSheet memberId={statsFor} onClose={() => setStatsFor(null)} onOpenLog={onOpenLog} />
    </div>
  )
}

function MemberStatsSheet({ memberId, onClose, onOpenLog }) {
  const { logs, memberById, house, members } = useHouse()
  const m = memberById[memberId]
  const data = useMemo(() => {
    if (!m) return null
    const mine = logs.filter((l) => l.member_id === m.id)
    const rank = (p) => leaderboard(logs, members, p, house.week_start).find((r) => r.member.id === m.id)
    return {
      week: rank('week'),
      month: rank('month'),
      all: rank('all'),
      streak: streak(logs, m.id),
      best: bestStreak(logs, m.id),
      top: topChores(logs, m.id, 4),
      recent: mine.slice(0, 8),
      penalties: mine.filter((l) => l.voided),
    }
  }, [m, logs, members, house.week_start])

  return (
    <Sheet open={!!m} onClose={onClose} title={m?.name || ''}>
      {m && data && (
        <div className="stats">
          <div className="stats-hero">
            <Avatar member={m} size={76} ring />
            <div className="stats-tiles">
              {[['This week', data.week], ['This month', data.month], ['All time', data.all]].map(([label, r]) => (
                <div key={label} className="stat-tile glass">
                  <b>{r?.points ?? 0}</b>
                  <span>{label}</span>
                  {r && <small>#{r.rank}</small>}
                </div>
              ))}
            </div>
          </div>
          <div className="stats-row">
            <div className="stat-tile glass wide"><Icon name="flame" size={20} className={data.streak ? 'flame-on' : ''} /><b>{data.streak}</b><span>day streak</span></div>
            <div className="stat-tile glass wide"><Icon name="trophy" size={20} /><b>{data.best}</b><span>best streak</span></div>
            <div className="stat-tile glass wide"><Icon name="thumbDown" size={20} /><b>{data.penalties.length}</b><span>penalties</span></div>
          </div>
          {data.top.length > 0 && (
            <>
              <h4 className="group-title">Favorite chores</h4>
              <div className="glass list">
                {data.top.map((t) => (
                  <div key={t.name} className="row">
                    <ChoreIcon icon={t.icon} size={36} />
                    <span className="row-main"><span className="row-label">{t.name}</span><span className="row-sub">{plural(t.count, 'time')}</span></span>
                    <span className="pts pts-sm">{t.points}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {data.recent.length > 0 && (
            <>
              <h4 className="group-title">Recent</h4>
              <div className="glass list">
                {data.recent.map((l) => <LogRow key={l.id} log={l} showDate onClick={(x) => { onClose(); setTimeout(() => onOpenLog(x), 150) }} />)}
              </div>
            </>
          )}
        </div>
      )}
    </Sheet>
  )
}
