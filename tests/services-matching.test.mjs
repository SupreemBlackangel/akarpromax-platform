import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  computeMatchScore,
  distanceKm,
} from "../lib/services/match-score.ts";

const muscat = { latitude: 23.588, longitude: 58.3829 };
const seeb = { latitude: 23.6703, longitude: 58.1824 };

const baseProvider = {
  id: "p1",
  user_id: "u1",
  country_code: "OM",
  city_id: "muscat",
  category_ids: ["ac-repair"],
  price_ranges: [{ category_id: "ac-repair", price_from: 15, price_to: 40 }],
  rating_avg: 4.6,
  rating_count: 120,
  response_rate: 97,
  completion_rate: 98,
};

function request(overrides = {}) {
  return {
    id: "r1",
    category_id: "ac-repair",
    country_code: "om",
    city_id: "muscat",
    latitude: muscat.latitude,
    longitude: muscat.longitude,
    urgency: "normal",
    budget_min: 10,
    budget_max: 60,
    ...overrides,
  };
}

test("distanceKm computes a sane Muscat–Seeb distance", () => {
  const d = distanceKm(muscat, seeb);
  assert.ok(d !== null);
  assert.ok(d > 10 && d < 60, `expected 10-60km, got ${d}`);
  assert.equal(distanceKm(muscat, { latitude: null, longitude: null }), null);
});

test("computeMatchScore qualifies a matching provider with a high score", () => {
  const result = computeMatchScore(request(), baseProvider);
  assert.ok(result, "expected a match");
  assert.equal(result.categoryMatch, true);
  assert.ok(result.score >= 50 && result.score <= 100, `score ${result.score}`);
  assert.equal(result.reasons[0], "category_match");
  assert.ok(result.reasons.includes("budget_fit"));
  assert.equal(result.ratingBonus, 10);
  assert.equal(result.responseBonus, 7);
});

test("computeMatchScore rejects non-approved providers and wrong country", () => {
  assert.equal(computeMatchScore(request(), { ...baseProvider, status: "under_review" }), null);
  assert.equal(computeMatchScore(request(), { ...baseProvider, country_code: "SA" }), null);
});

test("computeMatchScore rejects providers that do not cover the category", () => {
  assert.equal(computeMatchScore(request(), { ...baseProvider, category_ids: ["plumbing"] }), null);
});

test("computeMatchScore rejects providers beyond their service radius", () => {
  const far = {
    ...baseProvider,
    latitude: 17.03, // Salalah
    longitude: 54.09,
    service_radius_km: 10,
  };
  assert.equal(computeMatchScore(request(), far), null);
});

test("computeMatchScore applies the same-city bonus when coords are missing", () => {
  const result = computeMatchScore(
    request({ latitude: null, longitude: null, city_id: "muscat" }),
    { ...baseProvider, latitude: null, longitude: null, city_id: "muscat" },
  );
  assert.ok(result);
  assert.ok(result.reasons.includes("same_city"));
});

test("computeMatchScore escalates urgency", () => {
  const normal = computeMatchScore(request(), baseProvider);
  const urgent = computeMatchScore(request({ urgency: "urgent" }), baseProvider);
  assert.ok(normal);
  assert.ok(urgent);
  assert.ok(urgent.urgencyBonus > normal.urgencyBonus, "urgent should outscore normal");
  assert.equal(urgent.urgencyBonus, 10);
});

test("computeMatchScore detects budget conflicts", () => {
  const result = computeMatchScore(
    request({ budget_min: 100, budget_max: 150 }),
    baseProvider, // price range 15-40
  );
  assert.ok(result);
  assert.equal(result.budgetFit, false);
  assert.ok(!result.reasons.includes("budget_fit"));
});

test("computeMatchScore caps the score to 100", () => {
  const result = computeMatchScore(request(), baseProvider);
  assert.ok(result && result.score <= 100);
});

test("matching pipeline inserts qualified providers and notifies both sides", async () => {
  const [matching, score] = await Promise.all([
    readFile(new URL("../lib/services/matching.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/services/match-score.ts", import.meta.url), "utf8"),
  ]);
  assert.match(matching, /INSERT INTO service_request_matches/);
  assert.match(matching, /ON CONFLICT \(request_id, provider_id\) DO UPDATE SET/);
  assert.match(matching, /SERVICE_REQUEST_MATCHED/);
  assert.match(matching, /طلب جديد يناسب خدماتك/);
  assert.match(matching, /تمت مطابقة طلبك/);
  assert.match(matching, /function runMatching\(/);
  assert.match(matching, /findCandidateProviders\(/);
  // Case-insensitive on purpose. This assertion used to pin `country_code = ?1`,
  // which is what made every request match zero providers: the domain stores
  // uppercase, the provider profile stored the lowercase platform geo token,
  // and the column's C.UTF-8 collation makes `=` case-sensitive.
  assert.match(matching, /status = 'approved' AND UPPER\(country_code\) = \?1/);
  // Categories are fetched for every candidate in ONE query. This assertion
  // used to pin the per-provider form, which ran inside the loop: matching a
  // single request cost 1 + N round trips, on the publish path, synchronously,
  // while the customer waited -- and it grew with the marketplace rather than
  // with the work.
  assert.match(matching, /FROM service_provider_categories\s+WHERE is_active = 1 AND provider_id IN \(/);
  // And nothing queries inside the per-provider loop any more.
  const loop = matching.slice(matching.indexOf("for (const profile of rows)"));
  assert.doesNotMatch(loop.slice(0, 600), /\.prepare\(/, "no query may run inside the per-provider loop");
  assert.match(score, /export function computeMatchScore/);
  assert.match(score, /coversCategory/);
  assert.match(score, /distance > effectiveRadius/);
  assert.match(score, /export function distanceKm/);
});
