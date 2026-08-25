import { getIntegrationDb } from "@/lib/integration/db";
import { RADAR_MAX_RADIUS_KM, type RadarKind } from "@/lib/integration/constants";

/** Product default when the caller does not choose a radius. */
export const RADAR_DEFAULT_RADIUS_KM = 10;

/** Maximum radar targets returned to a device in one scan. */
export const RADAR_MAX_RESULTS = 100;

/**
 * Upper bound on rows a single scan may pull out of the database before
 * distance is computed. The bounding box normally keeps the real count far
 * below this; the cap only stops a pathological scan.
 */
export const RADAR_SCAN_LIMIT = 2000;

/**
 * Filters this contract actually applies. Anything outside these sets is
 * REJECTED — a filter is never accepted and then quietly ignored.
 */
export const RADAR_PROPERTY_FILTERS = [
  "dealType", "category", "propertyType",
  "minPrice", "maxPrice", "bedrooms", "bathrooms",
  "city", "district",
] as const;

export const RADAR_SERVICE_FILTERS = ["category"] as const;

export class OfficeRadarError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status: number, message?: string) {
    super(message ?? code);
    this.name = "OfficeRadarError";
    this.code = code;
    this.status = status;
  }
}

export type GeoPoint = { latitude: number | null; longitude: number | null };

/**
 * Latitude/longitude window that fully contains the requested circle. Used as a
 * coarse SQL filter so a scan never loads the whole catalogue; the exact
 * Haversine test still decides membership afterwards.
 */
export function boundingBox(latitude: number, longitude: number, radiusKm: number): {
  minLat: number; maxLat: number; minLng: number; maxLng: number;
} {
  const latDelta = radiusKm / 110.574;
  const cos = Math.cos((latitude * Math.PI) / 180);
  const lngDelta = Math.abs(cos) < 1e-6 ? 180 : radiusKm / (111.32 * Math.abs(cos));
  return {
    minLat: Math.max(-90, latitude - latDelta),
    maxLat: Math.min(90, latitude + latDelta),
    minLng: Math.max(-180, longitude - lngDelta),
    maxLng: Math.min(180, longitude + lngDelta),
  };
}

function sameCountry(a: unknown, b: unknown): boolean {
  const left = String(a ?? "").trim().toUpperCase();
  const right = String(b ?? "").trim().toUpperCase();
  return left.length > 0 && left === right;
}

function sameText(a: unknown, b: unknown): boolean {
  return String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();
}

export type RadarFilters = Record<string, unknown>;

/**
 * Validates the requested filters against what this contract can really apply.
 * Throws UNSUPPORTED_FILTER rather than silently dropping anything.
 */
export function normalizeRadarFilters(kind: RadarKind, filters: RadarFilters | undefined): RadarFilters {
  if (!filters) return {};
  const allowed = new Set<string>([
    ...(kind === "services" ? [] : RADAR_PROPERTY_FILTERS),
    ...(kind === "properties" ? [] : RADAR_SERVICE_FILTERS),
  ]);
  const normalized: RadarFilters = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    if (!allowed.has(key)) {
      throw new OfficeRadarError("UNSUPPORTED_FILTER", 400, `filter "${key}" is not supported for kind "${kind}"`);
    }
    normalized[key] = value;
  }
  return normalized;
}

function numberOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number | null {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return null;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export interface GeoDistanceProvider {
  withinRadius(origin: GeoPoint, target: GeoPoint, radiusKm: number): boolean;
  distanceKm(origin: GeoPoint, target: GeoPoint): number | null;
}

export const HaversineGeoDistanceProvider: GeoDistanceProvider = {
  withinRadius(origin, target, radiusKm) {
    const distance = haversineKm(origin, target);
    if (distance === null) return false;
    return distance <= radiusKm;
  },
  distanceKm(origin, target) {
    return haversineKm(origin, target);
  },
};

export type RadarTarget = {
  id: string;
  kind: "property" | "service";
  title: string;
  countryCode: string;
  cityId: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  /** Canonical public page, when the product exposes one. */
  url: string | null;
  extra: Record<string, unknown>;
};

export type RadarScanInput = {
  deviceId: string;
  sponsorId: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  kind: RadarKind;
  countryCode?: string;
  /** "global" only when the caller explicitly asked for it. Never a fallback. */
  scope?: "country" | "global";
  filters?: Record<string, unknown>;
};

export interface GeoRadarRepository {
  scan(input: RadarScanInput): Promise<RadarTarget[]>;
}

/**
 * Reads the CANONICAL catalogues.
 *
 * Properties come from `properties` — the same table `/api/properties` serves
 * and Phase 3A publishes into — not the legacy `property_listings` content
 * table. Only `approved` listings are eligible: draft, pending_review,
 * rejected, sold, rented and archived are never returned.
 *
 * Country isolation is absolute. There is no "or Oman" widening and no silent
 * global fallback: a scan is confined to the requested country unless the
 * caller explicitly asked for global scope.
 */
class DbGeoRadarRepository implements GeoRadarRepository {
  constructor(private db: D1Database) {}

  async scan(input: RadarScanInput): Promise<RadarTarget[]> {
    const targets: RadarTarget[] = [];
    const radius = Math.min(Math.max(input.radiusKm || 0, 0), RADAR_MAX_RADIUS_KM);
    const origin: GeoPoint = { latitude: input.latitude, longitude: input.longitude };
    const box = boundingBox(input.latitude, input.longitude, radius);
    const filters = input.filters ?? {};
    const country = String(input.countryCode ?? "").trim();
    const global = input.scope === "global";

    if (input.kind === "properties" || input.kind === "both") {
      const clauses: string[] = [
        "status = ?1",
        "latitude IS NOT NULL",
        "longitude IS NOT NULL",
        "latitude >= ?2",
        "latitude <= ?3",
        "longitude >= ?4",
        "longitude <= ?5",
      ];
      const params: unknown[] = ["approved", box.minLat, box.maxLat, box.minLng, box.maxLng];
      if (!global) {
        params.push(country.toUpperCase(), country.toLowerCase());
        clauses.push(`country IN (?${params.length - 1}, ?${params.length})`);
      }
      for (const [column, key] of [["deal_type", "dealType"], ["category", "category"], ["property_type", "propertyType"]] as const) {
        if (filters[key] !== undefined) {
          params.push(String(filters[key]).trim().toLowerCase());
          clauses.push(`${column} = ?${params.length}`);
        }
      }
      for (const [column, key] of [["bedrooms", "bedrooms"], ["bathrooms", "bathrooms"]] as const) {
        const value = numberOrNull(filters[key]);
        if (value !== null) {
          params.push(value);
          clauses.push(`${column} >= ?${params.length}`);
        }
      }
      const minPrice = numberOrNull(filters.minPrice);
      if (minPrice !== null) {
        params.push(minPrice);
        clauses.push(`price >= ?${params.length}`);
      }
      const maxPrice = numberOrNull(filters.maxPrice);
      if (maxPrice !== null) {
        params.push(maxPrice);
        clauses.push(`price <= ?${params.length}`);
      }
      params.push(RADAR_SCAN_LIMIT);

      const rows = await this.db
        .prepare(`SELECT * FROM properties WHERE ${clauses.join(" AND ")} LIMIT ?${params.length}`)
        .bind(...params)
        .all<Record<string, unknown>>();

      for (const row of rows.results ?? []) {
        // Country is re-verified here so a case difference in stored data can
        // never widen the scan.
        if (!global && !sameCountry(row.country, country)) continue;
        if (filters.city !== undefined && !sameText(row.city, filters.city)) continue;
        if (filters.district !== undefined && !sameText(row.district, filters.district)) continue;

        const point: GeoPoint = {
          latitude: row.latitude == null ? null : Number(row.latitude),
          longitude: row.longitude == null ? null : Number(row.longitude),
        };
        const distance = HaversineGeoDistanceProvider.distanceKm(origin, point);
        if (distance === null || distance > radius) continue;

        targets.push({
          id: String(row.id),
          kind: "property",
          title: String(row.title_ar || row.title_en || row.id),
          countryCode: String(row.country ?? ""),
          cityId: row.city ? String(row.city) : null,
          district: row.district ? String(row.district) : null,
          latitude: point.latitude,
          longitude: point.longitude,
          distanceKm: distance,
          url: `/properties/${String(row.id)}`,
          extra: {
            price: row.price == null ? null : Number(row.price),
            currency: row.currency == null ? null : String(row.currency),
            dealType: row.deal_type == null ? null : String(row.deal_type),
            category: row.category == null ? null : String(row.category),
            propertyType: row.property_type == null ? null : String(row.property_type),
            bedrooms: row.bedrooms == null ? null : Number(row.bedrooms),
            bathrooms: row.bathrooms == null ? null : Number(row.bathrooms),
          },
        });
      }
    }

    if (input.kind === "services" || input.kind === "both") {
      const clauses: string[] = [
        "status = ?1",
        "latitude IS NOT NULL",
        "longitude IS NOT NULL",
        "latitude >= ?2",
        "latitude <= ?3",
        "longitude >= ?4",
        "longitude <= ?5",
      ];
      const params: unknown[] = ["approved", box.minLat, box.maxLat, box.minLng, box.maxLng];
      if (!global) {
        params.push(country.toUpperCase(), country.toLowerCase());
        clauses.push(`country_code IN (?${params.length - 1}, ?${params.length})`);
      }
      params.push(RADAR_SCAN_LIMIT);

      const rows = await this.db
        .prepare(`SELECT * FROM service_provider_profiles WHERE ${clauses.join(" AND ")} LIMIT ?${params.length}`)
        .bind(...params)
        .all<Record<string, unknown>>();

      let categoryProviders: Set<string> | null = null;
      if (filters.category !== undefined) {
        const linked = await this.db
          .prepare("SELECT provider_id FROM service_provider_categories WHERE category_id = ?1")
          .bind(String(filters.category))
          .all<Record<string, unknown>>();
        categoryProviders = new Set((linked.results ?? []).map((entry) => String(entry.provider_id)));
      }

      for (const row of rows.results ?? []) {
        if (!global && !sameCountry(row.country_code, country)) continue;
        if (categoryProviders && !categoryProviders.has(String(row.id))) continue;

        const point: GeoPoint = {
          latitude: row.latitude == null ? null : Number(row.latitude),
          longitude: row.longitude == null ? null : Number(row.longitude),
        };
        const distance = HaversineGeoDistanceProvider.distanceKm(origin, point);
        if (distance === null || distance > radius) continue;

        targets.push({
          id: String(row.id),
          kind: "service",
          // Public display name only. Phone, WhatsApp, e-mail and every other
          // contact or internal field stay out of a radar target.
          title: String(row.display_name_ar || row.display_name_en || row.id),
          countryCode: String(row.country_code ?? ""),
          cityId: row.city_id ? String(row.city_id) : null,
          district: row.district_id ? String(row.district_id) : null,
          latitude: point.latitude,
          longitude: point.longitude,
          distanceKm: distance,
          url: null,
          extra: {
            rating: row.rating_avg == null ? null : Number(row.rating_avg),
            ratingCount: row.rating_count == null ? null : Number(row.rating_count),
          },
        });
      }
    }

    targets.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    return targets.slice(0, RADAR_MAX_RESULTS);
  }
}

export class GeoRadarService {
  constructor(
    private repository: GeoRadarRepository,
    private db: D1Database,
  ) {}

  async scan(input: RadarScanInput): Promise<{ targets: RadarTarget[]; queryId: string }> {
    const targets = await this.repository.scan(input);
    const queryId = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO office_radar_queries
          (id, device_id, sponsor_id, latitude, longitude, radius_km, kind, filters, matched_count)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
      )
      .bind(
        queryId,
        input.deviceId,
        input.sponsorId,
        input.latitude,
        input.longitude,
        Math.min(Math.max(input.radiusKm || 0, 0), RADAR_MAX_RADIUS_KM),
        input.kind,
        input.filters ? JSON.stringify(input.filters) : null,
        targets.length,
      )
      .run();
    return { targets, queryId };
  }
}

export async function createGeoRadarService(): Promise<GeoRadarService> {
  const db = await getIntegrationDb();
  return new GeoRadarService(new DbGeoRadarRepository(db), db);
}

export async function listRadarQueries(sponsorId?: string, deviceId?: string, limit = 20): Promise<Array<Record<string, unknown>>> {
  const db = await getIntegrationDb();
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (sponsorId) {
    params.push(sponsorId);
    clauses.push(`sponsor_id = ?${params.length}`);
  }
  if (deviceId) {
    params.push(deviceId);
    clauses.push(`device_id = ?${params.length}`);
  }
  const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  const rows = await db
    .prepare(
      `SELECT id, device_id, sponsor_id, latitude, longitude, radius_km, kind, filters, matched_count, created_at
       FROM office_radar_queries${where}
       ORDER BY created_at DESC
       LIMIT ?${params.length + 1}`,
    )
    .bind(...params, limit)
    .all<Record<string, unknown>>();
  return rows.results ?? [];
}

export type { RadarKind };
