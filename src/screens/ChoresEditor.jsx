import { useEffect, useMemo, useRef, useState } from 'react'
import Sheet, { Page } from '../components/Sheet.jsx'
import { Button, ChoreIcon, Stepper } from '../components/ui.jsx'
import { IconPicker } from '../components/Pickers.jsx'
import { useFeedback } from '../components/Feedback.jsx'
import Icon from '../icons/Icon.jsx'
import { useHouse } from '../store.jsx'
import { haptic } from '../lib/haptics.js'
import { toAppError } from '../lib/errors.js'

function buildItems(tasks, sections) {
  const ids = new Set(sections.map((s) => s.id))
  const items = tasks.filter((t) => !t.section_id || !ids.has(t.section_id)).map((t) => ({ type: 'task', id: t.id, task: t }))
  for (const s of sections) {
    items.push({ type: 'section', id: s.id, section: s })
    for (const t of tasks.filter((x) => x.section_id === s.id)) items.push({ type: 'task', id: t.id, task: t })
  }
  return items
}

export default function ChoresEditor({ open, onClose }) {
  const h = useHouse()
  const { tasks, sections, house } = h
  const { toast, prompt, confirm } = useFeedback()
  const [items, setItems] = useState(() => buildItems(tasks, sections))
  const [drag, setDrag] = useState(null)
  const [editTask, setEditTask] = useState(null) // task object or { new: true, section_id }
  const dragRef = useRef(null)
  const scroller = useRef(null)
  const rowEls = useRef([])

  // Sync from server when not dragging
  useEffect(() => {
    if (!dragRef.current) setItems(buildItems(tasks, sections))
  }, [tasks, sections])

  const run = async (fn, ok) => {
    try {
      await fn()
      if (ok) toast(ok, 'success')
    } catch (e) {
      toast(toAppError(e).message, 'error')
    }
  }

  // ── drag & drop ────────────────────────────────────────────────────────────
  const blockOf = (list, i) => {
    if (list[i].type === 'task') return [i, i + 1]
    let e = i + 1
    while (e < list.length && list[e].type !== 'section') e++
    return [i, e]
  }

  const onHandleDown = (e, index) => {
    e.preventDefault()
    e.stopPropagation()
    const container = scroller.current?.closest('.page-body')
    if (!container) return
    haptic('medium')
    const cRect = container.getBoundingClientRect()
    const st = container.scrollTop
    const rects = items.map((_, i) => {
      const r = rowEls.current[i].getBoundingClientRect()
      return { top: r.top - cRect.top + st, bottom: r.bottom - cRect.top + st }
    })
    const [start, end] = blockOf(items, index)
    let units
    if (items[index].type === 'task') {
      units = items.map((_, i) => [i, i + 1]).filter(([s]) => s < start || s >= end)
    } else {
      units = []
      for (let i = 0; i < items.length; i++) {
        if (items[i].type === 'section' && (i < start || i >= end)) units.push(blockOf(items, i))
      }
    }
    units = units.map(([s, en]) => ({ s, e: en, mid: (rects[s].top + rects[en - 1].bottom) / 2 }))
    const st0 = {
      index, start, end, units, container,
      startY: e.clientY, startScroll: st, y: e.clientY,
      top: rects[start].top, bottom: rects[end - 1].bottom,
      blockH: rects[end - 1].bottom - rects[start].top,
    }
    dragRef.current = st0
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ ...st0, dy: 0, shifted: new Set() })
    const tick = () => {
      const d = dragRef.current
      if (!d) return
      const r = d.container.getBoundingClientRect()
      const edge = 70
      let v = 0
      if (d.y < r.top + edge) v = -Math.ceil((r.top + edge - d.y) / 6)
      else if (d.y > r.bottom - edge) v = Math.ceil((d.y - (r.bottom - edge)) / 6)
      if (v) {
        d.container.scrollTop += v
        update()
      }
      d.raf = requestAnimationFrame(tick)
    }
    st0.raf = requestAnimationFrame(tick)
  }

  const update = () => {
    const d = dragRef.current
    if (!d) return
    let dy = d.y - d.startY + (d.container.scrollTop - d.startScroll)
    const shifted = new Set()
    const top = d.top + dy, bottom = d.bottom + dy
    for (const u of d.units) {
      if (u.s >= d.end && bottom > u.mid) shifted.add(u.s)
      if (u.e <= d.start && top < u.mid) shifted.add(u.s)
    }
    setDrag((prev) => prev && { ...prev, dy, shifted })
  }

  const onHandleMove = (e) => {
    if (!dragRef.current) return
    dragRef.current.y = e.clientY
    update()
  }

  const onHandleUp = () => {
    const d = dragRef.current
    if (!d) return
    cancelAnimationFrame(d.raf)
    dragRef.current = null
    const cur = drag
    setDrag(null)
    if (!cur || !cur.shifted.size) return
    const block = items.slice(d.start, d.end)
    const take = (u) => items.slice(u.s, u.e)
    const before = d.units.filter((u) => u.e <= d.start)
    const after = d.units.filter((u) => u.s >= d.end)
    const covered = new Set()
    d.units.forEach((u) => { for (let i = u.s; i < u.e; i++) covered.add(i) })
    // items that are neither in a unit nor the block (loose tasks during section drag) stay in front
    const fixed = items.filter((_, i) => !covered.has(i) && (i < d.start || i >= d.end))
    const next = [
      ...fixed,
      ...before.filter((u) => !cur.shifted.has(u.s)).flatMap(take),
      ...after.filter((u) => cur.shifted.has(u.s)).flatMap(take),
      ...block,
      ...before.filter((u) => cur.shifted.has(u.s)).flatMap(take),
      ...after.filter((u) => !cur.shifted.has(u.s)).flatMap(take),
    ]
    haptic()
    setItems(next)
    save(next)
  }

  const save = (list) => {
    let sec = null
    const layout = { sections: [], tasks: [] }
    for (const it of list) {
      if (it.type === 'section') {
        sec = it.id
        layout.sections.push(it.id)
      } else layout.tasks.push({ id: it.id, section_id: sec })
    }
    run(() => h.call('reorder', { p_house: house.id, p_layout: layout }))
  }

  const transformFor = (i) => {
    if (!drag) return undefined
    if (i >= drag.start && i < drag.end) return `translateY(${drag.dy}px)`
    const u = drag.units.find((x) => i >= x.s && i < x.e)
    if (u && drag.shifted.has(u.s)) return `translateY(${u.s >= drag.end ? -drag.blockH : drag.blockH}px)`
    return undefined
  }

  const sectionMenu = async (s) => {
    const name = await prompt({ title: 'Rename section', defaultValue: s.name, confirmText: 'Save', maxLength: 30 })
    if (name && name !== s.name) run(() => h.call('upsert_section', { p_house: house.id, p_id: s.id, p_name: name }))
  }

  const total = useMemo(() => tasks.reduce((s, t) => s + t.points, 0), [tasks])

  return (
    <Page open={open} onClose={onClose} title="Chores & points">
      <div className="editor-actions">
        <Button variant="glass" className="btn-sm" onClick={() => setEditTask({ new: true, section_id: null })}><Icon name="plus" size={16} stroke={2.6} /> Chore</Button>
        <Button variant="glass" className="btn-sm" onClick={async () => {
          const n = await prompt({ title: 'New section', message: 'Group chores by room or any way you like.', placeholder: 'e.g. Kitchen', confirmText: 'Add', maxLength: 30 })
          if (n) run(() => h.call('upsert_section', { p_house: house.id, p_id: null, p_name: n }), 'Section added')
        }}><Icon name="plus" size={16} stroke={2.6} /> Section</Button>
      </div>
      <p className="muted small editor-hint"><Icon name="grip" size={14} /> Drag the handle to reorder chores or whole sections. Tap to edit.</p>

      <div className={`editor-list glass ${drag ? 'is-dragging' : ''}`} ref={scroller}>
        {items.length === 0 && <p className="muted center-text" style={{ padding: 24 }}>No chores yet. Add your first one above.</p>}
        {items.map((it, i) => {
          const dragging = drag && i >= drag.start && i < drag.end
          const style = { transform: transformFor(i), transition: dragging || !drag ? 'none' : undefined }
          if (it.type === 'section') {
            const count = items.slice(i + 1).findIndex((x) => x.type === 'section')
            const n = count === -1 ? items.length - i - 1 : count
            return (
              <div key={it.id} ref={(el) => (rowEls.current[i] = el)} className={`ed-section ${dragging ? 'dragging' : ''}`} style={style}>
                <button className="ed-main" onClick={() => sectionMenu(it.section)}>
                  <span className="ed-section-name">{it.section.name}</span>
                  <span className="muted small">{n} {n === 1 ? 'chore' : 'chores'}</span>
                </button>
                <button className="icon-btn" aria-label="Add chore to section" onClick={() => setEditTask({ new: true, section_id: it.id })}><Icon name="plus" size={18} stroke={2.4} /></button>
                <button className="icon-btn" aria-label="Delete section" onClick={async () => {
                  if (await confirm({ title: `Delete “${it.section.name}”?`, message: 'Its chores move to General. Nothing is lost.', confirmText: 'Delete', destructive: true }))
                    run(() => h.call('delete_section', { p_house: house.id, p_id: it.id }))
                }}><Icon name="trash" size={17} /></button>
                <span className="handle" onPointerDown={(e) => onHandleDown(e, i)} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp} aria-label="Drag section">
                  <Icon name="grip" size={20} />
                </span>
              </div>
            )
          }
          return (
            <div key={it.id} ref={(el) => (rowEls.current[i] = el)} className={`ed-task ${dragging ? 'dragging' : ''}`} style={style}>
              <button className="ed-main" onClick={() => setEditTask(it.task)}>
                <ChoreIcon icon={it.task.icon} size={38} />
                <span className="ed-name">{it.task.name}</span>
                <span className="pts pts-sm">{it.task.points}</span>
              </button>
              <span className="handle" onPointerDown={(e) => onHandleDown(e, i)} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp} aria-label="Drag chore">
                <Icon name="grip" size={20} />
              </span>
            </div>
          )
        })}
      </div>
      <p className="footnote">{tasks.length} chores · {total} total points. Changing points only affects future logs.</p>

      <TaskSheet task={editTask} onClose={() => setEditTask(null)} />
    </Page>
  )
}

