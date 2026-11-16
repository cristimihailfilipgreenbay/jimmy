import { Popover } from '@base-ui/react/popover'
import { Book, Eye, File, Lightbulb, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { citationLabel } from '../lib/segments'
import type { Citation } from '../schemas/chat'

// A Citation chip; it opens the source passage, as in the design's popover.
export function CitationChip({ citation }: { citation: Citation }) {
  const label = citationLabel(citation)
  // Textbook passages look different from Notes: double line, book icon, serif title.
  const library = citation.source_type === 'library'
  const Icon = library ? Book : File
  return (
    <Popover.Root>
      <Popover.Trigger
        className={library ? 'chip chip-lib' : 'chip chip-notes'}
        aria-label={`Source, ${library ? 'Subject Library' : 'your notes'}: ${label}. Show passage.`}
      >
        <Icon className="size-3.5" aria-hidden />
        <span>{label}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} collisionPadding={12} className="z-[70]">
          <Popover.Popup
            aria-label={`${library ? 'Subject Library' : 'Your notes'} source`}
            className="fade-in w-[min(380px,calc(100vw-24px))] rounded-lg border border-border bg-card p-4 shadow-xl outline-none"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase ${library ? 'text-lib' : 'text-notes'}`}>
                <Icon className="size-3.5" aria-hidden /> {library ? 'Subject Library' : 'Your notes'}
              </span>
              <Popover.Close render={<Button variant="ghost" size="icon-sm" className="-mr-2" aria-label="Close source" />}>
                <X />
              </Popover.Close>
            </div>
            <p className={`text-sm leading-snug font-medium ${library ? 'font-serif italic' : ''}`}>{citation.document}</p>
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
