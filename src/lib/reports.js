export const REPORT_CATEGORIES = {
  undone: { label: 'Undone chore', icon: 'hourglass', color: '#E8590C' },
  mess: { label: 'Mess', icon: 'trash', color: '#8250E6' },
  damage: { label: 'Damage', icon: 'alert', color: '#D70015' },
  supplies: { label: 'Out of supplies', icon: 'bag', color: '#0A6CF0' },
  other: { label: 'Other', icon: 'flag', color: '#677184' },
}
export const catOf = (k) => REPORT_CATEGORIES[k] || REPORT_CATEGORIES.other
