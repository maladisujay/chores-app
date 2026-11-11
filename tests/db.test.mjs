import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { DEMO_PRELUDE } from '../src/lib/demoPrelude.js'

const db = new PGlite()
await db.exec(DEMO_PRELUDE)
await db.exec(readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8'))
await db.exec(readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')) // idempotent

let uid = null
const users = { owner: crypto.randomUUID(), alex: crypto.randomUUID(), sam: crypto.randomUUID(), jo: crypto.randomUUID(), alex2: crypto.randomUUID(), stranger: crypto.randomUUID() }
const as = (u) => { uid = users[u] }
async function rpc(fn, args = {}) {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ''])
  const keys = Object.keys(args)
  const sql = `select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as r`
  const vals = keys.map((k) => (args[k] !== null && typeof args[k] === 'object' ? JSON.stringify(args[k]) : args[k]))
  const res = await db.query(sql, vals)
  return res.rows[0]?.r
}
let pass = 0, fail = 0
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.log('  ✗', msg) } }
async function throws(code, p, msg) {
  try { await p; fail++; console.log('  ✗ expected', code, '-', msg) }
  catch (e) { if (String(e.message).includes(code)) pass++; else { fail++; console.log('  ✗', msg, 'got', e.message) } }
}

const now = new Date().toISOString()
as('owner')
const houseId = await rpc('create_house', {
  p_name: '  The  Loft ', p_owner_name: 'Owner', p_owner_color: '#0a84ff', p_pin: '1234',
  p_photo_required: true, p_is_open: true,
  p_setup: { members: ['Alex', 'Sam', 'alex', ''], sections: [{ name: 'Kitchen', tasks: [{ name: 'Dishes', icon: 'sink', points: 10 }, { name: 'Counters', icon: 'counter', points: 6 }] }, { name: 'Bathroom', tasks: [{ name: 'Toilet', icon: 'toilet', points: 15 }] }] }
})
ok(houseId, 'house created')
let H = await rpc('get_house', { p_house: houseId })
ok(H.house.name === 'The Loft', 'name cleaned')
ok(H.members.length === 3, 'dup member names deduped: ' + H.members.length)
ok(H.tasks.length === 3 && H.sections.length === 2, 'tasks/sections')
const code = H.house.code
ok(/^[A-Z2-9]{6}$/.test(code), 'code format')

as('alex')
await throws('NOT_MEMBER', rpc('get_house', { p_house: houseId }), 'stranger cannot read')
let P = await rpc('preview_house', { p_code: code.toLowerCase() })
ok(P.members.length === 3 && P.is_open, 'preview')
const alexSlot = P.members.find((m) => m.name === 'Alex').id
const samSlot = P.members.find((m) => m.name === 'Sam').id
const ownerId = P.members.find((m) => m.role === 'owner').id
await throws('COLOR_TAKEN', rpc('join_house', { p_code: code, p_member: alexSlot, p_name: null, p_color: '#0A84FF', p_pin: '1111' }), 'color taken')
await throws('BAD_PIN', rpc('join_house', { p_code: code, p_member: alexSlot, p_name: null, p_color: '#FF453A', p_pin: '12' }), 'bad pin')
ok(await rpc('join_house', { p_code: code, p_member: alexSlot, p_name: null, p_color: '#FF453A', p_pin: '1111' }) === houseId, 'alex joined')
ok(await rpc('join_house', { p_code: code, p_member: alexSlot, p_name: null, p_color: '#FF453A', p_pin: '1111' }) === houseId, 'join idempotent')
as('sam')
await throws('ALREADY_CLAIMED', rpc('join_house', { p_code: code, p_member: alexSlot, p_name: null, p_color: '#30D158', p_pin: '2222' }), 'claimed slot')
await rpc('join_house', { p_code: code, p_member: samSlot, p_name: null, p_color: '#30D158', p_pin: '2222' })
as('owner')
await rpc('update_house', { p_house: houseId, p_patch: { is_open: false } })
as('jo')
await throws('HOUSE_CLOSED', rpc('join_house', { p_code: code, p_member: null, p_name: 'Jo', p_color: '#FFD60A', p_pin: '3333' }), 'closed')
as('owner')
await rpc('update_house', { p_house: houseId, p_patch: { is_open: true } })
as('jo')
await throws('NAME_TAKEN', rpc('join_house', { p_code: code, p_member: null, p_name: 'SAM', p_color: '#FFD60A', p_pin: '3333' }), 'name taken')
await rpc('join_house', { p_code: code, p_member: null, p_name: 'Jo', p_color: '#FFD60A', p_pin: '3333' })

