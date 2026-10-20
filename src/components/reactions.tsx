"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { ArrowBigUp } from "lucide-react";
import { togglePostReaction } from "@/actions/post";
import { toggleProjectUpvote } from "@/actions/project";

type Kind = "UPVOTE" | "SHIP_IT" | "NEED_THIS" | "HOW";

const STAMPS: { kind: Kind; label: string }[] = [
  { kind: "SHIP_IT", label: "ship it" },
  { kind: "NEED_THIS", label: "need this" },
  { kind: "HOW", label: "how?!" },
];

/** Upvote + builder stamps on a post. Updates instantly, rolls back if the server fails. */
export function PostReactions({
  postId,
  counts,
  mine,
  canReact,
}: {
  postId: string;
  counts: Record<Kind, number>;
  mine: Kind[];
  canReact: boolean;
}) {
  const [, start] = useTransition();
  const [state, toggle] = useOptimistic({ counts, mine }, (s, kind: Kind) => {
    const on = s.mine.includes(kind);
    return {
      counts: { ...s.counts, [kind]: s.counts[kind] + (on ? -1 : 1) },
      mine: on ? s.mine.filter((k) => k !== kind) : [...s.mine, kind],
    };
  });

  function react(kind: Kind) {
    start(async () => {
      toggle(kind);
      await togglePostReaction(postId, kind);
    });
  }

  if (!canReact) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2 text-body-s text-muted">
        <span className="text-count rounded-sm border border-line px-2 py-1">▲ {counts.UPVOTE}</span>
        <Link href="/signin" className="text-cobalt hover:underline">
          sign in to react
        </Link>
      </div>
    );
  }

  const up = state.mine.includes("UPVOTE");
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1">
      <button
        type="button"
        onClick={() => react("UPVOTE")}
        aria-pressed={up}
        aria-label={`${up ? "Remove upvote" : "Upvote"}, ${state.counts.UPVOTE} ${state.counts.UPVOTE === 1 ? "upvote" : "upvotes"}`}
        className={`mr-1 inline-flex h-9 items-center gap-1.5 rounded-sm border px-2.5 transition-colors duration-120 sm:mr-2 ${
          up ? "border-amber bg-amber text-amber-ink" : "border-line-strong text-ink hover:border-ink"
        }`}
      >
        <ArrowBigUp key={String(up)} className={`size-5 ${up ? "animate-stamp fill-current" : ""}`} />
        <span className="inline-block overflow-hidden">
          <span key={state.counts.UPVOTE} className="text-count inline-block animate-roll-up">
            {state.counts.UPVOTE}
          </span>
        </span>
      </button>
      {STAMPS.map((s) => {
        const on = state.mine.includes(s.kind);
        return (
          <button
            key={s.kind}
            type="button"
            aria-pressed={on}
            onClick={() => react(s.kind)}
            className={`inline-flex h-7 items-center gap-1 rounded-sm border px-1.5 font-mono text-[10px] transition-colors duration-120 sm:gap-1.5 sm:px-2 sm:text-[11px] sm:tracking-[0.04em] ${
              on ? "border-cobalt bg-cobalt text-on-cobalt" : "border-line text-muted hover:border-line-strong hover:text-ink"
            }`}
          >
            {s.label}
            <span className="tabular-nums">{state.counts[s.kind]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Project upvote box used in Discover, Launchpad and project pages. */
export function ProjectUpvote({
  projectId,
  count,
  upvoted,
  canVote,
  large = false,
}: {
  projectId: string;
  count: number;
  upvoted: boolean;
  canVote: boolean;
  large?: boolean;
}) {
  const [, start] = useTransition();
  const [state, toggle] = useOptimistic({ count, upvoted }, (s) => ({
    count: s.count + (s.upvoted ? -1 : 1),
    upvoted: !s.upvoted,
  }));

  const cls = `flex shrink-0 items-center justify-center rounded-sm border transition-colors duration-120 ${
    large ? "h-11 gap-2 px-4" : "size-14 flex-col gap-0.5"
  } ${state.upvoted ? "border-amber bg-amber text-amber-ink" : "border-line-strong hover:border-ink"}`;

  if (!canVote) {
    return (
      <Link href="/signin" className={cls} aria-label={`${count} ${count === 1 ? "upvote" : "upvotes"}. Sign in to upvote`}>
        <ArrowBigUp className="size-5" />
        <span className="text-count">{count}</span>
      </Link>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={state.upvoted}
      aria-label={`${state.upvoted ? "Remove upvote" : "Upvote"}, ${state.count} ${state.count === 1 ? "upvote" : "upvotes"}`}
      onClick={() =>
        start(async () => {
          toggle(null);
          await toggleProjectUpvote(projectId);
        })
      }
      className={cls}
    >
      <ArrowBigUp key={String(state.upvoted)} className={`size-5 ${state.upvoted ? "animate-stamp fill-current" : ""}`} />
      <span key={state.count} className="text-count animate-roll-up">
        {state.count}
        {large && (state.count === 1 ? " upvote" : " upvotes")}
      </span>
    </button>
  );
}
