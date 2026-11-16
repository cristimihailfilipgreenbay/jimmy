// The Tutor writes each paragraph either ending in Citation markers like [1] or [2][3]
// (from the Notes), or starting with [tutor] (Tutor Knowledge). See backend app/chat/citations.py.
export type Segment = { kind: 'notes'; text: string; citationIds: number[] } | { kind: 'tutor'; text: string }

const TUTOR = '[tutor]'

export function parseSegments(content: string): Segment[] {
  return content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((paragraph): Segment => {
      if (paragraph.startsWith(TUTOR)) return { kind: 'tutor', text: paragraph.slice(TUTOR.length).trim() }
      // Half-written text such as "...[" or "...[1" while the answer is still streaming.
      const settled = paragraph.replace(/\[\d*$/, '').replace(/\[t[a-z]*$/, '')
      const citationIds = [...new Set([...settled.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))]
      return { kind: 'notes', text: settled.replace(/\s*\[\d+\]/g, '').trim(), citationIds }
    })
}

export const citationLabel = (c: { document: string; page_or_section: string | null }) =>
  c.page_or_section ? `${c.document}, ${c.page_or_section}` : c.document

// Wikipedia and web Findings come from outside the Study Space and are unreviewed.
export const isWeb = (c: { source_type: string }) => c.source_type === 'wikipedia' || c.source_type === 'web'
