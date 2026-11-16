import { Book } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import type { Space } from '@/features/spaces/schemas/space'
import { errorMessage } from '@/lib/http'
import { toast } from '@/lib/toast'
import { usePacks } from '../queries/usePacks'
import { useSetLibrary } from '../queries/useSetLibrary'
import type { LibraryState } from '../schemas/library'

// Pick the textbook for a Study Space. A Space has one, so adding another replaces it.
export function PackDialog({
  studentId,
  space,
  state,
  open,
  onClose,
}: {
  studentId: string
  space: Space
  state: LibraryState | undefined
  open: boolean
  onClose: () => void
}) {
  const { data: packs, isPending } = usePacks(studentId, open)
  const set = useSetLibrary(studentId, space.id)
  const current = state?.pack?.id
  const error = set.error ? errorMessage(set.error, 'Could not change the textbook.') : null

  function choose(packId: string | null, message: string) {
    set.mutate({ packId }, { onSuccess: () => (toast(message, Book), onClose()) })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <div className="p-5">
          <DialogTitle>Textbook for {space.name}</DialogTitle>
          <DialogDescription className="mt-1">
            Open textbooks Jimmy can quote, with their authors and licence. Chapters are indexed in this Space only.
          </DialogDescription>
          <ul className="mt-4 space-y-2">
            {isPending && <li className="text-sm text-muted-foreground">Loading…</li>}
            {packs?.length === 0 && (
              <li className="text-sm text-muted-foreground">No textbooks are available. Run the seed command to download them.</li>
            )}
            {packs?.map((pack) => (
              <li key={pack.id} className="flex items-start gap-3 rounded-lg border p-3">
                <span className="mt-0.5 h-10 w-1.5 flex-none rounded-full bg-lib" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-[15px] leading-snug italic">{pack.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {pack.subject} · {pack.author}
                  </span>
                  <a href={pack.source_url} target="_blank" rel="noopener" className="text-xs text-muted-foreground underline underline-offset-2">
                    OpenStax · {pack.license}
                  </a>
                </span>
                {pack.id === current ? (
                  <Button variant="outline" size="sm" disabled={set.isPending} onClick={() => choose(null, `Removed the textbook from ${space.name}`)}>
                    Remove
                  </Button>
                ) : (
                  <Button size="sm" disabled={set.isPending} onClick={() => choose(pack.id, `${pack.title} added to ${space.name}`)}>
                    {current ? 'Use instead' : 'Add'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="mt-5">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
