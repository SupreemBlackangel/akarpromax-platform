/**
 * Find and repair campaigns that can never serve because their targeting names
 * values the engine's vocabularies do not contain.
 *
 * The one that bites: `page_types`. The engine's gate is
 * `ad.pageTypes.includes(ctx.pageType)`, and ctx.pageType is one of PAGE_TYPES —
 * home, listing, details, office-profile, tool-details and the rest. A campaign
 * carrying `["properties"]`, `["services"]`, `["tools"]` or `["offices"]` is
 * naming a SECTION in the page-type field. /properties resolves to page type
 * `listing`, so the gate refuses, every time, for the life of the campaign. It
 * is approved, active, inside its dates, and invisible.
 *
 * The admin route filters page_types against PAGE_TYPES_LIST today
 * (lib/ads/admin.ts), so this cannot be created through the console any more.
 * These rows predate that filter.
 *
 * The repair drops the values that are not page types and leaves the rest. When
 * every value goes, the field ends up empty, which is the correct answer rather
 * than a guess: an empty page_types means "any page type", and the campaign's
 * placement already pins it to the page family it was bought for.
 *
 * Placement and section problems are REPORTED and never rewritten. A placement
 * whose only fault is its case (`hero` vs `HERO`) looks trivial to fix and is
 * not — it decides what an advertiser is billed for, and that is a decision for
 * a person.
 *
 * Dry run (writes nothing):
 *   node --env-file=.env --import tsx scripts/repair-ad-campaign-targeting.mjs
 *
 * Apply the page_types repair only:
 *   node --env-file=.env --import tsx scripts/repair-ad-campaign-targeting.mjs --apply
 */
import postgres from "postgres";

import { AD_PLACEMENTS, PAGE_TYPES_LIST, PLATFORM_SECTIONS_REGISTRY } from "../src/constants/advertising.ts";

const APPLY = process.argv.includes("--apply");
const PAGE_TYPES = new Set(PAGE_TYPES_LIST);
const SECTIONS = new Set([...Object.keys(PLATFORM_SECTIONS_REGISTRY), "global"]);
const PLACEMENTS = new Set(Object.keys(AD_PLACEMENTS));

function parseList(value) {
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string");
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run with --env-file=.env");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require", max: 1 });

try {
  const rows = await sql`
    SELECT id, internal_name, campaign_type, status, approval_status, is_active,
           page_types, section_scopes, placements
      FROM ad_campaigns
     WHERE deleted_at IS NULL`;

  const repairs = [];
  const reports = [];

  for (const row of rows) {
    const name = row.internal_name ?? row.id;
    const servable = row.status === "active" && row.approval_status === "approved" && Number(row.is_active) === 1;

    const pageTypes = parseList(row.page_types);
    const badPageTypes = pageTypes.filter((value) => !PAGE_TYPES.has(value));
    if (badPageTypes.length) {
      repairs.push({
        id: row.id,
        name,
        servable,
        from: pageTypes,
        to: pageTypes.filter((value) => PAGE_TYPES.has(value)),
        bad: badPageTypes,
      });
    }

    const badSections = parseList(row.section_scopes).filter((value) => !SECTIONS.has(value));
    if (badSections.length) reports.push({ name, field: "section_scopes", bad: badSections });

    const badPlacements = parseList(row.placements).filter((value) => !PLACEMENTS.has(value));
    for (const value of badPlacements) {
      const upper = value.toUpperCase();
      reports.push({
        name,
        field: "placements",
        bad: [value],
        hint: PLACEMENTS.has(upper) ? `"${upper}" is a real placement — this looks like a case difference` : "no known placement",
      });
    }
  }

  console.log(`campaigns examined: ${rows.length}`);
  console.log(`page_types needing repair: ${repairs.length}\n`);
  for (const repair of repairs) {
    console.log(`  ${repair.servable ? "APPROVED+ACTIVE" : "not servable   "}  ${repair.name}`);
    console.log(`    page_types ${JSON.stringify(repair.from)} -> ${JSON.stringify(repair.to)}   (not page types: ${repair.bad.join(", ")})`);
  }

  if (reports.length) {
    console.log(`\nreported only, not changed (${reports.length}):`);
    for (const report of reports) {
      console.log(`  ${report.name}: ${report.field} = ${report.bad.join(", ")}${report.hint ? `  — ${report.hint}` : ""}`);
    }
  }

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to write the page_types repair.");
  } else {
    for (const repair of repairs) {
      await sql`
        UPDATE ad_campaigns
           SET page_types = ${JSON.stringify(repair.to)}, updated_at = CURRENT_TIMESTAMP
         WHERE id = ${repair.id}`;
    }
    console.log(`\nApplied ${repairs.length} repair(s). The engine caches servable campaigns for 30s.`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
