import { NextRequest, NextResponse } from "next/server";
import { authenticateOfficeRequest, requireScope } from "@/lib/integration/office-auth";
import {
  OfficeRadarError,
  RADAR_DEFAULT_RADIUS_KM,
  RADAR_MAX_RESULTS,
  createGeoRadarService,
  listRadarQueries,
  normalizeRadarFilters,
} from "@/lib/integration/radar";
import { RADAR_MAX_RADIUS_KM, type RadarKind } from "@/lib/integration/constants";
import { logSecurityEvent } from "@/lib/security/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateOfficeRequest(req);
  if ("error" in auth) return auth.error;
  const blocked = requireScope(auth.device, "office.radar.read");
  if (blocked) return blocked;

  const queries = await listRadarQueries(auth.device.sponsorId, auth.device.deviceId, 20);
  return NextResponse.json({ queries });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateOfficeRequest(req);
  if ("error" in auth) return auth.error;
  const blocked = requireScope(auth.device, "office.radar.read");
  if (blocked) return blocked;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  // A radar scan is only meaningful from a real coordinate. Nothing here
  // guesses one from a city name, a country, a currency or an office profile.
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (
    body.latitude === undefined || body.longitude === undefined ||
    body.latitude === null || body.longitude === null ||
    !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
  ) {
    return NextResponse.json(
      { error: "LOCATION_REQUIRED", message: "a valid latitude and longitude are required for a radar scan" },
      { status: 400 },
    );
  }

  const requestedRadius = body.radiusKm === undefined || body.radiusKm === null || body.radiusKm === ""
    ? RADAR_DEFAULT_RADIUS_KM
    : Number(body.radiusKm);
  if (!Number.isFinite(requestedRadius) || requestedRadius <= 0) {
    return NextResponse.json({ error: "INVALID_RADIUS", message: "radiusKm must be a positive number" }, { status: 400 });
  }
  // Enforced maximum; the effective value is reported back.
  const radiusKm = Math.min(RADAR_MAX_RADIUS_KM, requestedRadius);

  const kind: RadarKind = (["properties", "services", "both"] as const).includes(body.kind as RadarKind)
    ? (body.kind as RadarKind)
    : "properties";

  const scope = String(body.scope ?? "country").trim().toLowerCase() === "global" ? "global" : "country";
  const countryCode = String(body.countryCode ?? "").trim();
  if (scope === "country" && countryCode.length === 0) {
    // No silent widening to every country.
    return NextResponse.json(
      { error: "COUNTRY_REQUIRED", message: "countryCode is required unless scope is explicitly \"global\"" },
      { status: 400 },
    );
  }

  let filters: Record<string, unknown>;
  try {
    filters = normalizeRadarFilters(
      kind,
      typeof body.filters === "object" && body.filters !== null ? (body.filters as Record<string, unknown>) : undefined,
    );
  } catch (error) {
    if (error instanceof OfficeRadarError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
    }
    throw error;
  }

  const service = await createGeoRadarService();
  const { targets, queryId } = await service.scan({
    deviceId: auth.device.deviceId,
    sponsorId: auth.device.sponsorId,
    latitude,
    longitude,
    radiusKm,
    kind,
    countryCode,
    scope,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  });

  await logSecurityEvent("OFFICE_RADAR_SCAN", { deviceId: auth.device.deviceId, kind, matched: targets.length });

  return NextResponse.json({
    queryId,
    radiusKm,
    scope,
    countryCode: scope === "global" ? null : countryCode,
    maxResults: RADAR_MAX_RESULTS,
    targets,
  });
}
