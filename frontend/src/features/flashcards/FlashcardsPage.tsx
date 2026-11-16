import { useState } from 'react'
import { Layers, X } from 'lucide-react'
import { useParams } from 'react-router'
import { Placeholder } from '@/components/Placeholder'
import { Button } from '@/components/ui/button'
import { useSignedInStudent } from '@/features/auth/hooks/useSignedInStudent'
import { useSpaces } from '@/features/spaces/queries/useSpaces'
import { cardClass } from '@/lib/styles'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useSlidingIndicator } from '@/lib/useSlidingIndicator'
import { CardViewer } from './components/CardViewer'
import { DeckGrid } from './components/DeckGrid'
import { ReviewQueue } from './components/ReviewQueue'
import { StyleNotice } from './components/StyleNotice'
import { useDeck, useDrafts, useReviewDraft } from './queries/useFlashcards'
import type { CardDecision, Draft } from './schemas/flashcards'

type Tab = 'browse' | 'review'

// A Study Space's Flashcards: the approved deck, the drafts waiting for review, and a
// viewer to flip through the deck.
export function FlashcardsPage() {
  const { spaceId = '' } = useParams()
  const student = useSignedInStudent()
  const { data: spaces, isPending } = useSpaces(student.id)
  const deck = useDeck(student.id, spaceId)
  const drafts = useDrafts(student.id, spaceId)
  const review = useReviewDraft(student.id, spaceId)
  const [tab, setTab] = useState<Tab>('browse')
  const [topic, setTopic] = useState('all')
  const [viewer, setViewer] = useState<number | null>(null)
  const space = spaces?.find((s) => s.id === spaceId)
  // The tabs are not on the page while the lists load or the viewer is open, so the pill is
  // only placed once they are: the key changes then, and the hook measures them.
  const tabsShown = !!space && !deck.isPending && !drafts.isPending && viewer === null && (deck.data?.length || drafts.data?.length)
  const { container, indicator } = useSlidingIndicator<HTMLDivElement>(tabsShown ? tab : '')
  if (isPending || deck.isPending || drafts.isPending) return null
  if (!space) return <Placeholder title="Study Space not found" note="That Study Space does not exist." />

  const cards = deck.data ?? []
  const waiting = drafts.data ?? []
  const frame = (children: React.ReactNode) => (
    <main id="main" className="mx-auto max-w-4xl px-4 py-8 pb-28">
      {children}
    </main>
  )

  if (!cards.length && !waiting.length) {
    return frame(
      <div className={`${cardClass} px-6 py-12 text-center`}>
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-muted">
          <Layers className="size-5" aria-hidden />
        </span>
        <p className="mt-3 font-semibold">No flashcards yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Jimmy drafts cards from your notes and chats. You approve each one before it joins your deck.</p>
      </div>,
    )
  }
  if (viewer !== null && cards.length) return <CardViewer cards={cards} start={viewer} onClose={() => setViewer(null)} />

  const decide = (draft: Draft, decision: CardDecision) =>
    review.mutate(
      { draft, decision },
      {
        onSuccess: () =>
          decision.action === 'approve' ? toast('Added to your deck', Layers) : decision.action === 'edit' ? toast('Edited and added to your deck', Layers) : toast('Draft rejected', X),
      },
    )
  const shown = cards.filter((c) => topic === 'all' || c.topic === topic)

  return (
    <main id="main" className="mx-auto max-w-6xl px-4 py-6 pb-28">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Flashcards</h1>
          <p className="text-sm text-muted-foreground">
            {cards.length} in your deck · {waiting.length} drafts to review
          </p>
        </div>
        <Button variant="space" disabled={!shown.length} onClick={() => setViewer(0)}>
          <Layers /> Study deck
        </Button>
      </div>
      <StyleNotice studentId={student.id} />
      <div ref={container} role="tablist" aria-label="Flashcard views" className="relative mb-5 inline-flex rounded-lg bg-muted p-1">
        <span ref={indicator} aria-hidden className="pointer-events-none absolute top-0 left-0 rounded-md bg-card shadow-sm" />
        {(
          [
            ['browse', 'Browse deck'],
            ['review', `Review drafts (${waiting.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            data-ind-target
            data-active={tab === key}
            onClick={() => setTab(key)}
            className={cn('relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200', tab === key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="fade-in" key={tab}>
        {tab === 'browse' ? (
          <DeckGrid cards={cards} topic={topic} onTopic={setTopic} onOpen={(c) => setViewer(Math.max(0, shown.findIndex((s) => s.id === c.id)))} />
        ) : (
          <ReviewQueue drafts={waiting} deciding={review.isPending} error={review.error} onDecide={decide} />
        )}
      </div>
    </main>
  )
}