// rejoin from second device, wrong pin lockout
as('alex2')
ok(await rpc('rejoin_house', { p_code: code, p_member: alexSlot, p_pin: '9999' }) === null, 'wrong pin returns null')
for (let i = 0; i < 4; i++) await rpc('rejoin_house', { p_code: code, p_member: alexSlot, p_pin: '9999' })
await throws('PIN_LOCKED', rpc('rejoin_house', { p_code: code, p_member: alexSlot, p_pin: '1111' }), 'locked after 5')
await db.query(`update member_secrets set locked_until = null, failed_attempts = 0`)
ok(await rpc('rejoin_house', { p_code: code, p_member: alexSlot, p_pin: '1111' }) === houseId, 'rejoin ok')
as('alex')
ok((await rpc('get_house', { p_house: houseId })).me.name === 'Alex', 'first device still works')

// logging
H = await rpc('get_house', { p_house: houseId })
const dishes = H.tasks.find((t) => t.name === 'Dishes')
const alexId = alexSlot, samId = samSlot
const joId = H.members.find((m) => m.name === 'Jo').id
await throws('PHOTO_REQUIRED', rpc('log_chore', { p_house: houseId, p_task: dishes.id, p_done_at: now }), 'photo required for member')
await throws('BAD_PHOTO', rpc('log_chore', { p_house: houseId, p_task: dishes.id, p_done_at: now, p_after: 'other/x.jpg' }), 'path outside house')
await throws('FUTURE_DATE', rpc('log_chore', { p_house: houseId, p_task: dishes.id, p_done_at: new Date(Date.now() + 864e5).toISOString(), p_after: houseId + '/a.jpg' }), 'future')
await throws('TOO_OLD', rpc('log_chore', { p_house: houseId, p_task: dishes.id, p_done_at: new Date(Date.now() - 40 * 864e5).toISOString(), p_after: houseId + '/a.jpg' }), 'too old')
await throws('OWNER_ONLY', rpc('log_chore', { p_house: houseId, p_task: dishes.id, p_done_at: now, p_after: houseId + '/a.jpg', p_member: samId }), 'member logs for other')
const log1 = await rpc('log_chore', { p_house: houseId, p_task: dishes.id, p_done_at: now, p_after: houseId + '/a.jpg', p_before: houseId + '/b.jpg', p_note: ' sparkling ', p_points: 999 })
let L = await rpc('get_logs', { p_house: houseId })
ok(L[0].points === 10 && L[0].note === 'sparkling', 'member cannot override points')
as('owner')
const log2 = await rpc('log_chore', { p_house: houseId, p_task: null, p_done_at: new Date(Date.now() - 90 * 864e5).toISOString(), p_custom_name: 'Fixed sink', p_points: 40, p_member: samId })
ok(log2, 'owner custom, old date, no photo, for sam')

// votes: 4 active members. alex's log needs >2 votes => 3 votes
as('alex'); await throws('CANT_VOTE_OWN', rpc('vote_log', { p_log: log1, p_vote: true }), 'own vote')
as('sam'); let V = await rpc('vote_log', { p_log: log1, p_vote: true }); ok(V.votes === 1 && !V.voided, 'vote 1')
as('jo'); V = await rpc('vote_log', { p_log: log1, p_vote: true }); ok(V.votes === 2 && !V.voided, 'vote 2 = 50% not enough')
V = await rpc('vote_log', { p_log: log1, p_vote: false }); ok(V.votes === 1, 'unvote')
V = await rpc('vote_log', { p_log: log1, p_vote: true })
as('owner'); V = await rpc('vote_log', { p_log: log1, p_vote: true }); ok(V.voided, 'voided at 3/4')
as('jo'); await throws('ALREADY_VOIDED', rpc('vote_log', { p_log: log1, p_vote: false }), 'locked after void')
as('owner'); await rpc('restore_log', { p_log: log1 })
L = await rpc('get_logs', { p_house: houseId }); ok(!L.find((l) => l.id === log1).voided, 'restored')
as('sam'); await throws('VOTE_LOCKED', rpc('vote_log', { p_log: log1, p_vote: true }), 'override locks')
await throws('CANT_VOTE_OWN', rpc('vote_log', { p_log: log2, p_vote: true }), 'sam own log')
as('jo'); await throws('VOTE_WINDOW_CLOSED', rpc('vote_log', { p_log: log2, p_vote: true }), 'window closed')

