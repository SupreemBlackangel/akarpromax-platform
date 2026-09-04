import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.AD_TRACKING_SECRET ??= "test-secret-for-geo-authority";

import { resolveClaimedGeo, clearGeoAuthorityCache } from "../lib/ads/geo-authority.ts";
import { signTrackingToken, verifyTrackingToken } from "../lib/ads/events.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFile(path.join(ROOT, rel), "utf8");

/**
 * The location registry decides where a visitor is, not the request body.
 *
 * `resolveServerAdContext` derives the device from the User-Agent, the domain
 * from the Host header, the session from a signed cookie and the IP from the
 * proxy headers. Country was the visitor's own assertion, honestly labelled
 * `countrySource: "client"`. City, region and district had no server-side
 * counterpart at all.
 *
 * Measured against the engine, with a campaign targeting only
 * `cities: ["jeddah"]`:
 *
 *   countryCode=sa  cityId=jeddah   -> served and billed
 *   countryCode=eg  cityId=jeddah   -> served and billed   (not a place)
 *   countryCode=—   cityId=jeddah   -> served and billed
 *
 * An advertiser paying CPM for Jeddah was billed for an impression from
 * anyone who typed "jeddah" into a request body, from anywhere.
 *
 * This does not solve attribution -- only a real geo source at the edge does
 * that. It makes the claim COHERENT, and it seals the resolved location into
 * the tracking token so the impression is reported for the place the decision
 * was actually made in.
 */

const CITIES = [
  { city_code: "JEDDAH", region_code: "MAKKAH", country_code: "SA" },
  { city_code: "RIYADH", region_code: "RIYADH", country_code: "SA" },
  { city_code: "EG-CAIRO", region_code: "EG-C", country_code: "EG" },
  { city_code: "SY-MANBIJ", region_code: "SY-HL", country_code: "SY" },
];

function fakeDb(rows = CITIES, { fail = false } = {}) {
  return {
    prepare() {
      return {
        async all() {
          if (fail) throw new Error("database is down");
          return { results: rows };
        },
      };
    },
  };
}

beforeEach(() => clearGeoAuthorityCache());

// ---- the claim is made coherent ---------------------------------------------

test("a coherent claim is kept", async () => {
  const geo = await resolveClaimedGeo(fakeDb(), { countryCode: "sa", regionId: "makkah", cityId: "jeddah" });
  assert.deepEqual(
    { countryCode: geo.countryCode, regionId: geo.regionId, cityId: geo.cityId },
    { countryCode: "sa", regionId: "makkah", cityId: "jeddah" },
  );
  assert.equal(geo.authority, "registry");
});

test("Jeddah is in Saudi Arabia even when the body says Egypt", async () => {
  // The finding, in one line.
  const geo = await resolveClaimedGeo(fakeDb(), { countryCode: "eg", regionId: "eg-c", cityId: "jeddah" });
  assert.equal(geo.countryCode, "sa");
  assert.equal(geo.regionId, "makkah");
  assert.equal(geo.cityId, "jeddah");
});

test("a city with no country claimed gets its own", async () => {
  const geo = await resolveClaimedGeo(fakeDb(), { cityId: "sy-manbij" });
  assert.equal(geo.countryCode, "sy");
  assert.equal(geo.regionId, "sy-hl");
});

test("case does not matter on either side", async () => {
  const geo = await resolveClaimedGeo(fakeDb(), { cityId: "JeDdAh" });
  assert.equal(geo.cityId, "jeddah");
  assert.equal(geo.countryCode, "sa");
});

test("a city the registry has never heard of is dropped", async () => {
  // Nothing can target it anyway, so dropping breaks nothing -- and it keeps a
  // made-up string out of the cache key and out of the impression row.
  const geo = await resolveClaimedGeo(fakeDb(), { countryCode: "sa", cityId: "atlantis" });
  assert.equal(geo.cityId, undefined);
  assert.equal(geo.districtId, undefined);
  assert.equal(geo.countryCode, "sa", "the country claim is left alone; only the city was false");
});

test("no city claimed means nothing to correct", async () => {
  const geo = await resolveClaimedGeo(fakeDb(), { countryCode: "sa" });
  assert.equal(geo.authority, "client");
  assert.equal(geo.countryCode, "sa");
});

// ---- it fails open, deliberately --------------------------------------------

test("a database failure keeps the claim rather than dropping every city", async () => {
  // Dropping instead would silently disable an entire targeting tier the
  // moment the database hiccupped, which is the exact shape of the bug this
  // whole body of work has been about. The nonce and the rate limiter still
  // stand in front of billing.
  const geo = await resolveClaimedGeo(fakeDb(CITIES, { fail: true }), { countryCode: "eg", cityId: "jeddah" });
  assert.equal(geo.cityId, "jeddah");
  assert.equal(geo.authority, "client");
});

test("an empty registry is not treated as authority", async () => {
  const geo = await resolveClaimedGeo(fakeDb([]), { countryCode: "eg", cityId: "jeddah" });
  assert.equal(geo.cityId, "jeddah");
  assert.equal(geo.authority, "client");
});

test("no database at all keeps the claim", async () => {
  const geo = await resolveClaimedGeo(null, { cityId: "jeddah" });
  assert.equal(geo.authority, "client");
});

// ---- the token carries the decision -----------------------------------------

test("the tracking token seals the resolved location", async () => {
  const token = await signTrackingToken({
    campaignId: "c1", placement: "web_home_hero", section: "home", pageType: "home",
    countryCode: "sa", regionId: "makkah", cityId: "jeddah",
  });
  const verified = await verifyTrackingToken(token);
  assert.ok(verified, "the token must verify");
  assert.equal(verified.co, "sa");
  assert.equal(verified.rg, "makkah");
  assert.equal(verified.ci, "jeddah");
});

test("the track path prefers the token over the body, like it already does for placement", async () => {
  const track = await read("lib/ads/track.ts");
  assert.match(track, /if \(payload\.co\) ctx\.countryCode = payload\.co;/);
  assert.match(track, /if \(payload\.ci\) ctx\.cityId = payload\.ci;/);

  // The mechanism is not new -- placement, section, page type and channel have
  // always been taken from the token. Geography simply was not in it.
  assert.match(track, /if \(payload\.pl\) ctx\.placement = payload\.pl;/);
});

test("a token minted before this field existed still works", async () => {
  // Refusing them would drop every impression in flight at deploy time.
  const token = await signTrackingToken({
    campaignId: "c1", placement: "web_home_hero", section: "home", pageType: "home",
  });
  const verified = await verifyTrackingToken(token);
  assert.ok(verified);
  assert.equal(verified.co, undefined);
});

// ---- every door is wired ----------------------------------------------------

test("both match routes consult the registry", async () => {
  for (const route of ["app/api/ads/match/route.ts", "app/api/ads/match-batch/route.ts"]) {
    const source = await read(route);
    assert.match(source, /resolveClaimedGeo/, `${route} must resolve the claim`);
  }
});

test("the engine seals the matched context into every token it mints", async () => {
  const engine = await read("lib/ads/engine.ts");
  const mint = engine.slice(engine.indexOf("signTrackingToken("));
  assert.match(mint, /countryCode: ctx\.countryCode/);
  assert.match(mint, /cityId: ctx\.cityId/);
});
