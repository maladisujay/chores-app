import { useRef } from 'react'
import { MEMBER_COLORS } from '../lib/presets.js'
import { CHORE_ICONS, ICON_KEYS } from '../icons/choreIcons.js'
import { ChoreIcon } from './ui.jsx'
import Icon from '../icons/Icon.jsx'
import { haptic } from '../lib/haptics.js'

export function ColorPicker({ value, onChange, taken = [] }) {
  const takenSet = new Set(taken.map((c) => c?.toUpperCase()))
  return (
    <div className="color-grid">
      {MEMBER_COLORS.map((c) => {
        const isTaken = takenSet.has(c.hex) && value?.toUpperCase() !== c.hex
        const sel = value?.toUpperCase() === c.hex
        return (
          <button
            key={c.hex}
            type="button"
            className={`color-dot ${sel ? 'sel' : ''} ${isTaken ? 'taken' : ''}`}
            style={{ '--c': c.hex }}
            disabled={isTaken}
            aria-label={`${c.name}${isTaken ? ' (taken)' : ''}`}
            onClick={() => {
              haptic()
              onChange(c.hex)
            }}
          >
            {sel && <Icon name="check" size={18} stroke={3} />}
            {isTaken && <Icon name="x" size={14} stroke={2.5} />}
          </button>
        )
      })}
    </div>
  )
}

export function IconPicker({ value, onChange }) {
  return (
    <div className="icon-grid">
      {ICON_KEYS.map((k) => (
        <button
          key={k}
          type="button"
          className={`icon-cell ${value === k ? 'sel' : ''}`}
          onClick={() => {
            haptic()
            onChange(k)
          }}
        >
          <ChoreIcon icon={k} size={46} />
          <span>{CHORE_ICONS[k].label}</span>
        </button>
      ))}
    </div>
  )
}

export function PinInput({ value, onChange, autoFocus, label = 'PIN' }) {
  const ref = useRef(null)
  return (
    <div className="pin" onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        className="pin-hidden"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={4}
        value={value}
        autoFocus={autoFocus}
        aria-label={label}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
      />
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`pin-box ${value.length === i ? 'cur' : ''} ${value[i] ? 'filled' : ''}`}>
          {value[i] ? '•' : ''}
        </span>
      ))}
    </div>
  )
}
