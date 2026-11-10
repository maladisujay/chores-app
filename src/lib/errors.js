const MESSAGES = {
  NOT_SIGNED_IN: 'Your session expired. Please reload the app.',
  NOT_MEMBER: "You're no longer a member of this home.",
  OWNER_ONLY: 'Only the home owner can do that.',
  HOUSE_NOT_FOUND: 'No home found with that code. Check it and try again.',
  HOUSE_CLOSED: "This home isn't accepting new members right now. Ask the owner to open it.",
  HOUSE_FULL: 'This home is full.',
  COLOR_TAKEN: 'Someone already picked that color — choose another.',
  NAME_TAKEN: 'That name is already taken in this home.',
  NAME_REQUIRED: 'Please enter a name.',
  BAD_PIN: 'PIN must be exactly 4 digits.',
  WRONG_PIN: "That PIN doesn't match. Try again.",
  PIN_LOCKED: 'Too many wrong attempts. Try again in 15 minutes, or ask the owner to reset you.',
  NO_PIN: 'This member has no PIN yet. Ask the owner to reset them.',
  BAD_COLOR: 'Please pick a color.',
  ALREADY_CLAIMED: 'Someone already joined with that name. If that was you, use “I already joined”.',
  MEMBER_NOT_FOUND: 'That member no longer exists.',
  TASK_NOT_FOUND: 'That chore no longer exists.',
  TASK_REQUIRED: 'Pick a chore first.',
  PHOTO_REQUIRED: 'An “after” photo is required in this home.',
  BAD_PHOTO: 'Photo upload failed. Try again.',
  FUTURE_DATE: "You can't log a chore in the future.",
  TOO_OLD: 'Chores can only be logged up to 30 days back.',
  BAD_DATE: 'Pick a valid date and time.',
  BAD_POINTS: 'Points must be between 0 and 1000.',
  CANT_VOTE_OWN: "You can't vote on your own chore.",
  ALREADY_VOIDED: 'This chore was already marked incomplete.',
  VOTE_LOCKED: 'The owner has locked voting on this chore.',
  VOTE_WINDOW_CLOSED: 'Voting on this chore has closed.',
  REQUEST_PENDING: 'There is already a pending request for this chore.',
  NOT_YOUR_LOG: 'You can only request changes to your own chores.',
  NOTHING_TO_CHANGE: 'Nothing was changed.',
  OWNER_EDITS_DIRECTLY: 'As the owner you can edit directly.',
  REQUEST_NOT_FOUND: 'That request was already handled.',
  LOG_NOT_FOUND: 'That chore was deleted.',
  OWNER_CANNOT_LEAVE: 'Transfer ownership to someone else first.',
  NOT_JOINED_YET: "They haven't joined yet.",
  NOT_ALLOWED: "You don't have permission to do that.",
  TOO_MANY_HOUSES: "You've reached the limit of homes on this device.",
  SECTION_NOT_FOUND: 'That section no longer exists.',
}

export class AppError extends Error {
  constructor(code, raw) {
    super(MESSAGES[code] || raw || 'Something went wrong.')
    this.code = code
  }
}

export function toAppError(e) {
  if (e instanceof AppError) return e
  const raw = String(e?.message || e || '')
  const code = Object.keys(MESSAGES).find((k) => raw.includes(k))
  if (code) return new AppError(code)
  if (/fetch|network|Failed to fetch|Load failed/i.test(raw)) return new AppError('NETWORK', "You're offline or the server can't be reached.")
  return new AppError('UNKNOWN', raw || 'Something went wrong.')
}
