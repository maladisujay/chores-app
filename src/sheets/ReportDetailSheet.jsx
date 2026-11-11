import { useRef, useState } from 'react'
import Sheet, { Page } from '../components/Sheet.jsx'
import { Avatar, Button, ChoreIcon, Empty, Segmented } from '../components/ui.jsx'
import PhotoPicker from '../components/PhotoPicker.jsx'
import ReportRow from '../components/ReportRow.jsx'
import { useFeedback } from '../components/Feedback.jsx'
import Icon from '../icons/Icon.jsx'
import { useHouse, usePhotoUrls } from '../store.jsx'
import { catOf } from '../lib/reports.js'
import { fmtWhen, relTime } from '../lib/format.js'
import { haptic } from '../lib/haptics.js'
import { toAppError } from '../lib/errors.js'
import { PhotoViewer } from './LogDetailSheet.jsx'

export default function ReportDetailSheet({ report: live, onClose }) {
  const last = useRef(null)
  if (live) last.current = live
  const report = live || last.current
  return (
    <Sheet open={!!live} onClose={onClose} title="Report">
      {report && <Detail report={report} onClose={onClose} />}
    </Sheet>
  )
}

function Detail({ report, onClose }) {
  const h = useHouse()
  const { toast, confirm } = useFeedback()
  const { me, isOwner, memberById, taskById, backend, house } = h
  const [viewer, setViewer] = useState(null)
  const [busy, setBusy] = useState(null)
  const [resolving, setResolving] = useState(false)
  const [note, setNote] = useState('')
  const [fixPhoto, setFixPhoto] = useState(null)
  const c = catOf(report.category)
  const paths = [...report.photos, report.resolution_photo].filter(Boolean)
  const urls = usePhotoUrls(paths)
  const reporter = report.anonymous ? null : memberById[report.reporter_id]
  const about = memberById[report.about_member]
  const task = taskById[report.task_id]
  const resolver = memberById[report.resolved_by]
  const open = report.status === 'open'
  const iAgree = report.agrees.includes(me.id)
  const canResolve = open && (isOwner || report.mine || report.about_member === me.id)
  const canManage = isOwner || report.mine

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

  const resolve = () =>
    run('resolve', async () => {
      let path = null
      if (fixPhoto) path = await backend.uploadPhoto(house.id, fixPhoto.blob)
      try {
        await h.call('resolve_report', { p_report: report.id, p_note: note.trim() || null, p_photo: path })
      } catch (e) {
        backend.removePhotos([path])
        throw e
      }
      haptic('success')
      toast('Marked as resolved', 'success')
      setResolving(false)
      setNote('')
      setFixPhoto(null)
    })

  return (
    <div className="detail">
      {report.photos.length > 0 && (
        <div className={`report-gallery n${Math.min(report.photos.length, 4)}`}>
          {report.photos.map((p, i) => (
            <button key={p} className="detail-photo" onClick={() => urls[p] && setViewer({ url: urls[p], label: `Photo ${i + 1} of ${report.photos.length}` })}>
              {urls[p] ? <img src={urls[p]} alt={`Report photo ${i + 1}`} /> : urls[p] === null ? <span className="photo-missing"><Icon name="image" size={24} /></span> : <span className="spinner" />}
            </button>
          ))}
        </div>
      )}

      <div className="detail-head">
        <span className="report-cat lg-size" style={{ '--cat': c.color }}><Icon name={c.icon} size={28} stroke={2} /></span>
        <div className="detail-title">
          <h3>{report.title}</h3>
          <span className="muted">{c.label} · {fmtWhen(report.created_at)}</span>
        </div>
      </div>

      <div className={`notice ${open ? 'warn' : 'success'} glass`}>
        <Icon name={open ? 'alert' : 'check'} size={18} />
        <span>
          {open
            ? 'Open — waiting for someone to sort it out.'
            : `Resolved by ${resolver?.name || 'a former member'} ${relTime(report.resolved_at)}.`}
        </span>
      </div>

      <div className="glass list">
        <div className="row">
          {reporter ? <Avatar member={reporter} size={34} /> : <span className="row-ico" style={{ background: '#5856D6' }}><Icon name="eyeOff" size={17} stroke={2.2} /></span>}
          <span className="row-main">
            <span className="row-label">{report.anonymous ? (report.mine ? 'You (anonymous)' : 'Anonymous') : reporter?.name || 'Former member'}</span>
            <span className="row-sub">Reported by</span>
          </span>
        </div>
        {about && (
          <div className="row">
            <Avatar member={about} size={34} />
            <span className="row-main"><span className="row-label">{about.id === me.id ? 'You' : about.name}</span><span className="row-sub">About</span></span>
          </div>
        )}
        {task && (
          <div className="row">
            <ChoreIcon icon={task.icon} size={34} />
            <span className="row-main"><span className="row-label">{task.name}</span><span className="row-sub">Related chore</span></span>
          </div>
        )}
        {report.details && (
          <div className="row">
            <span className="row-ico" style={{ background: '#C27C00' }}><Icon name="note" size={17} stroke={2.2} /></span>
            <span className="row-main"><span className="row-label wrap">{report.details}</span></span>
          </div>
        )}
      </div>

      {!open && (report.resolution_note || report.resolution_photo) && (
        <>
          <h4 className="group-title">How it was fixed</h4>
          <div className="glass list">
            {report.resolution_photo && (
              <button className="fix-photo" onClick={() => urls[report.resolution_photo] && setViewer({ url: urls[report.resolution_photo], label: 'After the fix' })}>
                {urls[report.resolution_photo] ? <img src={urls[report.resolution_photo]} alt="After the fix" /> : <span className="spinner" />}
              </button>
            )}
            {report.resolution_note && <div className="row"><span className="row-main"><span className="row-label wrap">{report.resolution_note}</span></span></div>}
          </div>
        </>
      )}

      {open && !report.mine && report.about_member !== me.id && (
        <div className="vote-card glass">
          <div className="vote-foot">
            <div>
              <b>Noticed this too?</b>
              <p className="muted small">{report.agrees.length ? `${report.agrees.length} ${report.agrees.length === 1 ? 'housemate agrees' : 'housemates agree'}` : 'Back it up so it gets attention.'}</p>
            </div>
            <Button variant={iAgree ? 'glass' : 'primary'} className="btn-sm" loading={busy === 'agree'} onClick={() => run('agree', async () => { haptic(); await h.call('agree_report', { p_report: report.id, p_agree: !iAgree }) })}>
              {iAgree ? 'Undo' : 'Me too'}
            </Button>
          </div>
        </div>
      )}
      {open && report.mine && report.agrees.length > 0 && (
        <p className="footnote">{report.agrees.length} {report.agrees.length === 1 ? 'housemate agrees' : 'housemates agree'} with your report.</p>
      )}

      {resolving ? (
        <div className="resolve-box">
          <h4 className="group-title">Mark as resolved</h4>
          <div className="resolve-grid">
            <PhotoPicker label="Fix photo" value={fixPhoto} onChange={setFixPhoto} />
            <textarea className="field" rows={4} maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was done? (optional)" />
          </div>
          <div className="detail-actions">
            <Button variant="glass" onClick={() => setResolving(false)}>Cancel</Button>
            <Button loading={busy === 'resolve'} onClick={resolve}><Icon name="check" size={18} stroke={2.6} /> Resolve</Button>
          </div>
        </div>
      ) : (
        <div className="detail-actions">
          {canResolve && (
            <Button onClick={() => setResolving(true)}><Icon name="check" size={18} stroke={2.6} /> {report.about_member === me.id ? 'I fixed it' : 'Resolve'}</Button>
          )}
          {!open && canManage && (
            <Button variant="glass" loading={busy === 'reopen'} onClick={() => run('reopen', async () => { const old = await h.call('reopen_report', { p_report: report.id }); backend.removePhotos([old]); toast('Report reopened') })}>
              <Icon name="undo" size={18} /> Reopen
            </Button>
          )}
          {canManage && (
            <Button variant="danger-soft" loading={busy === 'delete'} onClick={async () => {
              if (!(await confirm({ title: 'Delete this report?', message: 'It and its photos will be removed for everyone.', confirmText: 'Delete', destructive: true }))) return
              run('delete', async () => { const gone = await h.call('delete_report', { p_report: report.id }); backend.removePhotos(gone); toast('Report deleted'); onClose() })
            }}>
              <Icon name="trash" size={18} /> Delete
            </Button>
          )}
        </div>
      )}
      <PhotoViewer photo={viewer} onClose={() => setViewer(null)} />
    </div>
  )
}

