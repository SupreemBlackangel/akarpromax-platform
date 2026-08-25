// AkarProMax L1C-0.5A — the deprecated Services Drizzle model cannot become the
// default migration-authoring path again.
//
// `drizzle.config.ts` still lists lib/db/schemas/services-schema.ts (kept for
// archaeology). Running `drizzle-kit generate` against it would author DDL that
// recreates the duplicate Services truth L1C-0 removed. Automatic generation
// from drizzle.forward.config.ts is disabled too (no snapshot on purpose), so
// `npm run db:generate` must fail fast rather than generate anything.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFile(path.join(ROOT, rel), "utf8");

test("npm run db:generate does not invoke drizzle-kit generate", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const script = pkg.scripts["db:generate"];
  assert.ok(script, "db:generate must still exist so the guard is what developers hit");
  assert.doesNotMatch(script, /drizzle-kit\s+generate/, "db:generate must not reach drizzle-kit");
  assert.match(script, /guard-db-generate\.mjs/, "db:generate must run the guard");
});

test("the guard fails fast and explains the reviewed forward-migration process", () => {
  let failed = false;
  let stderr = "";
  try {
    execFileSync(process.execPath, [path.join(ROOT, "scripts/guard-db-generate.mjs")], { encoding: "utf8" });
  } catch (error) {
    failed = true;
    stderr = String(error.stderr ?? "");
  }
  assert.equal(failed, true, "the guard must exit non-zero");
  assert.match(stderr, /db:generate is disabled/);
  assert.match(stderr, /lib\/db\/schemas\/services-schema\.ts/, "it must name the deprecated model");
  assert.match(stderr, /db:migrate:forward/, "it must point at the supported process");
});

test("no npm script generates migrations from the default drizzle config", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const offenders = Object.entries(pkg.scripts)
    .filter(([, command]) => /drizzle-kit\s+generate/.test(command))
    .filter(([, command]) => !/--config\s+drizzle\.mysql\.config\.ts/.test(command))
    .map(([name]) => name);
  assert.deepEqual(offenders, [], "only the MySQL config (which has no Services schema) may still generate");
});

test("the trusted forward migration config excludes the deprecated Services model", async () => {
  const forward = await read("drizzle.forward.config.ts");
  assert.doesNotMatch(forward, /services-schema/, "Services has not entered the forward baseline yet");
  assert.match(forward, /geo-schema\.ts/);
  assert.match(forward, /currency-schema\.ts/);
});

test("the deprecated Services model is preserved but still marked non-canonical", async () => {
  const deprecated = await read("lib/db/schemas/services-schema.ts");
  assert.match(deprecated, /NOT CANONICAL SERVICES PERSISTENCE/);
  const config = await read("drizzle.config.ts");
  assert.match(config, /services-schema\.ts/, "drizzle.config.ts is kept for archaeology, not deleted");
});
