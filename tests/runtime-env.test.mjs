import assert from "node:assert/strict";
import test from "node:test";

import {
  DEV_FALLBACK_SESSION_SECRET,
  TEST_SESSION_SECRET,
  RuntimeEnvError,
  validateRuntimeEnv,
  getRuntimeEnv,
  resetRuntimeEnvForTests,
  getTrustedOrigins,
} from "../lib/config/runtime-env.ts";

const VALID_SECRET = "a-32-char-plus-production-secret-0123456789abcdef";
const TEST_URL = "https://app.akarpromax.com";

function prodEnv(overrides = {}) {
  return {
    NODE_ENV: "production",
    SESSION_SECRET: VALID_SECRET,
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    DB_PROVIDER: "mysql",
    APP_URL: TEST_URL,
    TRUSTED_ORIGINS: TEST_URL,
    ...overrides,
  };
}

test("production accepts a complete valid environment", () => {
  const env = validateRuntimeEnv(prodEnv());
  assert.equal(env.nodeEnv, "production");
  assert.equal(env.isProduction, true);
  assert.equal(env.appOrigin, "https://app.akarpromax.com");
  assert.deepEqual(env.trustedOrigins, ["https://app.akarpromax.com"]);
  assert.equal(env.sessionSecret, VALID_SECRET);
});

test("production fails fast on missing SESSION_SECRET", () => {
  const env = prodEnv();
  delete env.SESSION_SECRET;
  assert.throws(() => validateRuntimeEnv(env), RuntimeEnvError);
  assert.throws(() => validateRuntimeEnv(env), /SESSION_SECRET/);
});

test("production rejects too-short SESSION_SECRET", () => {
  assert.throws(() => validateRuntimeEnv(prodEnv({ SESSION_SECRET: "short" })), RuntimeEnvError);
});

test("production rejects the .env.example placeholder value", () => {
  assert.throws(
    () => validateRuntimeEnv(prodEnv({ SESSION_SECRET: "REPLACE_WITH_32_BYTE_RANDOM_STRING" })),
    RuntimeEnvError,
  );
});

test("production rejects known weak secrets", () => {
  for (const weak of ["my_super_secret_key", "secret", "changeme", "password", "default-secret"]) {
    assert.throws(
      () => validateRuntimeEnv(prodEnv({ SESSION_SECRET: weak })),
      RuntimeEnvError,
      `expected "${weak}" to be rejected`,
    );
  }
});

test("production rejects the dev and test fallback secrets", () => {
  assert.throws(() => validateRuntimeEnv(prodEnv({ SESSION_SECRET: DEV_FALLBACK_SESSION_SECRET })), RuntimeEnvError);
  assert.throws(() => validateRuntimeEnv(prodEnv({ SESSION_SECRET: TEST_SESSION_SECRET })), RuntimeEnvError);
});

test("production fails fast on missing DATABASE_URL", () => {
  const env = prodEnv();
  delete env.DATABASE_URL;
  assert.throws(() => validateRuntimeEnv(env), /DATABASE_URL/);
});

test("production fails fast on missing APP_URL", () => {
  const env = prodEnv();
  delete env.APP_URL;
  assert.throws(() => validateRuntimeEnv(env), /APP_URL/);
});

test("production fails fast on missing or empty TRUSTED_ORIGINS", () => {
  const env = prodEnv();
  delete env.TRUSTED_ORIGINS;
  assert.throws(() => validateRuntimeEnv(env), /TRUSTED_ORIGINS/);
  assert.throws(() => validateRuntimeEnv(prodEnv({ TRUSTED_ORIGINS: "" })), /TRUSTED_ORIGINS/);
});

test("production rejects invalid TRUSTED_ORIGINS entries", () => {
  assert.throws(() => validateRuntimeEnv(prodEnv({ TRUSTED_ORIGINS: "not-a-url" })), /TRUSTED_ORIGINS/);
  assert.throws(() => validateRuntimeEnv(prodEnv({ TRUSTED_ORIGINS: "ftp://example.com" })), /TRUSTED_ORIGINS/);
});

test("production defaults to mysql when DB_PROVIDER is unset", () => {
  const env = prodEnv();
  delete env.DB_PROVIDER;
  const parsed = validateRuntimeEnv(env);
  assert.equal(parsed.dbProvider, "mysql");
});