function TaskSheet({ task, onClose }) {
  const h = useHouse()
  const { toast, confirm } = useFeedback()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('other')
  const [points, setPoints] = useState(10)
  const [section, setSection] = useState('')
  const [busy, setBusy] = useState(false)
  const isNew = task?.new

  useEffect(() => {
    if (!task) return
    setName(isNew ? '' : task.name)
    setIcon(isNew ? 'broom' : task.icon)
    setPoints(isNew ? 10 : task.points)
    setSection((isNew ? task.section_id : task.section_id) || '')
  }, [task, isNew])

  const save = async () => {
    setBusy(true)
    try {
      await h.call('upsert_task', {
        p_house: h.house.id, p_id: isNew ? null : task.id, p_section: section || null,
        p_name: name.trim(), p_icon: icon, p_points: points,
      })
      toast(isNew ? 'Chore added' : 'Saved', 'success')
      onClose()
    } catch (e) {
      toast(toAppError(e).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={!!task}
      onClose={onClose}
      title={isNew ? 'New chore' : 'Edit chore'}
      tall
      footer={<Button className="btn-lg" disabled={!name.trim()} loading={busy} onClick={save}>{isNew ? 'Add chore' : 'Save'}</Button>}
    >
      <div className="task-preview">
        <ChoreIcon icon={icon} size={72} />
        <input className="field" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Chore name" autoFocus={isNew} />
      </div>
      <div className="field-block">
        <label className="field-label">Points</label>
        <div className="inline-row">
          <div className="quick-pts">
            {[3, 5, 10, 15, 20].map((p) => (
              <button key={p} className={`chip ${points === p ? 'on' : ''}`} onClick={() => setPoints(p)}>{p}</button>
            ))}
          </div>
          <Stepper value={points} onChange={setPoints} />
        </div>
      </div>
      <div className="field-block">
        <label className="field-label">Section</label>
        <select className="field" value={section} onChange={(e) => setSection(e.target.value)}>
          <option value="">General (no section)</option>
          {h.sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="field-block">
        <label className="field-label">Icon</label>
        <IconPicker value={icon} onChange={setIcon} />
      </div>
      {!isNew && (
        <Button variant="danger-soft" className="btn-block" onClick={async () => {
          if (await confirm({ title: `Delete “${task.name}”?`, message: 'Past logs of this chore stay in history and keep their points.', confirmText: 'Delete', destructive: true })) {
            try {
              await h.call('delete_task', { p_house: h.house.id, p_id: task.id })
              toast('Chore deleted')
              onClose()
            } catch (e) {
              toast(toAppError(e).message, 'error')
            }
          }
        }}><Icon name="trash" size={18} /> Delete chore</Button>
      )}
    </Sheet>
  )
}
