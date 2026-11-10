// Local demo backend: runs the real schema.sql inside PGlite (Postgres in WASM),
// persisted to IndexedDB. Lets you try every feature without a server and lets
// you switch between pretend roommates to test multi-user flows on one device.
import { PGlite } from '@electric-sql/pglite'
import schemaSql from '../../supabase/schema.sql?raw'
import { DEMO_PRELUDE } from './demoPrelude.js'
import { toAppError } from './errors.js'

const SCHEMA_VERSION = "4"

export async function createDemoBackend() {
  const db = new PGlite('idb://chores-demo')
  await db.exec(DEMO_PRELUDE)
  let hash = 0
  for (let i = 0; i < schemaSql.length; i++) hash = (Math.imul(31, hash) + schemaSql.charCodeAt(i)) | 0
  const version = `${SCHEMA_VERSION}-${hash}`
  if (localStorage.getItem('demo-schema') !== version) {
    await db.exec(schemaSql) // idempotent upgrade
    localStorage.setItem('demo-schema', version)
  }
  const listeners = new Set()
  let chain = Promise.resolve()
  const run = (fn) => (chain = chain.then(fn, fn))

  const getUid = () => {
    let id = localStorage.getItem('demo-uid')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('demo-uid', id)
    }
    return id
  }

  const backend = {
    mode: 'demo',
    async ensureSession() {
      return getUid()
    },
    // demo helpers
    currentUser: getUid,
    switchUser(id) {
      localStorage.setItem('demo-uid', id || crypto.randomUUID())
    },
    async rpc(fn, args = {}) {
      return run(async () => {
        try {
          await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [getUid()])
          const keys = Object.keys(args).filter((k) => args[k] !== undefined)
          const sql = `select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as r`
          const vals = keys.map((k) => (args[k] !== null && typeof args[k] === 'object' ? JSON.stringify(args[k]) : args[k]))
          const res = await db.query(sql, vals)
          if (!/^(get_|preview_|my_)/.test(fn)) queueMicrotask(() => listeners.forEach((l) => l()))
          return res.rows[0]?.r ?? null
        } catch (e) {
          throw toAppError(e)
        }
      })
    },
    async uploadPhoto(houseId, blob) {
      const path = `${houseId}/${crypto.randomUUID()}.jpg`
      const data = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result)
        r.onerror = rej
        r.readAsDataURL(blob)
      })
      await run(() => db.query('insert into demo_storage (path, data) values ($1, $2)', [path, data]))
      return path
    },
    async photoUrls(paths) {
      if (!paths.length) return {}
      const res = await run(() => db.query('select path, data from demo_storage where path = any($1)', [paths]))
      return Object.fromEntries(res.rows.map((r) => [r.path, r.data]))
    },
    async removePhotos(paths) {
      const list = (paths || []).filter(Boolean)
      if (list.length) await run(() => db.query('delete from demo_storage where path = any($1)', [list]))
    },
    subscribe(_houseId, onChange) {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    async listDemoMembers(houseId) {
      const res = await run(() =>
        db.query(
          `select d.user_id, m.name, m.color, m.role from member_devices d join members m on m.id = d.member_id
           where d.house_id = $1 and m.status = 'active' order by m.created_at`,
          [houseId],
        ),
      )
      return res.rows
    },
    async resetAll() {
      await db.close()
      indexedDB.deleteDatabase('/pglite/chores-demo')
      localStorage.removeItem('demo-schema')
      localStorage.removeItem('demo-uid')
    },
  }
  if (import.meta.env.DEV) window.__demo = backend
  return backend
}
