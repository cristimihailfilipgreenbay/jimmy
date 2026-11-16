// Jimmy's head, from the design prototype. Colour follows the text colour.
export function JimmyHead({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="5.2 5.6 21.6 22.4" aria-hidden="true">
      <circle cx="7.4" cy="19.6" r="1.7" fill="currentColor" />
      <circle cx="24.6" cy="19.6" r="1.7" fill="currentColor" />
      <circle cx="16" cy="19" r="8.6" fill="currentColor" />
      <path
        d="M7.3 17.6C7 11.8 10.8 7.6 16 7.6c2.6 0 4.6.8 6.1 2.1l2.6-2.2-.4 3.9c.8 1.6 1.2 3.6 1.1 6.2-3.9-.3-6.9-1.7-8.9-4.1-2 2.4-5.2 3.8-9.2 4.1z"
        fill="currentColor"
      />
      <path d="M7.6 17.4c3.8-.3 6.8-1.6 8.6-4 2 2.3 5 3.7 8.6 4" fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
      <g fill="none" stroke="#fff" strokeWidth="1.4">
        <circle cx="12.7" cy="20" r="2.5" />
        <circle cx="19.3" cy="20" r="2.5" />
        <path d="M15.2 20h1.6" />
      </g>
      <path d="M13.6 24.2c1.4 1.3 3.4 1.3 4.8 0" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
