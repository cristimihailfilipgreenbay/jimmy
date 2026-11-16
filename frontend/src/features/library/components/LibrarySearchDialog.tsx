import { useState } from 'react'
import { Book, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { Space } from '@/features/spaces/schemas/space'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { useLibrarySearch } from '../queries/useLibrarySearch'

// Marks the words of the search that appear as they are; a misspelled word still finds
// its passage but has nothing to mark.
function Marked({ text, query }: { text: string; query: string }) {
  const words = query.split(/\s+/).filter((w) => w.length > 1).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (words.length === 0) return text
  return text.split(new RegExp(`(${words.join('|')})`, 'gi')).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="hl">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

// A search bar over the Space's textbook. It ranks by words and by spelling, so a typo
// such as "newtons thrid law" still finds the passage.
export function LibrarySearchDialog({
  studentId,
  space,
  open,
  onClose,
}: {
  studentId: string
  space: Space
  open: boolean
  onClose: () => void
}) {
  const [typed, setTyped] = useState('')
  const q = useDebouncedValue(typed.trim())
  const { data: hits, isFetching, isError } = useLibrarySearch(studentId, space.id, q)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden">
        <div className="flex max-h-[85vh] flex-col p-5">
          <DialogTitle>Search the textbook</DialogTitle>
          <DialogDescription className="mt-1">Finds passages in the {space.name} Subject Library, even when a word is misspelled.</DialogDescription>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              autoFocus
              type="search"
              autoComplete="off"
              spellCheck={false}
              aria-label="Search the textbook"
              placeholder="Try “conservation of momentum”"
              className="pl-9"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
          </div>
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto" aria-live="polite" aria-busy={isFetching}>
            {q.length < 2 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Type at least two letters.</p>
            ) : isError ? (
              <p role="alert" className="py-6 text-center text-sm text-destructive">
                The search failed. Try again.
              </p>
            ) : hits && hits.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No passages match “{q}”.</p>
            ) : (
              <ul className="space-y-2">
                {hits?.map((hit) => (
                  <li key={hit.chunk_id} className="rounded-lg border p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-lib">
                      <Book className="size-3.5 flex-none" aria-hidden />
                      <span className="font-serif font-normal italic">
                        {[hit.document, hit.page_or_section].filter(Boolean).join(', ')}
                      </span>
                    </p>
                    <p className="mt-1.5 line-clamp-5 font-serif text-[15px] leading-relaxed whitespace-pre-line">
                      <Marked text={hit.passage} query={q} />
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
