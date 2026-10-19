"use client";

import { useState } from "react";
import { ArrowBigUp, Bookmark, MessageSquare, Share } from "lucide-react";

const STAMPS = [
  { key: "ship", label: "ship it" },
  { key: "need", label: "need this" },
  { key: "how", label: "how?!" },
] as const;

type StampKey = (typeof STAMPS)[number]["key"];

// Prototype state only: nothing is saved. Real reactions will be optimistic
// server actions that roll back on error.
export function Reactions({
  upvotes,
  comments,
  stamps,
}: {
  upvotes: number;
  comments: number;
  stamps: Record<StampKey, number>;
}) {
  const [up, setUp] = useState(false);
  const [mine, setMine] = useState<StampKey | null>(null);
  const [saved, setSaved] = useState(false);
  const count = upvotes + (up ? 1 : 0);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-2">
      <button
        type="button"
        onClick={() => setUp((v) => !v)}
        aria-pressed={up}
        aria-label={up ? `Remove upvote, ${count} upvotes` : `Upvote, ${count} upvotes`}
        className={`mr-1 inline-flex h-9 items-center gap-1.5 rounded-sm border px-2.5 transition-colors duration-120 sm:mr-2 ${
          up
            ? "border-amber bg-amber text-amber-ink"
            : "border-line-strong text-ink hover:border-ink"
        }`}
      >
        <ArrowBigUp key={String(up)} className={`size-5 ${up ? "animate-stamp fill-current" : ""}`} />
        <span className="inline-block overflow-hidden">
          <span key={count} className="text-count inline-block animate-roll-up">
            {count}
          </span>
        </span>
      </button>

      {STAMPS.map((s) => {
        const on = mine === s.key;
        return (
          <button
            key={s.key}
            type="button"
            aria-pressed={on}
            onClick={() => setMine(on ? null : s.key)}
            className={`inline-flex h-7 items-center gap-1 rounded-sm border px-1.5 font-mono text-[10px] transition-colors duration-120 sm:gap-1.5 sm:px-2 sm:text-[11px] sm:tracking-[0.04em] ${
              on
                ? "border-cobalt bg-cobalt text-on-cobalt"
                : "border-line text-muted hover:border-line-strong hover:text-ink"
            }`}
          >
            {s.label}
            <span className="tabular-nums">{stamps[s.key] + (on ? 1 : 0)}</span>
          </button>
        );
      })}

      <span className="ml-auto flex w-full items-center justify-end sm:w-auto">
        <IconButton label={`${comments} comments`}>
          <MessageSquare className="size-[18px]" />
          <span className="text-count">{comments}</span>
        </IconButton>
        <IconButton label={saved ? "Remove from saved" : "Save"} pressed={saved} onClick={() => setSaved((v) => !v)}>
          <Bookmark className={`size-[18px] ${saved ? "fill-current text-cobalt" : ""}`} />
        </IconButton>
        <IconButton label="Share">
          <Share className="size-[18px]" />
        </IconButton>
      </span>
    </div>
  );
}

function IconButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-sm px-2 text-muted transition-colors duration-120 hover:bg-surface-2 hover:text-ink"
    >
      {children}
    </button>
  );
}
