import { cn } from '@/lib/utils'
import { parseSegments } from '../lib/segments'
import type { Citation } from '../schemas/chat'
import { CitationChip, TutorChip } from './CitationChip'

// An answer as the design shows it: each statement beside its source line, then its chip.
export function Segments({ content, citations, streaming }: { content: string; citations: Citation[]; streaming: boolean }) {
  const segments = parseSegments(content)
  return (
    <div className="pl-1">
      {segments.map((segment, i) => {
        const live = streaming && i === segments.length - 1
        return (
          <p key={i} className={cn('seg', segment.kind === 'tutor' ? 'seg-tutor' : 'seg-notes')}>
            <span className={cn(live && 'caret')}>{segment.text}</span>
            {!live && segment.kind === 'tutor' && (
              <>
                {' '}
                <TutorChip />
              </>
            )}
            {!live &&
              segment.kind === 'notes' &&
              segment.citationIds.map((id) => {
                const citation = citations.find((c) => c.id === id)
                return citation ? <CitationChip key={id} citation={citation} /> : null
              })}
          </p>
        )
      })}
    </div>
  )
}
