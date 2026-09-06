// A published request reaches three craftsmen, and a requester gets three
// tries. The owner's rule, and the reasoning it rests on:
//
//   wave 1  -> the three nearest in the trade
//   wave 2  -> three others, once all of wave 1 are finished with it
//   wave 3  -> three others, on the same condition
//   after   -> nine craftsmen have been contacted and none was accepted, so
//              the requester is barred from opening a new one for a while.
//
// Everything here is the pure decision, with no database in it.
import assert from "node:assert/strict";
import test from "node:test";

import {
  selectWave,
  canRenew,
  blockedUntil,
  isBlockActive,
  totalReach,
  isProviderSort,
  DEFAULT_WAVE_SETTINGS,
  DEFAULT_PROVIDER_SORT,
  PROVIDER_SORTS,
} from "../lib/services/request-waves.ts";

/** A candidate at a distance, with the numbers the orderings read. */
const candidate = (id, km, { rating = 4, ratings = 10, completion = 90, response = 90 } = {}) => ({
  provider: { id, rating_avg: rating, rating_count: ratings, completion_rate: completion, response_rate: response },
  result: { providerId: id, distanceKm: km, score: 100 - km },
});

const POOL = [
  candidate("far", 9, { rating: 5.0, completion: 100, response: 100 }),
  candidate("near", 1, { rating: 3.2, completion: 70, response: 60 }),
  candidate("mid", 4, { rating: 4.6, completion: 95, response: 92 }),
  candidate("closest", 0.5, { rating: 3.0, completion: 60, response: 55 }),
  candidate("edge", 7, { rating: 4.9, completion: 98, response: 97 }),
];

// ---- the wave --------------------------------------------------------------

test("a wave is three, and by default they are the three nearest", () => {
  const wave = selectWave(POOL, { waveSize: 3 });
  assert.equal(wave.length, 3);
  assert.deepEqual(wave.map((c) => c.provider.id), ["closest", "near", "mid"]);
});

test("the requester may ask for the best rated, or the most dependable, instead", () => {
  assert.deepEqual(
    selectWave(POOL, { waveSize: 3, sort: "rating" }).map((c) => c.provider.id),
    ["far", "edge", "mid"],
  );
  // Trust is what a provider has delivered — completion and response — not the
  // stars alone, so it need not agree with the rating order.
  assert.deepEqual(
    selectWave(POOL, { waveSize: 3, sort: "trust" }).map((c) => c.provider.id),
    ["far", "edge", "mid"],
  );
});

test("an unknown distance sorts last, because it is not a short one", () => {
  const pool = [candidate("known", 6), { provider: { id: "unknown" }, result: { providerId: "unknown", distanceKm: null } }];
  assert.deepEqual(selectWave(pool, { waveSize: 2 }).map((c) => c.provider.id), ["known", "unknown"]);
});

test("a later wave never repeats a craftsman an earlier one already reached", () => {
  const first = selectWave(POOL, { waveSize: 3 });
  const notified = new Set(first.map((c) => c.provider.id));
  const second = selectWave(POOL, { waveSize: 3, alreadyNotified: notified });

  assert.deepEqual(second.map((c) => c.provider.id), ["edge", "far"]);
  for (const member of second) assert.ok(!notified.has(member.provider.id));
});

test("the same request picks the same three twice", () => {
  const tied = [candidate("b", 3), candidate("a", 3), candidate("c", 3)];
  assert.deepEqual(selectWave(tied, { waveSize: 2 }).map((c) => c.provider.id), ["a", "b"]);
  assert.deepEqual(selectWave(tied, { waveSize: 2 }).map((c) => c.provider.id), ["a", "b"]);
});

test("a thin market gives what it has rather than nothing", () => {
  assert.equal(selectWave([candidate("only", 2)], { waveSize: 3 }).length, 1);
  assert.equal(selectWave([], { waveSize: 3 }).length, 0);
});

