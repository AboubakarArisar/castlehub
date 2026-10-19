// The CastleHub mark: a tower whose middle battlement is raised like an upvote.
export function Mark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M3 22V5h4.5v3H9V5.5L12 2l3 3.5V8h1.5V5H21v17H3Zm7.25 0v-4.25a1.75 1.75 0 0 1 3.5 0V22h-3.5Z"
      />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-ink ${className}`}>
      <Mark className="size-7 text-cobalt" />
      <span className="font-display text-[1.6rem] leading-none font-extrabold tracking-[-0.05em]">
        castlehub
      </span>
    </span>
  );
}
