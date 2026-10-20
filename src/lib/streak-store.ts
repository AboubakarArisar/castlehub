import "server-only";
import { db } from "@/lib/db";
import { dateToDay, dayIn, dayToDate, MILESTONES, summarize } from "@/lib/streaks";

// Build-streak writes. Not server actions: only our own create/delete actions call these,
// always with the signed-in builder's id, so nobody can credit or edit a streak directly.

/**
 * Credit a qualifying build (a new post or project) to the builder's day.
 * Upsert on the (user, day) key: concurrent or repeated calls add to the count but
 * can never create a second row for the day. Returns the credited day.
 */
export async function creditBuild(userId: string, at = new Date()): Promise<Date> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } });
  const day = dayToDate(dayIn(at, user.timezone));
  const row = await db.buildDay.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
  // A brand-new day changes the streak; extra posts on the same day only change the count.
  if (row.count === 1) await refreshStreak(userId);
  return day;
}

/** Remove the credit a deleted or moderated post/project earned. */
export async function revokeBuild(userId: string, day: Date | null) {
  if (!day) return;
  const { count } = await db.buildDay.updateMany({ where: { userId, day, count: { gt: 0 } }, data: { count: { decrement: 1 } } });
  if (count === 0) return;
  const { count: removed } = await db.buildDay.deleteMany({ where: { userId, day, count: { lte: 0 } } });
  if (removed) await refreshStreak(userId);
}

/**
 * Recalculate the stored summary from this builder's day rows (one indexed query, run only
 * when a day is added or removed) and award any milestones the latest run has reached.
 */
export async function refreshStreak(userId: string) {
  const rows = await db.buildDay.findMany({ where: { userId }, select: { day: true }, orderBy: { day: "asc" } });
  const s = summarize(rows.map((r) => dateToDay(r.day)));
  await db.user.update({
    where: { id: userId },
    data: { streakLength: s.length, streakEnd: s.end ? dayToDate(s.end) : null, longestStreak: s.longest, activeDays: s.active },
  });

  const reached = MILESTONES.filter((m) => m.days <= s.length);
  if (reached.length === 0) return;
  // skipDuplicates + the (user, days) key: only milestones awarded right now come back,
  // so a repeat call can't award or notify twice.
  const awarded = await db.streakMilestone.createManyAndReturn({
    data: reached.map((m) => ({ userId, days: m.days })),
    skipDuplicates: true,
    select: { days: true },
  });
  if (awarded.length) {
    await db.notification.createMany({
      data: awarded.map((a) => ({ userId, actorId: userId, kind: "STREAK_MILESTONE" as const, streakDays: a.days })),
    });
  }
}
