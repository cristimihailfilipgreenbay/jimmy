import { z } from 'zod'

export const explanationStyleSchema = z.enum(['short', 'balanced', 'detailed'])
export type ExplanationStyle = z.infer<typeof explanationStyleSchema>

export const EXPLANATION_STYLES: { value: ExplanationStyle; label: string; hint: string }[] = [
  { value: 'short', label: 'Short', hint: 'A few sentences, straight to the point.' },
  { value: 'balanced', label: 'Balanced', hint: 'A clear explanation with the key steps.' },
  { value: 'detailed', label: 'Detailed', hint: 'Full explanations with examples and context.' },
]

// Mirrors the backend's ProfileOut (app/profile/schemas.py).
export const profileSchema = z.object({
  // The language answers come in; null means the Student's own language.
  language: z.string().nullable(),
  explanation_style: explanationStyleSchema,
  // Off: a Quiz or Test is written up front at one difficulty. On: it follows the answers.
  adaptive_difficulty: z.boolean(),
})
export type Profile = z.infer<typeof profileSchema>

// Mirrors the backend's FactOut: something Jimmy remembers, or a style it may follow.
export const factSchema = z.object({
  id: z.uuid(),
  kind: z.string(),
  text: z.string(),
  status: z.string(),
  origin: z.string(),
  created_at: z.string(),
})
export type Fact = z.infer<typeof factSchema>

// The languages Jimmy can answer in. The value is the name the Tutor is told to write in.
// "Same as I write in" stores nothing.
export const SAME_LANGUAGE = 'same'
export const LANGUAGES = ['English', 'German', 'French', 'Spanish', 'Italian', 'Portuguese', 'Dutch', 'Polish', 'Romanian', 'Turkish']
