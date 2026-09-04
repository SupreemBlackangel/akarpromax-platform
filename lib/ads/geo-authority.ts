/**
 * The location registry, not the visitor, decides where a visitor is.
 *
 * `resolveServerAdContext` derives the device from the User-Agent, the domain
 * from the Host header, the session from a signed cookie and the IP from the
 * proxy headers. Country is the visitor's own assertion -- honestly labelled
 * `countrySource: "client"`, because there is no GeoIP at the edge. City,
 * region and district had no server-side counterpart at all.
 *
 * Measured against the engine before this existed, with a campaign targeting
 * only `cities: ["jeddah"]`:
 *
 *   countryCode=sa  cityId=jeddah   -> served and billed   (coherent)
 *   countryCode=eg  cityId=jeddah   -> served and billed   (Jeddah is not in Egypt)
 *   countryCode=—   cityId=jeddah   -> served and billed   (no country at all)
 *
 * An advertiser paying CPM for Jeddah was billed for an impression from anyone
 * who typed "jeddah" into a request body, from anywhere, in any combination.
 *
 * This does not solve attribution -- only a real geo source at the edge can do
 * that, and it is recorded as the next step. What it does is make the claim
 * COHERENT: a city that the registry does not know is dropped, and a city the
 * registry does know decides its own governorate and country, overriding
 * whatever the client said about them. A visitor can still lie about which
 * city they are in; they can no longer be in a city and a country that do not
 * contain each other, nor in a city that does not exist.
 */

// D1Database is an ambient global -- see types/cloudflare-runtime.d.ts

export type ClaimedGeo = {
  countryCode?: string;
  regionId?: string;
  cityId?: string;
  districtId?: string;
};

export type ResolvedGeo = ClaimedGeo & {
  /** Which parts the registry decided rather than the visitor. */
  authority: "registry" | "client";
};

type CityRow = { cityCode: string; regionCode: string; countryCode: string };

/**
 * The whole city table, keyed by lowercased city code.
 *
 * It is a few hundred rows of reference data that changes when an administrator
 * edits it, so it is loaded once and held. The TTL exists so a newly added city
 * becomes targetable without a restart -- the case that made the eight empty
 * Saudi governorates worth fixing in the first place.
 */
let cache: { at: number; byCity: Map<string, CityRow> } | null = null;
let inFlight: Promise<Map<string, CityRow>> | null = null;

const TTL_MS = 10 * 60 * 1000;

export function clearGeoAuthorityCache(): void {
  cache = null;
  inFlight = null;
}

async function loadCities(db: D1Database): Promise<Map<string, CityRow>> {
  const rows = await db
    .prepare(
      `SELECT ci.code AS city_code, g.code AS region_code, c.code AS country_code
         FROM cities ci
         JOIN governorates g ON g.id = ci.governorate_id
         JOIN countries c ON c.id = g.country_id
        WHERE ci.code IS NOT NULL AND g.code IS NOT NULL AND c.code IS NOT NULL`,
    )
    .all();

  const byCity = new Map<string, CityRow>();
  for (const row of (rows?.results ?? []) as Array<Record<string, unknown>>) {
    const cityCode = String(row.city_code ?? "").trim();
    if (!cityCode) continue;
    byCity.set(cityCode.toLowerCase(), {
      cityCode: cityCode.toLowerCase(),
      regionCode: String(row.region_code ?? "").trim().toLowerCase(),
      countryCode: String(row.country_code ?? "").trim().toLowerCase(),
    });
  }
  return byCity;
}

async function cities(db: D1Database): Promise<Map<string, CityRow>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.byCity;
  if (inFlight) return inFlight;

  inFlight = loadCities(db)
    .then((byCity) => {
      // An empty table is not cached. Before the catalogue was seeded this
      // query returned almost nothing, and remembering that would have
      // disabled city targeting for ten minutes after it was fixed.
      if (byCity.size > 0) cache = { at: Date.now(), byCity };
      return byCity;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

const clean = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

/**
 * Make a claimed location coherent against the registry.
 *
 * On any failure the claim is returned unchanged, marked `client`. Dropping the
 * city instead would silently disable an entire targeting tier the moment the
 * database hiccupped -- which is the exact shape of the bug this whole body of
 * work has been about. The token nonce and the rate limiter still stand in
 * front of billing either way.
 */
export async function resolveClaimedGeo(
  db: D1Database | null,
  claimed: ClaimedGeo,
): Promise<ResolvedGeo> {
  const cityId = clean(claimed.cityId);
  if (!db || !cityId) return { ...claimed, authority: "client" };

  let byCity: Map<string, CityRow>;
  try {
    byCity = await cities(db);
  } catch (error) {
    console.error("[ads/geo-authority] registry lookup failed; claim kept as-is", {
      message: error instanceof Error ? error.message : String(error),
    });
    return { ...claimed, authority: "client" };
  }

  if (byCity.size === 0) return { ...claimed, authority: "client" };

  const row = byCity.get(cityId);
  if (!row) {
    // A city the registry has never heard of cannot be targeted by anyone, so
    // dropping it changes nothing that was working -- and it stops a made-up
    // string from being carried into the cache key and the impression row.
    return {
      countryCode: claimed.countryCode,
      regionId: claimed.regionId,
      cityId: undefined,
      districtId: undefined,
      authority: "registry",
    };
  }

  return {
    countryCode: row.countryCode,
    regionId: row.regionCode,
    cityId: row.cityCode,
    // The district is kept only when a city was resolved; it is checked
    // against nothing yet, which is stated here rather than implied.
    districtId: claimed.districtId,
    authority: "registry",
  };
}
