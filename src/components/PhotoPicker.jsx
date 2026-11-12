import { useEffect, useRef, useState } from 'react'
import Icon from '../icons/Icon.jsx'
import { compressImage } from '../lib/image.js'
import { haptic } from '../lib/haptics.js'
import { Spinner } from './ui.jsx'
import { useFeedback } from './Feedback.jsx'
import { useHouse } from '../store.jsx'

// Members can only take a live photo with the camera (no gallery uploads), so photos are fresh and original.
// The owner can also pick from the library. Desktops (no camera capture) fall back to the file picker.
const hasCamera = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

// value: { blob, url } for a new photo, { path, url } for an existing one, or null
export default function PhotoPicker({ label, value, onChange, required, hint }) {
  const library = useRef(null)
  const camera = useRef(null)
  const root = useRef(null)
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState(false)
  const { toast } = useFeedback()
  const cameraOnly = !useHouse()?.isOwner

  useEffect(() => {
    if (!menu) return
    const away = (e) => { if (!root.current?.contains(e.target)) setMenu(false) }
    const esc = (e) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('pointerdown', away, true)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', away, true)
      document.removeEventListener('keydown', esc)
    }
  }, [menu])

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.type && !file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
      toast('Please choose an image.', 'error')
      return
    }
    setBusy(true)
    try {
      const blob = await compressImage(file)
      onChange({ blob, url: URL.createObjectURL(blob) })
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const open = () => {
    if (busy) return
    if (!hasCamera()) return library.current?.click()
    haptic()
    if (cameraOnly) return camera.current?.click()
    setMenu((m) => !m)
  }
  const choose = (ref) => {
    setMenu(false)
    ref.current?.click()
  }

  return (
    <div ref={root} className={`photo-pick ${value ? 'has' : ''} ${menu ? 'menu-open' : ''}`}>
      <button type="button" className="photo-tile" onClick={open} aria-haspopup={hasCamera() && !cameraOnly ? 'menu' : undefined} aria-expanded={menu}>
        {value?.url ? (
          <img src={value.url} alt={label} />
        ) : busy ? (
          <Spinner size={26} />
        ) : (
          <span className="photo-empty">
            <Icon name="camera" size={28} stroke={1.8} />
            <span className="photo-label">{label}</span>
            <span className={`photo-req ${required ? 'req' : ''}`}>{required ? 'Required' : hint || 'Optional'}</span>
          </span>
        )}
        {value?.url && <span className="photo-tag">{label}</span>}
      </button>
      {value && !menu && (
        <button type="button" className="photo-remove" onClick={() => onChange(null)} aria-label={`Remove ${label}`}>
          <Icon name="x" size={14} stroke={3} />
        </button>
      )}
      {menu && (
        <div className="photo-menu lg" role="menu">
          <button type="button" role="menuitem" onClick={() => choose(camera)}>
            <span>Take Photo</span>
            <Icon name="camera" size={20} stroke={2} />
          </button>
          <button type="button" role="menuitem" onClick={() => choose(library)}>
            <span>{value ? 'Replace from Library' : 'Photo Library'}</span>
            <Icon name="image" size={20} stroke={2} />
          </button>
        </div>
      )}
      <input ref={library} type="file" accept="image/*" hidden onChange={pick} />
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
    </div>
  )
}
