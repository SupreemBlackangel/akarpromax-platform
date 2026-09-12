// A column the ad engine reads must exist wherever the table is created.
//
// Five did not. `loadCreatives` selects alt_text_ar, alt_text_en, alt_text_tr,
// media_width and media_height from ad_creatives on every page load. The
// table's CREATE — in lib/content-schema.ts for the D1/Postgres path and
// lib/mysql-runtime.ts for MySQL — named none of them. They existed only in
// AD_CREATIVE_NEW_COLUMNS, an ALTER list run by `ensureAdSchema`.
//
// And `ensureAdSchema` is reached from three callers: POST /api/admin/ads,
// the public POST /api/ads/request, and `ensureContentSchema` — which returns
// at its first line on any database already stamped CONTENT_SCHEMA_VERSION, as
// production has been since v3. So a column the READ path cannot run without
// was created by a WRITE path. It has worked because an ad was posted at some
// point; nothing orders those two events.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (rel) => readFile(new URL(`../${rel}`, import.meta.url), "utf8");

/** The columns the engine names in its SELECT, read from the engine itself. */
async function creativeColumnsTheEngineReads() {
  const engine = await read("lib/ads/engine.ts");
  const select = /SELECT([\s\S]*?)FROM ad_creatives/.exec(engine);
  assert.ok(select, "loadCreatives must still select from ad_creatives");
  return select[1]
    .split(",")
    .map((part) => part.trim())
    .filter((part) => /^[a-z_][a-z0-9_]*$/.test(part));
}

/** The column names inside one `CREATE TABLE IF NOT EXISTS <table> (...)`. */
function createdColumns(source, table) {
  const create = new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(([\\s\\S]*?)\\n\\s*\\)`).exec(source);
  assert.ok(create, `${table} must still be created`);
  return new Set(
    create[1]
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("--"))
      .map((line) => line.split(/\s+/)[0])
      .filter((name) => /^[a-z_][a-z0-9_]*$/.test(name)),
  );
}

test("the engine still reads the five columns this is about", async () => {
  // If the SELECT ever loses them the rest of this file would pass vacuously.
  const columns = await creativeColumnsTheEngineReads();
  for (const column of ["alt_text_ar", "alt_text_en", "alt_text_tr", "media_width", "media_height"]) {
    assert.ok(columns.includes(column), `the engine no longer reads ${column}; this test needs revisiting`);
  }
});

test("every column the engine reads is in the D1/Postgres CREATE", async () => {
  const columns = await creativeColumnsTheEngineReads();
  const created = createdColumns(await read("lib/content-schema.ts"), "ad_creatives");
  const missing = columns.filter((column) => !created.has(column));
  assert.deepEqual(missing, [], `lib/content-schema.ts creates ad_creatives without: ${missing.join(", ")}`);
});

test("every column the engine reads is in the MySQL CREATE", async () => {
  const columns = await creativeColumnsTheEngineReads();
  const created = createdColumns(await read("lib/mysql-runtime.ts"), "ad_creatives");
  const missing = columns.filter((column) => !created.has(column));
  assert.deepEqual(missing, [], `lib/mysql-runtime.ts creates ad_creatives without: ${missing.join(", ")}`);
});

test("the five are in the versioned schema, not only in a runtime ALTER list", async () => {
  const migration = await read("drizzle-pg-forward/0017_ad_creative_media_metadata.sql");
  for (const column of ["alt_text_ar", "alt_text_en", "alt_text_tr", "media_width", "media_height"]) {
    assert.match(
      migration,
      new RegExp(`ADD COLUMN IF NOT EXISTS ${column}\\b`),
      `${column} must reach an existing database through a migration, not through a POST handler`,
    );
  }
});

test("the reason this mattered is still true: the coordinator short-circuits", async () => {
  // If ensureContentSchema ever stops returning early, ensureAdSchema would run
  // on every boot and the ALTER list would be enough on its own. It does not,
  // and the guard above is what stands in for it.
  const content = await read("lib/content-schema.ts");
  assert.match(content, /if \(await isContentSchemaApplied\(db\)\.catch\(\(\) => false\)\) return;/);
  assert.match(content, /await ensureAdSchema\(db\);/, "the coordinator call sits after that return");
});

test("the read path does not ensure the schema it depends on", async () => {
  // Stated so the day someone adds ensureAdSchema to the match routes, this
  // test says the reasoning has changed rather than silently agreeing.
  for (const route of ["app/api/ads/match-batch/route.ts", "app/api/ads/match/route.ts"]) {
    const source = await read(route).catch(() => null);
    if (!source) continue;
    assert.doesNotMatch(
      source,
      /ensureAdSchema/,
      `${route} now ensures the ad schema; the columns no longer depend on a write path and this file should be revisited`,
    );
  }
});
