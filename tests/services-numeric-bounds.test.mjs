import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  boundedNumber,
  LATITUDE,
  LONGITUDE,
  SERVICE_RADIUS_KM,
  MONEY,
  DURATION_DAYS,
  FOUNDED_YEAR,
  TEAM_SIZE,
} from "../lib/services/numbers.ts";
import { computeMatchScore, distanceKm, PLATFORM_MAX_SERVICE_RADIUS_KM } from "../lib/services/match-score.ts";

const read = (rel) => readFile(new URL(`../${rel}`, import.meta.url), "utf8");

/**
 * Numeric input on the services write paths.
 *
 * Every route carried its own copy of a parser that accepted any finite number,
 * and nothing below it -- not the domain functions, not the columns -- narrowed
 * that. So whatever a client sent was stored and then used as though it were a
 * real distance, a real place, or real money.
 */

// ---- the helper -------------------------------------------------------------

test("a value inside the bounds is kept exactly", () => {
  assert.equal(boundedNumber("23.588", LATITUDE), 23.588);
  assert.equal(boundedNumber(0, LATITUDE), 0, "zero is a latitude, not an absence");
  assert.equal(boundedNumber(-90, LATITUDE), -90, "the bounds are inclusive");
  assert.equal(boundedNumber(90, LATITUDE), 90);
});

test("absence stays absence", () => {
  for (const empty of [null, undefined, ""]) {
    assert.equal(boundedNumber(empty, MONEY), null);
  }
  assert.equal(boundedNumber("not a number", MONEY), null);
  assert.equal(boundedNumber(Number.NaN, MONEY), null);
  assert.equal(boundedNumber(Number.POSITIVE_INFINITY, MONEY), null);
});

test("an out-of-range value is refused, not clamped", () => {
  // Clamping would invent a value the client never sent. A provider who typed
  // their radius wrong should fall back to the default coverage rather than
  // silently receive the maximum.
  assert.equal(boundedNumber(1e12, SERVICE_RADIUS_KM), null);
  assert.notEqual(boundedNumber(1e12, SERVICE_RADIUS_KM), SERVICE_RADIUS_KM.max);
  assert.equal(boundedNumber(91, LATITUDE), null);
  assert.equal(boundedNumber(-181, LONGITUDE), null);
  assert.equal(boundedNumber(-1, MONEY), null, "a negative price is not an offer");
});

test("fields that count whole things refuse fractions", () => {
  assert.equal(boundedNumber(3.5, DURATION_DAYS), null);
  assert.equal(boundedNumber(3, DURATION_DAYS), 3);
  assert.equal(boundedNumber(1998.5, FOUNDED_YEAR), null);
  assert.equal(boundedNumber(2.5, TEAM_SIZE), null);
});

// ---- why the radius bound is the one that matters ---------------------------

test("an impossible latitude makes a provider look like the nearest one", () => {
  // This is the bound that turned out to be load-bearing, and not for the
  // reason I first assumed.
  //
  // Latitude 383.588 is 23.588 + 360. It is not a place, but the haversine
  // formula is built from sin and cos, which wrap: the distance from Muscat to
  // "latitude 383.588" comes back as 1.6e-12 km. So a profile carrying an
  // impossible latitude is not rejected as nonsense -- it is scored as being
  // essentially zero metres from every request at that longitude, taking the
  // full proximity bonus ahead of every provider who gave a real position.
  const muscat = { latitude: 23.588, longitude: 58.3829 };
  const wrapped = distanceKm(muscat, { latitude: 23.588 + 360, longitude: 58.3829 });
  assert.ok(wrapped !== null);
  assert.ok(wrapped < 0.001, `an out-of-range latitude reads as ${wrapped}km away`);

  // The write path is where that has to be stopped, because the distance
  // calculation cannot tell the difference afterwards.
  assert.equal(boundedNumber(23.588 + 360, LATITUDE), null);
  assert.equal(boundedNumber(500, LATITUDE), null);
});

test("the radius bound is defence in depth, not the thing that stops abuse", () => {
  // Worth being exact about: the matcher already clamps the radius with
  //   Math.min(providerRadius, PLATFORM_MAX_SERVICE_RADIUS_KM)
  // so a provider posting 1e12 was never matched beyond the platform ceiling.
  // The bound at the write keeps absurd values out of the row and off the
  // profile; it is not a matching fix, and this test exists so nobody later
  // believes it was one.
  const muscat = { latitude: 23.588, longitude: 58.3829 };
  const salalah = { latitude: 17.03, longitude: 54.09 };
  const request = { id: "r1", category_id: "ac-repair", country_code: "om", urgency: "normal", ...muscat };
  const provider = {
    id: "p1", user_id: "u1", country_code: "OM", category_ids: ["ac-repair"],
    price_ranges: [], ...salalah,
  };

  assert.equal(
    computeMatchScore(request, { ...provider, service_radius_km: 1e12 }),
    null,
    "the platform ceiling already refuses this",
  );
  assert.ok(PLATFORM_MAX_SERVICE_RADIUS_KM > 0);
});

// ---- the write paths actually use it ----------------------------------------

const BOUNDED_WRITES = [
  ["app/api/service-providers/route.ts", ["LATITUDE", "LONGITUDE", "SERVICE_RADIUS_KM"]],
  ["app/api/service-offers/route.ts", ["MONEY", "DURATION_DAYS"]],
  ["app/api/service-offers/[id]/revise/route.ts", ["MONEY"]],
  ["app/api/service-requests/route.ts", ["LATITUDE", "LONGITUDE", "MONEY"]],
  ["app/api/service-requests/[id]/route.ts", ["MONEY"]],
];

test("the write paths bound their numbers", async () => {
  for (const [file, bounds] of BOUNDED_WRITES) {
    const source = await read(file);
    assert.match(source, /boundedNumber\(/, `${file} does not bound anything`);
    for (const bound of bounds) {
      assert.ok(source.includes(bound), `${file} does not apply ${bound}`);
    }
  }
});

test("no bounded write path still carries the permissive local parser", async () => {
  // Eleven routes had their own copy. A leftover copy beside the bounded one is
  // how a later edit reaches for the wrong parser without noticing.
  for (const [file] of BOUNDED_WRITES) {
    // service-providers keeps its local parser for the GET query string, where
    // an out-of-range value is answered with a 400 rather than dropped -- which
    // is the right answer for a query the client got wrong.
    if (file === "app/api/service-providers/route.ts") continue;
    const source = await read(file);
    assert.doesNotMatch(
      source,
      /function cleanNumber/,
      `${file} still defines the unbounded parser next to the bounded one`,
    );
  }
});

test("the coordinates stored are bounded as tightly as the coordinates searched", async () => {
  // The public search path already refused out-of-range values. The write path
  // that stores them did not, so the check guarded the query and not the data.
  const source = await read("app/api/service-providers/route.ts");
  assert.match(source, /latitude < -90 \|\| latitude > 90/, "the search guard is still there");
  assert.match(source, /latitude: boundedNumber\(body\.latitude, LATITUDE\)/);
  assert.equal(LATITUDE.min, -90);
  assert.equal(LATITUDE.max, 90);
  assert.equal(LONGITUDE.min, -180);
  assert.equal(LONGITUDE.max, 180);
});
