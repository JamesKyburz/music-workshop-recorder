export function durationToMs (duration) {
  const parts = duration.split(':')
  return (
    (parts.pop() || 0) * 1000 +
    (parts.pop() || 0) * 60000 +
    (parts.pop() || 0) * 3600000
  )
}

export function msToTime (ms) {
  const twoDigits = s =>
    Math.floor(s)
      .toString()
      .padStart(2, '0')
  const seconds = twoDigits((ms / 1000) % 60)
  const minutes = twoDigits((ms / 60000) % 60)
  const hours = twoDigits((ms / 3600000) % 24)
  return `${hours}:${minutes}:${seconds}`.replace(/^00:/, '')
}
