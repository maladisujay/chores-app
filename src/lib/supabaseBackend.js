import { createClient, processLock } from '@supabase/supabase-js'
import { toAppError } from './errors.js'

const BUCKET = 'chore-photos'
const TABLES = ['logs', 'log_votes', 'change_requests', 'tasks', 'sections', 'members', 'reports', 'report_agrees']

export function createSupabaseBackend(url, key) {
  const sb = createClient(url, key, {
    // processLock: the default cross-tab navigator lock can get stuck on iOS Safari after
    // app switching, and then requests silently go out signed-out (401 / permission denied).
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'chores-auth', lock: processLock },
  })
  const urlCache = new Map() // path -> { url, exp }

  // Keep the latest session in memory so it can be restored if storage reads fail.
  let lastSession = null
  sb.auth.onAuthStateChange((_event, session) => { if (session) lastSession = session })

  const signedOutError = (e) =>
    e && (e.code === '42501' || e.code === 'PGRST301' || e.code === 'PGRST303' || /permission denied for function|JWT|not authenticated/i.test(e.message || ''))

  // The request went out without a valid user. Restore the session, or as a last resort start a new one.
  async function recoverSession() {
    const { data } = await sb.auth.getSession()
    if (data.session) {
      const { data: r } = await sb.auth.refreshSession()
      if (r?.session) return
    }
    if (lastSession?.refresh_token) {
      const { data: r, error } = await sb.auth.setSession({ access_token: lastSession.access_token, refresh_token: lastSession.refresh_token })
      if (!error && r?.session) return
    }
    const { error } = await sb.auth.signInAnonymously()
    if (error) throw toAppError(error)
  }

  return {
    mode: 'supabase',
    async ensureSession() {
      const { data } = await sb.auth.getSession()
      if (data.session) return data.session.user.id
      const { data: d, error } = await sb.auth.signInAnonymously()
      if (error) {
        if (/anonymous/i.test(error.message)) throw new Error('Anonymous sign-ins are disabled. Enable them in Supabase → Authentication → Sign In / Providers.')
        throw toAppError(error)
      }
      return d.user.id
    },
    async rpc(fn, args = {}) {
      let { data, error } = await sb.rpc(fn, args)
      if (error && signedOutError(error)) {
        await recoverSession()
        ;({ data, error } = await sb.rpc(fn, args))
        if (error && signedOutError(error)) throw toAppError('SESSION_LOST')
      }
      if (error) throw toAppError(error)
      return data
    },
    async uploadPhoto(houseId, blob) {
      const path = `${houseId}/${crypto.randomUUID()}.jpg`
      const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || 'image/jpeg', cacheControl: '31536000', upsert: false })
      if (error) throw toAppError(error)
      urlCache.set(path, { url: URL.createObjectURL(blob), exp: Infinity })
      return path
    },
    async photoUrls(paths) {
      const now = Date.now()
      const out = {}
      const missing = []
      for (const p of paths) {
        const c = urlCache.get(p)
        if (c && c.exp > now) out[p] = c.url
        else missing.push(p)
      }
      if (missing.length) {
        const { data, error } = await sb.storage.from(BUCKET).createSignedUrls(missing, 60 * 60 * 6)
        if (error) throw toAppError(error)
        for (const d of data || []) {
          if (d.signedUrl) {
            out[d.path] = d.signedUrl
            urlCache.set(d.path, { url: d.signedUrl, exp: now + 1000 * 60 * 60 * 5 })
          }
        }
      }
      return out
    },
    async removePhotos(paths) {
      const list = (paths || []).filter(Boolean)
      if (!list.length) return
      await sb.storage.from(BUCKET).remove(list).catch(() => {})
    },
    subscribe(houseId, onChange) {
      let ch = sb.channel(`house-${houseId}-${Math.random().toString(36).slice(2)}`)
      for (const table of TABLES) {
        ch = ch.on('postgres_changes', { event: '*', schema: 'public', table, filter: `house_id=eq.${houseId}` }, onChange)
      }
      ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: 'houses', filter: `id=eq.${houseId}` }, onChange)
      ch.subscribe()
      return () => sb.removeChannel(ch)
    },
  }
}
