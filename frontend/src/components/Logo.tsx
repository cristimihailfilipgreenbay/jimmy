import { JimmyBadge } from '@/components/JimmyBadge'

// The design's logo (variant C): Jimmy peeking up out of a tinted circle, and a
// lowercase "jimmy." wordmark whose full stop keeps the primary colour in every Study Space.
export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <JimmyBadge className="size-8" />
      <span className="hidden text-[19px] leading-none font-bold tracking-[-0.04em] text-foreground lowercase sm:inline">
        jimmy<span className="text-primary">.</span>
      </span>
    </span>
  )
}
