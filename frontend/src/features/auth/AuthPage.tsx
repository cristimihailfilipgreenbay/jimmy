import { useState } from 'react'
import { FileText, Lock, Search } from 'lucide-react'
import { Link, Navigate, useLocation } from 'react-router'
import { AnimatedHeight } from '@/components/AnimatedHeight'
import { AuthTabs, type AuthMode } from './components/AuthTabs'
import { ForgotPasswordForm } from './components/ForgotPasswordForm'
import { JimmyHead } from './components/JimmyHead'
import { SignInForm } from './components/SignInForm'
import { SignUpForm } from './components/SignUpForm'
import { useMe } from './queries/useMe'

const PAPER = { backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '100% 28px' }

// Sign in and Sign up on one screen, in the design's "Peek" layout.
export function AuthPage() {
  const mode: AuthMode = useLocation().pathname === '/sign-up' ? 'sign-up' : 'sign-in'
  const { data, isPending } = useMe()
  const [forgot, setForgot] = useState(false)
  if (isPending) return null
  if (data) return <Navigate to={data.onboarded ? '/' : '/welcome'} replace />

  const up = mode === 'sign-up'
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 pb-12 pt-32">
      <div className="pointer-events-none absolute inset-0 opacity-60" style={PAPER} aria-hidden />
      <div className="relative w-full max-w-[420px]">
        <div className="peek-jimmy absolute top-0 left-1/2 z-0 -translate-x-1/2 -translate-y-[80%]" aria-hidden>
          <JimmyHead className="size-24 text-foreground" />
        </div>
        <div className="peek-bubble absolute top-0 left-1/2 z-20 ml-14 hidden -translate-y-[190%] rounded-2xl rounded-bl-sm border bg-card px-3 py-1.5 text-sm whitespace-nowrap shadow-sm sm:block">
          Hi, I’m <span className="font-semibold">Jimmy</span>, your study tutor.
        </div>
        <span className="absolute top-0 left-1/2 z-20 -mt-[5px] -ml-[46px] h-3 w-5 rounded-full bg-foreground" aria-hidden />
        <span className="absolute top-0 left-1/2 z-20 -mt-[5px] ml-[26px] h-3 w-5 rounded-full bg-foreground" aria-hidden />
        <div className="relative z-10 rounded-2xl border bg-card p-6 shadow-[0_10px_40px_-12px_rgba(20,20,30,.18)] sm:p-8">
          <AnimatedHeight>
          <h1 className="sr-only">Jimmy</h1>
          <p className="-mt-1 mb-3 text-center text-xs text-muted-foreground sm:hidden">
            Hi, I’m <span className="font-semibold text-foreground">Jimmy</span>, your study tutor.
          </p>
          {forgot ? (
            <ForgotPasswordForm onBack={() => setForgot(false)} />
          ) : (
            <>
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-semibold tracking-tight">{up ? 'Create your account' : 'Welcome back'}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {up ? 'Email and password now, the rest together after.' : 'Sign in to pick up where you left off.'}
                </p>
              </div>
              <AuthTabs mode={mode} />
              <div key={mode} className="animate-in fade-in slide-in-from-bottom-1 duration-200 motion-reduce:animate-none">
                {up ? <SignUpForm /> : <SignInForm onForgot={() => setForgot(true)} />}
              </div>
              <p className="mt-5 text-center text-sm text-muted-foreground">
                {up ? (
                  <>
                    Already have an account?{' '}
                    <Link to="/sign-in" className="font-medium text-foreground hover:underline">
                      Sign in
                    </Link>
                  </>
                ) : (
                  <>
                    New to Jimmy?{' '}
                    <Link to="/sign-up" className="font-medium text-foreground hover:underline">
                      Create an account
                    </Link>
                  </>
                )}
              </p>
            </>
          )}
          </AnimatedHeight>
        </div>
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <FileText className="size-3.5" aria-hidden /> Answers from your notes
          </li>
          <li className="flex items-center gap-1.5">
            <Search className="size-3.5" aria-hidden /> Every claim cited
          </li>
          <li className="flex items-center gap-1.5">
            <Lock className="size-3.5" aria-hidden /> Private to you
          </li>
        </ul>
      </div>
    </main>
  )
}
