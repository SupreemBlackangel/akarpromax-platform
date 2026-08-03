import assert from "node:assert/strict";
import { test } from "node:test";

import { hashPassword, verifyPassword, createSecureToken, sha256Hex, generateVerificationCode } from "../lib/auth/crypto";

test("password hashing round-trips and rejects wrong passwords", async () => {
  const stored = await hashPassword("SuperSecret123");
  assert.equal(await verifyPassword("SuperSecret123", stored), true);
  assert.equal(await verifyPassword("WrongPassword", stored), false);
  assert.equal(await verifyPassword("SuperSecret123", "garbage"), false);
});

test("verification codes are 6 digits and tokens are unique", async () => {
  const code = generateVerificationCode();
  assert.match(code, /^\d{6}$/);
  const first = await createSecureToken();
  const second = await createSecureToken();
  assert.notEqual(first, second);
  assert.notEqual(await sha256Hex("abc"), await sha256Hex("abd"));
});
