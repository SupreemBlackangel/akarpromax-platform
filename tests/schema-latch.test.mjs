import assert from "node:assert/strict";
import test from "node:test";

import {
  SchemaModeError,
  decideSchemaMode,
  getSchemaStatus,
} from "../lib/runtime-db.ts";

const base = {
  d1Available: true,
  d1InitSucceeded: true,
  allowMysqlFallback: false,
  mysqlConfigured: true,
};

test("D1 with successful init selects d1 mode", () => {
  assert.equal(decideSchemaMode(base), "d1");
});

test("missing D1 binding with MySQL configured selects mysql-fallback", () => {
  assert.equal(
    decideSchemaMode({ ...base, d1Available: false }),
    "mysql-fallback",
  );
});

test("D1 init failure without the explicit flag fails fast in any environment", () => {
  assert.throws(
    () => decideSchemaMode({ ...base, d1InitSucceeded: false }),
    SchemaModeError,
  );
});

test("D1 init failure with explicit MySQL fallback selects mysql-fallback", () => {
  assert.equal(
    decideSchemaMode({ ...base, d1InitSucceeded: false, allowMysqlFallback: true }),
    "mysql-fallback",
  );
});

test("D1 init failure cannot fall back when MySQL is not configured", () => {
  assert.throws(
    () => decideSchemaMode({ ...base, d1InitSucceeded: false, allowMysqlFallback: true, mysqlConfigured: false }),
    SchemaModeError,
  );
});

test("no backend at all fails", () => {
  assert.throws(
    () => decideSchemaMode({ ...base, d1Available: false, mysqlConfigured: false }),
    SchemaModeError,
  );
});

test("missing D1 + missing MySQL + allow flag still fails", () => {
  assert.throws(
    () => decideSchemaMode({ ...base, d1Available: false, mysqlConfigured: false, allowMysqlFallback: true }),
    SchemaModeError,
  );
});

test("schema status starts uninitialized and not ready", () => {
  assert.deepEqual(getSchemaStatus(), { mode: "uninitialized", ready: false });
});
