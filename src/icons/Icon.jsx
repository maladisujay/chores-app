// SF-Symbols-like stroke icons
const P = {
  home: <><path d="M3.5 10.5 12 3.8l8.5 6.7" /><path d="M5.5 9v10.2c0 .7.6 1.3 1.3 1.3h3.7v-6h3v6h3.7c.7 0 1.3-.6 1.3-1.3V9" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /><circle cx="8.5" cy="14.5" r=".9" fill="currentColor" /><circle cx="12" cy="14.5" r=".9" fill="currentColor" /><circle cx="15.5" cy="14.5" r=".9" fill="currentColor" /></>,
  trophy: <><path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z" /><path d="M7.5 6H4.5v1.5A3 3 0 0 0 7.6 10.5M16.5 6h3v1.5a3 3 0 0 1-3.1 3" /><path d="M12 13.5V17M8.5 20.5h7M9.5 17h5v3.5h-5z" /></>,
  house: <><path d="M4 20.5V10l8-6 8 6v10.5" /><path d="M9.5 20.5v-5.5h5v5.5M2.5 20.5h19" /></>,
  homeFill: <path fill="currentColor" stroke="none" d="M11.2 3.2a1.3 1.3 0 0 1 1.6 0l8.2 6.5c.6.5.2 1.5-.6 1.5h-1v8.3c0 1.1-.9 2-2 2h-3.1v-5.6c0-.6-.4-1-1-1h-2.6c-.6 0-1 .4-1 1v5.6H6.6c-1.1 0-2-.9-2-2v-8.3h-1c-.8 0-1.2-1-.6-1.5z" />,
  calendarFill: <><path fill="currentColor" stroke="none" d="M6.5 4.2h11a3.3 3.3 0 0 1 3.3 3.3v1.7H3.2V7.5a3.3 3.3 0 0 1 3.3-3.3zM3.2 10.8h17.6v6.7a3.3 3.3 0 0 1-3.3 3.3h-11a3.3 3.3 0 0 1-3.3-3.3z" /><path d="M8 2.8v3M16 2.8v3" /><circle cx="8.5" cy="14.8" r="1.1" fill="var(--tab-cut, #fff)" stroke="none" /><circle cx="12" cy="14.8" r="1.1" fill="var(--tab-cut, #fff)" stroke="none" /><circle cx="15.5" cy="14.8" r="1.1" fill="var(--tab-cut, #fff)" stroke="none" /></>,
  trophyFill: <><path fill="currentColor" stroke="none" d="M7 3.5h10c.6 0 1 .4 1 1V9a6 6 0 0 1-12 0V4.5c0-.6.4-1 1-1zM10.5 14.6h3v3.4h-3zM8.3 18h7.4c.6 0 1 .4 1 1v1.5H7.3V19c0-.6.4-1 1-1z" /><path d="M6.4 6.2H4.5v1.3a3.2 3.2 0 0 0 3 3.2M17.6 6.2h1.9v1.3a3.2 3.2 0 0 1-3 3.2" /></>,
  houseFill: <path fill="currentColor" stroke="none" d="M11.2 3.4a1.3 1.3 0 0 1 1.6 0l7.4 5.6c.4.3.6.7.6 1.1v9.4c0 .8-.6 1.4-1.4 1.4h-4.5v-5.4c0-.6-.4-1-1-1h-3.8c-.6 0-1 .4-1 1v5.4H4.6c-.8 0-1.4-.6-1.4-1.4v-9.4c0-.4.2-.8.6-1.1z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  chevronR: <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
  chevronL: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  chevronD: <path d="m5.5 9.5 6.5 6.5 6.5-6.5" />,
  camera: <><path d="M4 8.5c0-1 .8-1.8 1.8-1.8h2.3l1.4-2.2h5l1.4 2.2h2.3c1 0 1.8.8 1.8 1.8v9.2c0 1-.8 1.8-1.8 1.8H5.8c-1 0-1.8-.8-1.8-1.8z" /><circle cx="12" cy="13" r="3.6" /></>,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><circle cx="9" cy="10" r="1.7" /><path d="m4 17 5-4.5 3.5 3 3-2.5 4.5 4" /></>,
  trash: <><path d="M4.5 6.5h15M9.5 6.5V4.8c0-.7.6-1.3 1.3-1.3h2.4c.7 0 1.3.6 1.3 1.3v1.7" /><path d="M6.5 6.5 7.4 19c.1.9.8 1.5 1.7 1.5h5.8c.9 0 1.6-.6 1.7-1.5l.9-12.5M10 10.5v6M14 10.5v6" /></>,
  edit: <><path d="M15.2 4.8a2 2 0 0 1 2.9 0l1.1 1.1a2 2 0 0 1 0 2.9L9 19l-4.5 1 1-4.5z" /><path d="m13.5 6.5 4 4" /></>,
  share: <><path d="M12 3.5v11M8 7.5l4-4 4 4" /><path d="M8 10.5H6.5c-.8 0-1.5.7-1.5 1.5v7c0 .8.7 1.5 1.5 1.5h11c.8 0 1.5-.7 1.5-1.5v-7c0-.8-.7-1.5-1.5-1.5H16" /></>,
  copy: <><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5" /><path d="M15.5 8.5V6c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v7.5c0 1.1.9 2 2 2h2.5" /></>,
  grip: <><circle cx="9" cy="7" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="7" r="1.3" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="9" cy="17" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="17" r="1.3" fill="currentColor" stroke="none" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  unlock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 7.7-1.5" /></>,
  thumbDown: <><path d="M7.5 13.5V4.5H5.3c-.7 0-1.3.6-1.3 1.3v6.4c0 .7.6 1.3 1.3 1.3z" /><path d="M7.5 13.5 11 20c1.3 0 2.3-1 2.3-2.3v-3.2h4.9c1.2 0 2.1-1.1 1.9-2.3l-1.1-6.2c-.2-.9-1-1.5-1.9-1.5H7.5" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5" /></>,
  users: <><circle cx="9" cy="8.5" r="3.2" /><path d="M3 19.5c.6-3.3 3-5 6-5s5.4 1.7 6 5" /><circle cx="16.8" cy="9.3" r="2.5" /><path d="M17 14.5c2.3.2 3.7 1.6 4.1 4" /></>,
  crown: <path d="M4 17.5 3 7.5l5 4 4-6 4 6 5-4-1 10zM5 20.5h14" />,
  flame: <path d="M12 21c3.9 0 6.5-2.6 6.5-6.2 0-3.6-2.6-5.6-3.6-8.8-.4 2-1.4 3.3-2.6 3.8C12.6 6.7 11 4.3 8.6 3c.4 3.2-3.1 5.6-3.1 10.3C5.5 17.6 8.1 21 12 21z" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 13.6a7.6 7.6 0 0 0 0-3.2l2-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-2.8-1.6L14 2.5h-4l-.3 2.3a7.5 7.5 0 0 0-2.8 1.6l-2.3-.9-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3.2l-2 1.5 2 3.4 2.3-.9a7.5 7.5 0 0 0 2.8 1.6l.3 2.3h4l.3-2.3a7.5 7.5 0 0 0 2.8-1.6l2.3.9 2-3.4z" /></>,
  inbox: <><path d="M3.5 13.5 6 5.5h12l2.5 8v5c0 .8-.7 1.5-1.5 1.5H5c-.8 0-1.5-.7-1.5-1.5z" /><path d="M3.5 13.5H8l1.5 2.5h5l1.5-2.5h4.5" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 8.5-8.5M16 7l2.5 2.5M14 9l2 2" /></>,
  logout: <><path d="M14.5 4.5h3c1.1 0 2 .9 2 2v11c0 1.1-.9 2-2 2h-3" /><path d="M10 8l-4 4 4 4M6 12h10" /></>,
  swap: <><path d="M7 4.5 3.5 8 7 11.5M3.5 8h13M17 12.5l3.5 3.5-3.5 3.5M20.5 16h-13" /></>,
  sparkles: <><path d="M10 3.5c.7 3.9 2.1 5.3 6 6-3.9.7-5.3 2.1-6 6-.7-3.9-2.1-5.3-6-6 3.9-.7 5.3-2.1 6-6z" /><path d="M17.5 14c.4 2.2 1.1 2.9 3.3 3.3-2.2.4-2.9 1.1-3.3 3.3-.4-2.2-1.1-2.9-3.3-3.3 2.2-.4 2.9-1.1 3.3-3.3z" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5" /><circle cx="12" cy="7.8" r=".9" fill="currentColor" /></>,
  alert: <><path d="M10.3 4.3 2.9 17.5c-.8 1.3.2 3 1.7 3h14.8c1.5 0 2.5-1.7 1.7-3L13.7 4.3c-.8-1.3-2.6-1.3-3.4 0z" /><path d="M12 9.5v4.5" /><circle cx="12" cy="17" r=".9" fill="currentColor" /></>,
  undo: <><path d="M8 5 4 9l4 4" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>,
  filter: <path d="M4 5.5h16l-6 7.5v5.5l-4 1.5v-7z" />,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  note: <><path d="M5.5 3.5h9l4 4v12c0 .6-.4 1-1 1h-12c-.6 0-1-.4-1-1v-15c0-.6.4-1 1-1z" /><path d="M8.5 11.5h7M8.5 15h7M8.5 8h3" /></>,
  minus: <path d="M5 12h14" />,
  flag: <><path d="M5.5 21V4" /><path d="M5.5 4.5h11.2c.7 0 1.1.8.7 1.4L15.3 9l2.1 3.1c.4.6 0 1.4-.7 1.4H5.5" /></>,
  bag: <><path d="M5 8h14l-1.1 11.2c-.1 1-.9 1.8-2 1.8H8.1c-1 0-1.9-.8-2-1.8z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>,
  megaphone: <><path d="M4 10v4c0 .6.4 1 1 1h2l8 4.5V4.5L7 9H5c-.6 0-1 .4-1 1z" /><path d="M18.5 9a4 4 0 0 1 0 6M7.5 15l1.2 4.5" /></>,
  eyeOff: <><path d="M3.5 3.5l17 17" /><path d="M9.9 5.2A9.6 9.6 0 0 1 12 5c5 0 8.5 4.6 9.5 7-.4 1-1.3 2.4-2.6 3.7M6.4 6.5C4.6 7.8 3.2 9.8 2.5 12c1 2.4 4.5 7 9.5 7 1.6 0 3-.4 4.3-1.1" /><path d="M10 10a3 3 0 0 0 4.2 4.2" /></>,
  more: <><circle cx="6" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="18" cy="12" r="1.4" fill="currentColor" /></>,
  hourglass: <><path d="M6.5 3.5h11M6.5 20.5h11" /><path d="M7.5 3.5c0 4.5 4.5 5.5 4.5 8.5s-4.5 4-4.5 8.5M16.5 3.5c0 4.5-4.5 5.5-4.5 8.5s4.5 4 4.5 8.5" /></>,
}

export default function Icon({ name, size = 22, stroke = 2, className = '', style }) {
  return (
    <svg
      className={`ico ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      {P[name]}
    </svg>
  )
}
