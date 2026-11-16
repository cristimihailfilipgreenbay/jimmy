import { useState, type FormEvent } from 'react'
import { ArrowLeft, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { firstErrors } from '../lib/firstError'
import { forgotPasswordSchema } from '../schemas/auth'
import { Field } from './Field'

// Shown as in the design, but not wired: Jimmy runs locally and sends no email.
export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [submitted, setSubmitted] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    const parsed = forgotPasswordSchema.safeParse({ email })
    if (!parsed.success) {
      setError(firstErrors(parsed.error).email)
      return
    }
    setError(undefined)
    setSubmitted(true)
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Reset your password</h2>
        <p className="mt-1 text-sm text-muted-foreground">Enter the email you signed up with.</p>
      </div>
      <Field id="email" label="Email" error={error}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'email-error' : undefined}
        />
      </Field>
      {submitted && (
        <p role="status" className="flex items-start gap-2 rounded-md border bg-muted p-3 text-sm">
          <Info className="mt-0.5 size-4 flex-none" aria-hidden />
          Password reset isn’t available yet. Jimmy runs on your own computer and can’t send email.
        </p>
      )}
      <Button type="submit" size="lg" className="w-full">
        Send reset link
      </Button>
      <Button type="button" variant="ghost" onClick={onBack} className="w-full">
        <ArrowLeft /> Back to sign in
      </Button>
    </form>
  )
}
