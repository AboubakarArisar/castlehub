import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, calendarWeeks, currentStreak, dayIn, isValidTimeZone, level, rollOrder, summarize } from "./streaks";

test("dayIn uses the builder's timezone, UTC by default", () => {
  const at = new Date("2026-10-20T21:30:00Z");
  assert.equal(dayIn(at), "2026-10-20");
  assert.equal(dayIn(at, "Asia/Karachi"), "2026-10-21"); // UTC+5: already tomorrow
  assert.equal(dayIn(at, "America/Los_Angeles"), "2026-10-20");
  assert.equal(dayIn(at, "Not/AZone"), "2026-10-20"); // invalid falls back to UTC
  assert.equal(isValidTimeZone("Europe/London"), true);
  assert.equal(isValidTimeZone("nope"), false);
});

test("daylight saving never skips or doubles a day", () => {
  // US clocks go back on 2026-11-01: that day is 25 hours long in New York.
  const ny = "America/New_York";
  assert.equal(dayIn(new Date("2026-11-01T04:30:00Z"), ny), "2026-11-01"); // 00:30 EDT
  assert.equal(dayIn(new Date("2026-11-02T04:30:00Z"), ny), "2026-11-01"); // 23:30 EST, same day
  assert.equal(dayIn(new Date("2026-11-02T05:30:00Z"), ny), "2026-11-02");
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-11-01", 1), "2026-11-02");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});

test("first qualifying contribution starts a 1-day streak", () => {
  assert.deepEqual(summarize(["2026-10-20"]), { active: 1, longest: 1, length: 1, end: "2026-10-20" });
  assert.deepEqual(summarize([]), { active: 0, longest: 0, length: 0, end: null });
});

test("several posts on the same day count once", () => {
  assert.deepEqual(summarize(["2026-10-20", "2026-10-20", "2026-10-20"]), { active: 1, longest: 1, length: 1, end: "2026-10-20" });
});

test("consecutive days increment the streak", () => {
  assert.equal(summarize(["2026-10-18", "2026-10-19", "2026-10-20"]).length, 3);
  assert.equal(summarize(["2026-12-31", "2027-01-01"]).length, 2); // across a year
});

test("a missed day resets the streak but keeps the longest and history", () => {
  const s = summarize(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-06"]);
  assert.deepEqual(s, { active: 5, longest: 4, length: 1, end: "2026-10-06" });
});

test("current streak is alive only through yesterday", () => {
  assert.equal(currentStreak(5, "2026-10-20", "2026-10-20"), 5);
  assert.equal(currentStreak(5, "2026-10-19", "2026-10-20"), 5); // today not done yet
  assert.equal(currentStreak(5, "2026-10-18", "2026-10-20"), 0); // missed a full day
  assert.equal(currentStreak(0, null, "2026-10-20"), 0);
});

test("calendar covers 53 Monday-first weeks ending today, with exact counts", () => {
  const counts = new Map([["2026-10-20", 3], ["2026-01-05", 1]]);
  const weeks = calendarWeeks(counts, "2026-10-21"); // a Wednesday
  assert.equal(weeks.length, 53);
  assert.equal(new Date(`${weeks[0][0]!.day}T00:00:00Z`).getUTCDay(), 1); // starts on a Monday
  const last = weeks[52];
  assert.equal(last[1]!.day, "2026-10-20");
  assert.equal(last[1]!.count, 3);
  assert.equal(last[2]!.day, "2026-10-21");
  assert.equal(last[3], null); // Thursday is in the future
  const flat = weeks.flat().filter(Boolean);
  assert.equal(flat.find((c) => c!.day === "2026-01-05")?.count, 1);
  assert.equal(flat.reduce((n, c) => n + c!.count, 0), 4);
});

test("intensity levels", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 9].map(level), [0, 1, 2, 3, 3, 4]);
});

test("builders on a roll rotate daily and are not ranked by streak alone", () => {
  const builders = Array.from({ length: 12 }, (_, i) => ({ id: `u${i}`, streak: i === 0 ? 90 : 2, joinedDaysAgo: 100 }));
  const days = ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24"].map((d) => rollOrder(builders, d).map((b) => b.id).join());
  assert.ok(new Set(days).size > 1, "order changes between days");
  assert.ok(days.some((d) => !d.startsWith("u0,")), "the longest streak isn't always first");
  assert.deepEqual(rollOrder(builders, "2026-10-20"), rollOrder(builders, "2026-10-20")); // stable within a day
});
