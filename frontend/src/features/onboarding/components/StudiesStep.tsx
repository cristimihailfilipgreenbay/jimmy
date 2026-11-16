import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SegmentedControl } from '@/components/SegmentedControl'
import { YEARS } from '../schemas/onboarding'
import { StepHeading } from './StepHeading'
import type { StepProps } from './stepProps'

export function StudiesStep({ form, update, onSubmit }: StepProps) {
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <StepHeading title="What are you studying?">This helps Jimmy suggest subjects. All optional.</StepHeading>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ob-course">Degree or course</Label>
        <Input id="ob-course" autoFocus placeholder="e.g. BSc Biology" maxLength={120} value={form.course} onChange={(e) => update({ course: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ob-uni">University</Label>
        <Input
          id="ob-uni"
          autoComplete="organization"
          placeholder="e.g. University of Freiburg"
          maxLength={120}
          value={form.university}
          onChange={(e) => update({ university: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Year</span>
        <SegmentedControl label="Year" options={YEARS} value={form.year} onChange={(year) => update({ year })} />
      </div>
      <button type="submit" className="hidden" tabIndex={-1} aria-hidden />
    </form>
  )
}
