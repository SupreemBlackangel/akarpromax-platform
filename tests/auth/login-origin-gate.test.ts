import test from "node:test";
import assert from "node:assert/strict";

// Freeze a valid production-shaped environment BEFORE the modules load.
// Use Object.assign to bypass TS2540 (NODE_ENV is readonly in @types/node).
Object.assign(process.env, {
  NODE_ENV: process.env.NODE_ENV || "test",
  SESSION_SECRET: process.env.SESSION_SECRET || "test-secret-".padEnd(48, "x"),
  TRUSTED_ORIGINS: "http://localhost:3010,http://localhost:3011,http://localhost:3022",
});

import { checkOrigin, isLocalhostOrigin } from "../../lib/security/origin";
import { validateRuntimeEnv, RuntimeEnvError } from "../../lib/config/runtime-env";
import { buildSessionCookieOptions } from "../../lib/auth/session";

const PROD_ENV = {
  NODE_ENV: "production",
  SESSION_SECRET: "a-strong-production-session-secret-0123456789abcdef",
  DATABASE_URL: "postgres://user:pass@db.example.com/app",
  APP_URL: "http://localhost:3010",
  TRUSTED_ORIGINS: "http://localhost:3010,http://localhost:3011,http://localhost:3022",
} as unknown as NodeJS.ProcessEnv;

test("production env with the 3022 runtime origin listed is valid and trusted", () => {
  const env = validateRuntimeEnv(PROD_ENV);
  assert.equal(env.isProduction, true);
  assert.ok(env.trustedOrigins.includes("http://localhost:3022"));
});

test("production env without TRUSTED_ORIGINS refuses to boot (documented contract)", () => {
  assert.throws(
    () => validateRuntimeEnv({ ...PROD_ENV, TRUSTED_ORIGINS: "" } as NodeJS.ProcessEnv),
    RuntimeEnvError,
  );
});

test("origin gate: trusted runtime origin accepted, forged origin refused", () => {
  // The runtime env for this process lists 3022 (set above).
  const trusted = checkOrigin({ method: "POST", origin: "http://localhost:3022", pathname: "/api/auth/login" });
  assert.equal(trusted.allowed, true);
  const forged = checkOrigin({ method: "POST", origin: "https://evil.example", pathname: "/api/auth/login" });
  assert.equal(forged.allowed, false);
  // Safe methods never require Origin (page loads keep working).
  assert.equal(checkOrigin({ method: "GET", origin: "https://evil.example" }).allowed, true);
  // Non-browser callers (no Origin header) pass through per ADR.
  assert.equal(checkOrigin({ method: "POST", origin: null }).allowed, true);
});

test("localhost origin matcher covers the certification runtime forms", () => {
  assert.equal(isLocalhostOrigin("http://localhost:3022"), true);
  assert.equal(isLocalhostOrigin("http://127.0.0.1:3022"), true);
  assert.equal(isLocalhostOrigin("http://localhost.evil.example"), false);
});

test("session cookie is HttpOnly+Lax always, Secure only in production", () => {
  const dev = buildSessionCookieOptions({ NODE_ENV: "development" } as NodeJS.ProcessEnv);
  assert.equal(dev.httpOnly, true);
  assert.equal(dev.sameSite, "lax");
  assert.equal(dev.secure, false);
  const prod = buildSessionCookieOptions({ NODE_ENV: "production" } as NodeJS.ProcessEnv);
  assert.equal(prod.secure, true);
  assert.equal(prod.path, "/");
});

test("login route surfaces origin rejection as structured 403 JSON, not a crash", async () => {
  const { NextRequest } = await import("next/server");
  const { POST } = await import("../../app/api/auth/login/route");
  const request = new NextRequest("http://localhost:3022/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://evil.example" },
    body: JSON.stringify({ identifier: "probe@example.com", password: "x" }),
  });
  const response = await POST(request);
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.error, "origin_rejected");
  assert.ok(body.requestId);
  assert.equal(response.headers.get("set-cookie"), null);
});
