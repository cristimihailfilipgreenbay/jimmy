import { useState, type FormEvent } from 'react'
import { CircleAlert, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/http'
import { firstErrors } from '../lib/firstError'
import { useSignUp } from '../queries/useSignUp'
import { signUpSchema } from '../schemas/auth'
import { ErrorBanner } from './ErrorBanner'
import { Field } from './Field'
import { PasswordField } from './PasswordField'
import { PasswordStrength } from './PasswordStrength'

export function SignUpForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [terms, setTerms] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const signUp = useSignUp()

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const parsed = signUpSchema.safeParse({ email, password, terms })
    if (!parsed.success) {
      setErrors(firstErrors(parsed.error))
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid=true]')?.focus())
      return
    }
    setErrors({})
    signUp.mutate({ email: parsed.data.email, password: parsed.data.password })
  }

  return (
    <>
      {signUp.error && <ErrorBanner>{errorMessage(signUp.error, 'Could not create your account.')}</ErrorBanner>}
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field id="email" label="Email" error={errors.email} hint="Only used to sign you in.">
          <Input
            className="h-10 text-[15px]"
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
        </Field>
        <PasswordField
          id="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          below={errors.password ? null : <PasswordStrength password={password} />}
        />
        <div className="flex flex-col gap-2">
          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-primary"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              aria-invalid={errors.terms ? true : undefined}
              aria-describedby={errors.terms ? 'terms-error' : undefined}
            />
            <span>I agree to Jimmy’s Terms and Privacy notice.</span>
          </label>
          {errors.terms && (
            <p id="terms-error" className="flex items-center gap-1.5 text-sm text-destructive">
              <CircleAlert className="size-3.5" aria-hidden />
              {errors.terms}
            </p>
          )}
        </div>
        <Button type="submit" variant="space" size="lg" className="w-full" disabled={signUp.isPending} disabledReason="Creating your account…" aria-busy={signUp.isPending}>
          {signUp.isPending ? (
            <>
              <LoaderCircle className="animate-spin" /> Creating your account…
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>
    </>
  )
}
