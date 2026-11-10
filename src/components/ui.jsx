import { CHORE_ICONS } from '../icons/choreIcons.js'
import Icon from '../icons/Icon.jsx'
import { haptic } from '../lib/haptics.js'

// Contact-style avatar: a default profile silhouette on the member's color.
// The silhouette is white or near-black, whichever stays readable (≥3:1) on that color.
const inkCache = {}
function inkFor(hex) {
  if (inkCache[hex]) return inkCache[hex]
  const lin = (i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const L = 0.2126 * lin(1) + 0.7152 * lin(3) + 0.0722 * lin(5)
  return (inkCache[hex] = 1.05 / (L + 0.05) >= 3 ? '#fff' : 'rgba(0,0,0,0.78)')
}

export function Avatar({ member, size = 36, ring = false, className = '' }) {
  const color = /^#[0-9a-f]{6}$/i.test(member?.color || '') ? member.color : '#8E8E93'
  return (
    <span
      className={`avatar ${ring ? 'avatar-ring' : ''} ${member?.status === 'removed' ? 'avatar-gone' : ''} ${className}`}
      style={{ '--c': color, '--ink': inkFor(color), width: size, height: size }}
      role="img"
      aria-label={member?.name || 'Member'}
      title={member?.name}
    >
      <svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden="true">
        <circle cx="16" cy="12.2" r="5.6" fill="currentColor" />
        <path d="M5.6 27.4c1.3-5.2 5.4-8.3 10.4-8.3s9.1 3.1 10.4 8.3A15.9 15.9 0 0 1 16 32a15.9 15.9 0 0 1-10.4-4.6z" fill="currentColor" />
      </svg>
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
