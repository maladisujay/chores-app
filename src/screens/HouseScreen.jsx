import { useState } from 'react'
import { useHouse } from '../store.jsx'
import { Avatar, Button, ChoreIcon, Group, Row, Switch } from '../components/ui.jsx'
import Sheet, { Page } from '../components/Sheet.jsx'
import { ColorPicker, PinInput } from '../components/Pickers.jsx'
import { useFeedback } from '../components/Feedback.jsx'
import Icon from '../icons/Icon.jsx'
import { shareInvite, copyText, inviteLink } from '../lib/share.js'
import { toAppError } from '../lib/errors.js'
import { plural } from '../lib/format.js'
import ChoresEditor from './ChoresEditor.jsx'
import ApprovalsPage from './ApprovalsPage.jsx'
import { groupTasks } from '../sheets/LogChoreSheet.jsx'

export default function HouseScreen({ houses, onSwitchHouse, onAddHouse, onLeft, onHousesChanged }) {
  const h = useHouse()
  const { house, me, isOwner, activeMembers, pendingRequests, tasks, backend } = h
  const { toast, confirm, prompt } = useFeedback()
  const [page, setPage] = useState(null) // 'chores' | 'members' | 'approvals' | 'viewChores'
  const [profileOpen, setProfileOpen] = useState(false)
  const [member, setMember] = useState(null)

  const run = async (fn, ok) => {
    try {
      await fn()
      if (ok) toast(ok, 'success')
    } catch (e) {
      toast(toAppError(e).message, 'error')
    }
  }
  const setHouse = (patch, ok) => run(() => h.call('update_house', { p_house: house.id, p_patch: patch }), ok)

  return (
    <div>
      <header className="large-header">
        <div>
          <p className="eyebrow">{plural(activeMembers.length, 'roommate')} · {plural(tasks.length, 'chore')}</p>
          <h1 className="large-title">House</h1>
        </div>
      </header>

      <section className="invite glass-heavy">
        <div className="invite-top">
          <div>
            <span className="code-label">Invite code</span>
            <button className="code-big as-btn" onClick={() => copyText(house.code, toast, 'Code copied')}>{house.code}</button>
          </div>
          <span className={`status-chip ${house.is_open ? 'open' : 'closed'}`}>
            <Icon name={house.is_open ? 'unlock' : 'lock'} size={14} stroke={2.4} /> {house.is_open ? 'Open' : 'Closed'}
          </span>
        </div>
        <p className="muted small">
          {house.is_open ? 'Anyone with this code can join.' : isOwner ? 'New people can’t join until you open the home. Existing members can still sign in.' : 'The home is closed to new members.'}
        </p>
        <div className="invite-actions">
          <Button variant="primary" className="btn-sm" onClick={() => shareInvite(house.name, house.code, toast)}><Icon name="share" size={16} /> Share invite</Button>
          <Button variant="glass" className="btn-sm" onClick={() => copyText(inviteLink(house.code), toast, 'Link copied')}><Icon name="link" size={16} /> Copy link</Button>
        </div>
        {isOwner && (
          <div className="invite-toggle">
            <span>Open to join</span>
            <Switch checked={house.is_open} onChange={(v) => setHouse({ is_open: v }, v ? 'Home is open to join' : 'Home closed to new members')} />
          </div>
        )}
      </section>

      {isOwner && (
        <Group>
          <Row icon="inbox" iconBg="#FF9F0A" label="Approvals" chevron onClick={() => setPage('approvals')} value={pendingRequests.length ? <span className="count-badge">{pendingRequests.length}</span> : 'None'} />
          <Row icon="sparkles" iconBg="#5E5CE6" label="Chores & points" chevron onClick={() => setPage('chores')} value={tasks.length} />
          <Row icon="users" iconBg="#30D158" label="Roommates" chevron onClick={() => setPage('members')} value={activeMembers.length} />
        </Group>
      )}
      {!isOwner && (
        <Group>
          <Row icon="sparkles" iconBg="#5E5CE6" label="Chores & points" chevron onClick={() => setPage('viewChores')} value={tasks.length} />
          <Row icon="users" iconBg="#30D158" label="Roommates" chevron onClick={() => setPage('members')} value={activeMembers.length} />
        </Group>
      )}

      {isOwner ? (
        <Group title="Rules">
          <Row icon="camera" iconBg="#FF9F0A" label="Require “after” photo" sub="Before photos are always optional. You can always log without photos.">
            <Switch checked={house.photo_required} onChange={(v) => setHouse({ photo_required: v })} />
          </Row>
          <Row icon="thumbDown" iconBg="#FF453A" label="Voting window" sub="How long after a chore housemates can vote it incomplete">
            <select className="mini-select" value={house.vote_window_days} onChange={(e) => setHouse({ vote_window_days: Number(e.target.value) })}>
              {[1, 2, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{plural(d, 'day')}</option>)}
            </select>
          </Row>
          <Row icon="calendar" iconBg="#0A84FF" label="Week starts on">
            <select className="mini-select" value={house.week_start} onChange={(e) => setHouse({ week_start: Number(e.target.value) })}>
              <option value={1}>Monday</option>
              <option value={0}>Sunday</option>
            </select>
          </Row>
          <Row icon="edit" iconBg="#8E8E93" label="Home name" value={house.name} chevron onClick={async () => {
            const n = await prompt({ title: 'Rename home', defaultValue: house.name, confirmText: 'Save' })
            if (n) setHouse({ name: n }, 'Renamed')
          }} />
          <Row icon="key" iconBg="#AC8E68" label="New invite code" sub="The old code stops working" chevron onClick={async () => {
            if (await confirm({ title: 'Generate a new code?', message: 'The current code and invite links will stop working.', confirmText: 'Generate' }))
              run(() => h.call('regenerate_code', { p_house: house.id }), 'New code ready')
          }} />
        </Group>
      ) : (
        <Group title="Rules">
          <Row icon="camera" iconBg="#FF9F0A" label="“After” photo" value={house.photo_required ? 'Required' : 'Optional'} />
          <Row icon="thumbDown" iconBg="#FF453A" label="Voting window" value={plural(house.vote_window_days, 'day')} />
        </Group>
      )}

      <Group title="You">
        <button className="row tappable" onClick={() => setProfileOpen(true)}>
          <Avatar member={me} size={40} />
          <span className="row-main"><span className="row-label">{me.name}</span><span className="row-sub">{isOwner ? 'Owner' : 'Member'} · Edit name, color & PIN</span></span>
          <Icon name="chevronR" size={16} className="row-chev" stroke={2.4} />
        </button>
      </Group>

      <Group title={houses.length > 1 ? 'Your homes' : undefined}>
        {houses.length > 1 && houses.map((x) => (
          <Row key={x.id} icon="house" iconBg={x.id === house.id ? 'var(--accent)' : '#8E8E93'} label={x.name} sub={x.role === 'owner' ? 'Owner' : 'Member'} onClick={x.id === house.id ? undefined : () => onSwitchHouse(x.id)}>
            {x.id === house.id && <Icon name="check" size={18} stroke={2.6} className="accent" />}
          </Row>
        ))}
        <Row icon="plus" iconBg="#30D158" label="Join or create another home" chevron onClick={onAddHouse} />
      </Group>

      <Group footer="Signing out only affects this device. Sign back in anytime with your home code, name and PIN.">
        <Row icon="logout" iconBg="#8E8E93" label="Sign out on this device" onClick={async () => {
          if (await confirm({ title: 'Sign out on this device?', message: `You'll need the code ${house.code} and your PIN to sign back in. Note it down!`, confirmText: 'Sign out' }))
            run(async () => { await backend.rpc('sign_out_house', { p_house: house.id }); onLeft() })
        }} />
        {!isOwner && (
          <Row icon="logout" iconBg="#FF453A" label="Leave this home" danger onClick={async () => {
            if (await confirm({ title: `Leave ${house.name}?`, message: 'Your past chores stay in the history. You’ll need to join again to come back.', confirmText: 'Leave', destructive: true }))
              run(async () => { await backend.rpc('leave_house', { p_house: house.id }); onLeft() })
          }} />
        )}
        {isOwner && (
          <Row icon="trash" iconBg="#FF453A" label="Delete this home" danger onClick={async () => {
            const typed = await prompt({ title: 'Delete home permanently?', message: `All chores, history and photos will be erased for everyone. Type “${house.name}” to confirm.`, placeholder: house.name, confirmText: 'Delete' })
            if (typed == null) return
            if (typed.trim().toLowerCase() !== house.name.toLowerCase()) return toast('Name didn’t match — nothing was deleted.', 'error')
            run(async () => {
              const paths = h.logs.flatMap((l) => [l.before_path, l.after_path]).filter(Boolean)
              await backend.removePhotos(paths)
              await backend.rpc('delete_house', { p_house: house.id })
              onLeft()
            }, 'Home deleted')
          }} />
        )}
      </Group>
      <p className="footnote">Chores · made for your home</p>

      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
      <ChoresEditor open={page === 'chores'} onClose={() => setPage(null)} />
      <ApprovalsPage open={page === 'approvals'} onClose={() => setPage(null)} />
      <ChoresList open={page === 'viewChores'} onClose={() => setPage(null)} />
      <Page open={page === 'members'} onClose={() => setPage(null)} title="Roommates" right={isOwner && (
        <button className="icon-btn lg nav-action" aria-label="Add roommate" onClick={async () => {
          const n = await prompt({ title: 'Add a roommate', message: 'They’ll pick this name when joining with the code.', placeholder: 'Name', confirmText: 'Add', maxLength: 24 })
          if (n) run(() => h.call('add_member', { p_house: house.id, p_name: n }), `${n} added`)
        }}><Icon name="plus" size={20} stroke={2.4} /></button>
      )}>
        <MembersList onPick={isOwner ? setMember : null} />
      </Page>
      <MemberSheet member={member} onClose={() => setMember(null)} onHousesChanged={onHousesChanged} />
    </div>
  )
}

