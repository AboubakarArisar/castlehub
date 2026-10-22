import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_POINTS, pngSize, reportSchema, strokesSchema, wallSide } from "./wall";

test("the wall starts 12 × 12 and grows as it fills", () => {
  assert.equal(wallSide(0), 12);
  assert.equal(wallSide(114), 12); // under 80% of 144
  assert.equal(wallSide(116), 16);
  assert.equal(wallSide(205), 20); // 80% of 256 is 204.8
});

test("drawing data is validated and size-limited", () => {
  const ok = [{ c: "#7b90ff", w: 8, p: [10, 10, 20, 20, 30, 25] }, { c: "#000000", w: 24, e: true, p: [40, 40] }];
  assert.equal(strokesSchema.safeParse(ok).success, true);
  assert.equal(strokesSchema.safeParse([{ c: "red", w: 8, p: [1, 1] }]).success, false); // colour must be #rrggbb
  assert.equal(strokesSchema.safeParse([{ c: "#ffffff", w: 500, p: [1, 1] }]).success, false); // brush too big
  assert.equal(strokesSchema.safeParse([{ c: "#ffffff", w: 4, p: [1, 1, 2] }]).success, false); // odd point list
  assert.equal(strokesSchema.safeParse([{ c: "#ffffff", w: 4, p: [1.5, 2] }]).success, false); // integers only
  assert.equal(strokesSchema.safeParse([{ c: "#ffffff", w: 4, p: [99999, 2] }]).success, false); // far off the tile
  assert.equal(strokesSchema.safeParse([{ c: "#ffffff", w: 4, p: [1, 2], extra: "<script>" }]).success, true); // unknown keys are dropped
  const tooMany = Array.from({ length: 7 }, () => ({ c: "#ffffff", w: 4, p: Array.from({ length: 20000 }, (_, i) => i % 500) }));
  assert.equal(strokesSchema.safeParse(tooMany).success, false, `more than ${MAX_POINTS} points`);
  assert.equal(strokesSchema.safeParse("nope").success, false);
});

test("PNG header check reads the real dimensions", () => {
  const png = new Uint8Array(33);
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 2, 0, 0, 0, 2, 0]);
  assert.deepEqual(pngSize(png), { width: 512, height: 512 });
  assert.equal(pngSize(new TextEncoder().encode("GIF89a........................")), null);
});

test("reports need a known reason", () => {
  assert.equal(reportSchema.safeParse({ reason: "SPAM" }).success, true);
  assert.equal(reportSchema.safeParse({ reason: "I just don't like it" }).success, false);
  assert.equal(reportSchema.safeParse({ reason: "OTHER", note: "x".repeat(501) }).success, false);
});
