import { useId } from 'react'
import { JimmyHeadShapes } from '@/components/JimmyHead'
import { cn } from '@/lib/utils'

// The design's logo mark: Jimmy peeking up out of a tinted circle.
export function JimmyBadge({ className }: { className?: string }) {
  const clip = useId()
  return (
    <svg className={cn('text-space', className)} viewBox="0 0 32 32" role="img" aria-label="Jimmy">
      <defs>
        <clipPath id={clip}>
          <circle cx="16" cy="16" r="16" />
        </clipPath>
      </defs>
      <circle cx="16" cy="16" r="16" fill="currentColor" opacity=".14" />
      <g clipPath={`url(#${clip})`}>
        <path d="M6 34c0-6 4.5-9 10-9s10 3 10 9z" fill="currentColor" />
        <g transform="translate(0 2.2)">
          <JimmyHeadShapes />
        </g>
      </g>
    </svg>
  )
}
