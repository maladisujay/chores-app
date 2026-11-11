import { useEffect, useMemo, useState } from 'react'
import Sheet from '../components/Sheet.jsx'
import PhotoPicker from '../components/PhotoPicker.jsx'
import { Avatar, Button, ChoreIcon, Segmented, Stepper } from '../components/ui.jsx'
import { useReportForm } from './ReportForm.jsx'
import { useFeedback } from '../components/Feedback.jsx'
import Icon from '../icons/Icon.jsx'
import { useHouse, usePhotoUrls } from '../store.jsx'
import { fromInputs, toDateInput, toTimeInput, addDays, fmtDayLabel, fmtTime } from '../lib/format.js'

const openPicker = (e) => {
  try {
    e.currentTarget.showPicker?.()
  } catch {}
}
import { haptic } from '../lib/haptics.js'
import { toAppError } from '../lib/errors.js'

export function groupTasks(tasks, sections) {
  const groups = []
  const loose = tasks.filter((t) => !t.section_id || !sections.find((s) => s.id === t.section_id))
  if (loose.length) groups.push({ id: null, name: sections.length ? 'General' : null, tasks: loose })
  for (const s of sections) {
    const ts = tasks.filter((t) => t.section_id === s.id)
    if (ts.length) groups.push({ id: s.id, name: s.name, tasks: ts })
  }
  return groups
}

