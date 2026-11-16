import { useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError, errorMessage } from '@/lib/http'
import { firstErrors } from '../lib/firstError'
import { useSignIn } from '../queries/useSignIn'
import { signInSchema } from '../schemas/auth'
import { ErrorBanner } from './ErrorBanner'
import { Field } from './Field'
import { PasswordField } from './PasswordField'

export function SignInForm({ onForgot }: { onForgot: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const signIn = useSignIn()

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const parsed = signInSchema.safeParse({ email, password, remember })
    if (!parsed.success) {
      setErrors(firstErrors(parsed.error))
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid=true]')?.focus())
      return
    }
    setErrors({})
    signIn.mutate(parsed.data)
  }

  const wrongCredentials = signIn.error instanceof ApiError && signIn.error.code === 'invalid_credentials'

  return (
    <>
      {signIn.error && (
        <ErrorBanner>
          {errorMessage(signIn.error, 'Could not sign in.')}
          {wrongCredentials && (
            <>
              {' '}
              Check for typos, or{' '}
              <button type="button" className="underline underline-offset-2" onClick={onForgot}>
                reset your password
              </button>
              .
            </>
          )}
        </ErrorBanner>
      )}
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field id="email" label="Email" error={errors.email}>
          <Input
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          right={
            <button type="button" onClick={onForgot} className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">
              Forgot password?
            </button>
          }
        />
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" className="size-4 accent-primary" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Keep me signed in on this device
        </label>
        <Button type="submit" size="lg" className="w-full" disabled={signIn.isPending} aria-busy={signIn.isPending}>
          {signIn.isPending ? (
            <>
              <LoaderCircle className="animate-spin" /> Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>
    </>
  )
}
