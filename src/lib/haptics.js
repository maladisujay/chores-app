export function haptic(kind = 'light') {
  try {
    const p = { light: 8, medium: 15, success: [10, 40, 18], warn: [20, 50, 20] }[kind] || 8
    navigator.vibrate?.(p)
  } catch {}
}
