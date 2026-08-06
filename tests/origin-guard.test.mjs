import assert from "node:assert/strict";
import test from "node:test";

import { ApiError } from "../lib/errors/api-error.ts";
import { assertSafeOrigin, checkOrigin, isWebhookPath } from "../lib/security/origin.ts";
import { resetRuntimeEnvForTests } from "../lib/config/runtime-env.ts";

const VALID_SECRET = "a-32-char-plus-production-secret-0123456789abcdef";
const APP_URL = "https://app.akarpromax.com";
const OTHER_TRUSTED = "https://admin.akarpromax.com";

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
    SESSION_SECRET: VALID_SECRET,
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    APP_URL,
    TRUSTED_ORIGINS: `${APP_URL}, ${OTHER_TRUSTED}`,
  });
}

function devEnv() {
  return applyEnv({
    NODE_ENV: "development",
    APP_URL: "http://localhost:3000",
  });
}

function request(method, origin, pathname = "/api/auth/login") {
  return {
    method,
    headers: { get: (name) => (name === "origin" ? origin : null) },
    nextUrl: { pathname },
    url: `http://localhost${pathname}`,
  };
}

test("safe methods (GET/HEAD/OPTIONS) bypass origin checks", () => {
  const restore = prodEnv();
  try {
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      const result = checkOrigin({ method, origin: "https://evil.example", pathname: "/api/auth/me" });
      assert.equal(result.allowed, true);
      assert.equal(result.reason, "safe_method");
    }
  } finally {
    restore();
  }
});

test("trusted origin is allowed for mutating requests", () => {
  const restore = prodEnv();
  try {
    assert.deepEqual(checkOrigin({ method: "POST", origin: OTHER_TRUSTED, pathname: "/api/auth/login" }).reason, "trusted");
    assert.equal(checkOrigin({ method: "POST", origin: APP_URL, pathname: "/api/auth/login" }).allowed, true);
  } finally {
    restore();
  }
});

test("untrusted origin is blocked in production", () => {
  const restore = prodEnv();
  try {
    const result = checkOrigin({ method: "POST", origin: "https://evil.example", pathname: "/api/auth/login" });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "untrusted");
  } finally {
    restore();
  }
});

test("missing origin is documented and allowed for server-to-server callers", () => {
  const restore = prodEnv();
  try {
    const result = checkOrigin({ method: "POST", origin: null, pathname: "/api/auth/login" });
    assert.equal(result.allowed, true);
    assert.equal(result.reason, "missing_origin");
  } finally {
    restore();
  }
});

test("localhost origin is allowed in development only", () => {
  let restore = devEnv();
  try {
    assert.equal(checkOrigin({ method: "POST", origin: "http://localhost:3000", pathname: "/api/auth/login" }).allowed, true);
    assert.equal(checkOrigin({ method: "POST", origin: "http://127.0.0.1:5173", pathname: "/api/auth/login" }).allowed, true);
  } finally {
    restore();
  }

  restore = prodEnv();
  try {
    const result = checkOrigin({ method: "POST", origin: "http://localhost:3000", pathname: "/api/auth/login" });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "untrusted");
  } finally {
    restore();
  }
});

test("malformed and non-http origins are blocked", () => {
  const restore = prodEnv();
  try {
    assert.equal(checkOrigin({ method: "POST", origin: "not-a-url", pathname: "/api/auth/login" }).allowed, false);
    assert.equal(checkOrigin({ method: "POST", origin: "ftp://example.com", pathname: "/api/auth/login" }).allowed, false);
    assert.equal(checkOrigin({ method: "POST", origin: "javascript:alert(1)", pathname: "/api/auth/login" }).allowed, false);
  } finally {
    restore();
  }
});

test("webhook paths are exempt when registered", () => {
  assert.equal(isWebhookPath("/api/webhooks/gateway"), false);
  assert.equal(isWebhookPath("/api/auth/login"), false);
});

test("assertSafeOrigin throws a uniform 403 for untrusted origins", () => {
  const restore = prodEnv();
  try {
    assert.throws(() => assertSafeOrigin(request("POST", "https://evil.example")), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 403);
      assert.equal(error.code, "AUTH_ORIGIN_REJECTED");
      return true;
    });
  } finally {
    restore();
  }
});

test("assertSafeOrigin passes for trusted origins and safe methods", () => {
  const restore = prodEnv();
  try {
    assert.doesNotThrow(() => assertSafeOrigin(request("POST", APP_URL)));
    assert.doesNotThrow(() => assertSafeOrigin(request("GET", "https://evil.example")));
  } finally {
    restore();
  }
});