// change requests
as('sam')
await throws('NOT_YOUR_LOG', rpc('request_change', { p_log: log1, p_kind: 'delete', p_payload: {}, p_reason: 'x' }), 'not yours')
as('alex')
const counters = H.tasks.find((t) => t.name === 'Counters')
const r1 = await rpc('request_change', { p_log: log1, p_kind: 'edit', p_payload: { task_id: counters.id, points: 500, note: 'oops', after_path: houseId + '/new.jpg' }, p_reason: 'wrong chore' })
await throws('REQUEST_PENDING', rpc('request_change', { p_log: log1, p_kind: 'delete', p_payload: {}, p_reason: null }), 'one pending')
L = await rpc('get_logs', { p_house: houseId }); ok(L.find((l) => l.id === log1).pending?.id === r1, 'pending visible')
await throws('OWNER_ONLY', rpc('resolve_request', { p_request: r1, p_approve: true }), 'member cannot approve')
as('owner')
let R = await rpc('get_requests', { p_house: houseId }); ok(R.length === 1, 'owner sees request')
let removed = await rpc('resolve_request', { p_request: r1, p_approve: true })
ok(Array.isArray(removed) && removed[0] === houseId + '/a.jpg', 'old photo returned for cleanup')
L = await rpc('get_logs', { p_house: houseId }); let l1 = L.find((l) => l.id === log1)
ok(l1.task_name === 'Counters' && l1.points === 6 && l1.note === 'oops', 'edit applied w/o points')
as('alex')
const r2 = await rpc('request_change', { p_log: log1, p_kind: 'delete', p_payload: {}, p_reason: 'dup' })
as('owner'); removed = await rpc('resolve_request', { p_request: r2, p_approve: false })
as('alex'); const r3 = await rpc('request_change', { p_log: log1, p_kind: 'delete', p_payload: {}, p_reason: 'dup' })
R = await rpc('get_requests', { p_house: houseId }); ok(R.length === 3 && R.every((r) => r.member_id === alexId), 'member sees own history')
as('owner'); removed = await rpc('resolve_request', { p_request: r3, p_approve: true })
ok(removed.length === 2, 'delete returns photos ' + JSON.stringify(removed))
L = await rpc('get_logs', { p_house: houseId }); ok(!L.find((l) => l.id === log1), 'deleted')
R = await rpc('get_requests', { p_house: houseId }); ok(R.filter((r) => r.status === 'pending').length === 0 && R.length === 3, 'owner sees no pending, keeps history')

// owner edits & tasks
await rpc('owner_update_log', { p_log: log2, p_payload: { points: 25, member_id: joId } })
L = await rpc('get_logs', { p_house: houseId }); ok(L[0].points === 25 && L[0].member_id === joId, 'owner edit')
const sec = await rpc('upsert_section', { p_house: houseId, p_id: null, p_name: 'Outdoor' })
const t2 = await rpc('upsert_task', { p_house: houseId, p_id: null, p_section: sec, p_name: 'Mow lawn', p_icon: 'lawn', p_points: 30 })
H = await rpc('get_house', { p_house: houseId })
const order = H.tasks.map((t) => t.id).reverse()
await rpc('reorder', { p_house: houseId, p_layout: { sections: H.sections.map((s) => s.id).reverse(), tasks: order.map((id) => ({ id, section_id: id === t2 ? null : H.tasks.find((t) => t.id === id).section_id })) } })
H = await rpc('get_house', { p_house: houseId })
ok(H.tasks[0].id === t2 && H.tasks[0].section_id === null && H.sections[0].name === 'Outdoor', 'reorder')
await rpc('delete_task', { p_house: houseId, p_id: t2 })
await rpc('delete_section', { p_house: houseId, p_id: H.sections.find((s) => s.name === 'Kitchen').id })
H = await rpc('get_house', { p_house: houseId })
ok(H.tasks.length === 3 && H.tasks.filter((t) => !t.section_id).length === 2, 'archive + section delete')
as('alex'); await throws('OWNER_ONLY', rpc('upsert_section', { p_house: houseId, p_id: null, p_name: 'x' }), 'member cannot edit tasks')

