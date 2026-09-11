/**
 * Repair ad campaigns created by the public "advertise with us" form before the
 * intake route learned the engine's vocabulary.
 *
 * POST /api/ads/request used to write the page-layout family key into two
 * dimensions that compare against different vocabularies, and pinned every
 * request to one class of screen:
 *
 *   section_scopes = ["company-detail"]   section gate compares PLATFORM_SECTIONS
 *   page_types     = ["company-detail"]   page-type gate compares PAGE_TYPES
 *   devices        = ["desktop"]          phones and tablets excluded
 *
 * Those rows are approved, active, paid for, and can never serve. The route no
 * longer writes them that way; this repairs the ones already stored.
 *
 * The section is derived from the row's own placement, not from the old
 * section_scopes value — the placement is the field that was always correct.
 *
 * Dry run (prints what it would change, touches nothing):
 *   node --env-file=.env --import tsx scripts/repair-ad-request-targeting.mjs
 *
 * Apply:
 *   node --env-file=.env --import tsx scripts/repair-ad-request-targeting.mjs --apply
 */
import postgres from "postgres";

import { STANDARD_PUBLIC_AD_FAMILY_DEFINITIONS } from "../src/config/standard-public-ad-registry.ts";
import { PAGE_TYPES_LIST, PLATFORM_SECTIONS_REGISTRY } from "../src/constants/advertising.ts";

const APPLY = process.argv.includes("--apply");
const VALID_SECTIONS = new Set(Object.keys(PLATFORM_SECTIONS_REGISTRY));
const VALID_PAGE_TYPES = new Set(PAGE_TYPES_LIST);

/** Longest prefix wins: web_company_detail_* must not resolve as web_companies_*. */
const FAMILIES_BY_PREFIX = Object.values(STANDARD_PUBLIC_AD_FAMILY_DEFINITIONS)
  .map((family) => ({ prefix: family.prefix, section: family.section }))
  .sort((a, b) => b.prefix.length - a.prefix.length);

function sectionForPlacement(placement) {
  const match = FAMILIES_BY_PREFIX.find((family) => placement.startsWith(`${family.prefix}_`));
  return match ? match.section : null;
}

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
    SELECT id, internal_name, placements, section_scopes, page_types, devices, status, approval_status
      FROM ad_campaigns
     WHERE campaign_type = 'request' AND deleted_at IS NULL`;

  const repairs = [];
  const skipped = [];

  for (const row of rows) {
    const placements = parseList(row.placements);
    const placement = placements[0];
    const section = placement ? sectionForPlacement(placement) : null;
    if (!section) {
      // A row whose placement names no known family is left alone and reported:
      // guessing its section is how the original bug was written.
      skipped.push({ id: row.id, why: `no family matches placement ${placement ?? "(none)"}` });
      continue;
    }

    const sections = parseList(row.section_scopes);
    const pageTypes = parseList(row.page_types);
    const devices = parseList(row.devices);

    const badSection = sections.some((value) => !VALID_SECTIONS.has(value));
    const badPageType = pageTypes.some((value) => !VALID_PAGE_TYPES.has(value));
    const desktopOnly = devices.length === 1 && devices[0] === "desktop";
    if (!badSection && !badPageType && !desktopOnly) continue;

    repairs.push({
      id: row.id,
      name: row.internal_name,
      placement,
      from: { sectionScopes: sections, pageTypes, devices },
      to: {
        sectionScopes: [section],
        pageTypes: badPageType ? [] : pageTypes,
        devices: desktopOnly ? ["desktop", "tablet", "mobile"] : devices,
      },
    });
  }

  console.log(`requests examined: ${rows.length}`);
  console.log(`needing repair:    ${repairs.length}`);
  for (const repair of repairs) {
    console.log(`  ${repair.id}  ${repair.name ?? ""}`);
    console.log(`    placement     ${repair.placement}`);
    console.log(`    sectionScopes ${JSON.stringify(repair.from.sectionScopes)} -> ${JSON.stringify(repair.to.sectionScopes)}`);
    console.log(`    pageTypes     ${JSON.stringify(repair.from.pageTypes)} -> ${JSON.stringify(repair.to.pageTypes)}`);
    console.log(`    devices       ${JSON.stringify(repair.from.devices)} -> ${JSON.stringify(repair.to.devices)}`);
  }
  for (const skip of skipped) console.log(`  SKIPPED ${skip.id}: ${skip.why}`);

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to write these changes.");
  } else {
    for (const repair of repairs) {
      await sql`
        UPDATE ad_campaigns
           SET section_scopes = ${JSON.stringify(repair.to.sectionScopes)},
               page_types     = ${JSON.stringify(repair.to.pageTypes)},
               devices        = ${JSON.stringify(repair.to.devices)},
               updated_at     = CURRENT_TIMESTAMP
         WHERE id = ${repair.id}`;
    }
    console.log(`\nApplied ${repairs.length} repair(s).`);
    console.log("The engine caches servable campaigns for 30s; the change is live after that.");
  }
} finally {
  await sql.end({ timeout: 5 });
}
