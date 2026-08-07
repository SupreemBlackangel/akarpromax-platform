import assert from "node:assert/strict";
import test from "node:test";

import {
  SchemaModeError,
  decideSchemaMode,
  getSchemaStatus,
} from "../lib/runtime-db.ts";

test("postgres provider selects postgres mode", () => {
  assert.equal(decideSchemaMode("postgres", false), "postgres");
});

test("mysql provider selects mysql mode without any D1 binding", () => {
  assert.equal(decideSchemaMode("mysql", false), "mysql");
});

test("d1 provider with the binding present selects d1 mode", () => {
  assert.equal(decideSchemaMode("d1", true), "d1");
});

test("d1 provider without the binding fails fast (no fallback)", () => {
  assert.throws(() => decideSchemaMode("d1", false), SchemaModeError);
});

test("schema status starts uninitialized and not ready", () => {
  assert.deepEqual(getSchemaStatus(), { mode: "uninitialized", ready: false });
});
