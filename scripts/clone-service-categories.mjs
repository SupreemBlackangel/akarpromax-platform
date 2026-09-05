#!/usr/bin/env node
/**
 * Give a country the service taxonomy, by copying another country's.
 *
 * The services marketplace keys every category to a country_code, and prod has
 * 53 categories under OM and none under any other country — so
 * /api/service-categories?country=SA returns {"categories":[]} and
 * /service-requests/new shows a requester no services to ask for.
 *
 * Idempotent and insert-only by construction: every row is looked up by
 * (country_code, code) — the table's own unique key — before it is inserted.
 * There is no UPDATE and no DELETE here, so a category a country has already
 * edited is never overwritten, and a second run inserts nothing.
 *
 * The tree is copied parents-first so a child's parent_id always resolves.
 *
 *   node scripts/clone-service-categories.mjs --from OM --to SA --dry-run
 *   node scripts/clone-service-categories.mjs --from OM --to SA
 *
 * DATABASE_URL must be set. Run it on the server.
 */

import pg from "pg";

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && argv[at + 1] && !argv[at + 1].startsWith("--") ? argv[at + 1] : fallback;
};

const DRY = argv.includes("--dry-run");
const FROM = (flag("from", "OM") ?? "OM").toUpperCase();
const TO = (flag("to") ?? "").toUpperCase();

if (!TO) {
  console.error("Usage: clone-service-categories.mjs --from OM --to SA [--dry-run]");
  process.exit(1);
}
if (TO === FROM) {
  console.error("--from and --to must differ.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query("SET search_path = public, akarpromax");

/** The columns carried over. Anything else keeps the table's default. */
const COPIED = [
  "code", "sort_order", "is_active", "name_ar", "name_en", "name_tr",
  "description_ar", "description_en", "description_tr", "icon", "image_url",
  "requires_license", "requires_visit", "price_min", "price_max",
  "dynamic_fields", "is_featured", "booking_mode", "badge_ar", "badge_en",
];

let inserted = 0;
let present = 0;

try {
  const { rows: source } = await client.query(
    `SELECT id, parent_id, ${COPIED.join(", ")} FROM service_categories WHERE country_code = $1 ORDER BY parent_id NULLS FIRST, sort_order`,
    [FROM],
  );
  if (source.length === 0) {
    console.error(`No categories under ${FROM} — nothing to copy.`);
    process.exit(1);
  }

  const { rows: existing } = await client.query(
    "SELECT code, id FROM service_categories WHERE country_code = $1",
    [TO],
  );
  // code -> id in the target country, filled as we go so children find their parent.
  const idByCode = new Map(existing.map((row) => [row.code, row.id]));
  const codeById = new Map(source.map((row) => [row.id, row.code]));

  if (!DRY) await client.query("BEGIN");

  // Parents first: a row whose parent_id is null, then the rest.
  const ordered = [...source].sort((a, b) => Number(Boolean(a.parent_id)) - Number(Boolean(b.parent_id)));

  for (const row of ordered) {
    if (idByCode.has(row.code)) { present += 1; continue; }

    let parentId = null;
    if (row.parent_id) {
      const parentCode = codeById.get(row.parent_id);
      parentId = parentCode ? idByCode.get(parentCode) ?? null : null;
      if (!parentId) {
        console.warn(`  skipped ${row.code}: its parent is not in ${TO} yet`);
        continue;
      }
    }

    const id = `svc-${TO}-${row.code}`;
    const values = COPIED.map((column) => row[column]);
    if (!DRY) {
      await client.query(
        `INSERT INTO service_categories (id, parent_id, country_code, ${COPIED.join(", ")})
         VALUES ($1, $2, $3, ${COPIED.map((_, i) => `$${i + 4}`).join(", ")})`,
        [id, parentId, TO, ...values],
      );
    }
    idByCode.set(row.code, id);
    inserted += 1;
  }

  if (!DRY) await client.query("COMMIT");
} catch (error) {
  if (!DRY) await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

console.log(DRY ? "DRY RUN — nothing was written" : "committed");
console.log(`  ${FROM} -> ${TO}: added ${inserted}, already present ${present}`);
