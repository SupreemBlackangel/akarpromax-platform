import assert from "node:assert/strict";
import test from "node:test";

import { normalizeCampaignBoundary, formatDateTime } from "../lib/ads/geo.ts";

/**
 * start_at/end_at are TEXT compared lexicographically against
 * formatDateTime(now). Three writers used to emit three different formats, so
 * public-request campaigns started a day late and advertiser-admin campaigns
 * ended a day early. These tests pin the comparison, not just the string.
 */

const started = (boundary, now) => boundary !== null && boundary <= formatDateTime(now);
const notEnded = (boundary, now) => boundary !== null && boundary >= formatDateTime(now);

test("a date-only start is live from the first moment of that day", () => {
  const start = normalizeCampaignBoundary("2026-09-02", "start");
  assert.equal(start, "2026-09-02 00:00:00");
  assert.ok(started(start, new Date("2026-09-02T00:00:01")), "live just after midnight");
  assert.ok(!started(start, new Date("2026-09-01T23:59:59")), "not live the day before");
});

test("a date-only end runs through the whole of that day", () => {
  const end = normalizeCampaignBoundary("2026-09-02", "end");
  assert.equal(end, "2026-09-02 23:59:59");
  assert.ok(notEnded(end, new Date("2026-09-02T18:52:45")), "still running that afternoon");
  assert.ok(!notEnded(end, new Date("2026-09-03T00:00:01")), "over the next day");
});

test("the ISO form the public request used to write no longer starts a day late", () => {
  // Previously stored verbatim as "2026-09-02T00:00:00.000Z"; 'T' sorts above
  // ' ', so it never compared as started during its own first day.
  const legacy = "2026-09-02T00:00:00.000Z";
  const noon = new Date("2026-09-02T12:00:00");
  assert.ok(!(legacy <= formatDateTime(noon)), "the raw ISO string is the bug being fixed");

  const fixed = normalizeCampaignBoundary(legacy, "start");
  assert.ok(started(fixed, noon), "after normalizing, it is live on its own start date");
});

test("an already-correct value is passed through untouched", () => {
  assert.equal(normalizeCampaignBoundary("2026-09-02 14:00:00", "start"), "2026-09-02 14:00:00");
});

test("empty and unparseable values become null rather than a bogus boundary", () => {
  for (const value of [null, undefined, "", "   ", "not a date"]) {
    assert.equal(normalizeCampaignBoundary(value, "start"), null, `${JSON.stringify(value)} -> null`);
  }
});
