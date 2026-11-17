import { Trash2 } from 'lucide-react'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cardClass } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { useDecideFact, useFacts } from '../queries/useFacts'
import { useProfile, useUpdateProfile } from '../queries/useProfile'
import { EXPLANATION_STYLES, LANGUAGES, SAME_LANGUAGE } from '../schemas/settings'

// How Jimmy writes answers in every Study Space: language, length, and the style changes
// the Student approved after rating answers down.
export function AnswerStyleSection({ studentId }: { studentId: string }) {
  const { data: profile } = useProfile(studentId)
  const update = useUpdateProfile(studentId)
  const { data: facts = [] } = useFacts(studentId)
  const decide = useDecideFact(studentId)
  const language = profile?.language ?? SAME_LANGUAGE
  const approved = facts.filter((f) => f.kind === 'style' && f.origin === 'feedback' && f.status === 'approved')
  const hint = EXPLANATION_STYLES.find((s) => s.value === profile?.explanation_style)?.hint
  return (
    <section className={cn(cardClass, 'mt-4 p-5')} aria-labelledby="s-answers">
      <h2 id="s-answers" className="font-semibold">
        Answers
      </h2>
      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium" id="answer-language-label">
            Language
          </label>
          <Select
            value={language}
            disabled={!profile}
            onValueChange={(value) => value && update.mutate({ language: value === SAME_LANGUAGE ? '' : value })}
          >
            <SelectTrigger className="h-10 w-full text-[15px]" aria-labelledby="answer-language-label">
              <SelectValue>{(value: string) => (value === SAME_LANGUAGE ? 'Same as I write in' : value)}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value={SAME_LANGUAGE}>Same as I write in</SelectItem>
              {/* A language saved before this was a list stays selectable. */}
              {profile?.language && !LANGUAGES.includes(profile.language) && <SelectItem value={profile.language}>{profile.language}</SelectItem>}
              {LANGUAGES.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Answer length</legend>
          <SegmentedControl
            label="Answer length"
            options={EXPLANATION_STYLES}
            value={profile?.explanation_style ?? null}
            onChange={(explanation_style) => update.mutate({ explanation_style })}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
        </fieldset>
        {approved.length > 0 && (
          <div>
            <p className="text-sm font-medium" id="approved-styles">
              Styles you approved
            </p>
            <ul aria-labelledby="approved-styles" className="mt-1.5 divide-y divide-border rounded-lg border border-border">
              {approved.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  {f.text}
                  <Button variant="ghost" size="icon-sm" aria-label={`Forget: ${f.text}`} disabled={decide.isPending} onClick={() => decide.mutate({ id: f.id, approve: false })}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Applies in every Study Space. Changes save automatically.</p>
      </div>
    </section>
  )
}
