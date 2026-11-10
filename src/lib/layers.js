// Ties overlays (sheets, pushed pages, photo viewer) to browser history so the
// phone's back gesture / Android back button closes the top layer instead of
// leaving the app.
const stack = []
let ignore = 0

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (ignore > 0) {
      ignore--
      return
    }
    const top = stack.pop()
    top?.onClose()
  })
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && stack.length && !document.querySelector('.dialog-root')) history.back()
  })
}

export function pushLayer(onClose) {
  const id = Math.random().toString(36).slice(2)
  stack.push({ id, onClose })
  history.pushState({ layer: id }, '')
  return id
}

// User dismissed this layer from the UI (swipe, ✕, backdrop).
export function dismissLayer(id) {
  const idx = stack.findIndex((l) => l.id === id)
  if (idx === -1) return
  if (idx === stack.length - 1) {
    history.back() // popstate will call onClose
  } else {
    const [l] = stack.splice(idx, 1)
    l.onClose()
  }
}

// Parent closed the layer programmatically; drop our history entry silently.
export function releaseLayer(id) {
  const idx = stack.findIndex((l) => l.id === id)
  if (idx === -1) return
  stack.splice(idx, 1)
  if (idx === stack.length) {
    ignore++
    history.back()
  }
}
