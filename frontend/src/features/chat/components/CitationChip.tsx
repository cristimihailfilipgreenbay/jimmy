import { Popover } from '@base-ui/react/popover'
import { Book, Eye, File, Globe, Lightbulb, TriangleAlert, X } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { citationLabel, isWeb } from '../lib/segments'
import type { Citation } from '../schemas/chat'

// A Citation chip; it opens the source passage, as in the design's popover.
export function CitationChip({ citation }: { citation: Citation }) {
  const web = isWeb(citation)
  const { spaceId } = useParams()
  const label = web ? `Unreviewed web · ${citation.page_or_section ?? citation.document}` : citationLabel(citation)
  // Textbook passages look different from Notes: double line, book icon, serif title.
  const library = citation.source_type === 'library'
  const Icon = web ? TriangleAlert : library ? Book : File
  const name = web ? 'Web, unreviewed' : library ? 'Subject Library' : 'Your notes'
  const tone = web ? 'text-web' : library ? 'text-lib' : 'text-notes'
  return (
    <Popover.Root>
      <Popover.Trigger
        className={web ? 'chip chip-web' : library ? 'chip chip-lib' : 'chip chip-notes'}
        aria-label={`Source, ${web ? 'web, unreviewed' : library ? 'Subject Library' : 'your notes'}: ${label}. Show passage.`}
      >
        <Icon className="size-3.5" aria-hidden />
        <span>{label}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} collisionPadding={12} className="z-[70]">
          <Popover.Popup
            aria-label={`${name} source`}
            className="fade-in w-[min(380px,calc(100vw-24px))] rounded-lg border border-border bg-card p-4 shadow-xl outline-none"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase ${tone}`}>
                <Icon className="size-3.5" aria-hidden /> {name}
              </span>
              <Popover.Close render={<Button variant="ghost" size="icon-sm" className="-mr-2" aria-label="Close source" />}>
                <X />
              </Popover.Close>
            </div>
            <p className={`text-sm leading-snug font-medium ${library ? 'font-serif italic' : ''}`}>{citation.document}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {web ? (
                <>
                  {citation.fetched_at && <>Fetched {citation.fetched_at} · </>}
                  <span className="break-all">{citation.url}</span>
                </>
              ) : (
                [citation.author, citation.page_or_section].filter(Boolean).join(' · ')
              )}
            </p>
            <blockquote className="mt-3 border-l-2 border-border pl-3 font-serif text-[15px] leading-relaxed whitespace-pre-line">
              {citation.passage}
            </blockquote>
            {web && (
              <p className="mt-3 flex items-start gap-2 rounded-md bg-web-soft p-2 text-xs text-web">
                <TriangleAlert className="mt-px size-3.5 flex-none" aria-hidden />
                Not reviewed by you yet. Approve it in Learned Material to cite it as library content.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {web ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<a href={citation.url ?? undefined} target="_blank" rel="noopener noreferrer" />}
                  >
                    <Globe /> Open page
                  </Button>
                  {/* A saved item can be reviewed; a Finding is only saved after the answer. */}
                  {citation.source_type === 'learned' ? (
                    <Button variant="outline" size="sm" nativeButton={false} render={<Link to={`/spaces/${spaceId}?tab=learned`} />}>
                      Review now
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      Review now
                    </Button>
                  )}
                </>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  <Eye /> Open at {citation.page_or_section ?? 'document'}
                </Button>
              )}
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
