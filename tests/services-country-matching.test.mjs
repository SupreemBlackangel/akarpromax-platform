import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { normalizeGeoToken } from "../lib/geo/platform-location.ts";

/**
 * Why the marketplace never carried a transaction.
 *
 * The services domain stores country codes uppercase: service_requests
 * uppercases on insert, and on production all 48 service_categories rows and
 * both service_marketplace_settings rows are "OM"/"SA".
 *
 * upsertProviderProfile was the one write that stored whatever the client sent.
 * The client sends the platform geo token, and normalizeGeoToken lowercases it.
 * So a provider profile landed as "om" while every request was "OM", and
 * findCandidateProviders compared them with a plain `=` against a C.UTF-8
 * column. Verified on production: 'om' = 'OM' returns false.
 *
 * Result: every published request matched zero providers, always. No provider
 * ever saw a request, so no offer, order or review could follow.
 *
 * These are source-level assertions because the failure was never in the
 * algorithm -- computeMatchScore is fine -- it was in the two lines that decide
 * which rows reach it.
 */

const read = (rel) => readFile(new URL(`../${rel}`, import.meta.url), "utf8");

test("the platform geo token really is lowercase", () => {
  // This is the premise of the whole bug: if this ever changes, the mismatch
  // it caused changes with it.
  assert.equal(normalizeGeoToken("OM"), "om");
  assert.equal(normalizeGeoToken("Om"), "om");
  assert.equal(normalizeGeoToken("  om  "), "om");
});

test("a provider profile is stored with the domain's uppercase country", async () => {
  const marketplace = await read("lib/services/marketplace.ts");
  assert.match(
    marketplace,
    /const countryCode = \(input\.countryCode \?\? "OM"\)\.toLocaleUpperCase\("en"\);/,
    "the profile write must normalize, or it stores the lowercase geo token",
  );
  assert.doesNotMatch(
    marketplace,
    /input\.countryCode \?\? "OM", input\.cityId/,
    "neither the insert nor the update may bind the raw client value",
  );
});

test("a request is stored with the same uppercase country", async () => {
  const marketplace = await read("lib/services/marketplace.ts");
  assert.match(marketplace, /String\(input\.countryCode\)\.toUpperCase\(\)/);
});

test("the matcher compares country case-insensitively", async () => {
  const matching = await read("lib/services/matching.ts");
  assert.match(
    matching,
    /UPPER\(country_code\) = \?1/,
    "a plain `=` on a C.UTF-8 column silently matches nothing when a row's case differs",
  );
  assert.doesNotMatch(matching, /AND country_code = \?1/);
});

test("the provider listing keeps its own case defence", async () => {
  // The listing already expanded each token to both cases and used IN. That
  // defence existed in one place and not the other, which is exactly how the
  // discrepancy survived: /providers looked fine while matching returned
  // nothing.
  const marketplace = await read("lib/services/marketplace.ts");
  assert.match(marketplace, /toLocaleLowerCase\("en"\), token\.toLocaleUpperCase\("en"\)/);
});

test("matching is triggered when a request is published", async () => {
  const marketplace = await read("lib/services/marketplace.ts");
  assert.match(marketplace, /const matched = await runMatching\(requestId\)/, "publishing must fan the request out to providers");
});

test("the admin operations snapshot selects a column that exists", async () => {
  // service_orders has `price`; there is no `agreed_price` column. Postgres
  // rejects an unknown column at plan time, so this threw regardless of row
  // count -- verified against production -- and it sits inside the Promise.all
  // that builds the whole admin snapshot, taking recent providers, requests,
  // orders and reports down with it.
  const marketplace = await read("lib/services/marketplace.ts");
  assert.doesNotMatch(marketplace, /SELECT o\.id, o\.status, o\.agreed_price/);
  assert.match(marketplace, /o\.price AS agreed_price/, "aliased so the admin client keeps reading the same field name");
});
