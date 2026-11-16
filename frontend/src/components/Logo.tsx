import { JimmyHeadShapes } from '@/components/JimmyHead'

// The design's logo (variant C): Jimmy peeking up out of a tinted circle, and a
// lowercase "jimmy." wordmark whose full stop takes the Study Space's colour.
export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg className="size-8 text-space" viewBox="0 0 32 32" role="img" aria-label="Jimmy">
        <defs>
          <clipPath id="logo-clip">
            <circle cx="16" cy="16" r="16" />
          </clipPath>
        </defs>
        <circle cx="16" cy="16" r="16" fill="currentColor" opacity=".14" />
        <g clipPath="url(#logo-clip)">
          <path d="M6 34c0-6 4.5-9 10-9s10 3 10 9z" fill="currentColor" />
          <g transform="translate(0 2.2)">
            <JimmyHeadShapes />
          </g>
        </g>
      </svg>
      <span className="hidden text-[19px] leading-none font-bold tracking-[-0.04em] text-foreground lowercase sm:inline">
        jimmy<span className="text-space">.</span>
      </span>
    </span>
  )
}
