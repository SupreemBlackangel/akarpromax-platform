// The audit screen must show the decisions the platform actually records.
//
// It showed none of them. There are two stores: `audit_logs`, written by
// lib/services/audit.ts for every services and ads decision — provider
// approvals, rejections, suspensions, listing verdicts, campaign approvals —
// and `audit_events`, written by the Drizzle side for authentication. The
// screen was built on the second and never connected to the first, so an
// administrator asking "who approved this provider" was looking at a table
// that has never held the answer.
//
// There is no seam for injecting the runtime database into these route
// handlers, so these assertions read the route. They are written against the
// specific shapes that were wrong, not against prose.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (rel) => readFile(new URL(`../${rel}`, import.meta.url), "utf8");

test("the audit read covers the store that holds services and ads decisions", async () => {
  const route = await read("app/api/admin/audit/route.ts");
  assert.match(route, /FROM audit_logs/, "audit_logs is where every moderation decision is written");
  assert.match(route, /FROM audit_events/, "authentication events must not be dropped in the process");
});

test("the two stores are read with their own columns, not one shape forced on both", async () => {
  const route = await read("app/api/admin/audit/route.ts");
  // audit_logs names the actor actor_user_id and the action `action`;
  // audit_events names them user_id and event_type. Reading either with the
  // other's column names is how a UNION written in haste returns nothing.
  assert.match(route, /SELECT id, actor_user_id, action, entity_type, entity_id, metadata, ip_address, created_at FROM audit_logs/);
  assert.match(route, /SELECT id, user_id, event_type, ip_address, user_agent, detail, created_at FROM audit_events/);
});

test("entity filtering happens in SQL where the columns are real", async () => {
  const route = await read("app/api/admin/audit/route.ts");
  assert.match(route, /if \(entityType\) add\("entity_type = \?", entityType\)/);
  assert.match(route, /if \(entityId\) add\("entity_id = \?", entityId\)/);
});

test("each row says which store it came from", async () => {
  // Without it the screen cannot tell an authentication event from a
  // moderation decision, and the two read very differently.
  const route = await read("app/api/admin/audit/route.ts");
  assert.match(route, /source: "services" as const/);
  assert.match(route, /source: "auth" as const/);
  assert.match(route, /AUDIT_SOURCES = \["all", "services", "auth"\]/);
});

test("one unreadable store does not blank the other", async () => {
  const route = await read("app/api/admin/audit/route.ts");
  const catches = route.match(/catch \{/g) ?? [];
  assert.ok(catches.length >= 2, "each read is guarded on its own");
  assert.match(route, /return \{ rows: \[\], total: 0 \};/);
});

test("the merged page is ordered by time across both stores", async () => {
  const route = await read("app/api/admin/audit/route.ts");
  assert.match(route, /const windowSize = limit \+ offset/, "each store must offer enough rows for the merge to be exact");
  assert.match(route, /\.sort\(\(a, b\) => \(a\.created_at < b\.created_at \? 1 :/);
  assert.match(route, /\.slice\(offset, offset \+ limit\)/);
});

test("the event filter offers the actions that exist, not a list written by hand", async () => {
  const route = await read("app/api/admin/audit/route.ts");
  assert.match(route, /SELECT DISTINCT action AS name FROM audit_logs/);
  assert.match(route, /SELECT DISTINCT event_type AS name FROM audit_events/);

  const client = await read("app/admin/audit/audit-admin-client.tsx");
  assert.match(client, /\(data\?\.actions \?\? \[\]\)\.map/);
  // The hard-coded list named events nothing emits; it must not come back.
  assert.doesNotMatch(client, /const EVENT_TYPES = \[/);
  assert.doesNotMatch(client, /"OFFICE_PAIRING_STARTED"/);
});

test("the decisions an administrator most needs to trace are written to audit_logs", async () => {
  // If these ever stopped being written, the screen would be honest and empty
  // rather than wrong — but the point of the fix is that they ARE written.
  const marketplace = await read("lib/services/marketplace.ts");
  assert.match(marketplace, /action: `service_provider\.status\.\$\{status\}`/);

  const core = await read("lib/services/core.ts");
  assert.match(core, /action: `service_listing\.status\.\$\{status\}`/);

  const approve = await read("app/api/admin/ads/approve/route.ts");
  assert.match(approve, /"ad\.approval"/);

  const audit = await read("lib/services/audit.ts");
  assert.match(audit, /INSERT INTO audit_logs/);
});
