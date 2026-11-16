/** "Created just now", "Created 5 min ago", "Created yesterday", as the design words it. */
export function createdLabel(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, (now - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'Created just now'
  if (seconds < 3600) return `Created ${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `Created ${Math.floor(seconds / 3600)} h ago`
  const days = Math.floor(seconds / 86400)
  return days === 1 ? 'Created yesterday' : `Created ${days} days ago`
}
