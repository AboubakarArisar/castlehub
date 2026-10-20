"use client";

import { useEffect } from "react";
import Link from "next/link";

// Catches unexpected errors in any page and offers a retry instead of a blank screen.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-[560px] flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-label text-muted">something broke</p>
      <h1 className="text-display-l mt-3">
        a brick <span className="accent-serif">fell</span> out
      </h1>
      <p className="mt-3 text-body-l text-muted">
        That didn&apos;t work. Try again, and if it keeps happening, let us know in the SkyCastle Slack.
      </p>
      {error.digest && <p className="text-label mt-2 text-muted">ref {error.digest}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="inline-flex h-11 items-center rounded-sm bg-cobalt px-5 text-body font-semibold text-on-cobalt">
          try again
        </button>
        <Link href="/feed" className="inline-flex h-11 items-center rounded-sm border border-line-strong px-5 text-body font-semibold hover:border-ink">
          back to the feed
        </Link>
      </div>
    </main>
  );
}
