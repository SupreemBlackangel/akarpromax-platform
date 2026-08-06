import assert from "node:assert/strict";
import test from "node:test";
import { decodeJwt, decodeProtectedHeader } from "jose";

import {
  SESSION_COOKIE,
  buildSessionCookieOptions,
  isSessionRevoked,
  resetRevokedSessionsForTests,
  revokeSessionJti,
  signSessionPayload,
  verifySessionPayload,
} from "../lib/auth/session.ts";

const SECRET = "test-session-secret-for-unit-tests-0123456789";
const BASE = { userId: "user-1", role: "user" };

test("sign and verify a session token round-trips the payload", async () => {
  const token = await signSessionPayload(BASE, SECRET);
  const payload = await verifySessionPayload(token, SECRET);
  assert.ok(payload);
  assert.equal(payload.userId, "user-1");
  assert.equal(payload.role, "user");
  assert.ok(payload.jti);
  assert.ok(Array.isArray(payload.permissions));
});

test("each session creation rotates the token and jti (anti-fixation)", async () => {
  const first = await signSessionPayload(BASE, SECRET);
  const second = await signSessionPayload(BASE, SECRET);
  assert.notEqual(first, second);
  const firstPayload = await verifySessionPayload(first, SECRET);
  const secondPayload = await verifySessionPayload(second, SECRET);
  assert.notEqual(firstPayload.jti, secondPayload.jti);
});

test("expired tokens are rejected", async () => {
  const token = await signSessionPayload(BASE, SECRET, { expiresInSeconds: 1 });
  assert.ok(await verifySessionPayload(token, SECRET));
  await new Promise((resolve) => setTimeout(resolve, 1100));
  assert.equal(await verifySessionPayload(token, SECRET), null);
});

test("tampered tokens are rejected", async () => {
  const token = await signSessionPayload(BASE, SECRET);
  const tampered = `${token.slice(0, -2)}xx`;
  assert.equal(await verifySessionPayload(tampered, SECRET), null);
});

test("a token signed with a different secret is rejected", async () => {
  const token = await signSessionPayload(BASE, SECRET);
  assert.equal(await verifySessionPayload(token, "a-different-32-character-secret-0000"), null);
});

test("revoked jti makes the session invalid server-side", async () => {
  resetRevokedSessionsForTests();
  const token = await signSessionPayload(BASE, SECRET);
  const payload = await verifySessionPayload(token, SECRET);
  assert.ok(payload);
  assert.equal(isSessionRevoked(payload.jti), false);
  revokeSessionJti(payload.jti);
  assert.equal(isSessionRevoked(payload.jti), true);
  assert.equal(await verifySessionPayload(token, SECRET), null);
});

test("session cookie options are hardened", () => {
  const prod = buildSessionCookieOptions({ NODE_ENV: "production" });
  assert.equal(prod.httpOnly, true);
  assert.equal(prod.secure, true);
  assert.equal(prod.sameSite, "lax");
  assert.equal(prod.path, "/");
  assert.equal(prod.maxAge, 60 * 60 * 24 * 7);
  assert.equal(prod.domain, undefined);

  const dev = buildSessionCookieOptions({ NODE_ENV: "development" });
  assert.equal(dev.secure, false);
  assert.equal(dev.httpOnly, true);
});

test("session token payload carries no sensitive data", async () => {
  const token = await signSessionPayload(BASE, SECRET);
  const claims = decodeJwt(token);
  for (const key of Object.keys(claims)) {
    assert.equal(/password|secret|email|otp|token|hash/i.test(key), false, `unexpected sensitive claim: ${key}`);
  }
  assert.equal(typeof claims.jti, "string");
  assert.equal(decodeProtectedHeader(token).alg, "HS256");
});

test("session cookie name is stable", () => {
  assert.equal(SESSION_COOKIE, "akar_session");
});
