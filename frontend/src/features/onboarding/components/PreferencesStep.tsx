import { SegmentedControl } from '@/components/SegmentedControl'
import { Switch } from '@/components/ui/switch'
import { GOALS, STYLES } from '../schemas/onboarding'
import { StepHeading } from './StepHeading'
import { ToggleChip } from './ToggleChip'
import { WebChip } from './WebChip'
import type { StepProps } from './stepProps'

export function PreferencesStep({ form, update }: StepProps) {
  const hint = STYLES.find((s) => s.value === form.style)?.hint
  return (
    <div className="flex flex-col gap-5">
      <StepHeading title="How should Jimmy help?">You can change all of this later in Settings.</StepHeading>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">I want to…</legend>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <ToggleChip
              key={g.value}
              pressed={form.goals.includes(g.value)}
              onClick={() =>
                update({ goals: form.goals.includes(g.value) ? form.goals.filter((x) => x !== g.value) : [...form.goals, g.value] })
              }
            >
              {g.label}
            </ToggleChip>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Answer length</legend>
        <SegmentedControl label="Answer length" options={STYLES} value={form.style} onChange={(style) => update({ style })} />
        <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      </fieldset>
      <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium" id="ob-web-label">
            Search the web when my notes don’t cover it
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Web results are always labelled <WebChip /> until you approve them.
          </p>
        </div>
        <Switch checked={form.web} onCheckedChange={(web) => update({ web })} aria-labelledby="ob-web-label" />
      </div>
    </div>
  )
}
