import assert from "node:assert/strict";
import test from "node:test";

import { ApiError } from "../lib/errors/api-error.ts";
import { createRequestId, logSecurityEvent, redactFields } from "../lib/security/audit.ts";

test("redactFields masks sensitive keys", () => {
  const output = redactFields({
    password: "hunter2",
    passwordHash: "pbkdf2...",
    token: "abc",
    authorization: "Bearer abc",
    otp: "123456",
    cookie: "akar_session=...",
    apiKey: "key-123",
    sessionSecret: "s3cret",
  });
  for (const value of Object.values(output)) {
    assert.equal(value, "[REDACTED]");
  }
});

test("redactFields keeps non-sensitive metadata", () => {
  const output = redactFields({ requestId: "abc", operation: "login", variable: "SESSION_SECRET", at: "now" });
  assert.deepEqual(output, { requestId: "abc", operation: "login", variable: "SESSION_SECRET", at: "now" });
});

test("redactFields drops undefined values", () => {
  const output = redactFields({ requestId: "abc", undefinedKey: undefined });
  assert.deepEqual(output, { requestId: "abc" });
});

test("createRequestId returns a hex id", () => {
  const id = createRequestId();
  assert.match(id, /^[0-9a-f]{32}$/);
  assert.notEqual(id, createRequestId());
});

test("logSecurityEvent emits a JSON entry with the event name and no secrets", async () => {
  const originalInfo = console.info;
  const captured = [];
  console.info = (message) => captured.push(message);
  try {
    logSecurityEvent("AUTH_LOGIN_FAILED", { requestId: "req-1", password: "hunter2", email: "x@example.com" });
  } finally {
    console.info = originalInfo;
  }
  assert.equal(captured.length, 1);
  const entry = JSON.parse(captured[0].replace(/^\[security\] /, ""));
  assert.equal(entry.event, "AUTH_LOGIN_FAILED");
  assert.equal(entry.requestId, "req-1");
  assert.equal(entry.password, "[REDACTED]");
  assert.equal(entry.email, "x@example.com");
});

test("ApiError carries fieldErrors for the unified response shape", () => {
  const error = new ApiError(400, "بيانات غير صالحة", "VALIDATION_ERROR", { email: ["required"] });
  assert.equal(error.status, 400);
  assert.equal(error.code, "VALIDATION_ERROR");
  assert.deepEqual(error.fieldErrors, { email: ["required"] });
});

test("ApiError without fieldErrors has none", () => {
  const error = new ApiError(401, "unauthorized");
  assert.equal(error.fieldErrors, undefined);
});