function MembersList({ onPick }) {
  const { activeMembers, members, me, house, isOwner } = useHouse()
  const former = members.filter((m) => m.status === 'removed')
  return (
    <>
      <Group footer={isOwner ? (house.is_open ? 'People who haven’t joined yet can join with the code and tap their name.' : 'Open the home so people who haven’t joined can join.') : undefined}>
        {activeMembers.map((m) => (
          <button key={m.id} className={`row ${onPick ? 'tappable' : ''}`} onClick={onPick ? () => onPick(m) : undefined} disabled={!onPick}>
            <Avatar member={m} size={40} />
            <span className="row-main">
              <span className="row-label">{m.name}{m.id === me.id && <span className="you">You</span>}</span>
              <span className="row-sub">{m.role === 'owner' ? 'Owner' : m.claimed ? `Member${isOwner ? ` · ${plural(m.devices, 'device')}` : ''}` : 'Hasn’t joined yet'}</span>
            </span>
            {!m.claimed && <span className="tag">Invited</span>}
            {onPick && <Icon name="chevronR" size={16} className="row-chev" stroke={2.4} />}
          </button>
        ))}
      </Group>
      {former.length > 0 && (
        <Group title="Former roommates" footer="Their past chores stay in the history.">
          {former.map((m) => (
            <div key={m.id} className="row">
              <Avatar member={m} size={36} />
              <span className="row-main"><span className="row-label">{m.name}</span></span>
            </div>
          ))}
        </Group>
      )}
    </>
  )
}

