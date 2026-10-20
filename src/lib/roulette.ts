// Builder Roulette: fair picking and the reveal reel. Pure functions, shared by server and tests.
import { z } from "zod";
import { PROJECT_TYPES } from "@/lib/rules";
import { CATEGORIES } from "@/lib/world-math";

export const MODES = ["builders", "projects"] as const;
export type Mode = (typeof MODES)[number];

/** Builder filters reuse the World Map interests; project filters are the real project types. */
export const FILTERS = {
  builders: CATEGORIES.map((c) => ({ key: c.key as string, label: c.label })),
  projects: PROJECT_TYPES.map((t) => ({ key: t, label: t === "AI_TOOL" ? "AI tools" : t === "WEBSITE" ? "Web apps" : `${t[0]}${t.slice(1).toLowerCase()}` })),
} as const;

export const spinRequest = z.object({
  mode: z.enum(MODES),
  filter: z.string().max(20).nullable().default(null),
  // Ids already shown this round (kept by the browser), so a round never repeats anyone.
  seen: z.array(z.string().regex(/^[\w-]{1,40}$/)).max(1000).default([]),
  last: z.string().regex(/^[\w-]{1,40}$/).nullable().default(null),
});

/**
 * Uniform pick among eligible ids not yet seen this round. When everyone has been seen,
 * a new round starts (never re-picking the one just shown, unless they're the only one).
 * No popularity weighting: every eligible builder or project has the same chance.
 */
export function pickFair(eligible: string[], seen: Iterable<string>, last: string | null, randomInt: (max: number) => number) {
  if (eligible.length === 0) return null;
  const seenSet = new Set(seen);
  let pool = eligible.filter((id) => !seenSet.has(id));
  const newRound = pool.length === 0;
  if (newRound) pool = eligible.length > 1 ? eligible.filter((id) => id !== last) : eligible;
  const id = pool[randomInt(pool.length)];
  return { id, newRound, remaining: pool.length - 1 };
}

/**
 * Faces for the spinning reel: other real candidates, shuffled, ending on the winner.
 * With fewer than three others the reel is skipped, so a tiny community isn't padded out
 * to look bigger than it is.
 */
export function buildReel<T>(others: T[], randomInt: (max: number) => number, length = 18): T[] {
  if (others.length < 3) return [];
  const shuffled = [...others];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // Long enough to read as a spin; real faces only (repeats when the pool is small).
  return Array.from({ length: Math.max(length, Math.min(shuffled.length, 40)) }, (_, i) => shuffled[i % shuffled.length]);
}
