import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const HouseCtx = createContext(null)
export const useHouse = () => useContext(HouseCtx)

const cacheKey = (id) => `house-cache-${id}`

export function HouseProvider({ backend, houseId, onLostAccess, children }) {
  const [data, setData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(cacheKey(houseId))) // instant paint from last session
    } catch {
      return null
    }
  })
  const [error, setError] = useState(null)
  const inflight = useRef(null)
  const again = useRef(false)

  const refresh = useCallback(async () => {
    if (inflight.current) {
      again.current = true
      return inflight.current
    }
    const run = (async () => {
      try {
        const [house, logs, requests, reports] = await Promise.all([
          backend.rpc('get_house', { p_house: houseId }),
          backend.rpc('get_logs', { p_house: houseId }),
          backend.rpc('get_requests', { p_house: houseId }),
          // Reports are optional: an older database without them still loads.
          backend.rpc('get_reports', { p_house: houseId }).catch(() => []),
        ])
        const next = { ...house, logs, requests, reports, loadedAt: Date.now() }
        setData(next)
        setError(null)
        try {
          localStorage.setItem(cacheKey(houseId), JSON.stringify(next))
        } catch {}
      } catch (e) {
        if (e.code === 'NOT_MEMBER') {
          localStorage.removeItem(cacheKey(houseId))
          onLostAccess?.()
        } else setError(e)
      } finally {
        inflight.current = null
        if (again.current) {
          again.current = false
          refresh()
        }
      }
    })()
    inflight.current = run
    return run
  }, [backend, houseId, onLostAccess])

  useEffect(() => {
    refresh()
    let t
    const debounced = () => {
      clearTimeout(t)
      t = setTimeout(refresh, 250)
    }
    const unsub = backend.subscribe(houseId, debounced)
    const onVis = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('online', refresh)
    const poll = setInterval(() => document.visibilityState === 'visible' && refresh(), 60000)
    return () => {
      unsub()
      clearTimeout(t)
      clearInterval(poll)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('online', refresh)
    }
  }, [backend, houseId, refresh])

  const value = useMemo(() => {
    if (!data) return { loading: true, error, refresh, backend }
    const memberById = Object.fromEntries(data.members.map((m) => [m.id, m]))
    const taskById = Object.fromEntries(data.tasks.map((t) => [t.id, t]))
    const sectionById = Object.fromEntries(data.sections.map((s) => [s.id, s]))
    const active = data.members.filter((m) => m.status === 'active')
    const isOwner = data.me.role === 'owner'
    const pending = data.requests.filter((r) => r.status === 'pending')
    return {
      ...data,
      backend,
      refresh,
      error,
      memberById,
      taskById,
      sectionById,
      activeMembers: active,
      isOwner,
      pendingRequests: pending,
      reports: data.reports || [],
      openReports: (data.reports || []).filter((r) => r.status === 'open'),
      // Mutations go through here so the UI refreshes right away.
      call: async (fn, args) => {
        const r = await backend.rpc(fn, args)
        refresh()
        return r
      },
    }
  }, [data, error, refresh, backend])

  return <HouseCtx.Provider value={value}>{children}</HouseCtx.Provider>
}

// Signed photo URLs, cached.
const urlCache = new Map() // path -> { url, t }
const fresh = (p) => {
  const c = urlCache.get(p)
  return c && Date.now() - c.t < 4 * 3600e3 ? c.url : null
}
export function usePhotoUrls(paths) {
  const { backend } = useHouse()
  const key = paths.filter(Boolean).join('|')
  const [urls, setUrls] = useState(() => Object.fromEntries(paths.filter(fresh).map((p) => [p, fresh(p)])))
  useEffect(() => {
    const list = paths.filter(Boolean)
    if (!list.length) return
    let alive = true
    backend
      .photoUrls(list)
      .then((u) => {
        Object.entries(u).forEach(([p, url]) => urlCache.set(p, { url, t: Date.now() }))
        const missing = Object.fromEntries(list.filter((p) => !u[p]).map((p) => [p, null]))
        if (alive) setUrls((prev) => ({ ...prev, ...missing, ...u }))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, backend])
  return urls
}
