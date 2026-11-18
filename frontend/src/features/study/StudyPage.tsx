import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, GraduationCap, Loader2, NotebookPen, PenLine, TriangleAlert, Upload } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Placeholder } from '@/components/Placeholder'
import { Button, buttonVariants } from '@/components/ui/button'
import { useSignedInStudent } from '@/features/auth/hooks/useSignedInStudent'
import { useSpace } from '@/features/spaces/queries/useSpace'
import { useTopics } from '@/features/topics/queries/useTopics'
import { errorMessage } from '@/lib/http'
import { cardClass } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { useLeaveGuard } from '@/lib/useLeaveGuard'
import { PastSessions } from './components/PastSessions'
import { QuestionCard } from './components/QuestionCard'
import { Recap } from './components/Recap'
import { useAnswerQuestion, useDecideDispute, useRecap, useReloadQuiz, useStartSession, useStoredSession } from './queries/useQuiz'
import { useWeakTopics } from './queries/useWeakTopics'
import { modeOf, STUDY_MODES, type AnswerOut, type Feedback, type Question, type StudyMode, type StudySession } from './schemas/study'

// A Study Space's Study screen: choose Quiz, answer questions with feedback after each
// one, then read the recap. A Test answers everything first and shows nothing until its results.
const START_CARDS: { mode: StudyMode; Icon: typeof Check; blurb: string; pills: string[] }[] = [
  { mode: 'quiz', Icon: Check, blurb: 'Feedback after every question, with the source passage. Good for learning.', pills: ['Multiple choice', '5 questions'] },
  { mode: 'short', Icon: PenLine, blurb: 'Write a sentence or two for each question and see how it was marked, with the source passage.', pills: ['Short written', '5 questions'] },
  { mode: 'essay', Icon: NotebookPen, blurb: 'Write a paragraph or two and get feedback on each point of a rubric, with the source passage.', pills: ['Essay', '1 question'] },
  { mode: 'test', Icon: GraduationCap, blurb: 'Answer everything first. Results and sources only at the end. Good for checking yourself.', pills: ['Multiple choice', 'Short written', 'Essay'] },
]

