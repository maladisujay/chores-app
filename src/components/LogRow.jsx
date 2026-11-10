import { Avatar, ChoreIcon, PointsPill } from './ui.jsx'
import Icon from '../icons/Icon.jsx'
import { fmtTime } from '../lib/format.js'
import { useHouse, usePhotoUrls } from '../store.jsx'

export default function LogRow({ log, onClick, showDate }) {
  const { memberById, activeMembers } = useHouse()
  const m = memberById[log.member_id]
  const thumb = log.after_path || log.before_path
  const urls = usePhotoUrls(thumb ? [thumb] : [])
  const late = new Date(log.created_at) - new Date(log.done_at) > 864e5
  const needed = Math.floor(activeMembers.filter((x) => x.claimed).length / 2) + 1
  return (
    <button className={`log-row ${log.voided ? 'voided' : ''}`} onClick={() => onClick?.(log)}>
      <span className="log-ico">
        <ChoreIcon icon={log.task_icon} size={46} />
        <span className="log-avatar"><Avatar member={m} size={22} /></span>
      </span>
      <span className="log-main">
        <span className="log-title">{log.task_name}</span>
        <span className="log-meta">
          <span className="log-who" style={{ color: m?.color }}>{m?.name || 'Former member'}</span>
          <span className="dot-sep">·</span>
          {showDate ? new Date(log.done_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' : ''}
          {fmtTime(log.done_at)}
        </span>
        <span className="log-flags">
          {log.voided && <span className="flag flag-red">Marked incomplete</span>}
          {!log.voided && log.votes.length > 0 && (
            <span className="flag flag-orange"><Icon name="thumbDown" size={11} stroke={2.4} /> {log.votes.length}/{needed}</span>
          )}
          {log.pending && <span className="flag flag-blue"><Icon name="hourglass" size={11} stroke={2.4} /> {log.pending.kind === 'delete' ? 'Delete requested' : 'Edit pending'}</span>}
          {late && <span className="flag flag-gray">Logged later</span>}
          {log.note && <span className="flag flag-gray"><Icon name="note" size={11} stroke={2.4} /></span>}
        </span>
      </span>
      {thumb && (
        <span className="log-thumb">{urls[thumb] ? <img src={urls[thumb]} alt="" loading="lazy" /> : <Icon name="image" size={18} />}</span>
      )}
      <PointsPill log={log} />
    </button>
  )
}
