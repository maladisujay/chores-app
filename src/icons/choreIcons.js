// Hand-drawn illustrative chore icons (64×64) on vivid app-icon-style tiles.
// Tile colors are chosen to keep ≥3:1 contrast against both light and dark
// backgrounds (see scripts/contrast.mjs); a white sticker outline keeps every
// illustration readable on its tile.
// Palette
const S1 = '#EEF1F6', S2 = '#D3DAE4', S3 = '#9AA5B8', DK = '#3A4252', W = '#FFFFFF'
const BL = '#4DA3FF', BL2 = '#2D7FF9', AQ = '#8FD3FF', YE = '#FFC93C', YE2 = '#F2A922'
const OR = '#FF8A3D', RD = '#FF5A5F', RD2 = '#E0424A', GR = '#34C77B', GR2 = '#1FA463'
const BR = '#C08552', BR2 = '#94603A', PU = '#9B6BFF', PU2 = '#7B4FE0', PK = '#FF7AA8'

const sparkle = (x, y, s = 1, c = W) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0-5 C.6-1.2 1.2-.6 5 0 C1.2.6.6 1.2 0 5 C-.6 1.2-1.2.6-5 0 C-1.2-.6-.6-1.2 0-5Z" fill="${c}"/>`
const bubble = (x, y, r) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${W}" fill-opacity=".85" stroke="${AQ}" stroke-width="1.2"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.25}" fill="${W}"/>`

export const CHORE_ICONS = {
  broom: {
    label: 'Broom', tile: '#B87400',
    svg: `<g transform="rotate(22 32 34)"><rect x="29.5" y="3" width="5" height="32" rx="2.5" fill="${BR}"/><rect x="29.5" y="3" width="2" height="32" rx="1" fill="${BR2}" opacity=".35"/><rect x="21" y="32" width="22" height="7" rx="2.5" fill="${RD}"/><path d="M21 39h22l5 18c-12 3-20 3-32 0z" fill="${YE}"/><path d="M27 42l-2 13M32 42v14M37 42l2 13" stroke="${YE2}" stroke-width="2" stroke-linecap="round"/></g>`,
  },
  mop: {
    label: 'Mop', tile: '#2E7CF6',
    svg: `<rect x="30" y="3" width="4" height="35" rx="2" fill="${S3}"/><rect x="18" y="36" width="28" height="7" rx="3.5" fill="${DK}"/>${[19, 24, 29, 34, 39].map((x, i) => `<rect x="${x}" y="41" width="5" height="${15 + (i % 2) * 3}" rx="2.5" fill="${i % 2 ? BL : AQ}"/>`).join('')}<path d="M50 50c0 2.2-1.6 4-3.5 4S43 52.2 43 50c0-2.5 3.5-6 3.5-6s3.5 3.5 3.5 6z" fill="${BL}" transform="translate(4 -4)"/><path d="M14 52c0 1.7-1.2 3-2.6 3s-2.6-1.3-2.6-3c0-1.9 2.6-4.5 2.6-4.5s2.6 2.6 2.6 4.5z" fill="${AQ}"/>`,
  },
  vacuum: {
    label: 'Vacuum', tile: '#DE3F47',
    svg: `<path d="M34 4h8a4 4 0 0 1 4 4v5h-4V8h-8z" fill="${DK}"/><rect x="34" y="8" width="4" height="34" rx="2" fill="${S3}"/><rect x="27" y="22" width="14" height="20" rx="6" fill="${RD}"/><rect x="29" y="25" width="5" height="12" rx="2.5" fill="${W}" opacity=".35"/><circle cx="34" cy="42" r="3" fill="${DK}"/><path d="M14 52a6 6 0 0 1 6-6h24a6 6 0 0 1 6 6v2H14z" fill="${DK}"/><rect x="14" y="54" width="36" height="4" rx="2" fill="${S3}"/><rect x="20" y="49" width="10" height="2.5" rx="1.25" fill="${AQ}"/>${sparkle(52, 40, .9, '#FFB3B6')}`,
  },
  sink: {
    label: 'Sink', tile: '#2E7CF6',
    svg: `<path d="M22 30v-14a8 8 0 0 1 16 0v2" fill="none" stroke="${S3}" stroke-width="4.5" stroke-linecap="round"/><rect x="34" y="16" width="8" height="5" rx="2" fill="${S3}"/><rect x="18" y="26" width="8" height="5" rx="2" fill="${DK}"/><path d="M39 24c0 1.7-1.1 3-2.5 3S34 25.7 34 24c0-1.8 2.5-4 2.5-4s2.5 2.2 2.5 4z" fill="${BL}" transform="translate(1.5 3)"/><rect x="6" y="32" width="52" height="8" rx="3" fill="${S2}"/><path d="M12 40h40l-3 14a5 5 0 0 1-5 4H20a5 5 0 0 1-5-4z" fill="${S1}"/><path d="M14 40h36" stroke="${S3}" stroke-width="2"/><ellipse cx="32" cy="44" rx="13" ry="2.5" fill="${AQ}" opacity=".7"/>`,
  },
  counter: {
    label: 'Counter', tile: '#1C9A55',
    svg: `<rect x="6" y="38" width="52" height="7" rx="2.5" fill="${S3}"/><rect x="9" y="45" width="46" height="14" rx="2" fill="${S1}"/><path d="M32 45v14" stroke="${S2}" stroke-width="2"/><rect x="26" y="50" width="3" height="5" rx="1.5" fill="${S3}"/><rect x="35" y="50" width="3" height="5" rx="1.5" fill="${S3}"/><path d="M14 22h8l1 4h-4v3h-5z" fill="${GR2}"/><rect x="12" y="28" width="11" height="10" rx="3" fill="${GR}"/><rect x="14" y="30" width="3" height="6" rx="1.5" fill="${W}" opacity=".45"/><path d="M33 33c3-3 15-3 20 0l-1 5H34z" fill="${YE}"/><path d="M36 35h14" stroke="${YE2}" stroke-width="1.6" stroke-linecap="round"/>${sparkle(44, 20, 1.1, GR)}${sparkle(53, 27, .7, GR)}`,
  },
  microwave: {
    label: 'Microwave', tile: '#6A62EC',
    svg: `<rect x="5" y="14" width="54" height="36" rx="6" fill="${S2}"/><rect x="5" y="14" width="54" height="36" rx="6" fill="none" stroke="${S3}" stroke-width="1.5"/><rect x="10" y="19" width="34" height="26" rx="3.5" fill="${DK}"/><path d="M14 40l14-17h6L20 40z" fill="${W}" opacity=".12"/><rect x="47" y="19" width="8" height="5" rx="1.5" fill="#2BD47D"/>${[30, 36].map((y) => `<circle cx="49" cy="${y}" r="1.6" fill="${S3}"/><circle cx="53" cy="${y}" r="1.6" fill="${S3}"/>`).join('')}<rect x="47" y="40" width="8" height="5" rx="2" fill="${PU}"/><rect x="11" y="50" width="6" height="3" rx="1" fill="${S3}"/><rect x="47" y="50" width="6" height="3" rx="1" fill="${S3}"/>`,
  },
  dishwasher: {
    label: 'Dishwasher', tile: '#0E8FA6',
    svg: `<rect x="10" y="6" width="44" height="52" rx="5" fill="${S1}"/><rect x="10" y="6" width="44" height="11" rx="5" fill="${DK}"/><rect x="10" y="13" width="44" height="4" fill="${DK}"/><circle cx="17" cy="11.5" r="2" fill="#2BD47D"/><rect x="34" y="10" width="15" height="3" rx="1.5" fill="${S3}"/><rect x="18" y="21" width="28" height="3.5" rx="1.75" fill="${S3}"/>${bubble(24, 38, 6)}${bubble(37, 34, 4)}${bubble(40, 46, 5)}${bubble(28, 50, 3)}<rect x="10" y="54" width="44" height="4" rx="2" fill="${S2}"/>`,
  },
  dishes: {
    label: 'Dishes', tile: '#2E7CF6',
    svg: `<ellipse cx="30" cy="50" rx="22" ry="7" fill="${S2}"/><ellipse cx="30" cy="45" rx="22" ry="7" fill="${W}" stroke="${S2}" stroke-width="2"/><ellipse cx="30" cy="45" rx="12" ry="3.6" fill="${S1}"/><ellipse cx="30" cy="38" rx="20" ry="6.5" fill="${W}" stroke="${S2}" stroke-width="2"/><ellipse cx="30" cy="38" rx="11" ry="3.2" fill="#E6F3FF"/><ellipse cx="30" cy="31" rx="18" ry="6" fill="${W}" stroke="${S2}" stroke-width="2"/><ellipse cx="30" cy="31" rx="10" ry="3" fill="#E6F3FF"/>${bubble(48, 18, 6)}${bubble(39, 13, 3.5)}${bubble(54, 30, 3)}`,
  },
  stove: {
    label: 'Stove', tile: '#E0621A',
    svg: `<rect x="6" y="10" width="52" height="44" rx="6" fill="${DK}"/><rect x="6" y="10" width="52" height="8" rx="4" fill="${S3}"/>${[14, 26, 38, 50].map((x) => `<circle cx="${x}" cy="14" r="2" fill="${DK}"/>`).join('')}<circle cx="21" cy="29" r="7" fill="none" stroke="#5B6577" stroke-width="3"/><circle cx="43" cy="29" r="5" fill="none" stroke="#5B6577" stroke-width="3"/><circle cx="21" cy="45" r="5" fill="none" stroke="#5B6577" stroke-width="3"/><circle cx="43" cy="45" r="7" fill="none" stroke="${OR}" stroke-width="3"/><circle cx="43" cy="45" r="3" fill="none" stroke="${YE}" stroke-width="2"/>`,
  },
  oven: {
    label: 'Oven', tile: '#E0621A',
    svg: `<rect x="8" y="6" width="48" height="52" rx="5" fill="${S2}"/><rect x="8" y="6" width="48" height="11" rx="5" fill="${S3}"/>${[16, 26, 38, 48].map((x) => `<circle cx="${x}" cy="11.5" r="2.6" fill="${DK}"/>`).join('')}<rect x="13" y="20" width="38" height="4" rx="2" fill="${S3}"/><rect x="13" y="28" width="38" height="24" rx="4" fill="${DK}"/><rect x="17" y="32" width="30" height="16" rx="2.5" fill="${OR}" opacity=".85"/><path d="M19 46c3-6 7-6 10-2s7 4 10-2 6-3 6-3v7H19z" fill="${YE}" opacity=".7"/>`,
  },
  fridge: {
    label: 'Fridge', tile: '#0E8FA6',
    svg: `<rect x="14" y="4" width="36" height="56" rx="6" fill="${S1}"/><rect x="14" y="4" width="36" height="56" rx="6" fill="none" stroke="${S2}" stroke-width="2"/><path d="M14 24h36" stroke="${S2}" stroke-width="2.5"/><rect x="18" y="10" width="3.5" height="9" rx="1.75" fill="${S3}"/><rect x="18" y="29" width="3.5" height="14" rx="1.75" fill="${S3}"/><circle cx="38" cy="33" r="3.5" fill="${RD}"/><rect x="33" y="40" width="9" height="7" rx="1.5" fill="${YE}" transform="rotate(-8 37 43)"/><rect x="40" y="10" width="5" height="5" rx="2.5" fill="${GR}"/>`,
  },
  trash: {
    label: 'Trash', tile: '#1C9A55',
    svg: `<path d="M16 22h32l-3 32a5 5 0 0 1-5 4.5H24a5 5 0 0 1-5-4.5z" fill="${GR}"/><path d="M24 28l1 24M32 28v24M40 28l-1 24" stroke="${GR2}" stroke-width="3" stroke-linecap="round"/><g transform="rotate(-12 18 18)"><rect x="12" y="14" width="40" height="7" rx="3.5" fill="${GR2}"/><rect x="27" y="9" width="10" height="6" rx="2.5" fill="${GR2}"/></g><path d="M44 8c3 2 4 5 2 8" stroke="${S3}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>`,
  },
  recycle: {
    label: 'Recycling', tile: '#2E7CF6',
    svg: `<path d="M14 18h36l-3 36a5 5 0 0 1-5 4.5H22a5 5 0 0 1-5-4.5z" fill="${BL}"/><rect x="11" y="13" width="42" height="7" rx="3.5" fill="${BL2}"/><g fill="${W}" transform="translate(32 38)"><path d="M-2-12l4 0 5 8-3 2-4-6-2 3-3-2z"/><path d="M9 4l-2 4h-9v-4h7l-2-3 3-1z"/><path d="M-9 6l-2-3 4-8 3 2-3 6h4v4z"/></g>`,
  },
  duster: {
    label: 'Dusting', tile: '#D63A75',
    svg: `<rect x="29.5" y="34" width="5" height="26" rx="2.5" fill="${BR}"/><rect x="27" y="31" width="10" height="6" rx="2" fill="${DK}"/>${[-50, -25, 0, 25, 50].map((a, i) => `<ellipse cx="32" cy="16" rx="6" ry="15" fill="${[PK, PU, '#FFB3CF', PU, PK][i]}" transform="rotate(${a} 32 31)"/>`).join('')}${sparkle(10, 46, .8, PK)}${sparkle(54, 48, .8, PU)}`,
  },
  sofa: {
    label: 'Tidy up', tile: '#8250E6',
    svg: `<rect x="12" y="18" width="40" height="22" rx="7" fill="${PU2}"/><rect x="5" y="28" width="12" height="22" rx="5" fill="${PU}"/><rect x="47" y="28" width="12" height="22" rx="5" fill="${PU}"/><rect x="14" y="34" width="36" height="12" rx="4" fill="${PU}"/><path d="M32 35v10" stroke="${PU2}" stroke-width="2"/><rect x="10" y="48" width="44" height="6" rx="3" fill="${PU2}"/><rect x="12" y="54" width="4" height="5" rx="1" fill="${BR2}"/><rect x="48" y="54" width="4" height="5" rx="1" fill="${BR2}"/><rect x="18" y="23" width="11" height="10" rx="3" fill="${YE}" transform="rotate(-10 23 28)"/>`,
  },
  plant: {
    label: 'Plants', tile: '#1C9A55',
    svg: `<path d="M32 40c0-10 0-18 0-24" stroke="${GR2}" stroke-width="3" stroke-linecap="round"/><path d="M32 26c-10 0-16-6-17-14 9 0 16 5 17 14z" fill="${GR}"/><path d="M32 32c9-1 15-7 15-15-9 1-14 7-15 15z" fill="${GR2}"/><path d="M32 22c-2-6 0-12 4-16 2 6 0 12-4 16z" fill="${GR}"/><path d="M18 40h28l-4 18H22z" fill="${OR}"/><rect x="16" y="38" width="32" height="6" rx="2" fill="#E9742B"/><path d="M52 24c0 1.7-1.1 3-2.5 3S47 25.7 47 24c0-1.8 2.5-4 2.5-4s2.5 2.2 2.5 4z" fill="${BL}"/><path d="M57 33c0 1.4-.9 2.5-2 2.5s-2-1.1-2-2.5c0-1.5 2-3.3 2-3.3s2 1.8 2 3.3z" fill="${AQ}"/>`,
  },
  toilet: {
    label: 'Toilet', tile: '#0E8FA6',
    svg: `<rect x="14" y="5" width="22" height="20" rx="4" fill="${W}" stroke="${S2}" stroke-width="2"/><rect x="18" y="9" width="6" height="2.5" rx="1.25" fill="${S3}"/><path d="M10 28h40a2 2 0 0 1 2 2c0 9-7 16-16 17l2 9H22l2-9c-8-2-14-8-14-17z" fill="${W}" stroke="${S2}" stroke-width="2" stroke-linejoin="round"/><ellipse cx="31" cy="30.5" rx="18" ry="3.5" fill="${S1}" stroke="${S2}" stroke-width="2"/><ellipse cx="31" cy="30.8" rx="11" ry="1.8" fill="${AQ}"/>${sparkle(54, 14, 1, BL)}${sparkle(46, 6, .6, BL)}`,
  },
  tub: {
    label: 'Bathtub', tile: '#2E7CF6',
    svg: `<path d="M12 30V14a6 6 0 0 1 12 0" fill="none" stroke="${S3}" stroke-width="3.5" stroke-linecap="round"/><rect x="20" y="13" width="8" height="4" rx="2" fill="${S3}"/>${bubble(22, 30, 4)}${bubble(30, 27, 5.5)}${bubble(40, 29, 4.5)}${bubble(48, 31, 3)}<rect x="4" y="32" width="56" height="6" rx="3" fill="${S2}"/><path d="M7 38h50v4a12 12 0 0 1-12 12H19A12 12 0 0 1 7 42z" fill="${W}" stroke="${S2}" stroke-width="2"/><rect x="14" y="53" width="4" height="6" rx="2" fill="${S3}"/><rect x="46" y="53" width="4" height="6" rx="2" fill="${S3}"/><path d="M46 28a4 4 0 0 1 7 1 5 5 0 0 1 3 3h-12a4 4 0 0 1 2-4z" fill="${YE}"/><circle cx="51.5" cy="27" r="2.6" fill="${YE}"/><path d="M53.8 27.2l2.4.6-2.2 1z" fill="${OR}"/>`,
  },
  shower: {
    label: 'Shower', tile: '#0E8FA6',
    svg: `<path d="M48 60V14a8 8 0 0 0-8-8h-6a8 8 0 0 0-8 8v4" fill="none" stroke="${S3}" stroke-width="4" stroke-linecap="round"/><path d="M14 26a12 8 0 0 1 24 0z" fill="${S2}"/><rect x="13" y="25" width="26" height="4" rx="2" fill="${S3}"/>${[16, 21, 26, 31, 36].map((x, i) => `<path d="M${x} 33l${(x - 26) * 0.25} ${12 + (i % 2) * 6}" stroke="${i % 2 ? BL : AQ}" stroke-width="2.6" stroke-linecap="round"/>`).join('')}`,
  },
  mirror: {
    label: 'Mirror', tile: '#B87400',
    svg: `<ellipse cx="32" cy="28" rx="18" ry="22" fill="${YE2}"/><ellipse cx="32" cy="28" rx="14" ry="18" fill="#D7EEFF"/><path d="M24 22l10-10M24 32l16-16M30 38l10-10" stroke="${W}" stroke-width="3" stroke-linecap="round" opacity=".9"/><rect x="18" y="50" width="28" height="8" rx="4" fill="${S2}"/><path d="M22 50h20l-2-3H24z" fill="${S3}"/>${sparkle(52, 10, 1.1, YE2)}${sparkle(12, 44, .7, YE2)}`,
  },
  paper: {
    label: 'Toilet paper', tile: '#677184',
    svg: `<path d="M14 18h26v34H14z" fill="${W}"/><ellipse cx="14" cy="35" rx="6" ry="17" fill="${S1}" stroke="${S2}" stroke-width="2"/><ellipse cx="14" cy="35" rx="2.4" ry="6" fill="${S3}"/><path d="M40 18c4 0 6 7.6 6 17s-2 17-6 17" fill="${S1}"/><path d="M40 52h14v6H38z" fill="${W}" stroke="${S2}" stroke-width="1.5"/><path d="M14 18h26M14 52h26" stroke="${S2}" stroke-width="2"/><path d="M44 52v6M49 52v6" stroke="${S2}" stroke-width="1.2" stroke-dasharray="1.5 1.5"/>`,
  },
  window: {
    label: 'Windows', tile: '#2E7CF6',
    svg: `<rect x="8" y="8" width="48" height="44" rx="4" fill="${W}"/><rect x="12" y="12" width="18" height="17" rx="1.5" fill="${AQ}"/><rect x="34" y="12" width="18" height="17" rx="1.5" fill="${AQ}"/><rect x="12" y="32" width="18" height="16" rx="1.5" fill="${AQ}"/><rect x="34" y="32" width="18" height="16" rx="1.5" fill="${AQ}"/><path d="M15 25l8-9M37 45l10-11M38 25l5-6" stroke="${W}" stroke-width="2.5" stroke-linecap="round"/><rect x="5" y="52" width="54" height="5" rx="2" fill="${S2}"/><circle cx="22" cy="40" r="4" fill="${W}" opacity=".8"/>${sparkle(43, 41, .7)}`,
  },
  groceries: {
    label: 'Groceries', tile: '#996638',
    svg: `<rect x="34" y="4" width="7" height="26" rx="3.5" fill="#E9B26B" transform="rotate(18 37 17)"/><path d="M22 20c-3-6 0-12 0-12s7 4 6 12z" fill="${GR}"/><path d="M26 22c2-6 8-8 8-8s0 7-6 10z" fill="${GR2}"/><circle cx="44" cy="24" r="6" fill="${RD}"/><path d="M44 18c0-2 1-3 3-4" stroke="${BR2}" stroke-width="1.6" fill="none"/><path d="M12 26h40l-4 32H16z" fill="${BR}"/><path d="M12 26h40l-1 5H13z" fill="${BR2}"/><path d="M24 36a8 8 0 0 0 16 0" fill="none" stroke="${BR2}" stroke-width="2.5" stroke-linecap="round"/>`,
  },
  laundry: {
    label: 'Laundry', tile: '#6A62EC',
    svg: `<rect x="10" y="5" width="44" height="54" rx="6" fill="${W}" stroke="${S2}" stroke-width="2"/><path d="M10 16h44" stroke="${S2}" stroke-width="2"/><circle cx="17" cy="10.5" r="2.2" fill="${S3}"/><circle cx="24" cy="10.5" r="2.2" fill="${S3}"/><rect x="38" y="8.5" width="11" height="4" rx="2" fill="#2BD47D"/><circle cx="32" cy="37" r="15" fill="${S2}"/><circle cx="32" cy="37" r="11.5" fill="${BL}"/><path d="M20.5 38c4 3 7 3 11.5 0s8-3 11.5 0a11.5 11.5 0 0 1-23 0z" fill="${BL2}"/><circle cx="28" cy="32" r="2.4" fill="${W}" opacity=".8"/><circle cx="35" cy="30" r="1.5" fill="${W}" opacity=".8"/>`,
  },
  basket: {
    label: 'Laundry basket', tile: '#D63A75',
    svg: `<path d="M18 22c2-8 10-10 14-6 3-6 13-5 14 4l-6 6H20z" fill="${PK}"/><path d="M28 22c3-4 9-5 12 0z" fill="${BL}"/><path d="M8 24h48l-5 32a4 4 0 0 1-4 3H17a4 4 0 0 1-4-3z" fill="${BR}"/><path d="M8 24h48v5H8z" fill="${BR2}"/><g stroke="${BR2}" stroke-width="2"><path d="M14 36h36M15 45h34"/><path d="M22 29l1 28M32 29v28M42 29l-1 28"/></g>`,
  },
  iron: {
    label: 'Ironing', tile: '#8250E6',
    svg: `<path d="M8 50c2-14 12-22 30-22h12a6 6 0 0 1 6 6v16z" fill="${PU}"/><path d="M8 50h48v4H8z" fill="${S3}"/><path d="M26 28c0-8 4-12 12-12h10a4 4 0 0 1 0 8H38c-2 0-4 2-4 4" fill="none" stroke="${PU2}" stroke-width="4.5" stroke-linecap="round"/><circle cx="44" cy="40" r="3" fill="${W}" opacity=".6"/><path d="M16 22c-3-3 3-5 0-9M24 18c-3-3 3-5 0-9" stroke="${S3}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  },
  bed: {
    label: 'Make bed', tile: '#6A62EC',
    svg: `<rect x="5" y="16" width="6" height="40" rx="2.5" fill="${BR2}"/><rect x="53" y="30" width="6" height="26" rx="2.5" fill="${BR2}"/><rect x="11" y="38" width="42" height="12" fill="${BR}"/><rect x="13" y="24" width="16" height="12" rx="5" fill="${W}" stroke="${S2}" stroke-width="2"/><path d="M24 32h28a3 3 0 0 1 3 3v8H22v-9a2 2 0 0 1 2-2z" fill="${PU}"/><path d="M30 32v11" stroke="${PU2}" stroke-width="2"/><path d="M11 44h44" stroke="${PU2}" stroke-width="2"/>`,
  },
  sponge: {
    label: 'Scrubbing', tile: '#B87400',
    svg: `<rect x="10" y="30" width="40" height="22" rx="6" fill="${YE}" transform="rotate(-10 30 41)"/><rect x="10" y="24" width="40" height="9" rx="4" fill="${GR}" transform="rotate(-10 30 28)"/>${[[20, 42], [30, 46], [38, 39], [26, 37]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="${YE2}"/>`).join('')}${bubble(50, 18, 6)}${bubble(42, 10, 3.5)}${bubble(56, 30, 3)}`,
  },
  spray: {
    label: 'Disinfect', tile: '#1C9A55',
    svg: `<path d="M22 12h16l2 6H20z" fill="${DK}"/><path d="M38 12h8v5h-6" fill="${DK}"/><rect x="28" y="18" width="6" height="6" fill="${S3}"/><path d="M22 24h18l4 8v22a5 5 0 0 1-5 5H23a5 5 0 0 1-5-5V32z" fill="${GR}"/><rect x="22" y="36" width="18" height="12" rx="2" fill="${W}"/><path d="M27 42h8M31 38v8" stroke="${GR}" stroke-width="2.6" stroke-linecap="round"/><g fill="${AQ}"><circle cx="52" cy="10" r="1.8"/><circle cx="56" cy="15" r="1.5"/><circle cx="52" cy="18" r="1.3"/><circle cx="58" cy="8" r="1.2"/></g>`,
  },
  pet: {
    label: 'Pet care', tile: '#E0621A',
    svg: `<ellipse cx="32" cy="22" rx="7" ry="8" fill="${OR}"/><ellipse cx="18" cy="16" rx="4.5" ry="5.5" fill="${OR}"/><ellipse cx="46" cy="16" rx="4.5" ry="5.5" fill="${OR}"/><ellipse cx="25" cy="7" rx="4" ry="5" fill="${OR}"/><ellipse cx="39" cy="7" rx="4" ry="5" fill="${OR}"/><path d="M8 42h48l-5 14H13z" fill="${BL}"/><ellipse cx="32" cy="42" rx="24" ry="5" fill="${BL2}"/><ellipse cx="32" cy="41" rx="18" ry="3" fill="${BR}"/>`,
  },
  lawn: {
    label: 'Yard', tile: '#1C9A55',
    svg: `<path d="M38 30L50 6" stroke="${DK}" stroke-width="3.5" stroke-linecap="round"/><path d="M45 6h10" stroke="${DK}" stroke-width="4" stroke-linecap="round"/><path d="M10 40a10 10 0 0 1 10-10h18a8 8 0 0 1 8 8v6H10z" fill="${RD}"/><rect x="18" y="33" width="12" height="4" rx="2" fill="${W}" opacity=".5"/><circle cx="16" cy="46" r="5" fill="${DK}"/><circle cx="40" cy="46" r="5" fill="${DK}"/><circle cx="16" cy="46" r="2" fill="${S3}"/><circle cx="40" cy="46" r="2" fill="${S3}"/><path d="M4 58c2-6 3-6 4 0 2-7 3-7 4 0 2-6 3-6 4 0 2-7 3-7 4 0 2-6 3-6 4 0 2-7 3-7 4 0 2-6 3-6 4 0 2-7 3-7 4 0 2-6 3-6 4 0 2-7 3-7 4 0 2-6 3-6 4 0 2-7 3-7 4 0z" fill="${GR}"/>`,
  },
  towel: {
    label: 'Towels', tile: '#D63A75',
    svg: `<rect x="8" y="42" width="48" height="14" rx="4" fill="${BL}"/><path d="M8 50h48" stroke="${BL2}" stroke-width="2"/><rect x="11" y="28" width="42" height="14" rx="4" fill="${PK}"/><path d="M11 36h42" stroke="#F0558C" stroke-width="2"/><rect x="14" y="15" width="36" height="13" rx="4" fill="${YE}"/><path d="M14 22h36" stroke="${YE2}" stroke-width="2"/>${sparkle(52, 10, .9, PK)}`,
  },
  bulb: {
    label: 'Lights', tile: '#B87400',
    svg: `<circle cx="32" cy="24" r="15" fill="${YE}"/><path d="M24 32c3 3 4 6 4 10h8c0-4 1-7 4-10" fill="${YE}"/><path d="M27 22a6 6 0 0 1 6-6" stroke="${W}" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="26" y="42" width="12" height="5" rx="1.5" fill="${S3}"/><rect x="26" y="47" width="12" height="5" rx="1.5" fill="${S2}"/><rect x="29" y="52" width="6" height="4" rx="2" fill="${DK}"/><g stroke="${YE2}" stroke-width="2.6" stroke-linecap="round"><path d="M8 24h4M52 24h4M14 8l3 3M50 8l-3 3"/></g>`,
  },
  car: {
    label: 'Car', tile: '#2E7CF6',
    svg: `<path d="M8 40v-6a4 4 0 0 1 4-4h4l6-10a6 6 0 0 1 5-3h12a6 6 0 0 1 5 3l6 10h2a4 4 0 0 1 4 4v6a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3z" fill="${BL}"/><path d="M21 30l5-8a3 3 0 0 1 2.5-1.5H31V30zM34 30v-9.5h4a3 3 0 0 1 2.5 1.5l5 8z" fill="#D7EEFF"/><circle cx="20" cy="43" r="6" fill="${DK}"/><circle cx="44" cy="43" r="6" fill="${DK}"/><circle cx="20" cy="43" r="2.4" fill="${S3}"/><circle cx="44" cy="43" r="2.4" fill="${S3}"/><rect x="50" y="33" width="5" height="3" rx="1.5" fill="${YE}"/>${bubble(14, 54, 3)}${bubble(32, 55, 3.6)}${bubble(50, 54, 2.6)}`,
  },
  package: {
    label: 'Packages', tile: '#996638',
    svg: `<path d="M32 8l22 10v28L32 56 10 46V18z" fill="${BR}"/><path d="M32 30L10 18v28l22 10z" fill="#D49A65"/><path d="M32 30l22-12" stroke="${BR2}" stroke-width="1.5"/><path d="M32 30v26" stroke="${BR2}" stroke-width="1.5"/><path d="M21 13l22 10v8l-5-2v-6L16 15z" fill="#F2D3A8"/>`,
  },
  cook: {
    label: 'Cooking', tile: '#DE3F47',
    svg: `<path d="M22 14c-3-3 3-5 0-9M32 14c-3-3 3-5 0-9M42 14c-3-3 3-5 0-9" stroke="${S3}" stroke-width="2.4" fill="none" stroke-linecap="round"/><rect x="12" y="24" width="40" height="28" rx="6" fill="${RD}"/><rect x="16" y="28" width="6" height="18" rx="3" fill="${W}" opacity=".3"/><rect x="9" y="20" width="46" height="6" rx="3" fill="${RD2}"/><rect x="28" y="15" width="8" height="5" rx="2" fill="${DK}"/><rect x="3" y="30" width="9" height="4" rx="2" fill="${DK}"/><rect x="52" y="30" width="9" height="4" rx="2" fill="${DK}"/>`,
  },
  table: {
    label: 'Set table', tile: '#1C9A55',
    svg: `<circle cx="32" cy="32" r="18" fill="${W}" stroke="${S2}" stroke-width="2"/><circle cx="32" cy="32" r="11" fill="${S1}"/><path d="M8 12v12a3 3 0 0 0 3 3v25" stroke="${S3}" stroke-width="3" stroke-linecap="round"/><path d="M5 12v10M11 12v10" stroke="${S3}" stroke-width="2" stroke-linecap="round"/><path d="M56 12c-4 2-4 10-4 15h4v25" stroke="${S3}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M27 31c2 3 8 3 10 0" stroke="${GR}" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="29" cy="28" r="1.5" fill="${GR2}"/><circle cx="35" cy="28" r="1.5" fill="${GR2}"/>`,
  },
  bucket: {
    label: 'Deep clean', tile: '#2E7CF6',
    svg: `<path d="M16 22a16 16 0 0 1 32 0" fill="none" stroke="${S3}" stroke-width="3"/>${bubble(22, 22, 5)}${bubble(32, 18, 6.5)}${bubble(42, 22, 5)}<path d="M12 26h40l-5 30a4 4 0 0 1-4 3H21a4 4 0 0 1-4-3z" fill="${BL}"/><rect x="10" y="24" width="44" height="6" rx="3" fill="${BL2}"/><rect x="18" y="34" width="4" height="18" rx="2" fill="${W}" opacity=".35"/>`,
  },
  other: {
    label: 'Other', tile: '#8250E6',
    svg: `<defs><linearGradient id="og" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7AA7FF"/><stop offset=".5" stop-color="${PU}"/><stop offset="1" stop-color="${PK}"/></linearGradient></defs><path d="M30 6c2 12 6 16 18 18-12 2-16 6-18 18-2-12-6-16-18-18 12-2 16-6 18-18z" fill="url(#og)"/><path d="M48 36c1 6 3 8 9 9-6 1-8 3-9 9-1-6-3-8-9-9 6-1 8-3 9-9z" fill="${PK}"/><path d="M16 44c.8 4 2 5.2 6 6-4 .8-5.2 2-6 6-.8-4-2-5.2-6-6 4-.8 5.2-2 6-6z" fill="#7AA7FF"/>`,
  },
}

export const ICON_KEYS = Object.keys(CHORE_ICONS)
