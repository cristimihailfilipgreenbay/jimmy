/** "just now", "5 min ago", "yesterday", as the design words when Notes were added. */
export function addedLabel(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, (now - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`
  const days = Math.floor(seconds / 86400)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

const KINDS: Record<string, string> = { 'application/pdf': 'PDF', 'text/markdown': 'Markdown', 'text/plain': 'Text' }
export const kindLabel = (mime: string) => KINDS[mime] ?? 'File'
