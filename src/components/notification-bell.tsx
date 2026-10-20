"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

const EVERY_MS = 60_000;

/**
 * Unread badge without sockets: the server renders the first count, then this
 * asks /api/notifications once a minute while the tab is visible (and when it comes back into view).
 */
export function NotificationBell({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (res.ok && alive) setCount((await res.json()).unread);
      } catch {}
    };
    const timer = setInterval(check, EVERY_MS);
    const cleared = () => setCount(0);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("notifications:read", cleared);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("notifications:read", cleared);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      aria-label={count ? `Notifications, ${count} unread` : "Notifications"}
      title="Notifications"
      className="relative grid size-9 place-items-center rounded-sm border border-line text-muted transition-colors duration-120 hover:border-line-strong hover:text-ink"
    >
      <Bell className="size-4" />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-amber px-1 font-mono text-[10px] font-bold text-amber-ink">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

/** Mounted on the notifications page: marks everything read once it has been seen. */
export function MarkRead({ action }: { action: () => Promise<void> }) {
  useEffect(() => {
    action().then(() => window.dispatchEvent(new Event("notifications:read")));
  }, [action]);
  return null;
}
