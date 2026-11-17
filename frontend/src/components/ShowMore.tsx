import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

// The end of a list that loads more as asked: "Show more" and how many of them are on the page.
export function ShowMore({ shown, total, hasMore, loading, onMore }: { shown: number; total: number; hasMore: boolean; loading: boolean; onMore: () => void }) {
  if (!hasMore && shown >= total) return null
  return (
    <div className="mt-4 flex flex-col items-center gap-1">
      {hasMore && (
        <Button variant="outline" disabled={loading} onClick={onMore}>
          {loading && <Loader2 className="animate-spin" />} Show more
        </Button>
      )}
      <p className="text-xs text-muted-foreground" role="status">
        Showing {shown} of {total}
      </p>
    </div>
  )
}
