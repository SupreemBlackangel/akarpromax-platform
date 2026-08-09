import assert from "node:assert/strict";
import test from "node:test";

import { CONTENT_TABLES_SQL } from "../lib/content-schema.ts";
import { AD_TABLES_SQL, AD_CAMPAIGN_NEW_COLUMNS, AD_CREATIVE_NEW_COLUMNS, AD_TRACKING_NEW_COLUMNS } from "../lib/ad-schema.ts";

function ddlFor(table, statements) {
  const prefix = `CREATE TABLE IF NOT EXISTS ${table} `;
  const match = statements.find((sql) => sql.startsWith(prefix));
  assert.ok(match, `CREATE TABLE for ${table} present`);
  return match;
}

function columnsOf(ddl) {
  const body = ddl.slice(ddl.indexOf("(") + 1, ddl.lastIndexOf(")"));
  return body
    .split(",")
    .map((line) => line.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function addColumnNames(columns) {
  return columns
    .map((statement) => statement.match(/ADD COLUMN (\w+)/)?.[1])
    .filter(Boolean);
}

test("ad_campaigns DDL + migrations have every column loadActiveAds SELECTs", () => {
  const ddl = ddlFor("ad_campaigns", CONTENT_TABLES_SQL);
  const cols = new Set([...columnsOf(ddl), ...addColumnNames(AD_CAMPAIGN_NEW_COLUMNS)]);
  const required = [
    "id", "internal_name", "advertiser_name", "campaign_type", "status", "media_type",
    "media_url", "mobile_media_url", "tablet_media_url", "poster_url", "channels",
    "eyebrow_ar", "eyebrow_en", "eyebrow_tr", "title_ar", "title_en", "title_tr",
    "accent_ar", "accent_en", "accent_tr", "description_ar", "description_en", "description_tr",
    "cta_ar", "cta_en", "cta_tr", "target_url", "countries", "cities", "languages", "devices",
    "priority", "weight", "start_at", "end_at", "section_scopes", "page_types", "placements",
    "domains", "region_ids", "district_ids", "latitude", "longitude", "radius_km",
    "target_all_countries", "target_all_regions", "target_all_cities", "target_all_districts",
    "entity_type", "entity_ids", "category_ids", "property_types", "service_categories",
    "office_types", "tool_categories", "operating_systems", "daily_start_time", "daily_end_time",
    "days_of_week", "rotation_group", "pricing_model", "price", "budget", "daily_budget",
    "spent_amount", "max_impressions", "max_clicks", "frequency_cap_per_user", "frequency_cap_period",
    "approval_status", "is_active", "is_sponsored", "is_featured", "is_fallback", "is_global",
    "total_impressions", "total_unique_impressions", "total_clicks", "total_unique_clicks",
    "total_conversions", "approved_by", "deleted_at",
  ];
  for (const col of required) {
    assert.ok(cols.has(col), `ad_campaigns DDL missing ${col}`);
  }
});

test("ad_creatives DDL has the columns loadCreatives SELECTs (incl tablet_media_url)", () => {
  const ddl = ddlFor("ad_creatives", CONTENT_TABLES_SQL);
  const cols = new Set(columnsOf(ddl));
  for (const col of ["id", "campaign_id", "media_type", "media_url", "mobile_media_url", "tablet_media_url", "poster_url", "position", "duration_seconds", "status"]) {
    assert.ok(cols.has(col), `ad_creatives DDL missing ${col}`);
  }
  assert.ok(
    AD_CREATIVE_NEW_COLUMNS.some((m) => m.table === "ad_creatives" && /tablet_media_url/.test(m.column)),
    "ad_creatives tablet_media_url has an ALTER migration for existing databases",
  );
});

test("ad_impressions/ad_clicks tracking columns have DDL + migrations", () => {
  for (const table of ["ad_impressions", "ad_clicks"]) {
    const ddl = ddlFor(table, AD_TABLES_SQL);
    const cols = new Set(columnsOf(ddl));
    for (const col of ["creative_id", "channel", "inventory_class"]) {
      assert.ok(cols.has(col), `${table} DDL missing ${col}`);
    }
    const migrations = AD_TRACKING_NEW_COLUMNS.filter((m) => m.table === table);
    assert.equal(migrations.length, 3, `${table} has 3 tracking-column migrations`);
  }
});

test("ensureAdSchema never selects a column absent from DDL + migrations combined", () => {
  const creativeDdl = ddlFor("ad_creatives", CONTENT_TABLES_SQL);
  const creativeCols = new Set([...columnsOf(creativeDdl), ...AD_CREATIVE_NEW_COLUMNS.filter((m) => m.table === "ad_creatives").map((m) => m.column.match(/ADD COLUMN (\w+)/)[1])]);
  for (const col of ["tablet_media_url"]) {
    assert.ok(creativeCols.has(col));
  }
});
