import Link from "next/link";
import { Flame } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { BuildCalendar } from "@/components/build-calendar";
import { getStreakHistory } from "@/lib/queries";
import { addDays, calendarWeeks, currentStreak, dateToDay, dayIn, milestoneName } from "@/lib/streaks";

type StreakFields = { streakLength: number; streakEnd: Date | null; timezone: string | null };

/** Today's streak state for a builder, computed in their timezone. */
export function streakNow(u: StreakFields, now = new Date()) {
  const today = dayIn(now, u.timezone);
  const end = u.streakEnd ? dateToDay(u.streakEnd) : null;
  return { today, current: currentStreak(u.streakLength, end, today), doneToday: end === today };
}

/** Profile section: streak stats, earned milestones and the 12-month calendar. */
export async function StreakSection({ builder }: { builder: StreakFields & { id: string; name: string | null; longestStreak: number; activeDays: number } }) {
  const { today, current } = streakNow(builder);
  const { counts, milestones } = await getStreakHistory(builder.id, addDays(today, -371));
  const weeks = calendarWeeks(counts, today);
  const stats = [
    { label: "current streak", value: current, unit: current === 1 ? "day" : "days" },
    { label: "longest streak", value: builder.longestStreak, unit: builder.longestStreak === 1 ? "day" : "days" },
    { label: "active build days", value: builder.activeDays, unit: "" },
  ];

  return (
    <section id="streak" aria-labelledby="streak-h" className="mt-6 scroll-mt-24">
      <h2 id="streak-h" className="text-label flex items-center gap-1.5 text-muted">
        <Flame className={`size-3.5 ${current ? "text-amber" : ""}`} aria-hidden="true" /> build streak
      </h2>
      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-body-s text-muted">{s.label}</dt>
            <dd className="font-display text-[26px] leading-8 font-extrabold tracking-[-0.03em]">
              {s.value}
              {s.unit && <span className="ml-1 font-sans text-body-s font-normal text-muted">{s.unit}</span>}
            </dd>
          </div>
        ))}
      </dl>
      {milestones.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Streak milestones">
          {milestones.map((m) => (
            <li
              key={m.days}
              title={`Reached ${m.awardedAt.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}`}
              className="text-label inline-flex items-center gap-1 rounded-sm border border-amber/60 px-1.5 py-1 text-amber"
            >
              <Flame className="size-3" aria-hidden="true" /> {m.days}d · {milestoneName(m.days)}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <BuildCalendar weeks={weeks} label={`${builder.name ?? "This builder"}'s build days over the last 12 months: ${builder.activeDays} active days`} />
      </div>
    </section>
  );
}

/** Compact, quiet streak status at the top of the feed for the signed-in builder. */
export function StreakWidget({ viewer }: { viewer: StreakFields & { handle: string } }) {
  const { current, doneToday } = streakNow(viewer);
  const text = doneToday
    ? `🔥 ${current}-day streak! You've built something today.`
    : current > 0
      ? `Keep your ${current}-day streak going. Share your progress today.`
      : "Your next build starts your streak.";
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-2.5 md:px-6">
      <span className={`grid size-7 shrink-0 place-items-center rounded-sm ${doneToday ? "bg-amber text-amber-ink" : "bg-surface-2 text-muted"}`}>
        <Flame className="size-4" aria-hidden="true" />
      </span>
      <p className="min-w-0 flex-1 text-body-s">
        <span className="sr-only">Build streak: </span>
        {text}
      </p>
      <Link href={`/${viewer.handle}#streak`} className="shrink-0 text-body-s text-cobalt hover:underline">
        your calendar →
      </Link>
    </div>
  );
}

/** "Builders on a Roll" strip for Discover. */
export function BuildersOnARoll({ builders }: { builders: { id: string; name: string | null; handle: string | null; image: string | null; streak: number }[] }) {
  if (builders.length === 0) return null;
  return (
    <section aria-labelledby="roll-h" className="border-b border-line px-4 py-4 md:px-6">
      <h2 id="roll-h" className="text-label flex items-center gap-1.5 text-muted">
        <Flame className="size-3.5 text-amber" aria-hidden="true" /> builders on a roll
      </h2>
      <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {builders.map((b) => (
          <li key={b.id} className="shrink-0">
            <Link href={`/${b.handle}`} className="flex items-center gap-2 rounded-sm border border-line px-2.5 py-1.5 hover:border-line-strong hover:bg-surface">
              <Avatar seed={b.handle ?? b.id} src={b.image} size={24} />
              <span className="text-body-s font-semibold">{b.name}</span>
              <span className="text-count text-amber">{b.streak}d</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
