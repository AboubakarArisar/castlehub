// Build streaks: pure date and streak logic (no database), shared by the server and tests.
// Days are "YYYY-MM-DD" strings in the builder's timezone; arithmetic on them is done in UTC,
// so daylight-saving shifts can never create or swallow a day.

export const MILESTONES = [
  { days: 3, name: "Getting Started" },
  { days: 7, name: "Consistent Builder" },
  { days: 14, name: "On a Roll" },
  { days: 30, name: "Dedicated Maker" },
  { days: 60, name: "Castle Regular" },
  { days: 100, name: "Legendary Builder" },
] as const;

export const milestoneName = (days: number) => MILESTONES.find((m) => m.days === days)?.name ?? `${days} days`;

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The calendar day of an instant in a timezone (UTC when unset or invalid). */
export function dayIn(at: Date, tz?: string | null): string {
  const zone = isValidTimeZone(tz) ? tz : "UTC";
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const dayToDate = (day: string) => new Date(`${day}T00:00:00Z`);
export const dateToDay = (d: Date) => d.toISOString().slice(0, 10);

/** Summary of a builder's build days: total, longest run, and the latest run (length + last day). */
export function summarize(days: string[]) {
  const sorted = [...new Set(days)].sort();
  let longest = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && sorted[i - 1] === addDays(sorted[i], -1) ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return { active: sorted.length, longest, length: run, end: sorted.at(-1) ?? null };
}

/** The streak still alive today: the latest run counts if it ended today or yesterday. */
export function currentStreak(length: number, end: string | null, today: string) {
  return end && (end === today || end === addDays(today, -1)) ? length : 0;
}

/** 0–4 colour intensity for a day's contribution count. */
export const level = (count: number) => (count <= 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4);

/**
 * Weeks (columns, Monday first) covering the last `weeks` weeks up to today.
 * Days after today are null so the grid keeps its shape.
 */
export function calendarWeeks(counts: Map<string, number>, today: string, weeks = 53) {
  const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  const start = addDays(today, -dow - (weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = addDays(start, w * 7 + d);
      return day > today ? null : { day, count: counts.get(day) ?? 0 };
    }),
  );
}

/** Small deterministic hash, used to rotate "builders on a roll" daily. */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

/**
 * Order active builders for "Builders on a Roll": not by streak length alone.
 * A daily-rotating random share, a capped streak bonus, and a boost for newer members.
 */
export function rollOrder<T extends { id: string; streak: number; joinedDaysAgo: number }>(builders: T[], today: string) {
  const score = (b: T) => hash(b.id + today) + Math.min(b.streak, 14) / 28 + (b.joinedDaysAgo <= 30 ? 0.35 : 0);
  return [...builders].sort((a, b) => score(b) - score(a));
}
