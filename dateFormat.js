export function formatRelativeDateTime(isoString) {
  if (!isoString) return ''
  // Normalize plain YYYY-MM-DD to local midnight (avoids UTC-offset day shift)
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(isoString)
    ? isoString + 'T00:00:00' : isoString
  const date = new Date(normalized)
  if (isNaN(date)) return ''

  const now = new Date()
  const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays    = Math.round((todayStart - targetStart) / 86_400_000)

  const timeStr = date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  if (diffDays === 0) return `Today at ${timeStr}`
  if (diffDays === 1) return `Yesterday at ${timeStr}`
  if (diffDays <= 6)  return `${date.toLocaleString('en-US', { weekday: 'short' })} at ${timeStr}`
  const monthDay = date.toLocaleString('en-US', { month: 'short', day: 'numeric' })
  if (date.getFullYear() === now.getFullYear()) return `${monthDay} at ${timeStr}`
  return `${monthDay}, ${date.getFullYear()} at ${timeStr}`
}