export function ReportsPage({ open, onClose, onOpen, onNew }) {
  const { reports } = useHouse()
  const [tab, setTab] = useState('open')
  const list = reports.filter((r) => (tab === 'open' ? r.status === 'open' : r.status === 'resolved'))
  return (
    <Page open={open} onClose={onClose} title="Reports" right={
      <button className="icon-btn lg" aria-label="New report" onClick={onNew}><Icon name="plus" size={20} stroke={2.4} /></button>
    }>
      <Segmented value={tab} onChange={setTab} options={[
        { value: 'open', label: `Open${reports.some((r) => r.status === 'open') ? ` (${reports.filter((r) => r.status === 'open').length})` : ''}` },
        { value: 'resolved', label: 'Resolved' },
      ]} />
      {list.length === 0 ? (
        <Empty icon={tab === 'open' ? 'sofa' : 'other'} title={tab === 'open' ? 'Nothing to report' : 'No resolved reports yet'}>
          {tab === 'open' ? 'Spotted something sus? Tap + to report it with photos.' : 'Resolved reports will show up here.'}
        </Empty>
      ) : (
        <div className="glass list" style={{ marginTop: 12 }}>
          {list.map((r) => <ReportRow key={r.id} report={r} onClick={onOpen} />)}
        </div>
      )}
    </Page>
  )
}
