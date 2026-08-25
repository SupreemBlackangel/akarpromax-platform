// L1A — pure unit tests for the destructive-test safety barrier.
//
// These tests perform NO database connection of any kind. They validate that
// the guard accepts loopback URLs and refuses everything else with the exact
// REFUSAL sentinel, before any destructive test could ever reach a remote
// database such as Neon.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  REFUSAL,
  assertLocalTestDatabaseUrl,
} from "./helpers/assert-local-test-database.mjs";

/** Comment prose must not be mistaken for executable destructive SQL. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

test("the refusal sentinel is the exact required sentence", () => {
  assert.equal(REFUSAL, "REFUSING DESTRUCTIVE L1A TEST AGAINST NON-LOCAL DATABASE");
});

test("ACCEPT — loopback PostgreSQL URLs pass and are returned unchanged", () => {
  const accepted = [
    "postgres://user:pass@localhost:5432/db",
    "postgres://user:pass@127.0.0.1:5432/db",
    "postgres://user:pass@[::1]:5432/db",
    "postgresql://user:pass@localhost:5432/db",
    "postgres://akar@127.0.0.1:55432/akar_l1a",
    "postgres://user@LOCALHOST:5432/db",
    "postgres://nobody@127.0.0.1:1/nothing",
  ];
  for (const url of accepted) {
    assert.equal(assertLocalTestDatabaseUrl(url), url, `should accept ${url}`);
  }
});

function assertRefused(url, label = String(url)) {
  assert.throws(
    () => assertLocalTestDatabaseUrl(url),
    (error) => {
      assert.ok(
        String(error.message).includes(REFUSAL),
        `error for ${label} must contain the refusal sentinel, got: ${error.message}`,
      );
      return true;
    },
    `should refuse ${label}`,
  );
}

test("REJECT — Neon hosts are refused", () => {
  assertRefused("postgres://user:pass@ep-example.neon.tech/db");
  assertRefused("postgres://user:pass@ep-broken-frost-123456.eu-central-1.aws.neon.tech/main?sslmode=require");
});

test("REJECT — remote and private-network IPv4 addresses are refused", () => {
  assertRefused("postgres://user:pass@10.0.0.20:5432/db");
  assertRefused("postgres://user:pass@192.168.1.100:5432/db");
  assertRefused("postgres://user:pass@8.8.8.8:5432/db");
  assertRefused("postgres://user:pass@172.16.0.5:5432/db");
});

test("REJECT — remote IPv6 addresses are refused", () => {
  assertRefused("postgres://user:pass@[2001:db8::1]:5432/db");
  assertRefused("postgres://user:pass@[fe80::1]:5432/db");
});

test("REJECT — arbitrary DNS hostnames are refused", () => {
  assertRefused("postgres://user:pass@example.com:5432/db");
  assertRefused("postgres://user:pass@db.internal:5432/db");
  assertRefused("postgres://user:pass@my-neon-clone.io:5432/db");
});

test("REJECT — lookalike loopback hostnames are refused (no substring matching)", () => {
  assertRefused("postgres://user:pass@localhost.evil.com:5432/db");
  assertRefused("postgres://user:pass@127.0.0.1.evil.com:5432/db");
  assertRefused("postgres://user:pass@notlocalhost:5432/db");
});

test("REJECT — a 'safe-sounding' database NAME on a remote host is still refused", () => {
  assertRefused("postgres://user:pass@ep-example.neon.tech/test");
  assertRefused("postgres://user:pass@example.com:5432/development");
  assertRefused("postgres://user:pass@10.0.0.20:5432/local_testing_dev");
});

test("REJECT — malformed, empty and non-PostgreSQL URLs are refused", () => {
  assertRefused("invalid-url");
  assertRefused("https://localhost/database", "https scheme");
  assertRefused("mysql://user@localhost:3306/db", "mysql scheme");
  assertRefused("");
  assertRefused("   ");
  assertRefused(undefined, "undefined");
  assertRefused(null, "null");
});

test("NO BYPASS — the guard consults no environment override", () => {
  const source = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "helpers", "assert-local-test-database.mjs"),
    "utf8",
  );
  assert.equal(/process\.env/.test(source), false, "the guard must not read process.env at all");
  for (const forbidden of ["ALLOW_REMOTE", "FORCE", "SKIP_SAFETY", "UNSAFE", "OVERRIDE"]) {
    assert.equal(source.includes(forbidden), false, `guard source must not mention ${forbidden}`);
  }
});

test("NO BYPASS — repeated calls stay refused; there is no stateful unlock", () => {
  assertRefused("postgres://u@ep-example.neon.tech/db");
  assert.equal(
    assertLocalTestDatabaseUrl("postgres://u@127.0.0.1:5432/db"),
    "postgres://u@127.0.0.1:5432/db",
  );
  assertRefused("postgres://u@ep-example.neon.tech/db");
});

test("every destructive L1A test file applies the guard before connecting", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // Discovered, not hardcoded: a NEW destructive L1A test cannot be added
  // without the guard just because this list was not updated.
  const destructiveFiles = readdirSync(here)
    .filter((f) => f.endsWith(".test.mjs") && f !== path.basename(fileURLToPath(import.meta.url)))
    .map((f) => ({ file: f, source: readFileSync(path.join(here, f), "utf8") }))
    .filter(({ source }) => /DROP\s+(SCHEMA|TABLE)|TRUNCATE|DELETE\s+FROM/i.test(stripComments(source)));

  assert.ok(
    destructiveFiles.length >= 2,
    `expected the known destructive L1A tests to be discovered, found ${destructiveFiles.length}`,
  );
  for (const known of ["forward-migration.test.mjs", "schema-truth-verifier.test.mjs"]) {
    assert.ok(
      destructiveFiles.some((d) => d.file === known),
      `${known} is expected to contain destructive disposable-DB SQL`,
    );
  }

  for (const { file, source } of destructiveFiles) {
    assert.ok(
      source.includes("assertLocalTestDatabaseUrl"),
      `${file} must import and apply the local-database guard`,
    );
    const guardIndex = source.indexOf("assertLocalTestDatabaseUrl(");
    const connectIndex = source.search(/postgres\(|openMigrationClient\(/);
    assert.ok(guardIndex !== -1, `${file}: the guard is never called`);
    assert.ok(connectIndex !== -1, `${file}: no connection site found to order the guard against`);
    assert.ok(
      guardIndex < connectIndex,
      `${file}: the guard call must appear before the first database connection`,
    );
    // ...and the guard must sit before the destructive SQL too, never after it.
    const destructiveIndex = source.search(/DROP\s+(SCHEMA|TABLE)|TRUNCATE|DELETE\s+FROM/i);
    assert.ok(
      guardIndex < destructiveIndex,
      `${file}: the guard call must appear before any destructive SQL`,
    );
  }
});
