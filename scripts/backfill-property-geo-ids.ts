/**
 * Links existing property rows to the geo registry.
 *
 *   node --env-file=.env --import tsx scripts/backfill-property-geo-ids.ts [--apply]
 *
 * Properties predate the registry ids: their location is free text typed at
 * publication time. This walks the hierarchy once, matches each listing by
 * normalised name (the same key the registry deduplicates on), and fills
 * country_id/governorate_id/city_id/district_id.
 *
 * Nothing is invented. A listing whose city cannot be matched, or whose name
 * matches two places, is left untouched and reported — the search path already
 * falls back to the name for rows without an id, so an unmatched row keeps
 * working exactly as it does today.
 *
 * Dry run by default; pass --apply to write.
 */
import { eq, isNull, or } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { countries, governorates, cities, districts, villages } from "@/lib/db/schemas/geo-schema";
import { properties } from "@/lib/db/schemas/properties-schema";
import { geoMatchKey } from "@/lib/geo/platform-location";

const APPLY = process.argv.includes("--apply");

type NamedRow = { id: string; code?: string | null; nameAr: string; nameEn: string; nameTr?: string | null };

/** Every spelling of a row folded onto its dedup key. */
function keysOf(row: NamedRow): string[] {
  return [...new Set([row.code, row.nameAr, row.nameEn, row.nameTr].map(geoMatchKey).filter(Boolean))];
}

/** A name maps to a row only when exactly one row claims it. */
function indexByKey<T extends NamedRow>(rows: T[]): Map<string, T | null> {
  const index = new Map<string, T | null>();
  for (const row of rows) {
    for (const key of keysOf(row)) {
      index.set(key, index.has(key) ? null : row);
    }
  }
  return index;
}

function lookup<T extends NamedRow>(index: Map<string, T | null>, value: unknown): T | null {
  const key = geoMatchKey(value);
  return key ? index.get(key) ?? null : null;
}

async function main(): Promise<void> {
  const { db, end } = getDb();
  const report = {
    scanned: 0,
    linked: 0,
    unmatchedCountry: [] as string[],
    unmatchedGovernorate: [] as string[],
    unmatchedCity: [] as string[],
    unmatchedDistrict: [] as string[],
  };

  try {
    const countryRows = await db.select().from(countries);
    const countryIndex = indexByKey(countryRows as NamedRow[]);

    const rows = await db
      .select()
      .from(properties)
      .where(or(isNull(properties.cityId), isNull(properties.countryId)));

    // One registry read per parent, reused across every listing beneath it.
    const governorateCache = new Map<string, Map<string, NamedRow | null>>();
    const cityCache = new Map<string, Map<string, NamedRow | null>>();
    const childCache = new Map<string, { districts: Map<string, NamedRow | null>; villages: Map<string, NamedRow | null> }>();

    for (const property of rows) {
      report.scanned += 1;

      const country = lookup(countryIndex, property.country);
      if (!country) {
        report.unmatchedCountry.push(String(property.country));
        continue;
      }

      if (!governorateCache.has(country.id)) {
        const list = await db.select().from(governorates).where(eq(governorates.countryId, country.id));
        governorateCache.set(country.id, indexByKey(list as NamedRow[]));
      }
      const governorate = lookup(governorateCache.get(country.id)!, property.governorate);
      if (!governorate) {
        report.unmatchedGovernorate.push(`${property.country} / ${property.governorate}`);
        continue;
      }

      if (!cityCache.has(governorate.id)) {
        const list = await db.select().from(cities).where(eq(cities.governorateId, governorate.id));
        cityCache.set(governorate.id, indexByKey(list as NamedRow[]));
      }
      const city = lookup(cityCache.get(governorate.id)!, property.city);
      if (!city) {
        report.unmatchedCity.push(`${property.governorate} / ${property.city}`);
        continue;
      }

      if (!childCache.has(city.id)) {
        const [districtRows, villageRows] = await Promise.all([
          db.select().from(districts).where(eq(districts.cityId, city.id)),
          db.select().from(villages).where(eq(villages.cityId, city.id)),
        ]);
        childCache.set(city.id, {
          districts: indexByKey(districtRows as NamedRow[]),
          villages: indexByKey(villageRows as NamedRow[]),
        });
      }
      const children = childCache.get(city.id)!;
      const district = property.district ? lookup(children.districts, property.district) : null;
      const village = property.village ? lookup(children.villages, property.village) : null;
      if (property.district && !district && !village) {
        // Not a failure: the neighbourhood simply is not in the catalogue yet.
        report.unmatchedDistrict.push(`${property.city} / ${property.district}`);
      }

      report.linked += 1;
      if (APPLY) {
        await db
          .update(properties)
          .set({
            countryId: country.id,
            governorateId: governorate.id,
            cityId: city.id,
            districtId: district?.id ?? null,
            villageId: village?.id ?? null,
          })
          .where(eq(properties.id, property.id));
      }
    }
  } finally {
    await end();
  }

  const summarise = (list: string[]) => {
    const counts = new Map<string, number>();
    for (const value of list) counts.set(value, (counts.get(value) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([value, count]) => `${value} (${count})`);
  };

  console.log(`[backfill-geo] mode: ${APPLY ? "apply" : "dry-run"}`);
  console.log(`[backfill-geo] scanned ${report.scanned}, linkable ${report.linked}`);
  console.log(`[backfill-geo] unmatched country: ${summarise(report.unmatchedCountry).join(", ") || "none"}`);
  console.log(`[backfill-geo] unmatched governorate: ${summarise(report.unmatchedGovernorate).join(", ") || "none"}`);
  console.log(`[backfill-geo] unmatched city: ${summarise(report.unmatchedCity).join(", ") || "none"}`);
  console.log(`[backfill-geo] district/village not in catalogue: ${summarise(report.unmatchedDistrict).join(", ") || "none"}`);
  if (!APPLY) console.log("[backfill-geo] nothing written. Re-run with --apply.");
}

await main();
