const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })
const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long' })
const shortMonth = new Intl.DateTimeFormat('en-GB', { month: 'short' })

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
/** Whole calendar days between `iso` and `now` (0 is today). */
const daysAgo = (iso: string, now: Date) => Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000)

/** "Today, 09:12", "Yesterday, 20:14", "Tue, 10:02" within a week, else "13 Nov". */
export function chatWhen(iso: string, now = new Date()) {
  const d = new Date(iso)
  const days = daysAgo(iso, now)
  if (days <= 0) return `Today, ${clock.format(d)}`
  if (days === 1) return `Yesterday, ${clock.format(d)}`
  if (days < 7) return `${weekday.format(d)}, ${clock.format(d)}`
  return `${d.getDate()} ${shortMonth.format(d)}`
}

/** The heading a chat sits under: Today, Yesterday, This week, Earlier in November, or its month. */
export function chatGroup(iso: string, now = new Date()) {
  const d = new Date(iso)
  const days = daysAgo(iso, now)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return 'This week'
  const name = monthName.format(d)
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() ? `Earlier in ${name}` : name
}
