import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createInMemoryDb } from "./helpers/in-memory-db.mjs";
import { DbRealtimeTransport, UnsupportedRealtimeTransport, formatSse } from "../lib/integration/realtime.ts";

test("DbRealtimeTransport publishes and replays scoped events", async () => {
  const db = createInMemoryDb();
  const transport = new DbRealtimeTransport(db);
  assert.equal(transport.supported, true);

  await transport.publish({ eventId: "e-1", eventType: "OFFICE_RADAR_MATCH", scope: "sponsor", sponsorId: "office@akarpromax.com", payload: { count: 3 } });
  await transport.publish({ eventId: "e-2", eventType: "OFFICE_NEW_NEWS", scope: "global" });

  const stored = db.dump("office_realtime_events");
  assert.equal(stored.length, 2);

  const replayed = await transport.replay({ sponsorId: "office@akarpromax.com", officeId: null });
  const ids = replayed.map((e) => e.eventId).sort();
  assert.deepEqual(ids, ["e-1", "e-2"]);
  const radar = replayed.find((e) => e.eventId === "e-1");
  assert.deepEqual(radar.payload, { count: 3 });
});

test("cursor replay returns only events after the anchor (seeded rows)", async () => {
  const db = createInMemoryDb();
  db.seed("office_realtime_events", [
    { id: "row-1", event_id: "e-1", event_type: "T1", scope: "global", sponsor_id: null, office_id: null, payload: null, created_at: "2026-08-07 10:00:00" },
    { id: "row-2", event_id: "e-2", event_type: "T2", scope: "global", sponsor_id: null, office_id: null, payload: null, created_at: "2026-08-07 10:00:01" },
  ]);

  const transport = new DbRealtimeTransport(db);
  const after = await transport.replay({ sponsorId: "any", officeId: null }, "e-1");
  assert.deepEqual(after.map((e) => e.eventId), ["e-2"]);
});

test("office-scoped events are filtered for unrelated offices", async () => {
  const db = createInMemoryDb();
  db.seed("office_realtime_events", [
    { id: "row-1", event_id: "o1", event_type: "T", scope: "office", sponsor_id: "s", office_id: "office-a", payload: null, created_at: "2026-08-07 10:00:00" },
    { id: "row-2", event_id: "o2", event_type: "T", scope: "global", sponsor_id: null, office_id: null, payload: null, created_at: "2026-08-07 10:00:00" },
  ]);
  const transport = new DbRealtimeTransport(db);
  const rows = await transport.replay({ sponsorId: "s", officeId: "office-a" });
  assert.deepEqual(rows.map((e) => e.eventId), ["o1", "o2"]);
});

test("UnsupportedRealtimeTransport signals unsupported gracefully", async () => {
  const transport = new UnsupportedRealtimeTransport();
  assert.equal(transport.supported, false);
  await assert.rejects(transport.publish({ eventId: "x", eventType: "t", scope: "global" }), /REALTIME_UNSUPPORTED/);
  assert.deepEqual(await transport.replay({ sponsorId: "s", officeId: null }), []);
});

test("formatSse emits event id, type, and data lines", () => {
  const out = formatSse({ eventId: "e-1", eventType: "OFFICE_RADAR_MATCH", scope: "sponsor", payload: { a: 1 } }, "e-1");
  assert.match(out, /^id: e-1/m);
  assert.match(out, /event: OFFICE_RADAR_MATCH/);
  assert.match(out, /data: /);
});

test("stream route authenticates device and returns SSE content type", async () => {
  const source = await readFile(new URL("../app/api/office/v1/stream/route.ts", import.meta.url), "utf8");
  assert.match(source, /authenticateDeviceToken/);
  assert.match(source, /text\/event-stream/);
  assert.match(source, /last-event-id/);
  assert.match(source, /createRealtimeTransport/);
  assert.match(source, /ReadableStream/);
});