test("production accepts DB_PROVIDER=mysql and DB_PROVIDER=d1", () => {
  const my = validateRuntimeEnv(prodEnv({ DB_PROVIDER: "mysql" }));
  assert.equal(my.dbProvider, "mysql");
  const d1 = validateRuntimeEnv(prodEnv({ DB_PROVIDER: "d1" }));
  assert.equal(d1.dbProvider, "d1");
});

test("production rejects deprecated DB_PROVIDER=postgres", () => {
  assert.throws(() => validateRuntimeEnv(prodEnv({ DB_PROVIDER: "postgres" })), /DB_PROVIDER/);
});

test("production rejects an invalid DB_PROVIDER value", () => {
  assert.throws(() => validateRuntimeEnv(prodEnv({ DB_PROVIDER: "oracle" })), /DB_PROVIDER/);
});

test("development defaults to d1 provider", () => {
  const env = validateRuntimeEnv({ NODE_ENV: "development" });
  assert.equal(env.dbProvider, "d1");
});

test("development allows explicit postgres or mysql provider", () => {
  assert.equal(validateRuntimeEnv({ NODE_ENV: "development", DB_PROVIDER: "postgres" }).dbProvider, "postgres");
  assert.equal(validateRuntimeEnv({ NODE_ENV: "development", DB_PROVIDER: "mysql" }).dbProvider, "mysql");
});

test("test environment defaults to d1 provider", () => {
  const env = validateRuntimeEnv({ NODE_ENV: "test" });
  assert.equal(env.dbProvider, "d1");
});

test("production parses a comma-separated TRUSTED_ORIGINS list", () => {
  const env = validateRuntimeEnv(
    prodEnv({ TRUSTED_ORIGINS: "https://app.akarpromax.com, https://admin.akarpromax.com/" }),
  );
  assert.deepEqual(env.trustedOrigins, ["https://app.akarpromax.com", "https://admin.akarpromax.com"]);
});

test("production error messages never contain the secret value", () => {
  const leaked = "super-sensitive-prod-secret-value";
  try {
    validateRuntimeEnv(prodEnv({ SESSION_SECRET: leaked }));
  } catch (error) {
    assert.ok(error instanceof RuntimeEnvError);
    assert.equal(error.message.includes(leaked), false);
  }
});

test("development allows a missing secret and uses a documented fallback", () => {
  const env = validateRuntimeEnv({ NODE_ENV: "development" });
  assert.equal(env.nodeEnv, "development");
  assert.equal(env.sessionSecret, DEV_FALLBACK_SESSION_SECRET);
  assert.equal(env.isProduction, false);
});

test("development does not throw on a placeholder secret", () => {
  const env = validateRuntimeEnv({ NODE_ENV: "development", SESSION_SECRET: "REPLACE_WITH_32_BYTE_RANDOM_STRING" });
  assert.equal(env.sessionSecret, "REPLACE_WITH_32_BYTE_RANDOM_STRING");
});

test("test environment uses an independent test secret", () => {
  const env = validateRuntimeEnv({ NODE_ENV: "test" });
  assert.equal(env.sessionSecret, TEST_SESSION_SECRET);
  assert.notEqual(TEST_SESSION_SECRET, DEV_FALLBACK_SESSION_SECRET);
});

test("development allows localhost origins for CSRF", () => {
  const env = validateRuntimeEnv({ NODE_ENV: "development" });
  assert.equal(env.appOrigin, "http://localhost:3000");
});

test("getRuntimeEnv caches and returns a single validated environment", () => {
  resetRuntimeEnvForTests();
  const original = process.env.NODE_ENV;
  const originalSecret = process.env.SESSION_SECRET;
  process.env.NODE_ENV = "test";
  process.env.SESSION_SECRET = VALID_SECRET;
  process.env.APP_URL = "http://localhost:3100";
  try {
    const first = getRuntimeEnv();
    const second = getRuntimeEnv();
    assert.equal(first, second);
    assert.ok(getTrustedOrigins().includes("http://localhost:3100"));
  } finally {
    if (original === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = original;
    if (originalSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = originalSecret;
    delete process.env.APP_URL;
    resetRuntimeEnvForTests();
  }
});
