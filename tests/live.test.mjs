// End-to-end test against the real Supabase project in src/config.js.
// Creates a throwaway home with anonymous users, exercises the main flows, then deletes it.
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../src/config.js'

const mk = () => createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (c, m) => (c ? pass++ : (fail++, console.log('  ✗', m)))
const rpc = async (c, fn, args) => { const { data, error } = await c.rpc(fn, args); if (error) throw new Error(error.message); return data }
const expectErr = async (p, code, m) => { try { await p; ok(false, m + ' (no error)') } catch (e) { ok(e.message.includes(code), `${m}: ${e.message}`) } }

const owner = mk(), alex = mk(), sam = mk(), stranger = mk()
for (const c of [owner, alex, sam, stranger]) {
  const { error } = await c.auth.signInAnonymously()
  if (error) throw new Error('anon sign-in failed: ' + error.message)
}
pass++
const hid = await rpc(owner, 'create_house', { p_name: 'Live Test', p_owner_name: 'Owner', p_owner_color: '#0A84FF', p_pin: '1234', p_photo_required: true, p_is_open: true, p_setup: { members: ['Alex', 'Sam'], sections: [{ name: 'Kitchen', tasks: [{ name: 'Dishes', icon: 'dishes', points: 10 }] }] } })
try {
  const H = await rpc(owner, 'get_house', { p_house: hid })
  const code = H.house.code
  const P = await rpc(alex, 'preview_house', { p_code: code })
  await rpc(alex, 'join_house', { p_code: code, p_member: P.members.find((m) => m.name === 'Alex').id, p_name: null, p_color: '#FF453A', p_pin: '1111' })
  await rpc(sam, 'join_house', { p_code: code, p_member: P.members.find((m) => m.name === 'Sam').id, p_name: null, p_color: '#30D158', p_pin: '2222' })
  ok(true, 'joined')

  // realtime: owner listens for alex's log
  let gotEvent = false
  const ch = owner.channel('t').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logs', filter: `house_id=eq.${hid}` }, () => (gotEvent = true))
  await new Promise((res) => ch.subscribe((s) => s === 'SUBSCRIBED' && res()))
  await new Promise((r) => setTimeout(r, 1500)) // let the server finish attaching the change feed

  // photo upload by member
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
  const path = `${hid}/${crypto.randomUUID()}.jpg`
  const up = await alex.storage.from('chore-photos').upload(path, png, { contentType: 'image/png' })
  ok(!up.error, 'member upload ' + up.error?.message)
  const badUp = await stranger.storage.from('chore-photos').upload(`${hid}/x.jpg`, png, { contentType: 'image/png' })
  ok(!!badUp.error, 'stranger upload blocked')

  await expectErr(rpc(alex, 'log_chore', { p_house: hid, p_task: H.tasks[0].id, p_done_at: new Date().toISOString(), p_note: null, p_before: null, p_after: null, p_member: null, p_custom_name: null, p_points: null }), 'PHOTO_REQUIRED', 'photo required')
  const logId = await rpc(alex, 'log_chore', { p_house: hid, p_task: H.tasks[0].id, p_done_at: new Date().toISOString(), p_note: 'live', p_before: null, p_after: path, p_member: null, p_custom_name: null, p_points: null })
  ok(logId, 'logged')
  await new Promise((r) => setTimeout(r, 2500))
  ok(gotEvent, 'realtime event received')
  owner.removeChannel(ch)

  const signed = await owner.storage.from('chore-photos').createSignedUrls([path], 60)
  ok(signed.data?.[0]?.signedUrl, 'owner can view photo')
  const sSigned = await stranger.storage.from('chore-photos').createSignedUrls([path], 60)
  ok(!sSigned.data?.[0]?.signedUrl, 'stranger cannot view photo')

  // privacy
  await expectErr(rpc(stranger, 'get_logs', { p_house: hid }), 'NOT_MEMBER', 'stranger rpc')
  const { data: leak } = await stranger.from('logs').select('*').eq('house_id', hid)
  ok(Array.isArray(leak) && leak.length === 0, 'stranger table read empty')
  const { data: secrets, error: se } = await alex.from('member_secrets').select('*')
  ok(se || (secrets ?? []).length === 0, 'pin hashes not readable')
  await expectErr(rpc(alex, '_set_pin', { p_member: H.me.id, p_pin: '0000' }), '', 'internal fn not callable')

  // votes: 3 joined → 2 votes void
  await rpc(sam, 'vote_log', { p_log: logId, p_vote: true })
  const v = await rpc(owner, 'vote_log', { p_log: logId, p_vote: true })
  ok(v.voided, 'voided at 2/3')

  // request + approve
  const rq = await rpc(alex, 'request_change', { p_log: logId, p_kind: 'delete', p_payload: {}, p_reason: 'test' })
  const removed = await rpc(owner, 'resolve_request', { p_request: rq, p_approve: true })
  ok(removed.includes(path), 'delete approved returns photo')
  const rm = await owner.storage.from('chore-photos').remove(removed)
  ok(!rm.error, 'owner removes photo')

  // reports: anonymous report with a photo, about the owner
  const rpath = `${hid}/${crypto.randomUUID()}.jpg`
  ok(!(await sam.storage.from('chore-photos').upload(rpath, png, { contentType: 'image/png' })).error, 'report photo upload')
  const ownerMember = H.me.id
  const rep = await rpc(sam, 'create_report', { p_house: hid, p_category: 'mess', p_title: 'Live test report', p_details: null, p_about: ownerMember, p_task: null, p_photos: [rpath], p_anonymous: true })
  const seen = await rpc(owner, 'get_reports', { p_house: hid })
  ok(seen.length === 1 && seen[0].reporter_id === null && seen[0].mine === false, 'anonymous report hides author from owner')
  const { data: rawRows, error: rawErr } = await owner.from('reports').select('*').eq('house_id', hid)
  ok(!rawErr && rawRows.length === 1 && !('reporter_id' in rawRows[0]) && rawRows[0].shown_reporter === null, 'direct table read has no author ' + rawErr?.message)
  const { data: authors } = await owner.from('report_authors').select('*')
  ok((authors ?? []).length === 0, 'report authors unreadable')
  await expectErr(rpc(owner, 'agree_report', { p_report: rep, p_agree: true }), 'CANT_AGREE_OWN', 'subject cannot me-too')
  ok((await rpc(alex, 'agree_report', { p_report: rep, p_agree: true })) === 1, 'me too live')
  await expectErr(rpc(stranger, 'get_reports', { p_house: hid }), 'NOT_MEMBER', 'stranger cannot read reports')
  await rpc(owner, 'resolve_report', { p_report: rep, p_note: 'cleaned', p_photo: null })
  const gone = await rpc(sam, 'delete_report', { p_report: rep })
  ok(gone.includes(rpath), 'reporter deletes, photo returned')
  ok(!(await sam.storage.from('chore-photos').remove(gone)).error, 'reporter removes own photo')

  // rejoin on second device with PIN
  const alex2 = mk(); await alex2.auth.signInAnonymously()
  ok((await rpc(alex2, 'rejoin_house', { p_code: code, p_member: P.members.find((m) => m.name === 'Alex').id, p_pin: '9999' })) === null, 'wrong pin')
  ok((await rpc(alex2, 'rejoin_house', { p_code: code, p_member: P.members.find((m) => m.name === 'Alex').id, p_pin: '1111' })) === hid, 'rejoin ok')
} finally {
  await rpc(owner, 'delete_house', { p_house: hid })
  console.log('cleaned up test home')
}
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
