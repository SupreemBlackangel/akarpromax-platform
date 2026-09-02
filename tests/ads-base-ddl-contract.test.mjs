import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

/**
 * The existing schema-contract test unions the base DDL with the ADD COLUMN
 * retrofits, so a column present ONLY as an ALTER passes it. `domains` was
 * exactly that: selected by queryActiveAds but absent from both base
 * CREATE TABLE statements, so a freshly bootstrapped database failed every ad
 * request with `column "domains" does not exist`.
 *
 * This test deliberately checks the BASE DDL alone.
 */

function baseAdCampaignsDdl(source) {
  const start = source.indexOf("CREATE TABLE IF NOT EXISTS ad_campaigns");
  assert.notEqual(start, -1, "ad_campaigns CREATE TABLE should exist");
  return source.slice(start, source.indexOf("`", start));
}

async function selectedColumns() {
  const engine = await readFile(new URL("../lib/ads/engine.ts", import.meta.url), "utf8");
  const match = engine.match(/queryActiveAds[\s\S]*?`SELECT ([\s\S]*?)FROM ad_campaigns/);
  assert.ok(match, "queryActiveAds SELECT should be findable");
  return match[1].replace(/\n/g, " ").split(",").map((c) => c.trim()).filter(Boolean);
}

function declaresColumn(ddl, column) {
  return new RegExp(String.raw`^\s*${column}\s`, "m").test(ddl);
}

for (const file of ["../lib/content-schema.ts", "../lib/mysql-runtime.ts"]) {
  test(`every column the engine selects exists in the base DDL of ${file.replace("../lib/", "")}`, async () => {
    const ddl = baseAdCampaignsDdl(await readFile(new URL(file, import.meta.url), "utf8"));
    const columns = await selectedColumns();
    assert.ok(columns.length > 50, `expected the full projection, got ${columns.length}`);

    const missing = columns.filter((column) => !declaresColumn(ddl, column));
    assert.deepEqual(
      missing,
      [],
      `read by the engine but only present as an ADD COLUMN retrofit, so a fresh database cannot serve ads: ${missing.join(", ")}`,
    );
  });
}
