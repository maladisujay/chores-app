import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { pushLayer, dismissLayer, releaseLayer } from '../lib/layers.js'
import Icon from '../icons/Icon.jsx'

let openCount = 0
function lockBody(on) {
  openCount += on ? 1 : -1
  document.documentElement.classList.toggle('scroll-locked', openCount > 0)
}

// Shared mount/unmount + history logic for overlays.
export function useOverlay(open, onClose) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  const layer = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (open) {
      setMounted(true)
      layer.current = pushLayer(() => {
        layer.current = null
        closeRef.current?.()
      })
      lockBody(true)
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
      return () => {
        cancelAnimationFrame(r)
        lockBody(false)
        if (layer.current) releaseLayer(layer.current)
        layer.current = null
        setShown(false)
      }
    }
  }, [open])

  useEffect(() => {
    if (!open && mounted) {
      const t = setTimeout(() => setMounted(false), 380)
      return () => clearTimeout(t)
    }
  }, [open, mounted])

  const dismiss = () => {
    if (layer.current) dismissLayer(layer.current)
    else closeRef.current?.()
  }
  return { mounted, shown: shown && open, dismiss }
}

export default function Sheet({ open, onClose, title, children, footer, className = '', headerRight, tall }) {
  const { mounted, shown, dismiss } = useOverlay(open, onClose)
  const panel = useRef(null)
  const drag = useRef(null)
  const [dy, setDy] = useState(0)

  if (!mounted) return null

  const onDown = (e) => {
    if (e.target.closest('button,input,textarea,select,a')) return
    drag.current = { y: e.clientY, t: Date.now() }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onMove = (e) => {
    if (!drag.current) return
    setDy(Math.max(0, e.clientY - drag.current.y))
  }
  const onUp = (e) => {
    if (!drag.current) return
    const d = e.clientY - drag.current.y
    const v = d / Math.max(1, Date.now() - drag.current.t)
    drag.current = null
    if (d > 110 || v > 0.6) dismiss()
    setDy(0)
  }

  return createPortal(
    <div className={`sheet-root ${shown ? 'shown' : ''}`}>
      <div className="sheet-backdrop" onClick={dismiss} />
      <div
        ref={panel}
        className={`sheet lg ${tall ? 'sheet-tall' : ''} ${className}`}
        style={dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="sheet-head" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <span className="grabber" />
          <div className="sheet-titlebar">
            <button className="icon-btn lg" onClick={dismiss} aria-label="Close">
              <Icon name="x" size={18} stroke={2.4} />
            </button>
            <h2>{title}</h2>
            <div className="sheet-head-right">{headerRight}</div>
          </div>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

// Full-screen pushed page (slides in from the right) for owner tools.
export function Page({ open, onClose, title, children, right }) {
  const { mounted, shown, dismiss } = useOverlay(open, onClose)
  const [scrolled, setScrolled] = useState(false)
  if (!mounted) return null
  return createPortal(
    <div className={`page-root ${shown ? 'shown' : ''}`}>
      <div className="page-bg" />
      <header className={`page-nav ${scrolled ? 'scrolled' : ''}`}>
        <button className="icon-btn lg back-btn" onClick={dismiss} aria-label="Back">
          <Icon name="chevronL" size={22} stroke={2.4} />
        </button>
        <h1>{title}</h1>
        <div className="page-nav-right">{right}</div>
      </header>
      <div className="page-body" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)}>{children}</div>
    </div>,
    document.body,
  )
}
