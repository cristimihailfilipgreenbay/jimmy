import { useState } from 'react'
import { Book, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import type { Space } from '@/features/spaces/schemas/space'
import { errorMessage } from '@/lib/http'
import { toast } from '@/lib/toast'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
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
  const [typed, setTyped] = useState('')
  const q = useDebouncedValue(typed.trim())
  const { data: packs, isPending } = usePacks(studentId, q, open)
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
          {/* Matches titles, subjects and authors, and forgives misspellings. */}
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              autoComplete="off"
              spellCheck={false}
              aria-label="Search textbooks"
              placeholder="Search textbooks by title, subject or author"
              className="pl-9"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
          </div>
          <ScrollArea className="mt-3 max-h-72 [&>[data-slot=scroll-area-viewport]]:max-h-72">
            <ul className="space-y-2 pr-3" aria-live="polite">
              {isPending && <li className="text-sm text-muted-foreground">Loading…</li>}
              {packs?.length === 0 && (
                <li className="text-sm text-muted-foreground">
                  {q ? `No textbooks match “${q}”.` : 'No textbooks are available. Run the seed command to download them.'}
                </li>
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
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={set.isPending}
                      onClick={() => choose(null, `Removed the textbook from ${space.name}`)}
                    >
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
          </ScrollArea>
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
