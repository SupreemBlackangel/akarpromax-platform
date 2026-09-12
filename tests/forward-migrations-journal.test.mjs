// A migration that is not in the journal does not run, and says nothing.
//
// `runForwardMigrations` hands the folder to drizzle's `migrate()`, which does
// not read the folder: it reads drizzle-pg-forward/meta/_journal.json and
// applies the files listed there, in that order. A .sql file added without a
// journal entry is skipped in silence — and the runner then reports success,
// prints "N applied after run" with N unchanged, and the schema-truth check
// passes, because it verifies the market tables and knows nothing about the
// migration that did not run.
//
// That happened: 0015, 0016 and 0017 sat in the folder through two clean runs
// of `npm run db:migrate:forward` without being applied. Nothing in the output
// distinguished that from having nothing to do.
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FOLDER = path.join(ROOT, "drizzle-pg-forward");
const JOURNAL = path.join(FOLDER, "meta", "_journal.json");

const journal = () => JSON.parse(fs.readFileSync(JOURNAL, "utf8"));
const sqlFiles = () =>
  fs
    .readdirSync(FOLDER)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => name.replace(/\.sql$/, ""))
    .sort();

test("every migration file is listed in the journal", () => {
  const tags = new Set(journal().entries.map((entry) => entry.tag));
  const orphans = sqlFiles().filter((file) => !tags.has(file));
  assert.deepEqual(
    orphans,
    [],
    `these .sql files will never run — drizzle applies the journal, not the folder:\n  ${orphans.join("\n  ")}`,
  );
});

test("every journal entry has a file to apply", () => {
  const files = new Set(sqlFiles());
  const missing = journal().entries.map((entry) => entry.tag).filter((tag) => !files.has(tag));
  assert.deepEqual(missing, [], `the journal names migrations that are not on disk: ${missing.join(", ")}`);
});

test("the journal is ordered, contiguous and free of duplicates", () => {
  // drizzle applies entries in array order and records them by tag. A repeated
  // idx or a gap means the ledger and the folder disagree about what ran.
  const entries = journal().entries;
  assert.deepEqual(
    entries.map((entry) => entry.idx),
    entries.map((_, index) => index),
    "idx must be 0..n-1 in order",
  );
  const tags = entries.map((entry) => entry.tag);
  assert.equal(new Set(tags).size, tags.length, "a tag appears twice");
  // The file's numeric prefix is what a reader sorts by; the journal must agree.
  assert.deepEqual(tags, [...tags].sort(), "journal order does not match the numeric prefixes");
});

test("the runner still delegates to drizzle, which is why the journal is load-bearing", () => {
  // If this ever stops being true — a runner that reads the folder itself —
  // the guard above is describing a rule that no longer exists.
  const runner = fs.readFileSync(path.join(ROOT, "lib/db/forward-migrations.ts"), "utf8");
  assert.match(runner, /await migrate\(db, \{/);
  assert.match(runner, /migrationsFolder: options\.folder \?\? FORWARD_MIGRATIONS_FOLDER/);
});
