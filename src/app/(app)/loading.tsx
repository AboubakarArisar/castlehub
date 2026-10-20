// Shown instantly while an app page loads: the same shape as a page header and
// three posts, so the layout doesn't jump when content arrives.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse motion-reduce:animate-none">
      <div className="border-b border-line px-4 pt-6 pb-5 md:px-6">
        <div className="h-3 w-28 rounded-sm bg-surface-2" />
        <div className="mt-3 h-9 w-2/3 rounded-sm bg-surface-2" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3 border-b border-line px-4 py-5 md:px-6">
          <div className="size-10 shrink-0 rounded-sm bg-surface-2" />
          <div className="flex-1 space-y-2.5">
            <div className="h-3.5 w-40 rounded-sm bg-surface-2" />
            <div className="h-3.5 w-full rounded-sm bg-surface-2" />
            <div className="h-3.5 w-4/5 rounded-sm bg-surface-2" />
            {i === 0 && <div className="mt-3 aspect-video w-full rounded-sm bg-surface-2" />}
            <div className="flex gap-2 pt-1">
              <div className="h-8 w-14 rounded-sm bg-surface-2" />
              <div className="h-8 w-16 rounded-sm bg-surface-2" />
              <div className="h-8 w-16 rounded-sm bg-surface-2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
