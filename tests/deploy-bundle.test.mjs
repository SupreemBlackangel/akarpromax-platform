import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * What gets shipped to the production host.
 *
 * `output: 'standalone'` traces the project directory, and this repository
 * holds a great deal that has nothing to do with a web server. Measured on the
 * running production host before this was fixed:
 *
 *   .git           106 MB   full repository history, `git log` worked there
 *   devexpress     161 MB   a licensed desktop component library
 *   AkarApp_LIVE    86 MB   the compiled desktop app and two SQLite databases
 *   dist            47 MB   a stale build
 *   .vs            7.2 MB   local IDE state
 *
 * None of it was reachable over HTTP -- every path answered 404, checked
 * against production -- so nothing was disclosed. But the whole source tree
 * and its history on a public-facing server turns any file-read primitive into
 * a total one, and 300+ MB was uploaded on every single deploy, which is why
 * deploys were exceeding ten minutes.
 *
 * 539 MB -> 110 MB.
 */

const config = await readFile(path.join(ROOT, "next.config.js"), "utf8");

test("the deploy bundle excludes the repository history", () => {
  // The one that matters most. Everything else on the list is weight.
  assert.match(config, /'\.\/\.git\/\*\*'/, ".git must never be traced into the deploy");
});

test("the deploy bundle excludes the desktop app and its licensed libraries", () => {
  for (const excluded of ["./devexpress/**", "./AkarApp_LIVE/**", "./dist/**", "./.vs/**"]) {
    assert.ok(
      config.includes(`'${excluded}'`),
      `${excluded} belongs to the desktop build, not the web server`,
    );
  }
});

test("tessdata is NOT excluded, because OCR reads it from disk at runtime", async () => {
  // This was on the first draft of the exclusion list. lib/land/ocr/tessdata.ts
  // resolves it from process.cwd(), so excluding it breaks OCR on the server
  // and nowhere else -- the worst shape a bug can have.
  assert.ok(!config.includes("'./tessdata/**'"), "tessdata must stay in the bundle");

  const resolver = await readFile(path.join(ROOT, "lib/land/ocr/tessdata.ts"), "utf8");
  assert.match(resolver, /process\.cwd\(\)/, "if this stops reading from cwd, revisit the exclusion");
});

test("the migrations folder is NOT excluded, because the migrator reads the .sql files", async () => {
  assert.ok(!/'\.\/drizzle[^']*\*\*'/.test(config), "migration folders must stay in the bundle");

  const migrations = await readFile(path.join(ROOT, "lib/db/forward-migrations.ts"), "utf8");
  assert.match(migrations, /FORWARD_MIGRATIONS_FOLDER = "drizzle-pg-forward"/);
});

test("the exclusion list is explained where it is written", () => {
  // A bare list of globs invites someone to add tessdata back. The reasoning
  // for each side of the decision is in the file, and this keeps it there.
  const section = config.slice(config.indexOf("outputFileTracingExcludes") - 1200);
  assert.match(section, /NOT excluded/, "say why the dangerous ones were kept");
  assert.match(section, /tessdata/);
  assert.match(section, /drizzle-pg-forward/);
});
