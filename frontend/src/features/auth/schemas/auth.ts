import { z } from 'zod'

// Mirrors the backend's StudentOut. The name stays empty until onboarding.
export const studentSchema = z.object({ id: z.uuid(), display_name: z.string().nullable(), email: z.string() })
export type Student = z.infer<typeof studentSchema>

const emailSchema = z.string().trim().min(1, 'Enter your email address.').pipe(z.email('That doesn’t look like an email address.'))

// Mirrors the backend's SignUpIn (terms is checked here only).
export const signUpSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Use at least 8 characters.').max(128, 'Use 128 characters or fewer.'),
  terms: z.boolean().refine((agreed) => agreed, 'Please agree to continue.'),
})

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
  remember: z.boolean(),
})

export const forgotPasswordSchema = z.object({ email: emailSchema })
