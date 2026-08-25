// L0 harness test: guards the automatic release-test discovery runner.
// This test protects the release gate itself — it must never silently shrink
// back to a hard-coded subset of test files.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { discoverTestEntries } from "../scripts/run-release-tests.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("discovery finds every *.test.* entry under tests/", () => {
  const { entries } = discoverTestEntries();

  const expected = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "helpers" || e.name.startsWith(".")) continue;
        walk(abs);
      } else if (/\.(test|spec)\.(mjs|cjs|js|jsx|ts|tsx)$/i.test(e.name)) {
        expected.push(path.relative(ROOT, abs).split(path.sep).join("/"));
      }
    }
  };
  walk(path.join(ROOT, "tests"));

  for (const file of expected) assert.ok(entries.includes(file), `missing entry: ${file}`);
});

test("discovery keeps the legacy services-e2e entry", () => {
  const { entries } = discoverTestEntries();
  assert.ok(entries.includes("tests/services-e2e.mjs"));
});

test("discovery excludes tests/helpers support modules", () => {
  const { entries } = discoverTestEntries();
  assert.equal(entries.filter((e) => e.startsWith("tests/helpers/")).length, 0);
});

test("discovery is deterministic and free of duplicates", () => {
  const a = discoverTestEntries().entries;
  const b = discoverTestEntries().entries;
  assert.deepEqual(a, b);
  assert.deepEqual(a, [...a].sort());
  assert.equal(new Set(a).size, a.length);
});

test("release gate is materially larger than the old hard-coded 19-file list", () => {
  const { entries } = discoverTestEntries();
  assert.ok(entries.length >= 70, `expected >= 70 discovered entries, got ${entries.length}`);
});

test("every discovered entry exists on disk", () => {
  const { entries } = discoverTestEntries();
  for (const entry of entries) {
    assert.ok(fs.existsSync(path.join(ROOT, entry)), `missing file: ${entry}`);
  }
});
