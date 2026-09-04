#!/usr/bin/env node
/**
 * Seed the location catalogue for the countries that had none.
 *
 * Idempotent by construction: every row is looked up by (parent, code) before
 * it is inserted, so a second run inserts nothing and reports zero. There is no
 * DELETE and no UPDATE in this script at all -- it can add a missing city, and
 * it cannot alter or remove one that exists. Saudi Arabia is skipped entirely.
 *
 *   node scripts/seed-geo-catalogue.mjs --dry-run   # count, change nothing
 *   node scripts/seed-geo-catalogue.mjs             # insert
 *
 * DATABASE_URL must be set. Run it on the server; a statement-per-SSH-hop from
 * a laptop is what got this machine temporarily blocked once already.
 */

import pg from "pg";
import { CATALOGUE, SKIP } from "./geo-catalogue.mjs";

const DRY = process.argv.includes("--dry-run");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query("SET search_path = public, akarpromax");

const added = { governorates: 0, cities: 0, districts: 0 };
const skipped = { governorates: 0, cities: 0, districts: 0 };
const missingCountries = [];

/** Find a child by code under a parent, or insert it. Returns its id. */
async function ensure(table, parentColumn, parentId, row, order) {
  const found = await client.query(
    `SELECT id FROM ${table} WHERE ${parentColumn} = $1 AND lower(code) = lower($2) LIMIT 1`,
    [parentId, row.code],
  );
  if (found.rows.length > 0) {
    skipped[table] += 1;
    return found.rows[0].id;
  }
  if (DRY) {
    added[table] += 1;
    return null;
  }
  const inserted = await client.query(
    `INSERT INTO ${table} (${parentColumn}, code, name_ar, name_en, is_active, display_order)
     VALUES ($1, $2, $3, $4, true, $5) RETURNING id`,
    [parentId, row.code, row.ar, row.en, order],
  );
  added[table] += 1;
  return inserted.rows[0].id;
}

try {
  if (!DRY) await client.query("BEGIN");

  for (const [countryCode, governorates] of Object.entries(CATALOGUE)) {
    if (SKIP.has(countryCode)) continue;

    const country = await client.query(
      `SELECT id FROM countries WHERE lower(code) = lower($1) LIMIT 1`,
      [countryCode],
    );
    if (country.rows.length === 0) {
      // Adding a country is a bigger decision than adding a city -- it appears
      // in every country selector on the platform. Reported, not invented.
      missingCountries.push(countryCode);
      continue;
    }
    const countryId = country.rows[0].id;

    for (const [gIndex, governorate] of governorates.entries()) {
      const governorateId = await ensure("governorates", "country_id", countryId, governorate, gIndex);
      if (!governorateId) continue; // dry run, or nothing to descend into

      for (const [cIndex, city] of (governorate.cities ?? []).entries()) {
        const cityId = await ensure("cities", "governorate_id", governorateId, city, cIndex);
        if (!cityId) continue;

        for (const [dIndex, district] of (city.districts ?? []).entries()) {
          await ensure("districts", "city_id", cityId, district, dIndex);
        }
      }
    }
  }

  if (!DRY) await client.query("COMMIT");
} catch (error) {
  if (!DRY) await client.query("ROLLBACK");
  console.error("failed, nothing was written:", error.message);
  await client.end();
  process.exit(1);
}

console.log(DRY ? "DRY RUN — nothing was written" : "committed");
console.log(`  governorates  added ${added.governorates}  already present ${skipped.governorates}`);
console.log(`  cities        added ${added.cities}  already present ${skipped.cities}`);
console.log(`  districts     added ${added.districts}  already present ${skipped.districts}`);
if (missingCountries.length > 0) {
  console.log(`  countries not in the registry, skipped: ${missingCountries.join(", ")}`);
}

await client.end();