function MemberSheet({ member, onClose }) {
  const h = useHouse()
  const { toast, confirm, prompt } = useFeedback()
  const m = member && (h.memberById[member.id] || member)
  const taken = h.activeMembers.filter((x) => x.id !== m?.id && x.color).map((x) => x.color)
  const run = async (fn, ok, close) => {
    try {
      await fn()
      if (ok) toast(ok, 'success')
      if (close) onClose()
    } catch (e) {
      toast(toAppError(e).message, 'error')
    }
  }
  return (
    <Sheet open={!!member} onClose={onClose} title={m?.name || ''}>
      {m && (
        <div className="member-sheet">
          <div className="center"><Avatar member={m} size={80} ring /></div>
          <Group>
            <Row icon="edit" iconBg="#8E8E93" label="Name" value={m.name} chevron onClick={async () => {
              const n = await prompt({ title: 'Rename', defaultValue: m.name, confirmText: 'Save', maxLength: 24 })
              if (n) run(() => h.call('update_member', { p_member: m.id, p_name: n, p_color: null }), 'Saved')
            }} />
          </Group>
          {m.claimed && (
            <>
              <h4 className="group-title">Color</h4>
              <ColorPicker value={m.color} taken={taken} onChange={(c) => run(() => h.call('update_member', { p_member: m.id, p_name: null, p_color: c }))} />
            </>
          )}
          {m.id !== h.me.id && (
            <Group footer={m.claimed ? 'Reset signs them out everywhere and frees their name so they can join again with a new PIN (for a lost phone or forgotten PIN).' : undefined}>
              {m.claimed && (
                <Row icon="key" iconBg="#FF9F0A" label="Reset sign-in & PIN" onClick={async () => {
                  if (await confirm({ title: `Reset ${m.name}?`, message: `They'll be signed out and can re-join with the code${h.house.is_open ? '' : ' once you open the home'}. Their history is kept.`, confirmText: 'Reset' }))
                    run(() => h.call('reset_member', { p_member: m.id }), `${m.name} can now re-join`, true)
                }} />
              )}
              {m.claimed && (
                <Row icon="crown" iconBg="#5E5CE6" label="Make owner" onClick={async () => {
                  if (await confirm({ title: `Make ${m.name} the owner?`, message: 'You will become a regular member and lose owner controls.', confirmText: 'Transfer', destructive: true }))
                    run(() => h.call('transfer_owner', { p_member: m.id }), `${m.name} is now the owner`, true)
                }} />
              )}
              <Row icon="trash" iconBg="#FF453A" label={m.claimed ? 'Remove from home' : 'Remove invite'} danger onClick={async () => {
                if (await confirm({ title: `Remove ${m.name}?`, message: m.claimed ? 'They lose access. Their past chores stay in the history.' : 'They won’t be able to pick this name when joining.', confirmText: 'Remove', destructive: true }))
                  run(() => h.call('remove_member', { p_member: m.id }), `${m.name} removed`, true)
              }} />
            </Group>
          )}
        </div>
      )}
    </Sheet>
  )
}

