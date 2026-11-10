import { CHORE_ICONS } from '../icons/choreIcons.js'
import Icon from '../icons/Icon.jsx'
import { haptic } from '../lib/haptics.js'

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return [...parts[0]].slice(0, 2).join('').toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Pick white or near-black initials so they stay readable on every member color
// (≥3:1 for the large, bold initials).
const inkCache = {}
function inkFor(hex) {
  if (inkCache[hex]) return inkCache[hex]
  const lin = (i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const L = 0.2126 * lin(1) + 0.7152 * lin(3) + 0.0722 * lin(5)
  return (inkCache[hex] = 1.05 / (L + 0.05) >= 3 ? '#fff' : 'rgba(0,0,0,0.82)')
}

export function Avatar({ member, size = 36, ring = false, className = '' }) {
  const color = /^#[0-9a-f]{6}$/i.test(member?.color || '') ? member.color : '#8E8E93'
  return (
    <span
      className={`avatar ${ring ? 'avatar-ring' : ''} ${member?.status === 'removed' ? 'avatar-gone' : ''} ${className}`}
      style={{ '--c': color, '--ink': inkFor(color), width: size, height: size, fontSize: size * 0.38 }}
      title={member?.name}
    >
      {initials(member?.name)}
    </span>
  )
}

export function ChoreIcon({ icon, size = 44, radius }) {
  const def = CHORE_ICONS[icon] || CHORE_ICONS.other
  return (
    <span className="chore-ico" style={{ '--tile': def.tile, width: size, height: size, borderRadius: radius ?? size * 0.3 }}>
      <svg viewBox="0 0 64 64" width={size * 0.78} height={size * 0.78} dangerouslySetInnerHTML={{ __html: def.svg }} />
    </span>
  )
}

export function Switch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`switch ${checked ? 'on' : ''}`}
      onClick={() => {
        haptic()
        onChange(!checked)
      }}
    >
      <span className="knob" />
    </button>
  )
}

export function Segmented({ value, onChange, options }) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div className="segmented" style={{ '--n': options.length, '--i': idx }}>
      <span className="seg-thumb" />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={o.value === value ? 'active' : ''}
          onClick={() => {
            haptic()
            onChange(o.value)
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({ value, onChange, min = 0, max = 1000, step = 1 }) {
  const set = (v) => onChange(Math.max(min, Math.min(max, v)))
  return (
    <div className="stepper">
      <button type="button" onClick={() => { haptic(); set(value - step) }} disabled={value <= min} aria-label="Decrease">
        <Icon name="minus" size={18} />
      </button>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, '') || '0', 10)
          set(n)
        }}
        aria-label="Points"
      />
      <button type="button" onClick={() => { haptic(); set(value + step) }} disabled={value >= max} aria-label="Increase">
        <Icon name="plus" size={18} />
      </button>
    </div>
  )
}

export function Spinner({ size = 20 }) {
  return <span className="spinner" style={{ width: size, height: size }} />
}

export function Button({ children, variant = 'primary', loading, className = '', ...rest }) {
  return (
    <button className={`btn btn-${variant} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading ? <Spinner size={18} /> : children}
    </button>
  )
}

export function Empty({ icon = 'sparkles', title, children }) {
  return (
    <div className="empty">
      <div className="empty-ico"><ChoreIcon icon={icon} size={72} /></div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  )
}

export function Group({ title, footer, children, className = '' }) {
  return (
    <section className={`group ${className}`}>
      {title && <h4 className="group-title">{title}</h4>}
      <div className="glass group-body">{children}</div>
      {footer && <p className="group-footer">{footer}</p>}
    </section>
  )
}

export function Row({ icon, iconBg, label, value, onClick, chevron, danger, children, sub }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`row ${danger ? 'danger' : ''} ${onClick ? 'tappable' : ''}`} onClick={onClick} type={onClick ? 'button' : undefined}>
      {icon && (
        <span className="row-ico" style={{ background: iconBg || 'var(--accent)' }}>
          <Icon name={icon} size={17} stroke={2.2} />
        </span>
      )}
      <span className="row-main">
        <span className="row-label">{label}</span>
        {sub && <span className="row-sub">{sub}</span>}
      </span>
      {value !== undefined && <span className="row-value">{value}</span>}
      {children}
      {chevron && <Icon name="chevronR" size={16} className="row-chev" stroke={2.4} />}
    </Tag>
  )
}

export function PointsPill({ log, points, size = 'md' }) {
  if (log?.voided) {
    return (
      <span className={`pts pts-${size} pts-void`}>
        <s>{log.points}</s> −{Math.round(log.points * 0.5)}
      </span>
    )
  }
  return <span className={`pts pts-${size}`}>+{points ?? log.points}</span>
}