// ---- the renewal -----------------------------------------------------------

test("three others only once the current three are finished with it", () => {
  assert.deepEqual(canRenew(["declined", "declined", "declined"], 0), { ok: true, nextWave: 2 });
  assert.deepEqual(canRenew(["declined", "expired", "declined"], 1), { ok: true, nextWave: 3 });
});

test("a wave is not replaced while someone is still deciding", () => {
  const decision = canRenew(["declined", "waiting", "declined"], 0);
  assert.equal(decision.ok, false);
  assert.equal(decision.reason, "WAVE_STILL_OPEN");
});

test("a wave is never replaced while an offer is on the table", () => {
  // The answer to an offer you dislike is to decline it, not to leave the
  // craftsman waiting while three more are called in.
  const decision = canRenew(["offered", "declined", "declined"], 0);
  assert.equal(decision.ok, false);
  assert.equal(decision.reason, "OFFER_ON_TABLE");
  // Even with a renewal still available, and even if everyone else is done.
  assert.equal(canRenew(["offered", "expired", "expired"], 0).reason, "OFFER_ON_TABLE");
});

test("two renewals, and the third refusal carries the block with it", () => {
  const all = ["declined", "declined", "declined"];
  assert.equal(canRenew(all, 0).ok, true);
  assert.equal(canRenew(all, 1).ok, true);

  const exhausted = canRenew(all, 2);
  assert.equal(exhausted.ok, false);
  assert.equal(exhausted.reason, "RENEWALS_EXHAUSTED");
  assert.equal(exhausted.blockDays, 30);
});

test("nine craftsmen in total, from the settings and not from a constant", () => {
  assert.equal(totalReach(), 9);
  assert.equal(totalReach({ ...DEFAULT_WAVE_SETTINGS, waveSize: 5, maxRenewals: 1 }), 10);
});

// ---- the block -------------------------------------------------------------

test("the block ends by itself after thirty days", () => {
  const from = new Date("2026-09-06T10:00:00Z");
  const until = blockedUntil(from);
  assert.equal(until.toISOString(), "2026-10-06T10:00:00.000Z");

  assert.equal(isBlockActive(until, new Date("2026-10-05T23:59:00Z")), true);
  assert.equal(isBlockActive(until, new Date("2026-10-06T10:00:01Z")), false);
});

test("no block, an unreadable one, or one that has run out all mean: go ahead", () => {
  for (const value of [null, undefined, "", "not a date"]) {
    assert.equal(isBlockActive(value), false, String(value));
  }
  assert.equal(isBlockActive("2020-01-01 00:00:00"), false);
});

test("the block length is a setting, so an admin can change it without a deploy", () => {
  const until = blockedUntil(new Date("2026-09-06T00:00:00Z"), { ...DEFAULT_WAVE_SETTINGS, blockDays: 7 });
  assert.equal(until.toISOString(), "2026-09-13T00:00:00.000Z");
  // Zero or a negative never means "forever by accident".
  assert.ok(blockedUntil(new Date("2026-09-06T00:00:00Z"), { ...DEFAULT_WAVE_SETTINGS, blockDays: 0 }) > new Date("2026-09-06T00:00:00Z"));
});

// ---- the settings ----------------------------------------------------------

test("the defaults are the rule as it was stated", () => {
  assert.deepEqual(DEFAULT_WAVE_SETTINGS, { waveSize: 3, maxRenewals: 2, blockDays: 30, offerValidityHours: 48 });
  assert.equal(DEFAULT_PROVIDER_SORT, "nearest");
  assert.deepEqual(PROVIDER_SORTS, ["nearest", "rating", "trust"]);
});

test("only a known ordering is accepted from a client", () => {
  for (const value of PROVIDER_SORTS) assert.ok(isProviderSort(value));
  for (const value of ["", "closest", "NEAREST", null, 3, {}]) assert.equal(isProviderSort(value), false, String(value));
});
