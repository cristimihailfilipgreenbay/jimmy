import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router'
import { AnimatedHeight } from '@/components/AnimatedHeight'
import { Button } from '@/components/ui/button'
import { ErrorBanner } from '@/features/auth/components/ErrorBanner'
import { JimmyHead } from '@/components/JimmyHead'
import { meKey, useMe } from '@/features/auth/queries/useMe'
import { ApiError, errorMessage } from '@/lib/http'
import { DoneStep } from './components/DoneStep'
import { NameStep } from './components/NameStep'
import { PreferencesStep } from './components/PreferencesStep'
import { SpacesStep } from './components/SpacesStep'
import { StepProgress } from './components/StepProgress'
import { StudiesStep } from './components/StudiesStep'
import { SubjectsStep } from './components/SubjectsStep'
import {
  DONE,
  LAST_STEP,
  STEPS,
  bubbleText,
  canContinue,
  initialForm,
  toRequest,
  withDefaultAccents,
  type OnboardingForm,
} from './lib/form'
import { useCompleteOnboarding } from './queries/useCompleteOnboarding'
import type { OnboardingResponse } from './schemas/onboarding'

const PAPER = { backgroundImage: 'linear-gradient(color-mix(in oklab, var(--border) 35%, transparent) 1px, transparent 1px)', backgroundSize: '100% 28px' }
const STEP_COMPONENTS = [NameStep, StudiesStep, SubjectsStep, SpacesStep, PreferencesStep]

// Shown after sign-up, and again at every visit until the Student finishes it.
export function OnboardingPage() {
  const me = useMe().data
  const navigate = useNavigate()
  const qc = useQueryClient()
  const complete = useCompleteOnboarding()
  const [form, setForm] = useState<OnboardingForm>(initialForm)
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null)
  const [created, setCreated] = useState<OnboardingResponse | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Someone who already finished has nothing to do here (but keep the finish screen).
  if (me?.onboarded && !created) return <Navigate to="/" replace />

  const done = created !== null
  const update = (changes: Partial<OnboardingForm>) => setForm((f) => ({ ...f, ...changes }))

  function go(delta: 1 | -1) {
    setFormError(null)
    setDirection(delta > 0 ? 'next' : 'prev')
    setForm((f) => ({
      ...f,
      step: f.step + delta,
      subjects: f.step === 2 && delta > 0 ? withDefaultAccents(f.subjects) : f.subjects,
    }))
  }

  function submit() {
    const request = toRequest(form)
    if (!request.ok) return setFormError(request.message)
    setFormError(null)
    complete.mutate(request.body, {
      onSuccess: (response) => {
        setCreated(response)
        setDirection('next')
        update({ step: DONE })
      },
      onError: (err) => {
        // Finished in another tab: the Student is onboarded, so refresh and leave.
        if (err instanceof ApiError && err.code === 'already_onboarded') qc.invalidateQueries({ queryKey: meKey })
      },
    })
  }

  function next() {
    if (!canContinue(form) || complete.isPending) return
    if (form.step === LAST_STEP) submit()
    else go(1)
  }

  function finish(to: 'notes' | 'spaces') {
    if (!created) return
    qc.setQueryData(meKey, created.student)
    qc.invalidateQueries({ queryKey: ['spaces'] })
    navigate(to === 'notes' && created.spaces[0] ? `/spaces/${created.spaces[0].id}` : '/')
  }

  const Step = STEP_COMPONENTS[form.step]
  const error = formError ?? (complete.error ? errorMessage(complete.error, 'Could not set up your account.') : null)
  const bubble = bubbleText(form)
  const skippable = form.step === 1 || form.step === 4

  return (
    <main className="relative flex min-h-screen items-start justify-center overflow-hidden px-4 pt-12 pb-16 sm:pt-16">
      <div className="pointer-events-none absolute inset-0 opacity-60" style={PAPER} aria-hidden />
      <div className="relative w-full max-w-[560px]">
        <StepProgress step={form.step} done={done} />
        <div className="relative">
          <div className="peek-jimmy absolute top-0 left-1/2 z-0 -translate-x-1/2 -translate-y-[80%]" aria-hidden>
            <JimmyHead className="size-24 text-space" />
          </div>
          <div
            className="absolute bottom-full left-[calc(50%+50px)] z-20 mb-[50px] hidden w-max max-w-[250px] rounded-2xl rounded-bl-sm border bg-card px-3.5 py-2 text-sm shadow-sm sm:block"
            role="status"
            aria-live="polite"
          >
            <span key={form.step} className="block animate-in fade-in slide-in-from-bottom-1 duration-200 motion-reduce:animate-none">
              {bubble}
            </span>
          </div>
          <span className="absolute top-0 left-1/2 z-20 -mt-[5px] -ml-[46px] h-3 w-5 rounded-full bg-space" aria-hidden />
          <span className="absolute top-0 left-1/2 z-20 -mt-[5px] ml-[26px] h-3 w-5 rounded-full bg-space" aria-hidden />
          <div className="relative z-10 rounded-2xl border bg-card p-6 shadow-[0_10px_40px_-12px_rgba(20,20,30,.18)] sm:p-8">
            <AnimatedHeight>
              <h1 className="sr-only">Set up Jimmy</h1>
              <p className="-mt-1 mb-4 text-center text-xs text-muted-foreground sm:hidden">{bubble}</p>
              <div key={form.step} className={direction ? `step-${direction}` : undefined}>
                {done && created ? (
                  <DoneStep spaces={created.spaces} onFinish={finish} />
                ) : (
                  <Step form={form} update={update} onSubmit={next} />
                )}
              </div>
              {!done && (
                <>
                  {error && (
                    <div className="mt-5">
                      <ErrorBanner>{error}</ErrorBanner>
                    </div>
                  )}
                  <div className="mt-7 flex items-center justify-between gap-2 border-t pt-5">
                    <Button variant="ghost" onClick={() => go(-1)} disabled={form.step === 0 || complete.isPending}>
                      <ArrowLeft /> Back
                    </Button>
                    <div className="flex items-center gap-2">
                      {skippable && (
                        <Button variant="ghost" className="text-muted-foreground" onClick={() => (form.step === LAST_STEP ? submit() : go(1))} disabled={complete.isPending}>
                          Skip
                        </Button>
                      )}
                      <Button onClick={next} disabled={!canContinue(form) || complete.isPending} aria-busy={complete.isPending}>
                        {complete.isPending ? (
                          <>
                            <LoaderCircle className="animate-spin" /> Creating…
                          </>
                        ) : (
                          <>
                            {form.step === LAST_STEP ? 'Create my Spaces' : 'Continue'} <ArrowRight />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </AnimatedHeight>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Step {Math.min(form.step + 1, STEPS.length)} of {STEPS.length}
          {done ? ' · done' : ''}
        </p>
      </div>
    </main>
  )
}
