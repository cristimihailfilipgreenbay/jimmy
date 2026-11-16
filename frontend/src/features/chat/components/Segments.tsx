import { cn } from '@/lib/utils'
import { hasBlocks } from '../lib/markdown'
import { isWeb, parseSegments } from '../lib/segments'
import type { Citation } from '../schemas/chat'
import { CitationChip, TutorChip } from './CitationChip'
import { Markdown } from './Markdown'

// An answer as the design shows it: each statement beside its source line, then its chip.
export function Segments({ content, citations, streaming }: { content: string; citations: Citation[]; streaming: boolean }) {
  const segments = parseSegments(content)
  return (
    <div className="pl-1">
      {segments.map((segment, i) => {
        const live = streaming && i === segments.length - 1
        // A statement that rests only on textbook passages gets the Library's double line.
        const cited = segment.kind === 'notes' ? segment.citationIds.map((id) => citations.find((c) => c.id === id)) : []
        const fromLibrary = cited.length > 0 && cited.every((c) => c?.source_type === 'library')
        // A reply with no sources at all (the off-topic redirect) has no source line.
        // A statement that rests on any web Finding gets the dashed, hatched "unreviewed" style.
        const fromWeb = cited.some((c) => c && isWeb(c))
        return (
          <div
            key={i}
            className={cn('seg', segment.kind === 'tutor' ? 'seg-tutor' : fromWeb ? 'seg-web' : fromLibrary ? 'seg-lib' : cited.length > 0 ? 'seg-notes' : '')}
          >
            {hasBlocks(segment.text) ? (
              <div className={cn(live && 'caret')}>
                <Markdown text={segment.text} />
              </div>
            ) : (
              <span className={cn(live && 'caret')}>
                <Markdown text={segment.text} />
              </span>
            )}
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
          </div>
        )
      })}
    </div>
  )
}
