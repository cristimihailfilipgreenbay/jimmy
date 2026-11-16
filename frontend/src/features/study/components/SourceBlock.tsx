import { CitationChip } from '@/features/chat/components/CitationChip'
import { isWeb } from '@/features/chat/lib/segments'
import { cn } from '@/lib/utils'
import type { Feedback } from '../schemas/study'

// The passage an answer key comes from, so the Student can check it.
export function SourceBlock({ feedback }: { feedback: Feedback }) {
  const { source } = feedback
  const library = source.source_type === 'library'
  return (
    <figure className="mt-3 rounded-lg border border-border bg-background p-3">
      <figcaption className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Source passage</span>
        <CitationChip citation={{ id: feedback.position, ...source }} />
      </figcaption>
      <blockquote className={cn('seg my-0! text-[15px]!', isWeb(source) ? 'seg-web' : library ? 'seg-lib' : 'seg-notes')}>{source.passage}</blockquote>
    </figure>
  )
}
