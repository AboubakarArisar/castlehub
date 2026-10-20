// Slack's four-colour mark, for "sign in with Slack" buttons.
export function SlackLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#36c5f0" d="M9 2.5a2 2 0 1 0 0 4h2v-2a2 2 0 0 0-2-2Zm0 5.3H4a2 2 0 1 0 0 4h5a2 2 0 1 0 0-4Z" />
      <path fill="#2eb67d" d="M21.5 9.8a2 2 0 1 0-4 0v2h2a2 2 0 0 0 2-2Zm-5.3 0v-5a2 2 0 1 0-4 0v5a2 2 0 1 0 4 0Z" />
      <path fill="#ecb22e" d="M14.2 21.5a2 2 0 1 0 0-4h-2v2a2 2 0 0 0 2 2Zm0-5.3h5a2 2 0 1 0 0-4h-5a2 2 0 1 0 0 4Z" />
      <path fill="#e01e5a" d="M2.5 14.2a2 2 0 1 0 4 0v-2h-2a2 2 0 0 0-2 2Zm5.3 0v5a2 2 0 1 0 4 0v-5a2 2 0 1 0-4 0Z" />
    </svg>
  );
}
