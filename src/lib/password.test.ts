import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "./password";

test("a hash verifies only its own password", async () => {
  const stored = await hashPassword("correct horse");
  assert.equal(await verifyPassword("correct horse", stored), true);
  assert.equal(await verifyPassword("wrong horse", stored), false);
  assert.notEqual(await hashPassword("correct horse"), stored, "salted");
  assert.equal(await verifyPassword("x", "garbage"), false);
});