export default function LogChoreSheet({ open, onClose, initialTaskId, editLog, initialMode = 'chore' }) {
  const h = useHouse()
  const { toast } = useFeedback()
  const { isOwner, me, house, tasks, sections, activeMembers, taskById, backend } = h
  const editing = !!editLog
  const photoPaths = editing ? [editLog.before_path, editLog.after_path].filter(Boolean) : []
  const existingUrls = usePhotoUrls(photoPaths)

  const [taskId, setTaskId] = useState(null)
  const [custom, setCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [points, setPoints] = useState(10)
  const [memberId, setMemberId] = useState(me.id)
  const [date, setDate] = useState(toDateInput(new Date()))
  const [time, setTime] = useState(toTimeInput(new Date()))
  const [before, setBefore] = useState(null)
  const [after, setAfter] = useState(null)
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [picking, setPicking] = useState(true)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('chore')
  const report = useReportForm({ active: open && mode === 'report', onDone: onClose })

  // Reset every time the sheet opens
  useEffect(() => {
    if (!open) return
    const now = new Date()
    if (editing) {
      const l = editLog
      const t = l.task_id && taskById[l.task_id]
      setTaskId(t ? t.id : null)
      setCustom(!t)
      setCustomName(t ? '' : l.task_name)
      setPoints(l.points)
      setMemberId(l.member_id)
      setDate(toDateInput(l.done_at))
      setTime(toTimeInput(l.done_at))
      setBefore(l.before_path ? { path: l.before_path } : null)
      setAfter(l.after_path ? { path: l.after_path } : null)
      setNote(l.note || '')
      setPicking(false)
    } else {
      const t = initialTaskId && taskById[initialTaskId]
      setTaskId(t ? t.id : null)
      setCustom(false)
      setCustomName('')
      setPoints(t ? t.points : 10)
      setMemberId(me.id)
      setDate(toDateInput(now))
      setTime(toTimeInput(now))
      setBefore(null)
      setAfter(null)
      setNote('')
      setPicking(!t)
    }
    setReason('')
    setSearch('')
    setMode(editing ? 'chore' : initialMode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // fill in signed URLs for existing photos once loaded
  useEffect(() => {
    setBefore((b) => (b?.path && !b.url && existingUrls[b.path] ? { ...b, url: existingUrls[b.path] } : b))
    setAfter((a) => (a?.path && !a.url && existingUrls[a.path] ? { ...a, url: existingUrls[a.path] } : a))
  }, [existingUrls])

  const task = taskId ? taskById[taskId] : null
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q ? tasks.filter((t) => t.name.toLowerCase().includes(q)) : tasks
    return groupTasks(list, sections)
  }, [tasks, sections, search])

  const photoRequired = house.photo_required && !isOwner
  const doneAt = fromInputs(date, time)
  const minDate = isOwner ? undefined : toDateInput(addDays(new Date(), -30))
  const maxDate = toDateInput(new Date())
  const future = doneAt.getTime() > Date.now() + 10 * 60e3
  const tooOld = !isOwner && doneAt.getTime() < Date.now() - 30 * 864e5
  const hasChore = custom ? customName.trim().length > 0 : !!task
  const valid = hasChore && !future && !tooOld && (!photoRequired || after) && date && time

  const choose = (t) => {
    haptic()
    setTaskId(t.id)
    setCustom(false)
    setPoints(t.points)
    setPicking(false)
  }

  const submit = async () => {
    if (!valid) return
    setBusy(true)
    const uploaded = []
    try {
      const up = async (v) => {
        if (!v) return null
        if (v.path) return v.path
        const p = await backend.uploadPhoto(house.id, v.blob)
        uploaded.push(p)
        return p
      }
      const beforePath = await up(before)
      const afterPath = await up(after)

      if (!editing) {
        await h.call('log_chore', {
          p_house: house.id,
          p_task: custom ? null : taskId,
          p_done_at: doneAt.toISOString(),
          p_note: note.trim() || null,
          p_before: beforePath,
          p_after: afterPath,
          p_member: isOwner ? memberId : null,
          p_custom_name: custom ? customName.trim() : null,
          p_points: isOwner ? points : null,
        })
        const who = memberId === me.id ? 'Nice work!' : `Logged for ${h.memberById[memberId]?.name}.`
        toast(`${who} +${isOwner ? points : task.points} points`, 'success')
      } else {
        const l = editLog
        const payload = {}
        if (!custom && taskId && taskId !== l.task_id) payload.task_id = taskId
        if (Math.abs(doneAt - new Date(l.done_at)) >= 60e3) payload.done_at = doneAt.toISOString()
        if ((note.trim() || null) !== (l.note || null)) payload.note = note.trim() || null
        if (beforePath !== (l.before_path || null)) payload.before_path = beforePath
        if (afterPath !== (l.after_path || null)) payload.after_path = afterPath
        if (isOwner) {
          if (custom && !l.task_id && customName.trim() && customName.trim() !== l.task_name) payload.task_name = customName.trim()
          if (memberId !== l.member_id) payload.member_id = memberId
          if (points !== l.points) payload.points = points
        }
        if (!Object.keys(payload).length) {
          toast('Nothing was changed.')
          setBusy(false)
          return
        }
        if (isOwner) {
          const removed = await h.call('owner_update_log', { p_log: l.id, p_payload: payload })
          backend.removePhotos(removed)
          toast('Chore updated', 'success')
        } else {
          await h.call('request_change', { p_log: l.id, p_kind: 'edit', p_payload: payload, p_reason: reason.trim() || null })
          toast('Edit sent to the owner for approval', 'success')
        }
      }
      onClose()
    } catch (e) {
      backend.removePhotos(uploaded)
      toast(toAppError(e).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const title = editing ? (isOwner ? 'Edit chore' : 'Request an edit') : 'Log a chore'
  const pts = custom ? points : isOwner ? points : task?.points ?? 0
  const cta = editing ? (isOwner ? 'Save changes' : 'Send for approval') : hasChore ? `Log it · +${pts} pts` : 'Pick a chore'

  const switcher = !editing && (
    <div className="mode-switch">
      <Segmented value={mode} onChange={setMode} options={[{ value: 'chore', label: 'Log chore' }, { value: 'report', label: 'Report issue' }]} />
    </div>
  )

  if (mode === 'report' && !editing) {
    return (
      <Sheet open={open} onClose={onClose} title="Report an issue" tall footer={report.footer}>
        {switcher}
        {report.body}
      </Sheet>
    )
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      tall
      footer={
        <>
          {photoRequired && !after && hasChore && <p className="foot-hint"><Icon name="camera" size={14} /> Add an “after” photo to log this chore</p>}
          {future && <p className="foot-hint warn">That time is in the future</p>}
          {tooOld && <p className="foot-hint warn">You can log up to 30 days back</p>}
          <Button className="btn-lg" disabled={!valid} loading={busy} onClick={submit}>{cta}</Button>
        </>
      }
    >
      {switcher}
      {isOwner && (
        <div className="field-block">
          <label className="field-label">Who did it?</label>
          <div className="who-row h-scroll">
            {activeMembers.map((m) => (
              <button key={m.id} className={`who ${memberId === m.id ? 'sel' : ''}`} onClick={() => { haptic(); setMemberId(m.id) }} style={{ '--c': m.color || '#8E8E93' }}>
                <Avatar member={m} size={44} />
                <span>{m.id === me.id ? 'Me' : m.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="field-block">
        <label className="field-label">Chore</label>
        {!picking && (task || custom) ? (
          <div className="chosen glass">
            {custom ? (
              <>
                <ChoreIcon icon="other" size={48} />
                <input className="field chosen-input" value={customName} maxLength={40} onChange={(e) => setCustomName(e.target.value)} placeholder="What was done?" autoFocus={!editing} />
              </>
            ) : (
              <>
                <ChoreIcon icon={task.icon} size={48} />
                <span className="chosen-main">
                  <b>{task.name}</b>
                  <span className="muted small">{task.points} points{task.section_id && h.sectionById[task.section_id] ? ` · ${h.sectionById[task.section_id].name}` : ''}</span>
                </span>
              </>
            )}
            <button className="pill-btn" onClick={() => setPicking(true)}>Change</button>
          </div>
        ) : (
          <>
            {tasks.length > 8 && (
              <div className="search glass">
                <Icon name="search" size={18} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chores" />
                {search && <button className="icon-btn" onClick={() => setSearch('')} aria-label="Clear"><Icon name="x" size={14} stroke={2.6} /></button>}
              </div>
            )}
            {groups.map((g) => (
              <div key={g.id || 'loose'} className="task-group">
                {g.name && <h5 className="task-group-name">{g.name}</h5>}
                <div className="task-grid">
                  {g.tasks.map((t) => (
                    <button key={t.id} className={`task-tile glass ${t.id === taskId && !custom ? 'sel' : ''}`} onClick={() => choose(t)}>
                      <ChoreIcon icon={t.icon} size={48} />
                      <span className="task-name">{t.name}</span>
                      <span className="pts pts-sm">+{t.points}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!tasks.length && <p className="muted center-text">No chores set up yet. {isOwner ? 'Add some from the House tab.' : 'Ask the owner to add some.'}</p>}
            {isOwner && (
              <button className="ghost-link" onClick={() => { setCustom(true); setTaskId(null); setPicking(false); setPoints(points || 10) }}>
                <Icon name="sparkles" size={18} /> Log a one-off custom chore
              </button>
            )}
          </>
        )}
        {isOwner && (task || custom) && !picking && (
          <div className="inline-row">
            <span className="muted">Points</span>
            <Stepper value={points} onChange={setPoints} />
          </div>
        )}
      </div>

      <div className="field-block">
        <div className="label-row">
          <label className="field-label">When</label>
          {Math.abs(doneAt - Date.now()) > 90e3 && (
            <button className="pill-btn" onClick={() => { const n = new Date(); setDate(toDateInput(n)); setTime(toTimeInput(n)) }}>Reset to now</button>
          )}
        </div>
        <div className="when">
          <label className="when-part glass">
            <Icon name="calendar" size={18} />
            <span className="when-text">{fmtDayLabel(doneAt)}</span>
            <input type="date" value={date} min={minDate} max={maxDate} onClick={openPicker} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Date" />
          </label>
          <label className="when-part glass">
            <Icon name="clock" size={18} />
            <span className="when-text">{fmtTime(doneAt)}</span>
            <input type="time" value={time} onClick={openPicker} onChange={(e) => e.target.value && setTime(e.target.value)} aria-label="Time" />
          </label>
        </div>
      </div>

      <div className="field-block">
        <label className="field-label">Photos</label>
        <div className="photo-pair">
          <PhotoPicker label="Before" value={before} onChange={setBefore} />
          <PhotoPicker label="After" value={after} onChange={setAfter} required={photoRequired} />
        </div>
      </div>

      <div className="field-block">
        <label className="field-label">Note</label>
        <textarea className="field" rows={2} maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything worth mentioning? (optional)" />
      </div>

      {editing && !isOwner && (
        <div className="field-block">
          <label className="field-label">Why the change?</label>
          <input className="field" maxLength={280} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Picked the wrong chore" />
          <p className="muted small" style={{ marginTop: 8 }}>The owner will review this before it changes.</p>
        </div>
      )}
    </Sheet>
  )
}
