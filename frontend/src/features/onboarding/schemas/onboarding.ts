import { z } from 'zod'
import { studentSchema } from '@/features/auth/schemas/auth'
import { accentSchema, spaceSchema } from '@/features/spaces/schemas/space'

// These mirror the backend's OnboardingIn.
export const yearSchema = z.enum(['1st', '2nd', '3rd', '4th+', "Master's"])
export type Year = z.infer<typeof yearSchema>

export const goalSchema = z.enum(['understand', 'exams', 'cards', 'catchup', 'write'])
export type Goal = z.infer<typeof goalSchema>

export const styleSchema = z.enum(['short', 'balanced', 'detailed'])
export type Style = z.infer<typeof styleSchema>

const optionalText = z.string().trim().max(120, 'Use 120 characters or fewer.')

export const onboardingRequestSchema = z.object({
  name: z.string().trim().min(1, 'Tell us what to call you.').max(80, 'Use 80 characters or fewer.'),
  studies: z.object({ course: optionalText, university: optionalText, year: yearSchema.nullable() }),
  subjects: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Every Space needs a name.').max(80, 'Use 80 characters or fewer.'),
        course: optionalText,
        accent: accentSchema,
      }),
    )
    .min(1, 'Pick at least one subject.')
    .max(20),
  preferences: z.object({ goals: z.array(goalSchema), explanation_style: styleSchema, web_search: z.boolean() }),
})
export type OnboardingRequest = z.infer<typeof onboardingRequestSchema>

export const onboardingResponseSchema = z.object({ student: studentSchema, spaces: z.array(spaceSchema) })
export type OnboardingResponse = z.infer<typeof onboardingResponseSchema>

export const YEARS: { value: Year; label: string }[] = [
  { value: '1st', label: '1st' },
  { value: '2nd', label: '2nd' },
  { value: '3rd', label: '3rd' },
  { value: '4th+', label: '4th+' },
  { value: "Master's", label: 'Master’s' },
]

export const GOALS: { value: Goal; label: string }[] = [
  { value: 'understand', label: 'Understand concepts' },
  { value: 'exams', label: 'Prepare for exams' },
  { value: 'cards', label: 'Make flashcards' },
  { value: 'catchup', label: 'Catch up on lectures' },
  { value: 'write', label: 'Check my written answers' },
]

export const STYLES: { value: Style; label: string; hint: string }[] = [
  { value: 'short', label: 'Short', hint: 'A few sentences, straight to the point.' },
  { value: 'balanced', label: 'Balanced', hint: 'A clear explanation with the key steps.' },
  { value: 'detailed', label: 'Detailed', hint: 'Full explanations with examples and context.' },
]
