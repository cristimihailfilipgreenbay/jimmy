const day = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
const shortDay = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })
const month = new Intl.DateTimeFormat('en-GB', { month: 'long' })
const shortMonth = new Intl.DateTimeFormat('en-GB', { month: 'short' })
const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })

/** "09:15" */
export const time = (iso: string) => clock.format(new Date(iso))
/** "Tuesday 10 November, 09:15" */
export const longDate = (iso: string) => `${day.format(new Date(iso))}, ${time(iso)}`
/** "Tue · 09:15" */
export const shortDate = (iso: string) => `${shortDay.format(new Date(iso))} · ${time(iso)}`
/** The calendar tile of a row: "NOV" and 13. */
export const tile = (iso: string) => ({ month: shortMonth.format(new Date(iso)), day: new Date(iso).getDate() })

/** The group a session belongs to: This week, Last week, Earlier in November, or its month. */
export function weekLabel(iso: string, now = new Date()) {
  const date = new Date(iso)
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000)
  if (days < 7) return 'This week'
  if (days < 14) return 'Last week'
  const name = month.format(date)
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() ? `Earlier in ${name}` : name
}
