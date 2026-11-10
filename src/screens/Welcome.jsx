import { useEffect, useMemo, useState } from 'react'
import Icon from '../icons/Icon.jsx'
import { Avatar, Button, ChoreIcon, Spinner, Switch } from '../components/ui.jsx'
import { ColorPicker, PinInput } from '../components/Pickers.jsx'
import { useFeedback } from '../components/Feedback.jsx'
import { MEMBER_COLORS, PRESET_SECTIONS } from '../lib/presets.js'
import { haptic } from '../lib/haptics.js'
import { toAppError } from '../lib/errors.js'
import { shareInvite } from '../lib/share.js'

export default function Welcome({ backend, joinCode, onDone, onCancel }) {
  const [mode, setMode] = useState(joinCode ? 'join' : 'start')
  useEffect(() => {
    if (joinCode) setMode('join')
  }, [joinCode])

  if (mode === 'create') return <CreateFlow backend={backend} onBack={() => setMode('start')} onDone={onDone} />
  if (mode === 'join') return <JoinFlow backend={backend} initialCode={joinCode} onBack={() => (joinCode && onCancel ? onCancel() : setMode('start'))} onDone={onDone} />

  return (
    <div className="welcome">
      {onCancel && (
        <button className="welcome-close lg icon-btn" onClick={onCancel} aria-label="Back">
          <Icon name="x" size={18} stroke={2.4} />
        </button>
      )}
      <div className="hero">
        <div className="hero-orbit">
          {['broom', 'sink', 'toilet', 'laundry', 'plant', 'vacuum', 'dishes', 'trash'].map((k, i) => (
            <span key={k} className="orbit-item" style={{ '--i': i }}>
              <ChoreIcon icon={k} size={54} />
            </span>
          ))}
          <div className="hero-core lg">
            <img src="icon.svg" alt="" />
          </div>
        </div>
        <h1 className="hero-title">Chores</h1>
        <p className="hero-sub">Share the load. Track who did what, earn points and keep your home sparkling together.</p>
      </div>
      <div className="welcome-actions">
        <Button onClick={() => setMode('create')} className="btn-lg">
          <Icon name="plus" size={20} stroke={2.6} /> Create a home
        </Button>
        <Button variant="glass" onClick={() => setMode('join')} className="btn-lg">
          <Icon name="key" size={20} /> Join with a code
        </Button>
        <p className="welcome-fine">Already joined on another device or the home-screen app? Tap <b>Join with a code</b> and pick your name.</p>
        {backend.mode === 'demo' && (
          <p className="notice warn glass small">
            <Icon name="info" size={16} />
            <span>Demo mode: no server is connected, so data stays in this browser only. Add your Supabase key in src/config.js to share with roommates.</span>
          </p>
        )}
      </div>
    </div>
  )
}

function FlowShell({ title, step, steps, onBack, children, footer }) {
  return (
    <div className="flow">
      <header className="flow-head">
        <button className="icon-btn lg" onClick={onBack} aria-label="Back">
          <Icon name="chevronL" size={20} stroke={2.4} />
        </button>
        {steps > 1 && (
          <div className="flow-dots">
            {Array.from({ length: steps }).map((_, i) => (
              <span key={i} className={i <= step ? 'on' : ''} />
            ))}
          </div>
        )}
        <span style={{ width: 40 }} />
      </header>
      <div className="flow-body">
        <h1 className="flow-title">{title}</h1>
        {children}
      </div>
      {footer && <div className="flow-foot">{footer}</div>}
    </div>
  )
}

