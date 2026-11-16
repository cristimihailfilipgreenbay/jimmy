import { useState, type ComponentProps, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Field } from './Field'

type Props = Omit<ComponentProps<typeof Input>, 'type' | 'id'> & {
  id: string
  error?: string
  right?: ReactNode
  /** Rendered under the input, for example the strength meter. */
  below?: ReactNode
}

export function PasswordField({ id, error, right, below, ...input }: Props) {
  const [shown, setShown] = useState(false)
  return (
    <Field id={id} label="Password" error={error} right={right}>
      <div className="relative">
        <Input
          id={id}
          type={shown ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="pr-11"
          {...input}
        />
        <button
          type="button"
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
          onClick={() => setShown((s) => !s)}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
        >
          {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {below}
    </Field>
  )
}