// members
as('owner')
await throws('NOT_JOINED_YET', rpc('add_member', { p_house: houseId, p_name: 'Kim' }).then((id) => rpc('transfer_owner', { p_member: id })), 'transfer unjoined')
await rpc('reset_member', { p_member: samId })
as('sam'); await throws('NOT_MEMBER', rpc('get_house', { p_house: houseId }), 'reset signs out')
P = await rpc('preview_house', { p_code: code }); ok(!P.members.find((m) => m.id === samId).claimed, 'slot free again')
await rpc('join_house', { p_code: code, p_member: samId, p_name: null, p_color: '#30D158', p_pin: '4444' })
as('jo'); await rpc('leave_house', { p_house: houseId })
await throws('NOT_MEMBER', rpc('get_house', { p_house: houseId }), 'left')
as('owner'); H = await rpc('get_house', { p_house: houseId })
ok(H.members.find((m) => m.id === joId).status === 'removed', 'history keeps removed member')
await rpc('transfer_owner', { p_member: alexId })
await throws('OWNER_ONLY', rpc('update_house', { p_house: houseId, p_patch: { name: 'x' } }), 'old owner demoted')
as('alex'); await rpc('update_member', { p_member: alexId, p_name: 'Alexandra', p_color: '#BF5AF2' })
const houses = await rpc('my_houses'); ok(houses[0].role === 'owner' && houses[0].my_name === 'Alexandra', 'my_houses')
await throws('COLOR_TAKEN', rpc('update_member', { p_member: alexId, p_name: null, p_color: '#30d158' }), 'color clash')
// reports (alex is owner now; sam + original owner are members)
as('sam')
await throws('TITLE_REQUIRED', rpc('create_report', { p_house: houseId, p_category: 'mess', p_title: '  ', p_details: null, p_about: null, p_task: null, p_photos: [], p_anonymous: false }), 'title required')
await throws('BAD_PHOTO', rpc('create_report', { p_house: houseId, p_category: 'mess', p_title: 'x', p_details: null, p_about: null, p_task: null, p_photos: ['elsewhere/a.jpg'], p_anonymous: false }), 'photo path checked')
await throws('TOO_MANY_PHOTOS', rpc('create_report', { p_house: houseId, p_category: 'mess', p_title: 'x', p_details: null, p_about: null, p_task: null, p_photos: [1, 2, 3, 4, 5].map((i) => `${houseId}/p${i}.jpg`), p_anonymous: false }), 'max 4 photos')
const ownerMemberId = ownerId
const rep1 = await rpc('create_report', { p_house: houseId, p_category: 'undone', p_title: 'Dishes left in sink', p_details: 'Since Monday', p_about: ownerMemberId, p_task: null, p_photos: [`${houseId}/r1.jpg`, `${houseId}/r2.jpg`], p_anonymous: true })
as('owner')
let RP = await rpc('get_reports', { p_house: houseId })
ok(RP.length === 1 && RP[0].reporter_id === null && RP[0].anonymous && RP[0].mine === false, 'anonymous hidden from others')
const leak = await db.query('select * from reports')
ok(!('reporter_id' in leak.rows[0]) && leak.rows[0].shown_reporter === null, 'reports table has no author column')
as('sam'); RP = await rpc('get_reports', { p_house: houseId }); ok(RP[0].mine === true, 'reporter sees it is theirs')
await throws('CANT_AGREE_OWN', rpc('agree_report', { p_report: rep1, p_agree: true }), 'cannot agree own')
as('alex'); ok((await rpc('agree_report', { p_report: rep1, p_agree: true })) === 1, 'me too')
ok((await rpc('agree_report', { p_report: rep1, p_agree: true })) === 1, 'me too idempotent')
// a member not involved cannot resolve: make a second report about sam by alex (owner) and try as original owner
const rep2 = await rpc('create_report', { p_house: houseId, p_category: 'mess', p_title: 'Shoes everywhere', p_details: null, p_about: samId, p_task: null, p_photos: [], p_anonymous: false })
as('sam'); await throws('CANT_AGREE_OWN', rpc('agree_report', { p_report: rep2, p_agree: true }), 'cannot agree to report about yourself')
as('owner'); await throws('NOT_ALLOWED', rpc('resolve_report', { p_report: rep2, p_note: null, p_photo: null }), 'uninvolved cannot resolve')
await throws('NOT_ALLOWED', rpc('delete_report', { p_report: rep2 }), 'uninvolved cannot delete')
// tagged person resolves (original owner is about rep1)
await rpc('resolve_report', { p_report: rep1, p_note: 'Done now', p_photo: `${houseId}/fix.jpg` })
await throws('REPORT_CLOSED', rpc('resolve_report', { p_report: rep1, p_note: null, p_photo: null }), 'already resolved')
as('alex'); await throws('REPORT_CLOSED', rpc('agree_report', { p_report: rep1, p_agree: false }), 'closed for agrees')
as('sam'); ok((await rpc('reopen_report', { p_report: rep1 })) === `${houseId}/fix.jpg`, 'reporter reopens, gets old fix photo')
await rpc('resolve_report', { p_report: rep2, p_note: 'Put away', p_photo: null })
as('alex'); let gone = await rpc('delete_report', { p_report: rep1 })
ok(gone.length === 2 && gone.every((g) => g.startsWith(houseId)), 'owner deletes, photos returned ' + JSON.stringify(gone))
RP = await rpc('get_reports', { p_house: houseId }); ok(RP.length === 1 && RP[0].status === 'resolved' && RP[0].reporter_id === alexId, 'remaining report')
as('stranger'); await throws('NOT_MEMBER', rpc('get_reports', { p_house: houseId }), 'stranger blocked')

as('stranger'); await throws('HOUSE_NOT_FOUND', rpc('preview_house', { p_code: 'ZZZZZZ' }), 'bad code')
as('alex'); await rpc('delete_house', { p_house: houseId })
ok((await db.query('select count(*)::int c from logs')).rows[0].c === 0, 'cascade delete')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
