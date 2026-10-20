import assert from "node:assert/strict";
import { test } from "node:test";
import { buildReel, pickFair, spinRequest } from "./roulette";

const rand = (max: number) => Math.floor(Math.random() * max);

test("no eligible builders: nothing to pick", () => {
  assert.equal(pickFair([], [], null, rand), null);
});

test("one builder can always be discovered, without pretending there are more", () => {
  for (let i = 0; i < 5; i++) assert.equal(pickFair(["a"], i ? ["a"] : [], "a", rand)!.id, "a");
  assert.deepEqual(buildReel([], rand), []);
});

test("two builders alternate across rounds", () => {
  const first = pickFair(["a", "b"], [], null, rand)!;
  const second = pickFair(["a", "b"], [first.id], first.id, rand)!;
  assert.notEqual(second.id, first.id);
  // Both seen: a new round starts, but never repeats the one just shown.
  const third = pickFair(["a", "b"], [first.id, second.id], second.id, rand)!;
  assert.equal(third.newRound, true);
  assert.equal(third.id, first.id);
});

test("a round shows everyone exactly once before repeating", () => {
  const eligible = Array.from({ length: 300 }, (_, i) => `u${i}`);
  const seen: string[] = [];
  for (let i = 0; i < 300; i++) {
    const p = pickFair(eligible, seen, seen.at(-1) ?? null, rand)!;
    assert.equal(p.newRound, false);
    assert.ok(!seen.includes(p.id));
    seen.push(p.id);
  }
  assert.equal(new Set(seen).size, 300);
  assert.equal(pickFair(eligible, seen, seen.at(-1)!, rand)!.newRound, true);
});

test("picks are uniform, not popularity weighted", () => {
  const counts = new Map<string, number>();
  for (let i = 0; i < 30000; i++) {
    const id = pickFair(["a", "b", "c"], [], null, rand)!.id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const n of counts.values()) assert.ok(Math.abs(n - 10000) < 600, `${n}`);
});

test("reel uses only real candidates and skips tiny pools", () => {
  assert.deepEqual(buildReel(["a", "b"], rand), []);
  const reel = buildReel(["a", "b", "c", "d"], rand);
  assert.equal(reel.length, 18);
  assert.ok(reel.every((x) => ["a", "b", "c", "d"].includes(x)));
});

test("spin requests are validated", () => {
  assert.equal(spinRequest.safeParse({ mode: "builders" }).success, true);
  assert.equal(spinRequest.safeParse({ mode: "admins" }).success, false);
  assert.equal(spinRequest.safeParse({ mode: "projects", seen: ["ok", "nope; drop table"] }).success, false);
  assert.equal(spinRequest.safeParse({ mode: "projects", seen: Array(1001).fill("a") }).success, false);
});
