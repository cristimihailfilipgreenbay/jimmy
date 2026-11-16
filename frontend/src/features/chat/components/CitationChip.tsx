import { Popover } from '@base-ui/react/popover'
import { Eye, File, Lightbulb, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { citationLabel } from '../lib/segments'
import type { Citation } from '../schemas/chat'

// A Citation chip; it opens the source passage, as in the design's popover.
export function CitationChip({ citation }: { citation: Citation }) {
  const label = citationLabel(citation)
  return (
    <Popover.Root>
      <Popover.Trigger className="chip chip-notes" aria-label={`Source, your notes: ${label}. Show passage.`}>
        <File className="size-3.5" aria-hidden />
        <span>{label}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} collisionPadding={12} className="z-[70]">
          <Popover.Popup
            aria-label="Your notes source"
            className="fade-in w-[min(380px,calc(100vw-24px))] rounded-lg border border-border bg-card p-4 shadow-xl outline-none"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-notes uppercase">
                <File className="size-3.5" aria-hidden /> Your notes
              </span>
              <Popover.Close render={<Button variant="ghost" size="icon-sm" className="-mr-2" aria-label="Close source" />}>
                <X />
              </Popover.Close>
            </div>
            <p className="text-sm leading-snug font-medium">{citation.document}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[citation.author, citation.page_or_section].filter(Boolean).join(' · ')}
            </p>
            <blockquote className="mt-3 border-l-2 border-border pl-3 font-serif text-[15px] leading-relaxed whitespace-pre-line">
              {citation.passage}
            </blockquote>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled>
                <Eye /> Open at {citation.page_or_section ?? 'document'}
              </Button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

export function TutorChip({ className }: { className?: string }) {
  return (
    <span className={`chip chip-tutor ${className ?? ''}`} title="General knowledge from Jimmy. No citation.">
      <Lightbulb className="size-3.5" aria-hidden />
      <span>Tutor knowledge</span>
    </span>
  )
}
