import { useState } from 'react'
import { Page } from '../components/Sheet.jsx'
import { Avatar, Button, ChoreIcon, Empty } from '../components/ui.jsx'
import { useFeedback } from '../components/Feedback.jsx'
import Icon from '../icons/Icon.jsx'
import { useHouse, usePhotoUrls } from '../store.jsx'
import { fmtWhen, relTime } from '../lib/format.js'
import { toAppError } from '../lib/errors.js'

export default function ApprovalsPage({ open, onClose }) {
  const { pendingRequests, requests } = useHouse()
  const resolved = requests.filter((r) => r.status !== 'pending').slice(0, 10)
  return (
    <Page open={open} onClose={onClose} title="Approvals">
      {pendingRequests.length === 0 ? (
        <Empty icon="other" title="All caught up">No edit or delete requests waiting.</Empty>
      ) : (
        pendingRequests.map((r) => <RequestCard key={r.id} req={r} />)
      )}
      {resolved.length > 0 && (
        <>
          <h4 className="group-title">Recently handled</h4>
          <div className="glass list">
            {resolved.map((r) => (
              <ResolvedRow key={r.id} req={r} />
            ))}
          </div>
        </>
      )}
    </Page>
  )
}

function ResolvedRow({ req }) {
  const { memberById } = useHouse()
  const color = { approved: '#30D158', rejected: '#FF453A', cancelled: '#8E8E93' }[req.status]
  return (
    <div className="row">
      <Avatar member={memberById[req.member_id]} size={30} />
      <span className="row-main">
        <span className="row-label">{memberById[req.member_id]?.name} · {req.kind}</span>
        <span className="row-sub">{relTime(req.resolved_at || req.created_at)}</span>
      </span>
      <span className="tag" style={{ background: color + '22', color }}>{req.status}</span>
    </div>
  )
}

function RequestCard({ req }) {
  const h = useHouse()
  const { toast } = useFeedback()
  const [busy, setBusy] = useState(null)
  const log = h.logs.find((l) => l.id === req.log_id)
  const who = h.memberById[req.member_id]
  const p = req.payload || {}
  const paths = [p.before_path, p.after_path, log?.before_path, log?.after_path].filter(Boolean)
  const urls = usePhotoUrls(paths)

  const act = async (approve) => {
    setBusy(approve ? 'yes' : 'no')
    try {
      const orphans = await h.call('resolve_request', { p_request: req.id, p_approve: approve })
      h.backend.removePhotos(orphans)
      toast(approve ? 'Approved' : 'Rejected', approve ? 'success' : 'info')
    } catch (e) {
      toast(toAppError(e).message, 'error')
    } finally {
      setBusy(null)
    }
  }
  if (!log) return null

  const changes = []
  if (p.task_id) {
    const t = h.taskById[p.task_id]
    changes.push({ label: 'Chore', from: `${log.task_name} (${log.points})`, to: t ? `${t.name} (${t.points})` : 'Removed chore' })
  }
  if (p.done_at) changes.push({ label: 'When', from: fmtWhen(log.done_at), to: fmtWhen(p.done_at) })
  if ('note' in p) changes.push({ label: 'Note', from: log.note || '—', to: p.note || '—' })
  const photoChange = (key, label) =>
    key in p && (
      <div className="photo-diff" key={key}>
        <span className="muted small">{label} photo</span>
        <div className="photo-diff-row">
          <span className="thumb">{log[key] ? (urls[log[key]] ? <img src={urls[log[key]]} alt="" /> : <span className="spinner" />) : 'none'}</span>
          <Icon name="chevronR" size={16} />
          <span className="thumb">{p[key] ? (urls[p[key]] ? <img src={urls[p[key]]} alt="" /> : <span className="spinner" />) : 'removed'}</span>
        </div>
      </div>
    )

  return (
    <div className="req-card glass-heavy">
      <div className="req-head">
        <Avatar member={who} size={36} />
        <div className="req-who">
          <span><b>{who?.name}</b> wants to {req.kind === 'delete' ? 'delete this chore' : 'make a change'}</span>
          <span className="muted small">{relTime(req.created_at)}</span>
        </div>
        <span className={`tag ${req.kind === 'delete' ? 'tag-red' : 'tag-blue'}`}>{req.kind}</span>
      </div>
      <div className="req-log">
        <ChoreIcon icon={log.task_icon} size={40} />
        <span className="row-main">
          <span className="row-label">{log.task_name}</span>
          <span className="row-sub">{h.memberById[log.member_id]?.name} · {fmtWhen(log.done_at)} · {log.points} pts</span>
        </span>
      </div>
      {req.reason && <p className="req-reason">“{req.reason}”</p>}
      {req.kind === 'edit' && (
        <div className="req-changes">
          {changes.map((c) => (
            <div key={c.label} className="diff">
              <span className="muted small">{c.label}</span>
              <span className="diff-from">{c.from}</span>
              <span className="diff-to">{c.to}</span>
            </div>
          ))}
          {photoChange('before_path', 'Before')}
          {photoChange('after_path', 'After')}
        </div>
      )}
      <div className="req-actions">
        <Button variant="glass" loading={busy === 'no'} disabled={!!busy} onClick={() => act(false)}><Icon name="x" size={18} /> Reject</Button>
        <Button variant={req.kind === 'delete' ? 'danger' : 'primary'} loading={busy === 'yes'} disabled={!!busy} onClick={() => act(true)}>
          <Icon name="check" size={18} /> {req.kind === 'delete' ? 'Approve delete' : 'Approve'}
        </Button>
      </div>
    </div>
  )
}
