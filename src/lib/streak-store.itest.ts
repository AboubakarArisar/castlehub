// Database integration tests for build streaks. Needs a throwaway local Postgres with
// migrations applied:  DATABASE_URL=postgres://…@localhost:…  npm run test:db
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { db } from "@/lib/db";
import { creditBuild, refreshStreak, revokeBuild } from "@/lib/streak-store";

const url = process.env.DATABASE_URL ?? "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  console.error("Refusing to run: DATABASE_URL must point at a local test database.");
  process.exit(1);
}

const at = (day: string, time = "12:00:00") => new Date(`${day}T${time}Z`);
const user = (id: string) => db.user.findUniqueOrThrow({ where: { id }, select: { streakLength: true, longestStreak: true, activeDays: true, streakEnd: true } });
const days = async (userId: string) =>
  (await db.buildDay.findMany({ where: { userId }, orderBy: { day: "asc" } })).map((d) => `${d.day.toISOString().slice(0, 10)}x${d.count}`);

before(async () => {
  await db.user.deleteMany({ where: { id: { startsWith: "it-" } } });
  await db.user.createMany({ data: ["it-a", "it-b", "it-c", "it-d"].map((id) => ({ id, handle: id, name: id })) });
});
after(async () => {
  await db.user.deleteMany({ where: { id: { startsWith: "it-" } } });
  await db.$disconnect();
});

test("concurrent and repeated credits on one day make one day row", async () => {
  await Promise.all(Array.from({ length: 20 }, () => creditBuild("it-a", at("2026-10-01"))));
  assert.deepEqual(await days("it-a"), ["2026-10-01x20"]);
  const u = await user("it-a");
  assert.equal(u.streakLength, 1);
  assert.equal(u.activeDays, 1);
});

test("consecutive days build the streak and award milestones exactly once", async () => {
  for (const d of ["01", "02", "03", "04", "05", "06", "07"]) await creditBuild("it-b", at(`2026-10-${d}`));
  const u = await user("it-b");
  assert.equal(u.streakLength, 7);
  assert.equal(u.longestStreak, 7);
  const awarded = async () => (await db.streakMilestone.findMany({ where: { userId: "it-b" } })).map((m) => m.days).sort((a, b) => a - b);
  const notes = () => db.notification.count({ where: { userId: "it-b", kind: "STREAK_MILESTONE" } });
  assert.deepEqual(await awarded(), [3, 7]);
  assert.equal(await notes(), 2);

  // Recalculating again (even concurrently) never re-awards or re-notifies.
  await Promise.all([refreshStreak("it-b"), refreshStreak("it-b"), refreshStreak("it-b")]);
  assert.deepEqual(await awarded(), [3, 7]);
  assert.equal(await notes(), 2);
});

test("a missed day resets the current run but keeps the longest and the history", async () => {
  await creditBuild("it-b", at("2026-10-09")); // the 8th was missed
  const u = await user("it-b");
  assert.equal(u.streakLength, 1);
  assert.equal(u.longestStreak, 7);
  assert.equal(u.activeDays, 8);
  assert.equal(u.streakEnd?.toISOString().slice(0, 10), "2026-10-09");
});

test("deleting or moderating content gives its credit back", async () => {
  // Two posts on the 9th: deleting one keeps the day.
  const second = await creditBuild("it-b", at("2026-10-09", "18:00:00"));
  await revokeBuild("it-b", second);
  assert.ok((await days("it-b")).includes("2026-10-09x1"));
  // Deleting the last one removes the day, and the streak falls back to the earlier run.
  await revokeBuild("it-b", second);
  assert.ok(!(await days("it-b")).some((d) => d.startsWith("2026-10-09")));
  const u = await user("it-b");
  assert.equal(u.streakLength, 7);
  assert.equal(u.streakEnd?.toISOString().slice(0, 10), "2026-10-07");
  // Revoking something that earned no credit is a no-op.
  await revokeBuild("it-b", null);
  await revokeBuild("it-b", at("2026-01-01"));
  assert.equal((await user("it-b")).activeDays, 7);
});

test("days follow the builder's timezone", async () => {
  await db.user.update({ where: { id: "it-c" }, data: { timezone: "Asia/Karachi" } });
  const day = await creditBuild("it-c", at("2026-10-20", "21:30:00")); // 02:30 on the 21st in Karachi
  assert.equal(day.toISOString().slice(0, 10), "2026-10-21");
  // Over the New York DST change, 23:30 on Nov 1 (EST) is still Nov 1.
  await db.user.update({ where: { id: "it-d" }, data: { timezone: "America/New_York" } });
  await creditBuild("it-d", new Date("2026-11-01T04:30:00Z"));
  await creditBuild("it-d", new Date("2026-11-02T04:30:00Z"));
  assert.deepEqual(await days("it-d"), ["2026-11-01x2"]);
});
