import assert from "node:assert/strict";
import test from "node:test";

import { resetRuntimeEnvForTests } from "../lib/config/runtime-env.ts";
import { applySecurityHeaders, cspReportOnly, securityHeaders } from "../lib/security/headers.ts";

const VALID_SECRET = "a-32-char-plus-production-secret-0123456789abcdef";

function applyEnv(env) {
  const saved = {};
  for (const key of Object.keys(env)) {
    saved[key] = process.env[key];
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  resetRuntimeEnvForTests();
  return () => {
    for (const key of Object.keys(env)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    resetRuntimeEnvForTests();
  };
}

function prodEnv() {
  return applyEnv({
    NODE_ENV: "production",
    DB_PROVIDER: "postgres",
    SESSION_SECRET: VALID_SECRET,
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    APP_URL: "https://app.akarpromax.com",
    TRUSTED_ORIGINS: "https://app.akarpromax.com",
  });
}

function devEnv() {
  return applyEnv({ NODE_ENV: "development" });
}

test("security headers include the core hardening headers", () => {
  const restore = devEnv();
  try {
    const headers = securityHeaders();
    assert.equal(headers["X-Content-Type-Options"], "nosniff");
    assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
    assert.equal(headers["X-Frame-Options"], "SAMEORIGIN");
    assert.equal(headers["Cross-Origin-Opener-Policy"], "same-origin");
    assert.match(headers["Content-Security-Policy-Report-Only"], /^default-src 'self'/);
    assert.match(headers["Permissions-Policy"], /geolocation=\(self\)/);
  } finally {
    restore();
  }
});

test("HSTS is present in production and absent in development", () => {
  let restore = devEnv();
  try {
    assert.equal(securityHeaders()["Strict-Transport-Security"], undefined);
  } finally {
    restore();
  }
  restore = prodEnv();
  try {
    assert.match(securityHeaders()["Strict-Transport-Security"], /max-age=63072000/);
  } finally {
    restore();
  }
});

test("CSP report-only has no unsafe-eval or wildcard source", () => {
  const csp = cspReportOnly();
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.doesNotMatch(csp, /script-src 'self' 'unsafe-inline' \*/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /base-uri 'self'/);
  assert.match(csp, /form-action 'self'/);
  assert.match(csp, /frame-ancestors 'self'/);
  assert.match(csp, /connect-src 'self'/);
  assert.match(csp, /img-src 'self' data: blob: https:/);
});

test("CSP report-only is used instead of enforce until verified", () => {
  const restore = prodEnv();
  try {
    const headers = securityHeaders();
    assert.ok(headers["Content-Security-Policy-Report-Only"]);
    assert.equal(headers["Content-Security-Policy"], undefined);
  } finally {
    restore();
  }
});

test("applySecurityHeaders merges with existing headers", () => {
  const restore = devEnv();
  try {
    const init = applySecurityHeaders({
      headers: { "Cache-Control": "private, no-store", "X-Custom": "keep" },
      status: 201,
    });
    const headers = init.headers;
    assert.equal(headers["Cache-Control"], "private, no-store");
    assert.equal(headers["X-Custom"], "keep");
    assert.equal(headers["X-Content-Type-Options"], "nosniff");
    assert.equal(init.status, 201);
  } finally {
    restore();
  }
});

test("applySecurityHeaders works with a Headers instance", () => {
  const restore = devEnv();
  try {
    const existing = new Headers({ "Cache-Control": "no-store" });
    const init = applySecurityHeaders({ headers: existing });
    const headers = new Headers(init.headers);
    assert.equal(headers.get("Cache-Control"), "no-store");
    assert.ok(headers.get("X-Content-Type-Options"));
  } finally {
    restore();
  }
});

test("applySecurityHeaders returns headers on an empty init", () => {
  const restore = devEnv();
  try {
    const init = applySecurityHeaders();
    assert.ok(init.headers);
    assert.equal(init.headers["Referrer-Policy"], "strict-origin-when-cross-origin");
  } finally {
    restore();
  }
});
