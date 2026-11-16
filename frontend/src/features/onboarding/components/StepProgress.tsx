import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STEPS } from '../lib/form'

export function StepProgress({ step, done }: { step: number; done: boolean }) {
  return (
    <ol className="mb-24 flex items-center justify-center gap-1.5 sm:mb-[150px]" aria-label="Setup progress">
      {STEPS.map((label, i) => {
        const complete = i < step || done
        return (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className={cn(
                'flex items-center gap-1.5 text-xs',
                i === step && !done ? 'font-semibold text-foreground' : complete ? 'text-muted-foreground' : 'text-muted-foreground/60',
              )}
              aria-current={i === step && !done ? 'step' : undefined}
            >
              <span
                className={cn(
                  'grid size-5 place-items-center rounded-full text-[10px] transition-colors duration-300',
                  complete ? 'bg-primary text-primary-foreground' : i === step ? 'border-2 border-primary' : 'border',
                )}
              >
                {complete ? <Check className="size-3" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-border sm:w-6" aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}
