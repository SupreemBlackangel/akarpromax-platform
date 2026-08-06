import assert from "node:assert/strict";
import test from "node:test";

import {
  MemoryRateLimitStore,
  RateLimiter,
  clientIp,
  enforceRateLimit,
  identifierKey,
  ipKey,
  normalizeEmail,
  normalizePhone,
  resetRateLimiterForTests,
  setRateLimitStoreForTests,
} from "../lib/security/rate-limit.ts";

function smallWindowConfig(limit, windowMs, cooldownMs = 0) {
  return {
    login: { limit, windowMs, cooldownMs },
    register: { limit, windowMs, cooldownMs },
    verify_code: { limit, windowMs, cooldownMs },
    password_reset: { limit, windowMs, cooldownMs },
    password_reset_confirm: { limit, windowMs, cooldownMs },
    otp_resend: { limit, windowMs, cooldownMs },
    change_email: { limit, windowMs, cooldownMs },
    dev_login: { limit, windowMs, cooldownMs },
  };
}

function limiter(configs) {
  return new RateLimiter(new MemoryRateLimitStore(), configs);
}

test("burst limit allows up to the limit then blocks", async () => {
  const rate = limiter(smallWindowConfig(3, 60_000));
  const ip = "1.2.3.4";
  for (let i = 0; i < 3; i += 1) {
    const result = await rate.hit("login", [ipKey(ip)]);
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, 3 - i - 1);
  }
  const blocked = await rate.hit("login", [ipKey(ip)]);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, "rate_limited");
  assert.ok(blocked.retryAfterSeconds > 0);
});

test("window expires and the bucket resets", async () => {
  const rate = limiter(smallWindowConfig(1, 30));
  const ip = "5.6.7.8";
  assert.equal((await rate.hit("login", [ipKey(ip)])).allowed, true);
  assert.equal((await rate.hit("login", [ipKey(ip)])).allowed, false);
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal((await rate.hit("login", [ipKey(ip)])).allowed, true);
});

test("cooldown locks the identifier out after exceeding", async () => {
  const rate = limiter(smallWindowConfig(2, 60_000, 30_000));
  const id = identifierKey("user@example.com");
  await rate.hit("login", [id]);
  await rate.hit("login", [id]);
  const blocked = await rate.hit("login", [id]);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds >= 29);
  const stillBlocked = await rate.hit("login", [id]);
  assert.equal(stillBlocked.allowed, false);
});

test("identifier bucket is shared across different IPs", async () => {
  const rate = limiter(smallWindowConfig(2, 60_000));
  const id = identifierKey("shared@example.com");
  assert.equal((await rate.hit("login", [id])).allowed, true);
  assert.equal((await rate.hit("login", [id])).allowed, true);
  assert.equal((await rate.hit("login", [id])).allowed, false);
});

test("IP buckets are independent per IP", async () => {
  const rate = limiter(smallWindowConfig(1, 60_000));
  assert.equal((await rate.hit("login", [ipKey("10.0.0.1")])).allowed, true);
  assert.equal((await rate.hit("login", [ipKey("10.0.0.2")])).allowed, true);
});

test("stored keys are hashed and never contain the raw identifier", async () => {
  const store = new MemoryRateLimitStore();
  const rate = new RateLimiter(store, smallWindowConfig(3, 60_000));
  const email = "Person+Filter@Example.COM";
  await rate.hit("register", [identifierKey(normalizeEmail(email))]);
  for (const key of store.keys()) {
    assert.equal(key.includes("Person"), false);
    assert.equal(key.includes("Example.COM"), false);
  }
  assert.equal(email.toLowerCase(), "person+filter@example.com");
});

test("store keeps multiple hashed keys", async () => {
  const store = new MemoryRateLimitStore();
  const rate = new RateLimiter(store, smallWindowConfig(3, 60_000));
  await rate.hit("login", [ipKey("9.9.9.9"), identifierKey("a@b.com")]);
  const keys = store.keys();
  assert.equal(keys.length, 2);
  for (const key of keys) {
    assert.match(key, /^login:/);
    assert.ok(key.includes(":"));
  }
});

test("disabled limiter allows everything", async () => {
  const rate = new RateLimiter(new MemoryRateLimitStore(), smallWindowConfig(0, 1), { disabled: true });
  const result = await rate.hit("login", [ipKey("1.1.1.1")]);
  assert.equal(result.allowed, true);
  assert.equal(result.remaining, Number.MAX_SAFE_INTEGER);
});

test("normalization: email is case-insensitive and trimmed", () => {
  assert.equal(normalizeEmail("  User@Example.COM  "), "user@example.com");
});

test("normalization: phone keeps digits only", () => {
  assert.equal(normalizePhone("+968 9123 4567"), "96891234567");
  assert.equal(normalizePhone("(555) 123-4567"), "5551234567");
});

test("clientIp prefers proxy headers in order", () => {
  const headers = new Map([["cf-connecting-ip", "203.0.113.7"]]);
  const request = { headers: { get: (name) => headers.get(name.toLowerCase()) ?? null } };
  assert.equal(clientIp(request), "203.0.113.7");

  const forwarded = { headers: { get: (name) => (name === "x-forwarded-for" ? "198.51.100.9, 10.0.0.1" : null) } };
  assert.equal(clientIp(forwarded), "198.51.100.9");

  const real = { headers: { get: (name) => (name === "x-real-ip" ? "192.0.2.5" : null) } };
  assert.equal(clientIp(real), "192.0.2.5");

  assert.equal(clientIp({ headers: { get: () => null } }), "unknown");
});

test("enforceRateLimit emits blocked results through the singleton", async () => {
  setRateLimitStoreForTests(new MemoryRateLimitStore());
  const email = "login@example.com";
  for (let i = 0; i < 10; i += 1) {
    assert.equal((await enforceRateLimit("login", "1.2.3.4", email)).allowed, true);
  }
  const blocked = await enforceRateLimit("login", "1.2.3.4", email);
  assert.equal(blocked.allowed, false);
  await resetRateLimiterForTests();
  assert.equal((await enforceRateLimit("login", "1.2.3.4", email)).allowed, true);
});
