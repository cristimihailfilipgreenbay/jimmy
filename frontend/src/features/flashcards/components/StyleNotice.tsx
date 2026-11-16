import { Check, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/http'
import { toast } from '@/lib/toast'
import { useDecideStyle, useStyleProposal } from '../queries/useFlashcards'

// After the Student edits cards, Jimmy proposes the style the edits showed. Only an
// approved style shapes the next batch of cards.
export function StyleNotice({ studentId }: { studentId: string }) {
  const { data: proposal } = useStyleProposal(studentId)
  const decide = useDecideStyle(studentId)
  if (!proposal) return null
  return (
    <section role="group" aria-labelledby="style-notice" className="fade-in mb-5 rounded-xl border border-space/30 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-space-soft text-space-ink">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <h2 id="style-notice" className="text-sm font-semibold">
          Jimmy noticed how you edit cards
        </h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Use this style for the next cards? <strong className="font-medium text-foreground">{proposal.text}</strong>
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
          onClick={() => decide.mutate({ id: proposal.id, approve: true }, { onSuccess: () => toast('Jimmy will write cards this way', Sparkles) })}
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
