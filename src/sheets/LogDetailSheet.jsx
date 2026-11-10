import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Sheet, { useOverlay } from '../components/Sheet.jsx'
import { Avatar, Button, ChoreIcon, PointsPill } from '../components/ui.jsx'
import { useFeedback } from '../components/Feedback.jsx'
import Icon from '../icons/Icon.jsx'
import { useHouse, usePhotoUrls } from '../store.jsx'
import { fmtWhen, relTime } from '../lib/format.js'
import { penaltyOf } from '../lib/stats.js'
import { haptic } from '../lib/haptics.js'
import { toAppError } from '../lib/errors.js'
import LogChoreSheet from './LogChoreSheet.jsx'

export default function LogDetailSheet({ open, log: liveLog, onClose }) {
  const last = useRef(null)
  if (liveLog) last.current = liveLog
  const log = liveLog || last.current
  return (
    <Sheet open={open} onClose={onClose} title="Chore details">
      {log && <Detail log={log} onClose={onClose} />}
    </Sheet>
  )
}

function Detail({ log, onClose }) {
  const h = useHouse()
  const { toast, confirm, prompt } = useFeedback()
  const { me, isOwner, memberById, activeMembers, house, backend } = h
  const [editing, setEditing] = useState(false)
  const [viewer, setViewer] = useState(null)
  const [busy, setBusy] = useState(null)
  const urls = usePhotoUrls([log.before_path, log.after_path].filter(Boolean))
  const m = memberById[log.member_id]
  const loggedBy = log.logged_by && log.logged_by !== log.member_id ? memberById[log.logged_by] : null
  const total = activeMembers.filter((x) => x.claimed).length
  const needed = Math.floor(total / 2) + 1
  const iVoted = log.votes.includes(me.id)
  const mine = log.member_id === me.id || log.logged_by === me.id
  const voteClosed = Date.now() - new Date(log.done_at) > house.vote_window_days * 864e5
  const canVote = log.member_id !== me.id && !log.voided && !log.vote_override && !voteClosed
  const late = new Date(log.created_at) - new Date(log.done_at) > 864e5
  const pendingMine = log.pending && log.pending.member_id === me.id

  const run = async (key, fn) => {
    setBusy(key)
    try {
      await fn()
    } catch (e) {
      toast(toAppError(e).message, 'error')
    } finally {
      setBusy(null)
    }
  }

  const vote = () =>
    run('vote', async () => {
      haptic('medium')
      const r = await h.call('vote_log', { p_log: log.id, p_vote: !iVoted })
      if (r?.voided) toast(`Marked incomplete — ${m?.name} loses ${log.points} pts and a ${penaltyOf(log)} pt penalty`, 'error')
      else toast(iVoted ? 'Vote removed' : 'Vote counted', 'success')
    })

  const del = async () => {
    if (isOwner) {
      const ok = await confirm({ title: 'Delete this chore?', message: 'It will be removed from history and scores. This cannot be undone.', confirmText: 'Delete', destructive: true })
      if (!ok) return
      run('delete', async () => {
        const paths = await h.call('owner_delete_log', { p_log: log.id })
        backend.removePhotos(paths)
        toast('Chore deleted', 'success')
        onClose()
      })
    } else {
      const reason = await prompt({ title: 'Request deletion', message: 'The owner will review your request. Why should this be deleted?', placeholder: 'e.g. Logged it twice', confirmText: 'Send request', maxLength: 280 })
      if (!reason) return
      run('delete', async () => {
        await h.call('request_change', { p_log: log.id, p_kind: 'delete', p_payload: {}, p_reason: reason })
        toast('Deletion request sent to the owner', 'success')
      })
    }
  }

  const cancelReq = () =>
    run('cancel', async () => {
      const orphans = await h.call('cancel_request', { p_request: log.pending.id })
      backend.removePhotos(orphans)
      toast('Request cancelled')
    })

  const photos = [
    log.before_path && { label: 'Before', path: log.before_path },
    log.after_path && { label: 'After', path: log.after_path },
  ].filter(Boolean)

  return (
    <div className="detail">
      {photos.length > 0 && (
        <div className={`detail-photos n${photos.length}`}>
          {photos.map((p) => (
            <button key={p.path} className="detail-photo" onClick={() => urls[p.path] && setViewer({ ...p, url: urls[p.path] })}>
              {urls[p.path] ? <img src={urls[p.path]} alt={p.label} /> : urls[p.path] === null ? <span className="photo-missing"><Icon name="image" size={28} /><span>Photo unavailable</span></span> : <span className="spinner" />}
              <span className="photo-tag">{p.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="detail-head">
        <ChoreIcon icon={log.task_icon} size={60} />
        <div className="detail-title">
          <h3>{log.task_name}</h3>
          <span className="muted">{fmtWhen(log.done_at)}</span>
        </div>
        <PointsPill log={log} size="lg" />
      </div>

      {log.voided && (
        <div className="notice danger glass">
          <Icon name="thumbDown" size={18} />
          <span>Marked incomplete by the home. {m?.name} lost {log.points} pts plus a {penaltyOf(log)} pt penalty.</span>
        </div>
      )}
      {log.pending && (
        <div className="notice info glass">
          <Icon name="hourglass" size={18} />
          <span>{memberById[log.pending.member_id]?.name} requested {log.pending.kind === 'delete' ? 'to delete this chore' : 'an edit'} — waiting for the owner.</span>
        </div>
      )}

      <div className="glass list">
        <div className="row">
          <Avatar member={m} size={34} />
          <span className="row-main"><span className="row-label">{m?.name || 'Former member'}</span><span className="row-sub">Done by</span></span>
        </div>
        {loggedBy && (
          <div className="row">
            <Avatar member={loggedBy} size={34} />
            <span className="row-main"><span className="row-label">{loggedBy.name}</span><span className="row-sub">Logged by</span></span>
          </div>
        )}
        <div className="row">
          <span className="row-ico" style={{ background: '#8E8E93' }}><Icon name="clock" size={17} stroke={2.2} /></span>
          <span className="row-main">
            <span className="row-label">Logged {relTime(log.created_at)}</span>
            <span className="row-sub">{late ? 'Logged more than a day after it was done' : 'Logged on time'}{log.edited_at ? ' · edited' : ''}</span>
          </span>
        </div>
        {log.note && (
          <div className="row">
            <span className="row-ico" style={{ background: '#FFD60A' }}><Icon name="note" size={17} stroke={2.2} /></span>
            <span className="row-main"><span className="row-label wrap">{log.note}</span></span>
          </div>
        )}
      </div>

      {log.member_id !== me.id && !log.voided && (
        <div className="vote-card glass">
          <div className="vote-top">
            <div>
              <b>Not done properly?</b>
              <p className="muted small">
                {log.vote_override
                  ? 'The owner locked voting on this chore.'
                  : voteClosed
                    ? `Voting closed ${house.vote_window_days} days after the chore.`
                    : needed > total - 1
                      ? `A vote needs ${needed} of ${total} housemates, and ${m?.name || 'the doer'} can’t vote on their own chore — so it can’t pass until more people join. The owner can still mark it incomplete.`
                      : `If ${needed} of ${total} housemates vote, ${m?.name || 'they'} loses these ${log.points} pts and gets a ${penaltyOf(log)} pt penalty.`}
              </p>
            </div>
          </div>
          <div className="vote-bar">
            {Array.from({ length: needed }).map((_, i) => (
              <i key={i} className={i < log.votes.length ? 'on' : ''} />
            ))}
          </div>
          <div className="vote-foot">
            <div className="stack-avatars">
              {log.votes.map((id) => <Avatar key={id} member={memberById[id]} size={24} />)}
              <span className="muted small">{log.votes.length} of {needed} votes</span>
            </div>
            {canVote && (
              <Button variant={iVoted ? 'glass' : 'danger-soft'} loading={busy === 'vote'} onClick={vote} className="btn-sm">
                {iVoted ? <><Icon name="undo" size={16} /> Undo vote</> : <><Icon name="thumbDown" size={16} /> Vote</>}
              </Button>
            )}
          </div>
        </div>
      )}
      {log.member_id === me.id && log.votes.length > 0 && !log.voided && (
        <div className="notice warn glass">
          <Icon name="alert" size={18} />
          <span>{log.votes.length} of {needed} needed housemates think this wasn't done properly.</span>
        </div>
      )}

      <div className="detail-actions">
        {isOwner ? (
          <>
            <Button variant="glass" onClick={() => setEditing(true)}><Icon name="edit" size={18} /> Edit</Button>
            {log.voided ? (
              <Button variant="glass" loading={busy === 'restore'} onClick={() => run('restore', async () => { await h.call('restore_log', { p_log: log.id }); toast('Points restored', 'success') })}>
                <Icon name="undo" size={18} /> Restore points
              </Button>
            ) : (
              <Button variant="glass" loading={busy === 'void'} onClick={async () => {
                const ok = await confirm({ title: 'Mark as incomplete?', message: `${m?.name} will lose ${log.points} pts and get a ${penaltyOf(log)} pt penalty.`, confirmText: 'Mark incomplete', destructive: true })
                if (ok) run('void', async () => { await h.call('void_log', { p_log: log.id }); toast('Marked incomplete') })
              }}>
                <Icon name="thumbDown" size={18} /> Mark incomplete
              </Button>
            )}
            <Button variant="danger-soft" loading={busy === 'delete'} onClick={del}><Icon name="trash" size={18} /> Delete</Button>
          </>
        ) : mine ? (
          pendingMine ? (
            <Button variant="glass" loading={busy === 'cancel'} onClick={cancelReq}><Icon name="x" size={18} /> Cancel my request</Button>
          ) : log.pending ? null : (
            <>
              <Button variant="glass" onClick={() => setEditing(true)}><Icon name="edit" size={18} /> Request edit</Button>
              <Button variant="danger-soft" loading={busy === 'delete'} onClick={del}><Icon name="trash" size={18} /> Request delete</Button>
            </>
          )
        ) : null}
      </div>
      {!isOwner && mine && !log.pending && <p className="footnote">Logged chores can't be changed directly — the owner approves edits and deletions.</p>}

      <LogChoreSheet open={editing} onClose={() => setEditing(false)} editLog={log} />
      <PhotoViewer photo={viewer} onClose={() => setViewer(null)} />
    </div>
  )
}

function PhotoViewer({ photo, onClose }) {
  const last = useRef(null)
  if (photo) last.current = photo
  const p = photo || last.current
  const { mounted, shown, dismiss } = useOverlay(!!photo, onClose)
  if (!mounted || !p) return null
  return createPortal(
    <div className={`viewer ${shown ? 'shown' : ''}`} onClick={dismiss}>
      <img src={p.url} alt={p.label} />
      <span className="viewer-label">{p.label}</span>
      <button className="viewer-close icon-btn glass-btn" aria-label="Close"><Icon name="x" size={20} stroke={2.4} /></button>
    </div>,
    document.body,
  )
}
