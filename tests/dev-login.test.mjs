import assert from "node:assert/strict";
import test from "node:test";

import { ApiError } from "../lib/errors/api-error.ts";
import { resetRuntimeEnvForTests } from "../lib/config/runtime-env.ts";
import { assertDevLoginAllowed, devLoginEnabled } from "../lib/security/dev-login.ts";

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

test("dev login is blocked in production even when the flag is set", () => {
  const restore = applyEnv({
    NODE_ENV: "production",
    SESSION_SECRET: VALID_SECRET,
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    APP_URL: "https://app.akarpromax.com",
    TRUSTED_ORIGINS: "https://app.akarpromax.com",
    ENABLE_DEV_LOGIN: "true",
  });
  try {
    assert.equal(devLoginEnabled(), false);
    assert.throws(() => assertDevLoginAllowed(), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 403);
      assert.equal(error.code, "AUTH_DEV_LOGIN_BLOCKED");
      return true;
    });
  } finally {
    restore();
  }
});

test("dev login is blocked in test environments", () => {
  const restore = applyEnv({ NODE_ENV: "test", ENABLE_DEV_LOGIN: "true" });
  try {
    assert.equal(devLoginEnabled(), false);
    assert.throws(() => assertDevLoginAllowed(), ApiError);
  } finally {
    restore();
  }
});

test("dev login is blocked in development without the explicit flag", () => {
  const restore = applyEnv({ NODE_ENV: "development" });
  try {
    assert.equal(devLoginEnabled(), false);
    assert.throws(() => assertDevLoginAllowed(), ApiError);
  } finally {
    restore();
  }
});

test("dev login is allowed only in development with the explicit flag", () => {
  const restore = applyEnv({ NODE_ENV: "development", ENABLE_DEV_LOGIN: "true" });
  try {
    assert.equal(devLoginEnabled(), true);
    assert.doesNotThrow(() => assertDevLoginAllowed());
  } finally {
    restore();
  }
});

test("dev login never grants admin by default", () => {
  assert.equal(devLoginEnabled(), false);
});
