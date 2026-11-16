import { Input } from '@/components/ui/input'
import { StepHeading } from './StepHeading'
import type { StepProps } from './stepProps'

export function NameStep({ form, update, onSubmit }: StepProps) {
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <StepHeading title="What should Jimmy call you?">Your first name is enough. It’s only shown to you.</StepHeading>
      <Input
        aria-label="Your name"
        autoFocus
        autoComplete="given-name"
        placeholder="e.g. Ana"
        maxLength={80}
        value={form.name}
        onChange={(e) => update({ name: e.target.value })}
        className="h-12 px-4 text-center text-lg"
      />
    </form>
  )
}
