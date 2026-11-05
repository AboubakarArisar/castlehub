import assert from "node:assert/strict";
import { test } from "node:test";
import { hackathonSchema, hackathonStatus, publishProblems, readSubmission, toUtcInput } from "./hackathons";

const d = (s: string) => new Date(s);
const base = { publishedAt: d("2026-11-01T00:00Z"), archivedAt: null, opensAt: d("2026-11-10T12:00Z"), closesAt: d("2026-11-20T12:00Z"), override: null };

test("status follows the dates, with drafts and archives first", () => {
  assert.equal(hackathonStatus({ ...base, publishedAt: null }, d("2026-11-15T00:00Z")), "draft");
  assert.equal(hackathonStatus(base, d("2026-11-10T11:59Z")), "upcoming");
  assert.equal(hackathonStatus(base, d("2026-11-10T12:00Z")), "open");
  assert.equal(hackathonStatus(base, d("2026-11-20T11:59Z")), "open");
  assert.equal(hackathonStatus(base, d("2026-11-20T12:00Z")), "closed");
  assert.equal(hackathonStatus({ ...base, archivedAt: d("2026-11-25T00:00Z") }, d("2026-11-15T00:00Z")), "archived");
});

test("admins can close early or reopen", () => {
  assert.equal(hackathonStatus({ ...base, override: "CLOSED" }, d("2026-11-15T00:00Z")), "closed");
  assert.equal(hackathonStatus({ ...base, override: "OPEN" }, d("2026-12-01T00:00Z")), "open");
  // An archived event never accepts builds, whatever the override says.
  assert.equal(hackathonStatus({ ...base, override: "OPEN", archivedAt: d("2026-11-25T00:00Z") }, d("2026-12-01T00:00Z")), "archived");
});

test("publishing needs a title, brief and valid dates", () => {
  assert.deepEqual(publishProblems({ title: "Sky Jam", brief: "Build a thing", opensAt: base.opensAt, closesAt: base.closesAt }), {});
  const p = publishProblems({ title: "Sky Jam", brief: " ", opensAt: base.closesAt, closesAt: base.opensAt });
  assert.ok(p.brief);
  assert.equal(p.closesAt, "Closing must be after opening");
  assert.ok(publishProblems({ title: "Sky Jam", brief: "x", opensAt: null, closesAt: null }).opensAt);
});

const event = { title: "Sky Jam", slug: "sky-jam-1", summary: "", brief: "", theme: "", rules: "", prizes: "", linkUrl: "", coverUrl: "", opensAt: "2026-11-10T12:00", closesAt: "2026-11-20T12:00" };

test("event dates are typed in UTC and validated", () => {
  const r = hackathonSchema.safeParse(event);
  assert.ok(r.success);
  assert.equal(r.data.opensAt?.toISOString(), "2026-11-10T12:00:00.000Z");
  assert.equal(toUtcInput(r.data.opensAt), "2026-11-10T12:00");
  assert.equal(hackathonSchema.safeParse({ ...event, closesAt: "2026-11-09T12:00" }).success, false);
  assert.equal(hackathonSchema.safeParse({ ...event, opensAt: "tomorrow" }).success, false);
  assert.equal(hackathonSchema.safeParse({ ...event, linkUrl: "javascript:alert(1)" }).success, false);
  assert.equal(hackathonSchema.safeParse({ ...event, slug: "mine" }).success, false);
  assert.equal(hackathonSchema.safeParse({ ...event, slug: "Sky Jam!" }).success, false);
});

function form(fields: Record<string, string | string[]>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) f.append(k, x);
  return f;
}

test("a build needs a name and at least one http(s) link; tagline and description are optional", () => {
  const ok = readSubmission(form({ name: "Skyhop", repoUrl: "https://github.com/a/b" }));
  assert.ok(ok.success);
  assert.equal(ok.data.tagline, null);
  assert.equal(ok.data.description, null);

  const noLink = readSubmission(form({ name: "Skyhop" }));
  assert.equal(noLink.success, false);
  assert.equal(noLink.error?.issues[0].path[0], "demoUrl");

  assert.equal(readSubmission(form({ name: "", demoUrl: "https://a.dev" })).success, false);
  assert.equal(readSubmission(form({ name: "Skyhop", demoUrl: "javascript:alert(1)" })).success, false);
  assert.equal(readSubmission(form({ name: "Skyhop", videoUrl: "ftp://a.dev/v.mp4" })).success, false);
  assert.equal(readSubmission(form({ name: "Skyhop", demoUrl: "https://a.dev", images: ["1", "2", "3", "4", "5", "6"] })).success, false);
  assert.equal(readSubmission(form({ name: "Skyhop", demoUrl: "https://a.dev", tagline: "x".repeat(101) })).success, false);

  const tech = readSubmission(form({ name: "Skyhop", demoUrl: "https://a.dev", tech: "Next.js, three.js, next.js, " }));
  assert.deepEqual(tech.data?.tech, ["next.js", "three.js"]);
});
