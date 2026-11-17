import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { cn } from '@/lib/utils'

/** The page numbers to show: the first, the last, the current one and its neighbours, with gaps as null. */
function pageNumbers(page: number, count: number): (number | null)[] {
  const wanted = new Set([1, count, page - 1, page, page + 1].filter((n) => n >= 1 && n <= count))
  const sorted = [...wanted].sort((a, b) => a - b)
  const out: (number | null)[] = []
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push(null)
    out.push(n)
  })
  return out
}

// Page numbers with Previous and Next (shadcn Pagination), for lists the Student browses by page.
export function PageNav({ page, pageCount, onPage, label }: { page: number; pageCount: number; onPage: (page: number) => void; label: string }) {
  if (pageCount <= 1) return null
  const go = (n: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    if (n >= 1 && n <= pageCount && n !== page) onPage(n)
  }
  return (
    <Pagination aria-label={label}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" onClick={go(page - 1)} aria-disabled={page === 1} className={cn(page === 1 && 'pointer-events-none opacity-50')} tabIndex={page === 1 ? -1 : undefined} />
        </PaginationItem>
        {pageNumbers(page, pageCount).map((n, i) => (
          <PaginationItem key={n ?? `gap-${i}`}>
            {n === null ? <PaginationEllipsis /> : (
              <PaginationLink href="#" isActive={n === page} onClick={go(n)} aria-label={`Page ${n}`}>
                {n}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext href="#" onClick={go(page + 1)} aria-disabled={page === pageCount} className={cn(page === pageCount && 'pointer-events-none opacity-50')} tabIndex={page === pageCount ? -1 : undefined} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