// ─── Create a home ────────────────────────────────────────────────────────────
function CreateFlow({ backend, onBack, onDone }) {
  const { toast } = useFeedback()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [myName, setMyName] = useState('')
  const [color, setColor] = useState(MEMBER_COLORS[6].hex)
  const [mates, setMates] = useState([])
  const [mateInput, setMateInput] = useState('')
  const [sections, setSections] = useState(() =>
    PRESET_SECTIONS.map((s) => ({ ...s, on: true, tasks: s.tasks.map((t) => ({ ...t, on: true })) })),
  )
  const [photoRequired, setPhotoRequired] = useState(false)
  const [isOpen, setIsOpen] = useState(true)
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(null)

  const addMate = () => {
    const n = mateInput.trim().replace(/\s+/g, ' ').slice(0, 24)
    if (!n) return
    if ([myName, ...mates].some((m) => m.trim().toLowerCase() === n.toLowerCase())) {
      toast('That name is already on the list.', 'error')
      return
    }
    haptic()
    setMates([...mates, n])
    setMateInput('')
  }

  const toggleTask = (si, ti) =>
    setSections((ss) => ss.map((s, i) => (i !== si ? s : { ...s, tasks: s.tasks.map((t, j) => (j === ti ? { ...t, on: !t.on } : t)) })))
  const toggleSection = (si) =>
    setSections((ss) => ss.map((s, i) => (i !== si ? s : { ...s, on: !s.on, tasks: s.tasks.map((t) => ({ ...t, on: !s.on })) })))

  const choreCount = sections.reduce((n, s) => n + s.tasks.filter((t) => t.on).length, 0)

  const create = async () => {
    setBusy(true)
    try {
      const id = await backend.rpc('create_house', {
        p_name: name.trim(),
        p_owner_name: myName.trim(),
        p_owner_color: color,
        p_pin: pin,
        p_photo_required: photoRequired,
        p_is_open: isOpen,
        p_setup: {
          members: mates,
          sections: sections
            .map((s) => ({ name: s.name, tasks: s.tasks.filter((t) => t.on) }))
            .filter((s) => s.tasks.length),
        },
      })
      const house = await backend.rpc('get_house', { p_house: id })
      haptic('success')
      setCreated({ id, code: house.house.code, name: house.house.name })
    } catch (e) {
      toast(toAppError(e).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (created) {
    return (
      <div className="flow">
        <div className="flow-body center">
          <div className="success-burst">
            <ChoreIcon icon="other" size={96} />
          </div>
          <h1 className="flow-title">{created.name} is ready!</h1>
          <p className="muted">Share this code with your roommates. They pick their name, choose a color and they're in.</p>
          <div className="code-card glass-heavy">
            <span className="code-label">Home code</span>
            <span className="code-big">{created.code}</span>
          </div>
          <div className="row-actions">
            <Button variant="glass" onClick={() => shareInvite(created.name, created.code, toast)}>
              <Icon name="share" size={18} /> Share invite
            </Button>
          </div>
        </div>
        <div className="flow-foot">
          <Button className="btn-lg" onClick={() => onDone(created.id)}>
            Go to my home
          </Button>
        </div>
      </div>
    )
  }

  const steps = [
    {
      title: 'Create your home',
      valid: name.trim() && myName.trim() && color,
      body: (
        <>
          <label className="field-label">Home name</label>
          <input className="field" placeholder="e.g. The Loft" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoFocus />
          <label className="field-label">Your name</label>
          <input className="field" placeholder="What roommates call you" value={myName} maxLength={24} onChange={(e) => setMyName(e.target.value)} />
          <label className="field-label">Your color</label>
          <ColorPicker value={color} onChange={setColor} />
          {myName.trim() && (
            <div className="preview-chip glass">
              <Avatar member={{ name: myName, color }} size={34} /> <span>{myName.trim()}</span>
              <span className="tag">Owner</span>
            </div>
          )}
        </>
      ),
    },
    {
      title: 'Who lives here?',
      valid: true,
      body: (
        <>
          <p className="muted">Add your roommates' names. When they join with the code they just tap their name and pick a color. You can also do this later.</p>
          <form
            className="inline-add"
            onSubmit={(e) => {
              e.preventDefault()
              addMate()
            }}
          >
            <input className="field" placeholder="Roommate's name" value={mateInput} maxLength={24} onChange={(e) => setMateInput(e.target.value)} />
            <button className="btn btn-primary btn-square" type="submit" disabled={!mateInput.trim()} aria-label="Add">
              <Icon name="plus" size={22} stroke={2.6} />
            </button>
          </form>
          <div className="mate-list">
            <div className="mate glass">
              <Avatar member={{ name: myName, color }} size={34} />
              <span>{myName}</span>
              <span className="tag">You · Owner</span>
            </div>
            {mates.map((m, i) => (
              <div className="mate glass" key={m}>
                <Avatar member={{ name: m }} size={34} />
                <span>{m}</span>
                <button className="icon-btn" onClick={() => setMates(mates.filter((_, j) => j !== i))} aria-label={`Remove ${m}`}>
                  <Icon name="x" size={16} stroke={2.4} />
                </button>
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      title: 'Pick your chores',
      valid: true,
      body: (
        <>
          <p className="muted">Start with these and fine-tune names, icons, points, sections and order anytime from the House tab.</p>
          {sections.map((s, si) => (
            <div key={s.name} className="preset-sec">
              <button className="preset-sec-head" onClick={() => toggleSection(si)}>
                <span>{s.name}</span>
                <span className="muted small">{s.tasks.filter((t) => t.on).length}/{s.tasks.length}</span>
              </button>
              <div className="glass preset-list">
                {s.tasks.map((t, ti) => (
                  <button key={t.name} className={`preset-item ${t.on ? 'on' : ''}`} onClick={() => toggleTask(si, ti)}>
                    <ChoreIcon icon={t.icon} size={36} />
                    <span className="preset-name">{t.name}</span>
                    <span className="pts pts-sm">{t.points}</span>
                    <span className={`check ${t.on ? 'on' : ''}`}>{t.on && <Icon name="check" size={14} stroke={3} />}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </>
      ),
    },
    {
      title: 'House rules',
      valid: pin.length === 4,
      body: (
        <>
          <div className="glass group-body">
            <div className="row">
              <span className="row-ico" style={{ background: '#FF9F0A' }}><Icon name="camera" size={17} stroke={2.2} /></span>
              <span className="row-main">
                <span className="row-label">Require “after” photo</span>
                <span className="row-sub">Roommates must snap a photo when logging. Before photos stay optional.</span>
              </span>
              <Switch checked={photoRequired} onChange={setPhotoRequired} />
            </div>
            <div className="row">
              <span className="row-ico" style={{ background: '#30D158' }}><Icon name={isOpen ? 'unlock' : 'lock'} size={17} stroke={2.2} /></span>
              <span className="row-main">
                <span className="row-label">Open to join</span>
                <span className="row-sub">People with the code can join. Close it once everyone's in.</span>
              </span>
              <Switch checked={isOpen} onChange={setIsOpen} />
            </div>
          </div>
          <label className="field-label" style={{ marginTop: 24 }}>Your 4-digit PIN</label>
          <p className="muted small">Use it to sign in on another phone or the home-screen app. Don't forget it!</p>
          <PinInput value={pin} onChange={setPin} />
        </>
      ),
    },
  ]
  const cur = steps[step]

  return (
    <FlowShell
      title={cur.title}
      step={step}
      steps={steps.length}
      onBack={() => (step === 0 ? onBack() : setStep(step - 1))}
      footer={
        <Button
          className="btn-lg"
          disabled={!cur.valid}
          loading={busy}
          onClick={() => {
            haptic()
            if (step < steps.length - 1) setStep(step + 1)
            else create()
          }}
        >
          {step === 0 ? 'Continue' : step === 1 ? (mates.length ? `Continue with ${mates.length + 1} people` : 'Skip for now') : step === 2 ? `Continue with ${choreCount} chores` : 'Create home'}
        </Button>
      }
    >
      {cur.body}
    </FlowShell>
  )
}

// ─── Join / sign back in ──────────────────────────────────────────────────────
function JoinFlow({ backend, initialCode, onBack, onDone }) {
  const { toast } = useFeedback()
  const [code, setCode] = useState(initialCode || '')
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [who, setWho] = useState(null) // { kind: 'claim'|'new'|'rejoin', member }
  const [newName, setNewName] = useState('')
  const [color, setColor] = useState(null)
  const [pin, setPin] = useState('')

  const lookup = async (c = code) => {
    const clean = c.trim().toUpperCase()
    if (clean.length !== 6) return
    setBusy(true)
    try {
      const p = await backend.rpc('preview_house', { p_code: clean })
      if (p.already_member) {
        onDone(p.id)
        return
      }
      setPreview(p)
    } catch (e) {
      toast(toAppError(e).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (initialCode) lookup(initialCode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode])

  const taken = useMemo(() => (preview?.members || []).filter((m) => m.color && m.id !== who?.member?.id).map((m) => m.color), [preview, who])

  const submit = async () => {
    setBusy(true)
    try {
      let id
      if (who.kind === 'rejoin') {
        id = await backend.rpc('rejoin_house', { p_code: code, p_member: who.member.id, p_pin: pin })
        if (!id) {
          setPin('')
          throw toAppError('WRONG_PIN')
        }
      } else {
        id = await backend.rpc('join_house', {
          p_code: code,
          p_member: who.kind === 'claim' ? who.member.id : null,
          p_name: who.kind === 'new' ? newName.trim() : null,
          p_color: color,
          p_pin: pin,
        })
      }
      haptic('success')
      onDone(id)
    } catch (e) {
      const err = toAppError(e)
      toast(err.message, 'error')
      if (err.code === 'COLOR_TAKEN' || err.code === 'ALREADY_CLAIMED' || err.code === 'NAME_TAKEN') {
        lookup()
      }
    } finally {
      setBusy(false)
    }
  }

  // Step 1: code
  if (!preview) {
    return (
      <FlowShell
        title="Join a home"
        onBack={onBack}
        footer={
          <Button className="btn-lg" disabled={code.trim().length !== 6} loading={busy} onClick={() => lookup()}>
            Continue
          </Button>
        }
      >
        <p className="muted">Enter the 6-character code the owner shared with you.</p>
        <form onSubmit={(e) => { e.preventDefault(); lookup() }}>
          <input
            className="field code-field"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="ABC123"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            autoFocus={!initialCode}
            aria-label="Home code"
          />
        </form>
        {busy && initialCode && <div className="center" style={{ marginTop: 24 }}><Spinner /></div>}
      </FlowShell>
    )
  }

  // Step 2: who are you
  if (!who) {
    const unclaimed = preview.members.filter((m) => !m.claimed)
    const claimed = preview.members.filter((m) => m.claimed)
    return (
      <FlowShell title={preview.name} onBack={() => setPreview(null)}>
        {!preview.is_open && (
          <div className="notice warn glass">
            <Icon name="lock" size={18} /> This home is closed to new members. You can still sign back in if you already joined.
          </div>
        )}
        {unclaimed.length > 0 && (
          <>
            <h4 className="group-title">Which one is you?</h4>
            <div className="glass group-body">
              {unclaimed.map((m) => (
                <button
                  key={m.id}
                  className="row tappable"
                  disabled={!preview.is_open}
                  onClick={() => {
                    setWho({ kind: 'claim', member: m })
                    setColor(null)
                    setPin('')
                  }}
                >
                  <Avatar member={{ name: m.name }} size={36} />
                  <span className="row-main"><span className="row-label">{m.name}</span><span className="row-sub">Not joined yet</span></span>
                  <Icon name="chevronR" size={16} className="row-chev" stroke={2.4} />
                </button>
              ))}
            </div>
          </>
        )}
        {preview.is_open && (
          <button className="ghost-link" onClick={() => { setWho({ kind: 'new' }); setColor(null); setPin('') }}>
            <Icon name="plus" size={18} stroke={2.4} /> I'm not on the list
          </button>
        )}
        {claimed.length > 0 && (
          <>
            <h4 className="group-title">Already joined? Sign back in</h4>
            <div className="glass group-body">
              {claimed.map((m) => (
                <button key={m.id} className="row tappable" onClick={() => { setWho({ kind: 'rejoin', member: m }); setPin('') }}>
                  <Avatar member={m} size={36} />
                  <span className="row-main"><span className="row-label">{m.name}</span><span className="row-sub">{m.role === 'owner' ? 'Owner · ' : ''}Use your PIN</span></span>
                  <Icon name="chevronR" size={16} className="row-chev" stroke={2.4} />
                </button>
              ))}
            </div>
          </>
        )}
      </FlowShell>
    )
  }

  // Step 3a: sign back in
  if (who.kind === 'rejoin') {
    return (
      <FlowShell
        title={`Welcome back, ${who.member.name}`}
        onBack={() => setWho(null)}
        footer={<Button className="btn-lg" disabled={pin.length !== 4} loading={busy} onClick={submit}>Sign in</Button>}
      >
        <div className="center" style={{ margin: '8px 0 20px' }}><Avatar member={who.member} size={72} ring /></div>
        <p className="muted center-text">Enter the 4-digit PIN you chose when you joined.</p>
        <PinInput value={pin} onChange={setPin} autoFocus />
        <p className="muted small center-text" style={{ marginTop: 18 }}>Forgot it? Ask the owner to reset you from the House tab, then join again.</p>
      </FlowShell>
    )
  }

  // Step 3b: claim a name / new member
  const displayName = who.kind === 'claim' ? who.member.name : newName.trim()
  const valid = color && pin.length === 4 && (who.kind === 'claim' || newName.trim())
  return (
    <FlowShell
      title={who.kind === 'claim' ? `Hi ${who.member.name}!` : 'Introduce yourself'}
      onBack={() => setWho(null)}
      footer={<Button className="btn-lg" disabled={!valid} loading={busy} onClick={submit}>Join {preview.name}</Button>}
    >
      {who.kind === 'new' && (
        <>
          <label className="field-label">Your name</label>
          <input className="field" value={newName} maxLength={24} onChange={(e) => setNewName(e.target.value)} placeholder="Your name" autoFocus />
        </>
      )}
      <label className="field-label">Pick your color</label>
      <ColorPicker value={color} onChange={setColor} taken={taken} />
      {displayName && color && (
        <div className="preview-chip glass">
          <Avatar member={{ name: displayName, color }} size={34} /> <span>{displayName}</span>
        </div>
      )}
      <label className="field-label" style={{ marginTop: 22 }}>Choose a 4-digit PIN</label>
      <p className="muted small">You'll use it to sign in on another device or from the home-screen app.</p>
      <PinInput value={pin} onChange={setPin} />
    </FlowShell>
  )
}
