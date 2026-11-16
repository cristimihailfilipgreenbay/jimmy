import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CitationChip } from '@/features/chat/components/CitationChip'
import { cardClass } from '@/lib/styles'
import { cn } from '@/lib/utils'
import type { Card } from '../schemas/flashcards'

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// The deck, one card at a time: click or press Space to flip, arrows or a swipe to move.
export function CardViewer({ cards, start, onClose }: { cards: Card[]; start: number; onClose: () => void }) {
  const [index, setIndex] = useState(Math.min(start, cards.length - 1))
  const [flipped, setFlipped] = useState(false)
  // 'on' / 'off' play the flip; `dir` plays the card sliding in from its side.
  const [anim, setAnim] = useState<'on' | 'off' | null>(null)
  const [dir, setDir] = useState<'next' | 'prev' | null>(null)
  const [leaving, setLeaving] = useState<'next' | 'prev' | null>(null)
  const busy = useRef(false)
  const touchX = useRef<number | null>(null)
  const card = cards[index]

  const flip = () => {
    if (busy.current) return
    setDir(null)
    const on = !flipped
    setFlipped(on)
    if (reduceMotion()) return
    busy.current = true
    setAnim(on ? 'on' : 'off')
    setTimeout(() => {
      busy.current = false
      setAnim(null)
      document.querySelector<HTMLElement>(on ? '[data-rate=good]' : '[data-flip]')?.focus()
    }, 570)
  }
  const move = (to: number) => {
    if (busy.current || to === index || to < 0 || to >= cards.length) return
    const next = to > index ? 'next' : 'prev'
    const go = () => {
      setIndex(to)
      setFlipped(false)
      setAnim(null)
      setLeaving(null)
      setDir(reduceMotion() ? null : next)
      busy.current = false
    }
    if (reduceMotion()) return go()
    busy.current = true
    setLeaving(next)
    setTimeout(go, 160)
  }
  const rate = () => move(index + 1)

  // Keys while the viewer is open (not while typing).
  const keys = useRef({ flip, move, rate, flipped, index })
  useEffect(() => {
    keys.current = { flip, move, rate, flipped, index }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return
      const k = keys.current
      if (e.key === ' ') {
        e.preventDefault()
        k.flip()
      } else if (e.key === 'ArrowRight') k.move(k.index + 1)
      else if (e.key === 'ArrowLeft') k.move(k.index - 1)
      else if (k.flipped && ['1', '2', '3'].includes(e.key)) k.rate()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const ghost = (g: Card | undefined, side: 'l' | 'r') =>
    g && (
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={() => move(side === 'l' ? index - 1 : index + 1)}
        className={cn('ghost-card absolute inset-0 flex items-center justify-center p-6 text-center', cardClass, side === 'l' ? 'ghost-l' : 'ghost-r')}
      >
        <span className="font-serif text-lg leading-snug text-muted-foreground">{g.front}</span>
      </button>
    )

  return (
    <main id="main" className="overflow-x-clip py-6 pb-28">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-4 flex items-center">
          <Button variant="ghost" size="sm" className="-ml-2" onClick={onClose}>
            <ArrowLeft /> All cards
          </Button>
          <span className="ml-auto text-sm text-muted-foreground" aria-live="polite">
            Card {index + 1} of {cards.length}
          </span>
        </div>
        <div
          className="relative"
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return
            const dx = e.changedTouches[0].clientX - touchX.current
            touchX.current = null
            if (Math.abs(dx) > 50) move(index + (dx < 0 ? 1 : -1))
          }}
        >
          {ghost(cards[index - 1], 'l')}
          {ghost(cards[index + 1], 'r')}
          <div className={cn('relative z-10', leaving ? `card-out-${leaving}` : dir && `card-in-${dir}`)}>
            <div className={cn('flip h-80', flipped && 'is-flipped', anim && `anim-${anim}`)}>
              <span className="flip-shadow pointer-events-none absolute inset-x-10 -bottom-3 h-6 rounded-[50%] bg-black/10 opacity-0 blur-md" aria-hidden />
              <div className="flip-inner">
                <button
                  type="button"
                  data-flip
                  onClick={flip}
                  className={cn('flip-face flex flex-col p-6 text-left', cardClass)}
                  aria-label={`Card front: ${card.front}. Press to show answer.`}
                  tabIndex={flipped ? -1 : undefined}
                  aria-hidden={flipped || undefined}
                >
                  <span className="text-xs text-muted-foreground">{card.topic} · Question</span>
                  <span className="flex flex-1 items-center justify-center text-center font-serif text-2xl leading-snug">{card.front}</span>
                  <span className="text-center text-xs text-muted-foreground">Space or click to flip</span>
                </button>
                <div
                  className="flip-face flip-back flex flex-col overflow-hidden rounded-lg border border-border bg-card p-6 shadow-[0_1px_2px_rgba(20,20,30,.04)]"
                  aria-hidden={flipped ? undefined : true}
                  inert={!flipped}
                >
                  <span className="pointer-events-none absolute inset-0 bg-space/[.06]" aria-hidden />
                  <span className="relative text-xs font-semibold text-space-ink/80">{card.topic} · Answer</span>
                  <p className="relative flex flex-1 items-center justify-center text-center font-serif text-2xl leading-snug">{card.back}</p>
                  <div className="relative flex items-center justify-center">
                    <CitationChip citation={{ id: index + 1, ...card.source }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-center gap-1.5" role="group" aria-label="Cards">
          {cards.map((c, k) => (
            <button
              key={c.id}
              type="button"
              onClick={() => move(k)}
              aria-label={`Go to card ${k + 1}`}
              aria-current={k === index || undefined}
              className={cn('h-1.5 rounded-full transition-all duration-300', k === index ? 'w-6 bg-space' : 'w-1.5 bg-border hover:bg-muted-foreground/40')}
            />
          ))}
        </div>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button variant="outline" size="icon" aria-label="Previous card" disabled={index === 0} onClick={() => move(index - 1)}>
            <ArrowLeft />
          </Button>
          {flipped ? (
            <>
              <Button variant="outline" onClick={rate}>
                Again
              </Button>
              <Button variant="outline" onClick={rate}>
                Hard
              </Button>
              <Button variant="space" data-rate="good" onClick={rate}>
                Got it
              </Button>
            </>
          ) : (
            <Button variant="space" data-flip onClick={flip}>
              <Layers /> Show answer
            </Button>
          )}
          <Button variant="outline" size="icon" aria-label="Next card" disabled={index === cards.length - 1} onClick={() => move(index + 1)}>
            <ArrowRight />
          </Button>
        </div>
        <p className="mt-3 hidden text-center text-xs text-muted-foreground md:block">Keys: Space flip · ← → move · 1 Again · 2 Hard · 3 Got it</p>
        <p className="mt-3 text-center text-xs text-muted-foreground md:hidden">Tap the card to flip · swipe to move</p>
      </div>
    </main>
  )
}

