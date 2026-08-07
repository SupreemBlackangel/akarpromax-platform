import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  OFFICE_PROTOCOL_VERSION,
  checkProtocolVersion,
  isValidScope,
  OFFICE_SCOPES,
  OFFICE_SYNC_STATUSES,
  OFFICE_NOTIFICATION_CHANNELS,
  OFFICE_AD_PLACEMENTS,
  OFFICE_DEFAULT_SCOPES,
} from "../lib/integration/constants.ts";

test("protocol version 1 is SUPPORTED for a current app", () => {
  const result = checkProtocolVersion("1.2.0", OFFICE_PROTOCOL_VERSION);
  assert.equal(result.status, "SUPPORTED");
  assert.equal(result.action, "none");
});

test("future protocol is BLOCKED", () => {
  const result = checkProtocolVersion("1.2.0", OFFICE_PROTOCOL_VERSION + 1);
  assert.equal(result.status, "BLOCKED");
});

test("older protocol is UPDATE_REQUIRED", () => {
  const result = checkProtocolVersion("1.2.0", OFFICE_PROTOCOL_VERSION - 1);
  assert.equal(result.status, "UPDATE_REQUIRED");
});

test("same protocol with old minor app is UPDATE_RECOMMENDED", () => {
  const result = checkProtocolVersion("1.1.0", OFFICE_PROTOCOL_VERSION);
  assert.equal(result.status, "UPDATE_RECOMMENDED");
});

test("scope catalog is complete and validated", () => {
  assert.ok(OFFICE_SCOPES.includes("office.sync"));
  assert.ok(OFFICE_SCOPES.includes("office.radar.read"));
  assert.ok(isValidScope("office.news.read"));
  assert.ok(!isValidScope("office.master"));
  assert.ok(OFFICE_DEFAULT_SCOPES.every((s) => isValidScope(s)));
});

test("sync lifecycle includes conflict and dead-letter states", () => {
  assert.ok(OFFICE_SYNC_STATUSES.includes("conflict"));
  assert.ok(OFFICE_SYNC_STATUSES.includes("dead_letter"));
  assert.ok(OFFICE_SYNC_STATUSES.includes("retrying"));
});

test("notification channels are in_app, email, office_desktop", () => {
  assert.deepEqual([...OFFICE_NOTIFICATION_CHANNELS].sort(), ["email", "in_app", "office_desktop"]);
});

test("office ad placements exist", () => {
  assert.ok(OFFICE_AD_PLACEMENTS.includes("office_dashboard_hero"));
  assert.ok(OFFICE_AD_PLACEMENTS.includes("office_news_inline"));
});

test("schema module defines all integration tables", async () => {
  const source = await readFile(new URL("../lib/integration/schema.ts", import.meta.url), "utf8");
  for (const table of [
    "office_devices",
    "office_pairing_codes",
    "office_device_credentials",
    "office_sync_operations",
    "office_radar_queries",
    "office_notification_rules",
    "office_notification_deliveries",
    "office_realtime_events",
    "office_news_deliveries",
  ]) {
    assert.match(source, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`), `missing ${table}`);
  }
  assert.match(source, /ALTER TABLE property_listings ADD COLUMN latitude REAL NULL/);
});