export function StudyPage() {
  const { spaceId = '' } = useParams()
  const student = useSignedInStudent()
  const { data: space, isPending } = useSpace(student.id, spaceId)
  const { data: topics, isPending: loadingTopics } = useTopics(student.id, spaceId)
  const { data: weakData } = useWeakTopics(student.id, spaceId)
  const weak = weakData?.weak ?? []
  // "Practise this" on a weak Topic links here with ?topic=…
  const [params, setParams] = useSearchParams()
  const onlyId = params.get('topic')

  const start = useStartSession(spaceId)
  const answer = useAnswerQuestion(student.id, spaceId)
  const decide = useDecideDispute(student.id, spaceId)
  const reload = useReloadQuiz()
  const [session, setSession] = useState<StudySession | null>(null)
  const [history, setHistory] = useState<Feedback[]>([])
  // A Test shows no feedback, so it keeps what the Student answered to show it read-only.
  const [taken, setTaken] = useState<{ question: Question; answer: string }[]>([])
  // Which question is on screen: an index into the answered ones, or one past them
  // for the question waiting for an answer.
  const [viewing, setViewing] = useState(0)
  const [slide, setSlide] = useState<'q-next' | 'q-prev' | ''>('')
  const [recapOpen, setRecapOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // A past session's recap is opened from the list and kept in the address (?past=…).
  const pastId = params.get('past')
  const recap = useRecap(recapOpen ? session?.id : (pastId ?? undefined))
  const [backToList, setBackToList] = useState(false)
  // A Quiz or Test in progress asks before the page is refreshed or closed.
  useLeaveGuard(!!session && session.status === 'active' && !recapOpen)
  const opened = useRef<string | null>(null)
  // Going back puts focus on the row that was opened.
  useEffect(() => {
    if (pastId || !opened.current) return
    document.querySelector<HTMLElement>(`[data-session="${opened.current}"]`)?.focus()
    opened.current = null
  }, [pastId])
  // The session in progress is kept in the address (?session=…), so a reload goes on where it was.
  const storedId = params.get('session')
  const stored = useStoredSession(session ? null : storedId)
  const [restored, setRestored] = useState<string | null>(null)
  if (stored.data && storedId && restored !== storedId && !session) {
    const { session: s, history: h } = stored.data
    setRestored(storedId)
    setSession(s)
    setHistory(h.feedback)
    setTaken(h.taken)
    setViewing(s.kind === 'test' ? h.taken.length : h.feedback.length)
    setRecapOpen(s.status === 'finished')
  }
  const remember = (id: string | null) =>
    setParams(
      (old) => {
        const next = new URLSearchParams(old)
        if (id) next.set('session', id)
        else next.delete('session')
        return next
      },
      { replace: true },
    )

  if (isPending || loadingTopics || (storedId && !session && stored.isPending)) return null
  if (!space) return <Placeholder title="Study Space not found" note="That Study Space does not exist." />

  const reset = () => {
    setSession(null)
    setHistory([])
    setTaken([])
    setViewing(0)
    setRecapOpen(false)
    setError(null)
    remember(null)
  }
  const begin = (mode: StudyMode) => {
    setError(null)
    start.mutate(
      { mode, topicIds: onlyId ? [onlyId] : [] },
      {
      onSuccess: (s) => {
        setSession(s)
        remember(s.id)
        setHistory([])
        setTaken([])
        setViewing(0)
        setRecapOpen(false)
        setSlide('')
      },
      onError: (err) => setError(errorMessage(err, `Jimmy could not start the ${STUDY_MODES[mode].title}. Try again.`)),
      },
    )
  }

  const openPast = (id: string | null) => {
    opened.current = pastId ?? id
    setBackToList(id === null)
    setParams(
      (old) => {
        const next = new URLSearchParams(old)
        if (id) next.set('past', id)
        else next.delete('past')
        return next
      },
      { replace: false },
    )
  }

  const frame = (children: React.ReactNode, narrow = true, slide = '') => (
    <main id="main" className={cn('mx-auto px-4 py-8 pb-28', narrow ? 'max-w-3xl' : 'max-w-4xl', slide)}>
      {children}
    </main>
  )

  if (!topics?.total) {
    return frame(
      <div className={`${cardClass} px-6 py-12 text-center`}>
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-muted">
          <GraduationCap className="size-5" aria-hidden />
        </span>
        <p className="mt-3 font-semibold">Nothing to study yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Jimmy writes quiz and test questions from your notes. Upload notes to this Space first.</p>
        <Link to={`/spaces/${space.id}`} className={cn(buttonVariants({ variant: 'space', size: 'sm' }), 'mt-4')}>
          <Upload /> Upload notes
        </Link>
      </div>,
      false,
    )
  }

  if (!session && pastId) {
    return frame(
      recap.data ? (
        <Recap recap={recap.data} kind={recap.data.kind} spaceName={space.name} past={{ onBack: () => openPast(null), weakHref: `/spaces/${space.id}?tab=weak` }} />
      ) : (
        <p className="text-sm text-muted-foreground">{recap.isError ? 'Could not load the recap.' : 'Loading the recap…'}</p>
      ),
      true,
      'q-next',
    )
  }

  if (!session) {
    return frame(
      <>
        <h1 className="text-2xl font-semibold tracking-tight">Study {space.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Questions come from your notes, weighted towards your weak topics: {weak.length ? `${weak.slice(0, 5).map((w) => w.name).join(', ')}${(weakData?.total ?? 0) > 5 ? ` and ${(weakData?.total ?? 0) - 5} more` : ''}` : 'none'}.
        </p>
        {error && (
          <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 flex-none" aria-hidden />
            {error}
          </p>
        )}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {START_CARDS.map(({ mode, Icon, blurb, pills }) => {
            const starting = start.isPending && start.variables?.mode === mode
            return (
              <button
                key={mode}
                type="button"
                onClick={() => begin(mode)}
                disabled={start.isPending}
                className={cn(cardClass, 'p-5 text-left transition hover:border-space/40 hover:shadow-md disabled:opacity-60')}
              >
                <span className="grid size-10 place-items-center rounded-lg bg-space-soft text-space-ink">
                  {starting ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Icon className="size-5" aria-hidden />}
                </span>
                <p className="mt-3 text-lg font-semibold">{STUDY_MODES[mode].title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{starting ? 'Jimmy is writing your first question…' : blurb}</p>
                <p className="mt-4 flex gap-2 text-xs text-muted-foreground">
                  {pills.map((p) => (
                    <span key={p} className="rounded-full bg-muted px-2 py-0.5">
                      {p}
                    </span>
                  ))}
                  <span className="rounded-full bg-muted px-2 py-0.5">~{STUDY_MODES[mode].count * (mode === 'essay' ? 10 : 2)} min</span>
                </p>
              </button>
            )
          })}
        </div>
        <PastSessions studentId={student.id} spaceId={spaceId} onOpen={(id) => openPast(id)} onStart={() => begin('quiz')} />
      </>,
      false,
      backToList ? 'q-prev' : '',
    )
  }

  if (recapOpen) {
    return frame(
      recap.data ? (
        <Recap recap={recap.data} kind={session.kind === 'test' ? 'test' : 'quiz'} spaceName={space.name} onAgain={() => begin(modeOf(session))} onDone={reset} />
      ) : (
        <p className="text-sm text-muted-foreground">{recap.isError ? 'Could not load the summary.' : 'Loading the summary…'}</p>
      ),
    )
  }

  const total = session.question_count
  const test = session.kind === 'test'
  const feedback = history[viewing] ?? null
  // In a Test, a question already answered is shown again with the Student's answer.
  const review = test ? (taken[viewing] ?? null) : null
  const question = feedback ? null : review ? review.question : session.current
  const finished = session.status === 'finished'
  // The answer's result: its feedback, or a Dispute that waits for the Student first.
  const show = (out: AnswerOut) => {
    setSession(out.session)
    if (!out.feedback) return
    setHistory([...history, out.feedback])
    setViewing(history.length)
  }
  const goNext = () => {
    setSlide('q-next')
    if (viewing + 1 >= (test ? taken.length : history.length) && finished) setRecapOpen(true)
    else setViewing(viewing + 1)
  }

  return frame(
    <>
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={reset}>
          <ArrowLeft /> Exit
        </Button>
        <span className="rounded-full bg-space-soft px-2.5 py-0.5 text-xs font-semibold text-space-ink">{test ? 'Test · results at the end' : STUDY_MODES[modeOf(session)].title}</span>
        <span className="ml-auto text-sm text-muted-foreground">
          Question {Math.min(viewing + 1, total)} of {total}
        </span>
      </div>
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round((viewing / total) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress">
        <div className="h-full bg-space transition-all" style={{ width: `${Math.round((viewing / total) * 100)}%` }} />
      </div>
      {error && (
        <p role="alert" className="mb-3 flex items-start gap-2 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 flex-none" aria-hidden />
          {error}
        </p>
      )}
      {!feedback && !question ? (
        <div className={cn(cardClass, 'p-6 text-center')}>
          <p className="text-sm text-muted-foreground">Jimmy could not write the next question.</p>
          <Button
            className="mt-3"
            variant="space"
            size="sm"
            disabled={reload.isPending}
            onClick={() => reload.mutate(session.id, { onSuccess: setSession, onError: (err) => setError(errorMessage(err, 'Still could not write it. Try again.')) })}
          >
            Try again
          </Button>
        </div>
      ) : (
        <QuestionCard
          key={feedback?.question_id ?? question?.id}
          className={slide}
          question={question}
          feedback={feedback}
          test={test}
          submitted={review?.answer ?? null}
          dispute={feedback ? null : (session.dispute ?? null)}
          checking={answer.isPending}
          deciding={decide.isPending}
          canGoBack={viewing > 0}
          isLast={viewing + 1 >= total}
          onBack={() => {
            setSlide('q-prev')
            setViewing(viewing - 1)
          }}
          onNext={goNext}
          onCheck={(text) => {
            setError(null)
            const asked = question!
            answer.mutate(
              { sessionId: session.id, questionId: asked.id, answer: text },
              {
                onSuccess: (out) => {
                  if (!test) return show(out)
                  setSession(out.session)
                  setTaken([...taken, { question: asked, answer: text }])
                  setSlide('q-next')
                  if (out.session.status === 'finished') setRecapOpen(true)
                  else setViewing(taken.length + 1)
                },
                onError: (err) => setError(errorMessage(err, 'Jimmy could not check that answer. Try again.')),
              },
            )
          }}
          onDecide={(decision) => {
            setError(null)
            decide.mutate(
              { threadId: session.thread_id, interruptId: session.dispute!.interrupt_id, decision },
              { onSuccess: show, onError: (err) => setError(errorMessage(err, 'Jimmy could not save that decision. Try again.')) },
            )
          }}
        />
      )}
    </>,
  )
}
