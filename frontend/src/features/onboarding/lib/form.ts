import { ACCENTS } from '@/features/spaces/lib/accents'
import { courseLine } from '@/features/spaces/lib/course'
import type { Accent } from '@/features/spaces/schemas/space'
import { onboardingRequestSchema, type Goal, type OnboardingRequest, type Style, type Year } from '../schemas/onboarding'

export const STEPS = ['You', 'Studies', 'Subjects', 'Spaces', 'Preferences'] as const
export const LAST_STEP = STEPS.length - 1
export const DONE = STEPS.length

export type SubjectDraft = { name: string; course: string; lecturer: string; accent: Accent | null }

export type OnboardingForm = {
  step: number
  name: string
  course: string
  university: string
  year: Year | null
  subjects: SubjectDraft[]
  goals: Goal[]
  style: Style
  web: boolean
}

export const initialForm: OnboardingForm = {
  step: 0,
  name: '',
  course: '',
  university: '',
  year: null,
  subjects: [],
  goals: ['understand', 'exams'],
  style: 'balanced',
  web: true,
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** Names of Spaces that clash with an earlier one in the list. */
export function duplicateNames(subjects: SubjectDraft[]): Set<number> {
  const out = new Set<number>()
  subjects.forEach((s, i) => {
    if (s.name.trim() && subjects.findIndex((o) => sameName(o.name, s.name)) !== i) out.add(i)
  })
  return out
}

/** Why Continue is disabled on this step, for its tooltip. */
export function continueBlocker(form: OnboardingForm): string | undefined {
  if (form.step === 0 && !form.name.trim()) return 'Enter your name to continue'
  if (form.step === 2 && form.subjects.length === 0) return 'Pick at least one subject'
  if (form.step === 3) {
    if (!form.subjects.every((s) => s.name.trim())) return 'Give every Study Space a name'
    if (duplicateNames(form.subjects).size > 0) return 'Each Study Space needs its own name'
  }
  return undefined
}

export function canContinue(form: OnboardingForm): boolean {
  if (form.step === 0) return form.name.trim().length > 0
  if (form.step === 2) return form.subjects.length > 0
  if (form.step === 3) return form.subjects.every((s) => s.name.trim()) && duplicateNames(form.subjects).size === 0
  return true
}

/** Every Space gets the next colour in the design's order until the Student picks one. */
export function withDefaultAccents(subjects: SubjectDraft[]): SubjectDraft[] {
  return subjects.map((s, i) => (s.accent ? s : { ...s, accent: ACCENTS[i % ACCENTS.length].value }))
}

export function bubbleText(form: OnboardingForm): string {
  const first = form.name.trim().split(/\s+/)[0]
  return [
    'Hi! I’m Jimmy. What should I call you?',
    `Nice to meet you${first ? `, ${first}` : ''}! What are you studying?`,
    'Which subjects should we tackle this term?',
    'Each subject gets its own Study Space. Tweak them if you like.',
    'Last thing: how do you like your answers?',
    `All set${first ? `, ${first}` : ''}! Let’s add some notes.`,
  ][form.step]
}

/** The request for the backend, or the first problem with the form. */
export function toRequest(form: OnboardingForm): { ok: true; body: OnboardingRequest } | { ok: false; message: string } {
  const parsed = onboardingRequestSchema.safeParse({
    name: form.name,
    studies: { course: form.course, university: form.university, year: form.year },
    subjects: withDefaultAccents(form.subjects).map((s) => ({ name: s.name, course: courseLine(s.course, s.lecturer), accent: s.accent })),
    preferences: { goals: form.goals, explanation_style: form.style, web_search: form.web },
  })
  return parsed.success ? { ok: true, body: parsed.data } : { ok: false, message: parsed.error.issues[0].message }
}
