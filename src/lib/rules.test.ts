import assert from "node:assert/strict";
import { test } from "node:test";
import { embedUrl, handleSchema, isoWeek, postSchema, projectSchema, shiftWeek, slugify, sniffImage, weekRange } from "./rules";

test("isoWeek follows ISO-8601 (Thursday rule, year edges)", () => {
  assert.equal(isoWeek(new Date("2026-10-20T12:00:00Z")), "2026-W43");
  assert.equal(isoWeek(new Date("2021-01-03T12:00:00Z")), "2020-W53");
  assert.equal(isoWeek(new Date("2024-12-30T12:00:00Z")), "2025-W01");
});

test("weekRange and shiftWeek round-trip", () => {
  const r = weekRange("2026-W43")!;
  assert.equal(r.monday.toISOString().slice(0, 10), "2026-10-19");
  assert.equal(r.sunday.toISOString().slice(0, 10), "2026-10-25");
  assert.equal(weekRange("2026-W60"), null);
  assert.equal(shiftWeek("2026-W01", -1), "2025-W52");
});

test("handles: format and reserved names", () => {
  assert.equal(handleSchema.parse(" Mira-Makes "), "mira-makes");
  for (const bad of ["ab", "-mira", "mira-", "mi--ra", "feed", "a".repeat(31), "mira_makes"]) {
    assert.equal(handleSchema.safeParse(bad).success, false, bad);
  }
});

test("slugify", () => {
  assert.equal(slugify("Sky Hop: Wall-Jumps!"), "sky-hop-wall-jumps");
  assert.equal(slugify("Café ☕"), "cafe");
  assert.equal(slugify("!!!"), "project");
});

test("sniffImage accepts real image headers only", () => {
  assert.equal(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))?.ext, "png");
  assert.equal(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.ext, "jpg");
  assert.equal(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>")), null);
});

test("project and post validation", () => {
  const ok = projectSchema.safeParse({
    name: "skyhop", tagline: "A tiny platformer", description: "Climb a castle in the clouds.",
    type: "GAME", tags: "Pixel, platformer, pixel", websiteUrl: "", mediaUrl: "", images: [], launch: false,
  });
  assert.ok(ok.success);
  assert.deepEqual(ok.data.tags, ["pixel", "platformer"]);
  assert.equal(ok.data.websiteUrl, undefined);
  assert.equal(projectSchema.safeParse({ ...ok.data, tags: "", websiteUrl: "javascript:alert(1)" }).success, false);
  assert.equal(postSchema.safeParse({ body: "   " }).success, false);
  assert.ok(postSchema.safeParse({ body: "", imageUrl: "/api/uploads/x.png" }).success);
});

test("embedUrl allowlists YouTube and Vimeo", () => {
  assert.equal(embedUrl("https://youtu.be/abc123"), "https://www.youtube-nocookie.com/embed/abc123");
  assert.equal(embedUrl("https://vimeo.com/12345"), "https://player.vimeo.com/video/12345");
  assert.equal(embedUrl("https://evil.example/embed"), null);
});
