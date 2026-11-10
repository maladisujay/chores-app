import Icon from '../icons/Icon.jsx'
import { haptic } from '../lib/haptics.js'

const TABS = [
  { id: 'home', icon: 'home', label: 'Home' },
  { id: 'calendar', icon: 'calendar', label: 'Calendar' },
  null,
  { id: 'ranks', icon: 'trophy', label: 'Leaderboard' },
  { id: 'house', icon: 'house', label: 'House' },
]

export default function TabBar({ tab, onTab, onLog, badge }) {
  return (
    <nav className="tabbar-wrap" aria-label="Main">
      <div className="tabbar lg">
        {TABS.map((t, i) =>
          t ? (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => {
                if (tab !== t.id) haptic()
                onTab(t.id)
              }}
              aria-current={tab === t.id ? 'page' : undefined}
            >
              <span className="tab-ico">
                <Icon name={tab === t.id ? t.icon + 'Fill' : t.icon} size={25} stroke={1.9} />
                {t.id === 'house' && badge > 0 && <span className="badge">{badge}</span>}
              </span>
              <span className="tab-label">{t.id === 'house' ? 'House' : t.label === 'Leaderboard' ? 'Ranks' : t.label}</span>
            </button>
          ) : (
            <div key={i} className="tab-spacer" />
          ),
        )}
      </div>
      <button
        className="fab lg lg-tinted"
        onClick={() => {
          haptic('medium')
          onLog()
        }}
        aria-label="Log a chore"
      >
        <Icon name="plus" size={30} stroke={2.6} />
      </button>
    </nav>
  )
}
