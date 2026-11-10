import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../icons/Icon.jsx'

// Only shown in local demo mode (no Supabase key): lets you pretend to be each
// roommate on one device to try joining, voting and approvals.
export default function DemoBar({ backend, houseId, onSwitched }) {
  const [open, setOpen] = useState(false)
  const [people, setPeople] = useState([])
  useEffect(() => {
    if (open && houseId) backend.listDemoMembers(houseId).then(setPeople)
  }, [open, houseId, backend])
  const me = backend.currentUser()
  return createPortal(
    <div className={`demobar ${open ? 'open' : ''}`}>
      <button className="demobar-pill" onClick={() => setOpen(!open)}>
        <Icon name="swap" size={14} stroke={2.4} /> Demo
      </button>
      {open && (
        <div className="demobar-panel glass-heavy">
          <p className="demobar-note">Demo mode — data lives only in this browser. Switch device identity to act as another roommate:</p>
          {people.map((p) => (
            <button key={p.user_id} className={`demobar-row ${p.user_id === me ? 'cur' : ''}`} onClick={() => { backend.switchUser(p.user_id); onSwitched() }}>
              <span className="dot" style={{ background: p.color || '#999' }} /> {p.name} {p.role === 'owner' ? '· owner' : ''}
            </button>
          ))}
          <button className="demobar-row" onClick={() => { backend.switchUser(null); onSwitched() }}>
            <Icon name="plus" size={14} /> New device (join as someone new)
          </button>
          <button className="demobar-row danger" onClick={async () => { if (confirm('Erase all demo data?')) { await backend.resetAll(); location.reload() } }}>
            <Icon name="trash" size={14} /> Reset demo data
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}
