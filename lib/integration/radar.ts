import { getIntegrationDb } from "@/lib/integration/db";
import { RADAR_MAX_RADIUS_KM, type RadarKind } from "@/lib/integration/constants";

export type GeoPoint = { latitude: number | null; longitude: number | null };

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
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
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
  filters?: Record<string, unknown>;
};

export interface GeoRadarRepository {
  scan(input: RadarScanInput): Promise<RadarTarget[]>;
}

class DbGeoRadarRepository implements GeoRadarRepository {
  constructor(private db: D1Database) {}

  async scan(input: RadarScanInput): Promise<RadarTarget[]> {
    const targets: RadarTarget[] = [];
    const radius = Math.min(Math.max(input.radiusKm || 0, 0), RADAR_MAX_RADIUS_KM);
    const origin: GeoPoint = { latitude: input.latitude, longitude: input.longitude };

    if (input.kind === "properties" || input.kind === "both") {
      const rows = await this.db
        .prepare(
          `SELECT id, title_ar, title_en, country_code, city_id, latitude, longitude, price, status
           FROM property_listings
           WHERE status = 'active'
             AND (country_code = ?1 OR country_code = 'om')
           ORDER BY priority ASC`,
        )
        .bind(String(input.countryCode || "om").toLowerCase())
        .all<Record<string, unknown>>();
      for (const row of rows.results ?? []) {
        const point: GeoPoint = {
          latitude: row.latitude == null ? null : Number(row.latitude),
          longitude: row.longitude == null ? null : Number(row.longitude),
        };
        const distance = HaversineGeoDistanceProvider.distanceKm(origin, point);
        if (distance === null) continue;
        if (distance > radius) continue;
        targets.push({
          id: String(row.id),
          kind: "property",
          title: String(row.title_ar || row.title_en || row.id),
          countryCode: String(row.country_code),
          cityId: row.city_id ? String(row.city_id) : null,
          latitude: point.latitude,
          longitude: point.longitude,
          distanceKm: distance,
          extra: { price: row.price, status: String(row.status) },
        });
      }
    }

    if (input.kind === "services" || input.kind === "both") {
      const rows = await this.db
        .prepare(
          `SELECT p.id, p.business_name, p.country_code, p.city_id, p.latitude, p.longitude, p.rating_avg
           FROM service_provider_profiles p
           WHERE p.status = 'approved'
             AND (p.country_code = ?1 OR p.country_code = 'OM')
           ORDER BY p.rating_avg DESC`,
        )
        .bind(String(input.countryCode || "om").toUpperCase())
        .all<Record<string, unknown>>();
      for (const row of rows.results ?? []) {
        const point: GeoPoint = {
          latitude: row.latitude == null ? null : Number(row.latitude),
          longitude: row.longitude == null ? null : Number(row.longitude),
        };
        const distance = HaversineGeoDistanceProvider.distanceKm(origin, point);
        if (distance === null) continue;
        if (distance > radius) continue;
        targets.push({
          id: String(row.id),
          kind: "service",
          title: String(row.business_name || row.id),
          countryCode: String(row.country_code),
          cityId: row.city_id ? String(row.city_id) : null,
          latitude: point.latitude,
          longitude: point.longitude,
          distanceKm: distance,
          extra: { rating: row.rating_avg },
        });
      }
    }

    targets.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    return targets;
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
