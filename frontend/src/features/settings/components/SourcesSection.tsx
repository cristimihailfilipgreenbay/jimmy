import { Switch } from '@/components/ui/switch'
import { cardClass } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { useProfile, useUpdateProfile } from '../queries/useProfile'
import { SettingRow } from './SettingRow'

// Where Jimmy may look when the Notes and the Subject Library have no answer.
export function SourcesSection({ studentId }: { studentId: string }) {
  const { data: profile } = useProfile(studentId)
  const update = useUpdateProfile(studentId)
  return (
    <section className={cn(cardClass, 'mt-4 px-5')} aria-labelledby="s-sources">
      <h2 id="s-sources" className="pt-5 font-semibold">
        Sources
      </h2>
      <div className="divide-y divide-border">
        <SettingRow id="r-web" title="Allow web search" description="When your notes and library have no answer, Jimmy may search the web. Results are always labelled “Unreviewed web”.">
          <Switch checked={profile?.web_search ?? false} disabled={!profile} onCheckedChange={(web_search) => update.mutate({ web_search })} aria-labelledby="r-web" />
        </SettingRow>
        <SettingRow
          id="r-review"
          title="Review web content before saving"
          description="New web material goes to Learned Material for you to approve. This is always on: nothing from the web feeds quizzes or flashcards until you approve it."
        >
          <Switch checked disabled onCheckedChange={() => {}} aria-labelledby="r-review" />
        </SettingRow>
      </div>
    </section>
  )
}
