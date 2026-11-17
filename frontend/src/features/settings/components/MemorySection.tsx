import { useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { errorMessage } from '@/lib/http'
import { cardClass } from '@/lib/styles'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useClearEveryWeakTopic } from '../queries/useClearEveryWeakTopic'
import { useProfile, useUpdateProfile } from '../queries/useProfile'
import { SettingRow } from './SettingRow'

// What Jimmy remembers about how the Student is doing.
export function MemorySection({ studentId }: { studentId: string }) {
  const { data: profile } = useProfile(studentId)
  const update = useUpdateProfile(studentId)
  const clear = useClearEveryWeakTopic()
  const [confirming, setConfirming] = useState(false)
  return (
    <section className={cn(cardClass, 'mt-4 px-5 pb-2')} aria-labelledby="s-memory">
      <h2 id="s-memory" className="pt-5 font-semibold">
        Memory
      </h2>
      <div className="divide-y divide-border">
        <SettingRow
          id="r-weak"
          title="Remember weak topics"
          description="Jimmy notes topics you keep getting wrong and asks about them more in quizzes. Switch it off to pause that."
          info="Switched off, your quiz answers are still saved, but Jimmy stops marking new topics as weak and stops asking about weak ones more often. Topics already marked weak stay in the list until you clear them. Switch it back on and Jimmy counts every answer since you last cleared a topic, including the ones you gave while it was off."
        >
          <Switch
            checked={profile?.remember_weak_topics ?? true}
            disabled={!profile}
            onCheckedChange={(remember_weak_topics) => update.mutate({ remember_weak_topics })}
            aria-labelledby="r-weak"
          />
        </SettingRow>
        <SettingRow id="r-clear" title="Clear all weak topics" description="Across every Study Space. Notes and flashcards are not affected.">
          <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
            Clear…
          </Button>
        </SettingRow>
      </div>
      {(clear.isError || update.isError) && (
        <p role="alert" className="pb-4 text-sm text-destructive">
          {errorMessage(clear.error ?? update.error, 'Jimmy could not save that. Try again.')}
        </p>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Clear all weak topics?"
        description="Every topic marked weak, in every Study Space, is cleared and its earlier answers stop counting. Notes and flashcards are not affected."
        confirmLabel="Clear all"
        pending={clear.isPending}
        onConfirm={() => clear.mutate(undefined, { onSuccess: () => { setConfirming(false); toast('Weak topics cleared') } })}
      />
    </section>
  )
}
