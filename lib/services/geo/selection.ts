import { geoAliases, matchesGeoAlias } from "@/lib/geo/platform-location";
import type { GeoChildRow, GeoCountryRow, GeoProvider } from "@/lib/services/geo/geo-contract";

export type GeoSelectionInput = {
  scope?: "local" | "global";
  country?: string | null;
  governorate?: string | null;
  city?: string | null;
  district?: string | null;
};

export type ResolvedGeoSelection = {
  scope: "local" | "global";
  country: GeoCountryRow | null;
  governorate: GeoChildRow | null;
  city: GeoChildRow | null;
  district: GeoChildRow | null;
  aliases: {
    country: string[];
    governorate: string[];
    city: string[];
    district: string[];
  };
};

export type GeoSelectionResult =
  | { ok: true; value: ResolvedGeoSelection }
  | { ok: false; error: "GEO_INVALID_SELECTION" };

function requested(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function uniqueMatch<T extends GeoChildRow>(rows: T[], value: string): T | null {
  const matches = rows.filter((row) => matchesGeoAlias(row, value));
  return matches.length === 1 ? matches[0] : null;
}

function globalSelection(): ResolvedGeoSelection {
  return {
    scope: "global",
    country: null,
    governorate: null,
    city: null,
    district: null,
    aliases: { country: [], governorate: [], city: [], district: [] },
  };
}

/**
 * Resolves client geo tokens against the canonical hierarchy. Every child is
 * loaded through its parent, so a city/district from a different location can
 * never be combined with the selected country.
 */
export async function resolveGeoSelection(
  input: GeoSelectionInput,
  provider: GeoProvider,
): Promise<GeoSelectionResult> {
  const hasLocalToken = [input.country, input.governorate, input.city, input.district].some(requested);
  if (input.scope === "global") {
    return hasLocalToken ? { ok: false, error: "GEO_INVALID_SELECTION" } : { ok: true, value: globalSelection() };
  }

  // Backward-compatible global listing for old callers. New public surfaces
  // always send an explicit scope.
  if (!hasLocalToken && input.scope !== "local") {
    return { ok: true, value: globalSelection() };
  }
  if (!requested(input.country)) return { ok: false, error: "GEO_INVALID_SELECTION" };
  if (requested(input.district) && !requested(input.city)) {
    return { ok: false, error: "GEO_INVALID_SELECTION" };
  }

  const countries = await provider.getCountries();
  const countryMatches = countries.filter((row) => matchesGeoAlias(row, input.country));
  if (countryMatches.length !== 1) return { ok: false, error: "GEO_INVALID_SELECTION" };
  const country = countryMatches[0];

  const governorates = await provider.getGovernorates(country.id);
  let governorate: GeoChildRow | null = null;
  let city: GeoChildRow | null = null;

  if (requested(input.governorate)) {
    governorate = uniqueMatch(governorates, input.governorate as string);
    if (!governorate) return { ok: false, error: "GEO_INVALID_SELECTION" };
  }

  if (requested(input.city)) {
    if (governorate) {
      city = uniqueMatch(await provider.getCities(governorate.id), input.city as string);
    } else {
      const candidates: Array<{ governorate: GeoChildRow; city: GeoChildRow }> = [];
      for (const parent of governorates) {
        const matched = uniqueMatch(await provider.getCities(parent.id), input.city as string);
        if (matched) candidates.push({ governorate: parent, city: matched });
      }
      if (candidates.length === 1) {
        governorate = candidates[0].governorate;
        city = candidates[0].city;
      }
    }
    if (!city) return { ok: false, error: "GEO_INVALID_SELECTION" };
  }

  let district: GeoChildRow | null = null;
  if (requested(input.district)) {
    district = uniqueMatch(await provider.getDistricts(city!.id), input.district as string);
    if (!district) return { ok: false, error: "GEO_INVALID_SELECTION" };
  }

  return {
    ok: true,
    value: {
      scope: "local",
      country,
      governorate,
      city,
      district,
      aliases: {
        country: geoAliases(country),
        governorate: governorate ? geoAliases(governorate) : [],
        city: city ? geoAliases(city) : [],
        district: district ? geoAliases(district) : [],
      },
    },
  };
}
