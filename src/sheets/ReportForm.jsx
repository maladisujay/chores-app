import { useEffect, useState } from 'react'
import PhotoPicker from '../components/PhotoPicker.jsx'
import { Avatar, Button, ChoreIcon, Switch } from '../components/ui.jsx'
import { useFeedback } from '../components/Feedback.jsx'
import Icon from '../icons/Icon.jsx'
import { useHouse } from '../store.jsx'
import { REPORT_CATEGORIES } from '../lib/reports.js'
import { haptic } from '../lib/haptics.js'
import { toAppError } from '../lib/errors.js'

const MAX_PHOTOS = 4

// Returns the form body + sticky footer so it can live inside the "+" sheet.
export function useReportForm({ active, onDone }) {
  const h = useHouse()
  const { toast } = useFeedback()
  const { me, house, activeMembers, tasks, backend } = h
  const [category, setCategory] = useState('undone')
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [about, setAbout] = useState(null)
  const [taskId, setTaskId] = useState('')
  const [photos, setPhotos] = useState([])
  const [anonymous, setAnonymous] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!active) return
    setCategory('undone')
    setTitle('')
    setDetails('')
    setAbout(null)
    setTaskId('')
    setPhotos([])
    setAnonymous(false)
  }, [active])

  // Picking a chore pre-fills a sensible title for "undone" reports.
  const pickTask = (id) => {
    setTaskId(id)
    const t = tasks.find((x) => x.id === id)
    if (t && !title.trim()) setTitle(category === 'undone' ? `${t.name} wasn't done` : t.name)
  }

  const valid = title.trim().length > 0
  const submit = async () => {
    if (!valid) return
    setBusy(true)
    const uploaded = []
    try {
      for (const p of photos) uploaded.push(await backend.uploadPhoto(house.id, p.blob))
      await h.call('create_report', {
        p_house: house.id,
        p_category: category,
        p_title: title.trim(),
        p_details: details.trim() || null,
        p_about: about,
        p_task: taskId || null,
        p_photos: uploaded,
        p_anonymous: anonymous,
      })
      haptic('success')
      toast(anonymous ? 'Report posted anonymously' : 'Report posted', 'success')
      onDone?.()
    } catch (e) {
      backend.removePhotos(uploaded)
      toast(toAppError(e).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const others = activeMembers.filter((m) => m.id !== me.id)

  const body = (
    <>
      <div className="field-block">
        <label className="field-label">What's going on?</label>
        <div className="cat-grid">
          {Object.entries(REPORT_CATEGORIES).map(([k, c]) => (
            <button key={k} className={`cat ${category === k ? 'sel' : ''}`} style={{ '--cat': c.color }} onClick={() => { haptic(); setCategory(k) }}>
              <span className="cat-ico"><Icon name={c.icon} size={18} stroke={2.2} /></span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="field-block">
        <label className="field-label">Title</label>
        <input className="field" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Dishes left in the sink since Monday" />
      </div>

      <div className="field-block">
        <label className="field-label">Photos</label>
        <div className="report-photos">
          {photos.map((p, i) => (
            <PhotoPicker key={p.url} label={`Photo ${i + 1}`} value={p} onChange={(v) => setPhotos((ps) => (v ? ps.map((x, j) => (j === i ? v : x)) : ps.filter((_, j) => j !== i)))} />
          ))}
          {photos.length < MAX_PHOTOS && (
            <PhotoPicker key={`add-${photos.length}`} label="Add photo" hint={`Up to ${MAX_PHOTOS}`} value={null} onChange={(v) => v && setPhotos((ps) => [...ps, v].slice(0, MAX_PHOTOS))} />
          )}
        </div>
      </div>

      <div className="field-block">
        <label className="field-label">Details</label>
        <textarea className="field" rows={3} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Where, when, anything that helps (optional)" />
      </div>

      {others.length > 0 && (
        <div className="field-block">
          <label className="field-label">About someone? (optional)</label>
          <div className="who-row h-scroll">
            <button className={`who ${about === null ? 'sel' : ''}`} onClick={() => setAbout(null)} style={{ '--c': '#8E8E93' }}>
              <span className="who-none"><Icon name="users" size={22} /></span>
              <span>No one</span>
            </button>
            {others.map((m) => (
              <button key={m.id} className={`who ${about === m.id ? 'sel' : ''}`} onClick={() => { haptic(); setAbout(m.id) }} style={{ '--c': m.color || '#8E8E93' }}>
                <Avatar member={m} size={44} />
                <span>{m.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="field-block">
          <label className="field-label">Related chore (optional)</label>
          <div className="select-row">
            {taskId ? <ChoreIcon icon={tasks.find((t) => t.id === taskId)?.icon} size={36} /> : <span className="select-ph"><Icon name="sparkles" size={18} /></span>}
            <select className="field" value={taskId} onChange={(e) => pickTask(e.target.value)}>
              <option value="">None</option>
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="group-body anon-row">
        <div className="row">
          <span className="row-ico" style={{ background: '#5856D6' }}><Icon name="eyeOff" size={17} stroke={2.2} /></span>
          <span className="row-main">
            <span className="row-label">Post anonymously</span>
            <span className="row-sub">Nobody, including the owner, will see it was you.</span>
          </span>
          <Switch checked={anonymous} onChange={setAnonymous} />
        </div>
      </div>
    </>
  )

  const footer = (
    <Button className="btn-lg" disabled={!valid} loading={busy} onClick={submit}>
      <Icon name="megaphone" size={19} /> Post report
    </Button>
  )
  return { body, footer }
}
