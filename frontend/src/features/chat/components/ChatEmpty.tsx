import { BookOpen, File, Lightbulb, Tag, Upload, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { JimmyHead } from '@/components/JimmyHead'
import { WhenDisabled } from '@/components/WhenDisabled'
import { cn } from '@/lib/utils'

type Starter = {
  text: string
  icon: LucideIcon
  tag: string
  primary?: boolean
  tutor?: boolean
  to?: string
  ask?: boolean
  disabledReason?: string
}

const tile = (s: Starter) =>
  cn(
    'group flex h-full w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors duration-200 hover:border-space/30',
    s.primary ? 'border-space/30 bg-space/[.06] hover:bg-space/[.10]' : 'border-border bg-background hover:bg-space/[.05]',
    s.disabledReason && 'cursor-not-allowed opacity-60 hover:border-border hover:bg-background',
  )

// The design's empty Chat: Jimmy peeks over a card that says what he can use, with ways to start.
// Weak Topics do not exist yet, so only Notes, Topics and the Subject Library are counted.
export function ChatEmpty({
  spaceId,
  spaceName,
  notes,
  topics,
  libraryOn,
  onAsk,
}: {
  spaceId: string
  spaceName: string
  notes: { title: string }[]
  topics: { name: string }[]
  /** The Space has a textbook attached and switched on. */
  libraryOn: boolean
  onAsk: (q: string) => void
}) {
  const none = notes.length === 0
  const first = notes[0]?.title.replace(/\.(pdf|md|markdown|txt)$/i, '')
  const starters: Starter[] = none
    ? [
        { text: 'Upload your first notes', icon: Upload, tag: 'Start here', primary: true, to: `/spaces/${spaceId}` },
        {
          text: `Add a textbook to the ${spaceName} Subject Library`,
          icon: BookOpen,
          tag: 'Optional',
          // The Library card on the dashboard opens with its menu.
          to: `/spaces/${spaceId}?library=open`,
        },
        { text: `What does ${spaceName} usually cover?`, icon: Lightbulb, tag: 'Tutor knowledge', tutor: true, ask: true },
        { text: `Explain one key idea in ${spaceName} simply`, icon: Lightbulb, tag: 'Tutor knowledge', tutor: true, ask: true },
      ]
    : [
        { text: `Quiz me on ${(topics[2] ?? topics[0])?.name ?? spaceName}`, icon: Tag, tag: 'Quick quiz', ask: true },
        { text: `Summarise “${first}”`, icon: File, tag: 'From your notes', ask: true },
        { text: `What should I revise first for my ${spaceName} exam?`, icon: Lightbulb, tag: 'Study plan', ask: true },
      ]

  return (
    <section className="fade-in mx-auto w-full max-w-2xl pt-20" aria-labelledby="chat-empty-h">
      <div className="relative">
        <div className="peek-jimmy absolute top-0 left-1/2 z-0 -translate-x-1/2 -translate-y-[80%]" aria-hidden>
          <JimmyHead className="size-20 text-space" />
        </div>
        <span className="absolute top-0 left-1/2 z-20 -mt-[4px] -ml-[38px] h-2.5 w-4 rounded-full bg-space" aria-hidden />
        <span className="absolute top-0 left-1/2 z-20 -mt-[4px] ml-[22px] h-2.5 w-4 rounded-full bg-space" aria-hidden />
        <div className="relative z-10 rounded-2xl border border-border bg-card p-6 text-center shadow-[0_10px_40px_-16px_rgba(20,20,30,.16)] sm:p-8">
          <h2 id="chat-empty-h" className="text-xl font-semibold tracking-tight">
            {none ? `No notes in ${spaceName} yet` : `What shall we study in ${spaceName}?`}
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
            {none ? (
              <>
                Upload your lecture notes and I’ll answer from them, with page numbers. Until then, anything I say is labelled{' '}
                <span className="font-medium whitespace-nowrap text-tutor">Tutor knowledge</span>.
              </>
            ) : (
              `I’ll answer from your ${notes.length} note${notes.length === 1 ? '' : 's'}${libraryOn ? ' and the Subject Library' : ''}, and show where every sentence comes from.`
            )}
          </p>
          <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <File className="size-3.5" aria-hidden />
              {notes.length} notes
            </span>
            <span aria-hidden>·</span>
            {none ? (
              <span className="inline-flex items-center gap-1">
                <BookOpen className="size-3.5" aria-hidden />
                Subject Library {libraryOn ? 'on' : 'empty'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Tag className="size-3.5" aria-hidden />
                {topics.length} topics
              </span>
            )}
          </p>
          <ul className="mt-6 grid gap-2.5 text-left sm:grid-cols-2" aria-label="Ways to start">
            {starters.map((s, i) => {
              const body = (
                <>
                  <span
                    className={cn(
                      'grid size-8 flex-none place-items-center rounded-lg transition-colors duration-200',
                      s.primary
                        ? 'bg-space text-white'
                        : s.tutor
                          ? 'border border-dotted border-tutor/70 text-tutor'
                          : 'bg-space/[.10] text-space-ink/80 group-hover:bg-space/[.16]',
                    )}
                  >
                    <s.icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className={cn('block text-[11px] font-medium tracking-wide uppercase', s.tutor ? 'text-tutor' : 'text-muted-foreground')}>
                      {s.tag}
                    </span>
                    <span className="mt-0.5 block text-sm leading-snug font-medium">{s.text}</span>
                  </span>
                </>
              )
              return (
                <li key={s.text} className="ob-pop" style={{ animationDelay: `${150 + i * 70}ms` }}>
                  {s.to ? (
                    <Link to={s.to} className={tile(s)}>
                      {body}
                    </Link>
                  ) : (
                    <WhenDisabled disabled={!!s.disabledReason} reason={s.disabledReason} fill>
                      <button type="button" disabled={!!s.disabledReason} onClick={() => s.ask && onAsk(s.text)} className={tile(s)}>
                        {body}
                      </button>
                    </WhenDisabled>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      <p className="mt-5 text-center text-xs text-muted-foreground">
        {none ? 'You can also just ask below. Answers will be labelled Tutor knowledge.' : 'Or type your own question below.'}
      </p>
    </section>
  )
}
