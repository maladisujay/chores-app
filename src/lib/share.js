export const inviteLink = (code) => `${location.origin}${location.pathname}#join=${code}`

export async function shareInvite(houseName, code, toast) {
  const url = inviteLink(code)
  const text = `Join “${houseName}” on Chores — tap the link or enter code ${code}`
  if (navigator.share) {
    try {
      await navigator.share({ title: `Join ${houseName}`, text, url })
      return
    } catch (e) {
      if (e?.name === 'AbortError') return
    }
  }
  await copyText(`${text}\n${url}`, toast, 'Invite link copied')
}

export async function copyText(text, toast, msg = 'Copied') {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  toast?.(msg, 'success')
}
