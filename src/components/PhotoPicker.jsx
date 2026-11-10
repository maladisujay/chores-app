import { useRef, useState } from 'react'
import Icon from '../icons/Icon.jsx'
import { compressImage } from '../lib/image.js'
import { Spinner } from './ui.jsx'
import { useFeedback } from './Feedback.jsx'

// value: { blob, url } for a new photo, { path, url } for an existing one, or null
export default function PhotoPicker({ label, value, onChange, required, hint }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const { toast } = useFeedback()

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
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

  return (
    <div className={`photo-pick ${value ? 'has' : ''}`}>
      <button type="button" className="photo-tile" onClick={() => input.current?.click()}>
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
      {value && (
        <button type="button" className="photo-remove" onClick={() => onChange(null)} aria-label={`Remove ${label}`}>
          <Icon name="x" size={14} stroke={3} />
        </button>
      )}
      <input ref={input} type="file" accept="image/*" hidden onChange={pick} />
    </div>
  )
}
