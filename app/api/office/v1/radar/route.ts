import { NextRequest, NextResponse } from "next/server";
import { authenticateOfficeRequest, requireScope } from "@/lib/integration/office-auth";
import { createGeoRadarService, listRadarQueries } from "@/lib/integration/radar";
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

  const body = (await req.json()) as Record<string, unknown>;
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "latitude and longitude required" }, { status: 400 });
  }
  const radiusKm = Math.max(0, Math.min(RADAR_MAX_RADIUS_KM, Number(body.radiusKm ?? 10)));
  const kind: RadarKind = (["properties", "services", "both"] as const).includes(body.kind as RadarKind)
    ? (body.kind as RadarKind)
    : "properties";

  const service = await createGeoRadarService();
  const { targets, queryId } = await service.scan({
    deviceId: auth.device.deviceId,
    sponsorId: auth.device.sponsorId,
    latitude,
    longitude,
    radiusKm,
    kind,
    countryCode: String(body.countryCode ?? "om"),
    filters: typeof body.filters === "object" && body.filters !== null ? (body.filters as Record<string, unknown>) : undefined,
  });

  await logSecurityEvent("OFFICE_RADAR_SCAN", { deviceId: auth.device.deviceId, kind, matched: targets.length });

  return NextResponse.json({ queryId, targets });
}
