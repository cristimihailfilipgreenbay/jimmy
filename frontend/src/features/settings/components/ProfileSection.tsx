import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Input } from '@/components/ui/input'
import { meKey } from '@/features/auth/queries/useMe'
import { cardClass } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { useProfile, useUpdateProfile } from '../queries/useProfile'
import { YEARS, type Profile } from '../schemas/settings'

type TextKey = 'name' | 'course' | 'university'

// What the Student told Jimmy about themselves in onboarding. Every change saves at once.
export function ProfileSection({ studentId }: { studentId: string }) {
  const qc = useQueryClient()
  const { data: profile } = useProfile(studentId)
  const update = useUpdateProfile(studentId)
  // What is typed in a field until it is left; then the saved value shows again.
  const [drafts, setDrafts] = useState<Partial<Record<TextKey, string>>>({})

  const field = (key: TextKey, label: string, props: { optional?: boolean; placeholder?: string; autoComplete?: string }) => {
    const saved = profile?.[key] ?? ''
    return (
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor={`profile-${key}`}>
          {label} {props.optional && <span className="font-normal text-muted-foreground">(optional)</span>}
        </label>
        <Input
          id={`profile-${key}`}
          className="h-10 text-[15px]"
          value={drafts[key] ?? saved}
          maxLength={key === 'name' ? 80 : 120}
          disabled={!profile}
          placeholder={props.placeholder}
          autoComplete={props.autoComplete}
          onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
          onBlur={() => {
            const next = (drafts[key] ?? saved).trim()
            setDrafts(({ [key]: _left, ...rest }) => rest)
            // A name cannot be empty; the saved one comes back.
            if (next === saved || (key === 'name' && !next)) return
            update.mutate({ [key]: next }, { onSuccess: () => key === 'name' && qc.invalidateQueries({ queryKey: meKey }) })
          }}
        />
      </div>
    )
  }

  return (
    <section className={cn(cardClass, 'mt-6 p-5')} aria-labelledby="s-profile">
      <h2 id="s-profile" className="font-semibold">
        Profile
      </h2>
      <div className="mt-4 space-y-4">
        {field('name', 'What Jimmy calls you', { autoComplete: 'given-name' })}
        <div className="grid gap-4 sm:grid-cols-2">
          {field('course', 'Degree or course', { optional: true, placeholder: 'e.g. BSc Biology' })}
          {field('university', 'University', { optional: true, placeholder: 'e.g. University of Freiburg', autoComplete: 'organization' })}
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Year</legend>
          <div className="sm:max-w-md">
            <SegmentedControl label="Year" options={YEARS} value={profile?.year ?? null} onChange={(year: NonNullable<Profile['year']>) => update.mutate({ year })} />
          </div>
        </fieldset>
        <p className="text-xs text-muted-foreground">Used to suggest subjects and pitch explanations at the right level. Changes save automatically.</p>
      </div>
    </section>
  )
}
