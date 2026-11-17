import { Check, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAnswerStyleProposal, useDecideFact } from '@/features/settings/queries/useFacts'
import { errorMessage } from '@/lib/http'
import { toast } from '@/lib/toast'

// After repeated 👎 for the same reason, Jimmy proposes a change to how it answers.
// Only an approved style shapes the next answers.
export function StyleProposal({ studentId }: { studentId: string }) {
  const { data: proposal } = useAnswerStyleProposal(studentId)
  const decide = useDecideFact(studentId)
  if (!proposal) return null
  return (
    <section role="group" aria-labelledby="answer-style-notice" className="fade-in mb-2 rounded-xl border border-space/30 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-space-soft text-space-ink">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <h2 id="answer-style-notice" className="text-sm font-semibold">
          Jimmy noticed what you rate down
        </h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Answer this way from now on? <strong className="font-medium text-foreground">{proposal.text}</strong>
      </p>
      {decide.isError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {errorMessage(decide.error, 'Could not save that. Try again.')}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="space"
          size="sm"
          disabled={decide.isPending}
          onClick={() => decide.mutate({ id: proposal.id, approve: true }, { onSuccess: () => toast('Jimmy will answer this way', Sparkles) })}
        >
          <Check /> Use this style
        </Button>
        <Button variant="ghost" size="sm" disabled={decide.isPending} onClick={() => decide.mutate({ id: proposal.id, approve: false })}>
          <X /> No thanks
        </Button>
      </div>
    </section>
  )
}
