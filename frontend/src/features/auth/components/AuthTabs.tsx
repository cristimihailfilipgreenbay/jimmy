import { Link } from 'react-router'
import { cn } from '@/lib/utils'

export type AuthMode = 'sign-in' | 'sign-up'

const TABS: [AuthMode, string][] = [
  ['sign-in', 'Sign in'],
  ['sign-up', 'Sign up'],
]

// The pill behind the active tab slides across (CSS transform), as in the design.
export function AuthTabs({ mode }: { mode: AuthMode }) {
  return (
    <nav aria-label="Account" className="relative mb-6 grid grid-cols-2 rounded-lg bg-muted p-1">
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-card shadow-sm',
          'transition-transform duration-[280ms] ease-[cubic-bezier(.3,.7,.2,1)] motion-reduce:transition-none',
          mode === 'sign-up' && 'translate-x-full',
        )}
      />
      {TABS.map(([m, label]) => (
        <Link
          key={m}
          to={`/${m}`}
          aria-current={mode === m ? 'page' : undefined}
          className={cn(
            'relative z-10 rounded-md py-1.5 text-center text-sm font-medium transition-colors duration-200',
            mode === m ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
