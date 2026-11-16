import { useState } from 'react'
import { ArrowLeft, Check, GraduationCap, Loader2, TriangleAlert, Upload } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Placeholder } from '@/components/Placeholder'
import { Button, buttonVariants } from '@/components/ui/button'
import { useSignedInStudent } from '@/features/auth/hooks/useSignedInStudent'
import { useSpaces } from '@/features/spaces/queries/useSpaces'
import { useTopics } from '@/features/topics/queries/useTopics'
import { errorMessage } from '@/lib/http'
import { cardClass } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { QuestionCard } from './components/QuestionCard'
import { Recap } from './components/Recap'
import { useAnswerQuestion, useRecap, useReloadQuiz, useStartQuiz } from './queries/useQuiz'
import { useWeakTopics } from './queries/useWeakTopics'
import { QUIZ_LENGTH, type Feedback, type StudySession } from './schemas/study'

// A Study Space's Study screen: choose Quiz, answer questions with feedback after each
// one, then read the recap. A Test comes later.
export function StudyPage() {
  const { spaceId = '' } = useParams()
  const student = useSignedInStudent()
  const { data: spaces, isPending } = useSpaces(student.id)
  const { data: topics, isPending: loadingTopics } = useTopics(student.id, spaceId)
  const { data: weak = [] } = useWeakTopics(student.id, spaceId)
  // "Practise this" on a weak Topic links here with ?topic=…
  const [params] = useSearchParams()
  const only = topics?.find((t) => t.id === params.get('topic'))

  const start = useStartQuiz(spaceId)
  const answer = useAnswerQuestion(student.id, spaceId)
  const reload = useReloadQuiz()
  const [session, setSession] = useState<StudySession | null>(null)
  const [history, setHistory] = useState<Feedback[]>([])
  // Which question is on screen: an index into the answered ones, or one past them
  // for the question waiting for an answer.
  const [viewing, setViewing] = useState(0)
  const [slide, setSlide] = useState<'q-next' | 'q-prev' | ''>('')
  const [recapOpen, setRecapOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recap = useRecap(recapOpen ? session?.id : undefined)

  const space = spaces?.find((s) => s.id === spaceId)
  if (isPending || loadingTopics) return null
  if (!space) return <Placeholder title="Study Space not found" note="That Study Space does not exist." />

  const reset = () => {
    setSession(null)
    setHistory([])
    setViewing(0)
    setRecapOpen(false)
    setError(null)
  }
  const begin = () => {
    setError(null)
    start.mutate(only ? [only.id] : [], {
      onSuccess: (s) => {
        setSession(s)
        setHistory([])
        setViewing(0)
        setRecapOpen(false)
        setSlide('')
      },
      onError: (err) => setError(errorMessage(err, 'Jimmy could not start the Quiz. Try again.')),
    })
  }

  const frame = (children: React.ReactNode, narrow = true) => (
    <main id="main" className={cn('mx-auto px-4 py-8 pb-28', narrow ? 'max-w-3xl' : 'max-w-4xl')}>
      {children}
    </main>
  )

  if (!topics?.length) {
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

  if (!session) {
    return frame(
      <>
        <h1 className="text-2xl font-semibold tracking-tight">Study {space.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {QUIZ_LENGTH} questions from your notes, weighted towards your weak topics: {weak.map((w) => w.name).join(', ') || 'none'}.
        </p>
        {error && (
          <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 flex-none" aria-hidden />
            {error}
          </p>
        )}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={begin}
            disabled={start.isPending}
            className={cn(cardClass, 'p-5 text-left transition hover:border-space/40 hover:shadow-md disabled:opacity-60')}
          >
            <span className="grid size-10 place-items-center rounded-lg bg-space-soft text-space-ink">
              {start.isPending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Check className="size-5" aria-hidden />}
            </span>
            <p className="mt-3 text-lg font-semibold">Quiz</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {start.isPending ? 'Jimmy is writing your first question…' : 'Feedback after every question, with the source passage. Good for learning.'}
            </p>
            <p className="mt-4 flex gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2 py-0.5">Multiple choice</span>
              <span className="rounded-full bg-muted px-2 py-0.5">Short written</span>
              <span className="rounded-full bg-muted px-2 py-0.5">~{QUIZ_LENGTH * 2} min</span>
            </p>
          </button>
          <button type="button" disabled className={cn(cardClass, 'p-5 text-left opacity-60')}>
            <span className="grid size-10 place-items-center rounded-lg bg-space-soft text-space-ink">
              <GraduationCap className="size-5" aria-hidden />
            </span>
            <p className="mt-3 text-lg font-semibold">Test</p>
            <p className="mt-1 text-sm text-muted-foreground">Answer everything first. Results and sources only at the end. Good for checking yourself. Not built yet.</p>
          </button>
        </div>
      </>,
      false,
    )
  }

  if (recapOpen) {
    return frame(
      recap.data ? (
        <Recap recap={recap.data} spaceName={space.name} onAgain={begin} onDone={reset} />
      ) : (
        <p className="text-sm text-muted-foreground">{recap.isError ? 'Could not load the summary.' : 'Loading the summary…'}</p>
      ),
    )
  }

  const total = session.question_count
  const feedback = history[viewing] ?? null
  const question = feedback ? null : session.current
  const finished = session.status === 'finished'
  const goNext = () => {
    setSlide('q-next')
    if (viewing + 1 >= history.length && finished) setRecapOpen(true)
    else setViewing(viewing + 1)
  }

  return frame(
    <>
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={reset}>
          <ArrowLeft /> Exit
        </Button>
        <span className="rounded-full bg-space-soft px-2.5 py-0.5 text-xs font-semibold text-space-ink">Quiz</span>
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
          checking={answer.isPending}
          canGoBack={viewing > 0}
          isLast={viewing + 1 >= total}
          onBack={() => {
            setSlide('q-prev')
            setViewing(viewing - 1)
          }}
          onNext={goNext}
          onCheck={(text) => {
            setError(null)
            answer.mutate(
              { sessionId: session.id, questionId: question!.id, answer: text },
              {
                onSuccess: (out) => {
                  setHistory([...history, out.feedback])
                  setSession(out.session)
                  setViewing(history.length)
                },
                onError: (err) => setError(errorMessage(err, 'Jimmy could not check that answer. Try again.')),
              },
            )
          }}
        />
      )}
    </>,
  )
}
