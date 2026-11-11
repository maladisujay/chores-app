import { Avatar } from './ui.jsx'
import Icon from '../icons/Icon.jsx'
import { useHouse, usePhotoUrls } from '../store.jsx'
import { catOf } from '../lib/reports.js'
import { relTime } from '../lib/format.js'

export default function ReportRow({ report, onClick }) {
  const { memberById } = useHouse()
  const c = catOf(report.category)
  const thumb = report.photos[0]
  const urls = usePhotoUrls(thumb ? [thumb] : [])
  const who = report.anonymous ? null : memberById[report.reporter_id]
  const about = memberById[report.about_member]
  const resolved = report.status === 'resolved'
  return (
    <button className={`report-row ${resolved ? 'resolved' : ''}`} onClick={() => onClick?.(report)}>
      <span className="report-cat" style={{ '--cat': c.color }}><Icon name={c.icon} size={20} stroke={2.2} /></span>
      <span className="log-main">
        <span className="log-title">{report.title}</span>
        <span className="log-meta">
          {report.anonymous ? 'Anonymous' : who?.name || 'Former member'}
          <span className="dot-sep">·</span>
          {relTime(report.created_at)}
        </span>
        <span className="log-flags">
          {resolved ? (
            <span className="flag flag-green"><Icon name="check" size={11} stroke={3} /> Resolved</span>
          ) : (
            <span className="flag flag-orange">Open</span>
          )}
          {about && <span className="flag flag-gray"><Avatar member={about} size={13} /> {about.name}</span>}
          {report.agrees.length > 0 && <span className="flag flag-blue"><Icon name="users" size={11} stroke={2.4} /> {report.agrees.length} agree</span>}
          {report.photos.length > 1 && <span className="flag flag-gray"><Icon name="image" size={11} stroke={2.4} /> {report.photos.length}</span>}
        </span>
      </span>
      {thumb && <span className="log-thumb">{urls[thumb] ? <img src={urls[thumb]} alt="" loading="lazy" /> : <Icon name="image" size={18} />}</span>}
    </button>
  )
}
