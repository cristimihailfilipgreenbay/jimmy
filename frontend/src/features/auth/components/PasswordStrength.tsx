import { cn } from '@/lib/utils'
import { passwordStrength } from '../lib/passwordStrength'

export function PasswordStrength({ password }: { password: string }) {
  const { level, label, tip, started } = passwordStrength(password)
  const colour = level <= 1 ? 'bg-destructive' : level === 2 ? 'bg-amber-500' : 'bg-green-600'
  return (
    <div className="mt-1" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors duration-300', i <= level ? colour : 'bg-border')} />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {started ? (
          <>
            Strength: <span className="font-medium text-foreground">{label}</span>
            {tip && ` · ${tip}`}
          </>
        ) : (
          label
        )}
      </p>
    </div>
  )
}