function ProfileSheet({ open, onClose }) {
  const h = useHouse()
  const { me, activeMembers, house } = h
  const { toast, prompt } = useFeedback()
  const [pinMode, setPinMode] = useState(false)
  const [pin, setPin] = useState('')
  const taken = activeMembers.filter((x) => x.id !== me.id && x.color).map((x) => x.color)
  const run = async (fn, ok) => {
    try {
      await fn()
      if (ok) toast(ok, 'success')
    } catch (e) {
      toast(toAppError(e).message, 'error')
    }
  }
  return (
    <Sheet open={open} onClose={() => { setPinMode(false); setPin(''); onClose() }} title="Your profile">
      <div className="center"><Avatar member={me} size={84} ring /></div>
      <Group>
        <Row icon="edit" iconBg="#8E8E93" label="Name" value={me.name} chevron onClick={async () => {
          const n = await prompt({ title: 'Your name', defaultValue: me.name, confirmText: 'Save', maxLength: 24 })
          if (n) run(() => h.call('update_member', { p_member: me.id, p_name: n, p_color: null }), 'Saved')
        }} />
      </Group>
      <h4 className="group-title">Your color</h4>
      <ColorPicker value={me.color} taken={taken} onChange={(c) => run(() => h.call('update_member', { p_member: me.id, p_name: null, p_color: c }))} />
      <Group footer={`To sign in on another device: open the app, tap “Join with a code”, enter ${house.code}, pick your name and enter your PIN.`}>
        {!pinMode ? (
          <Row icon="key" iconBg="#FF9F0A" label="Change PIN" chevron onClick={() => setPinMode(true)} />
        ) : (
          <div className="pin-change">
            <span className="muted small">New 4-digit PIN</span>
            <PinInput value={pin} onChange={setPin} autoFocus />
            <Button className="btn-sm" disabled={pin.length !== 4} onClick={() => run(async () => { await h.call('set_pin', { p_house: house.id, p_pin: pin }); setPinMode(false); setPin('') }, 'PIN updated')}>Save PIN</Button>
          </div>
        )}
      </Group>
    </Sheet>
  )
}

function ChoresList({ open, onClose }) {
  const { tasks, sections } = useHouse()
  return (
    <Page open={open} onClose={onClose} title="Chores">
      {groupTasks(tasks, sections).map((g) => (
        <Group key={g.id || 'loose'} title={g.name}>
          {g.tasks.map((t) => (
            <div key={t.id} className="row">
              <ChoreIcon icon={t.icon} size={38} />
              <span className="row-main"><span className="row-label">{t.name}</span></span>
              <span className="pts pts-sm">{t.points}</span>
            </div>
          ))}
        </Group>
      ))}
      <p className="footnote">Only the owner can change chores and points.</p>
    </Page>
  )
}
