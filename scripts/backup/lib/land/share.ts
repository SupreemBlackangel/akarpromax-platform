import { Point, SavedLand } from "./contracts";
import { LandDirections, LandListingDraft, LandSharePayload } from "./contracts";

export interface ShareConfig {
  baseUrl: string;
  ttlMs?: number;
}

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function generateShareToken(landId: string): string {
  const rand = Math.random().toString(36).slice(2, 12);
  return `share_${landId.slice(0, 8)}_${rand}`;
}

export function createSharePayload(land: SavedLand, config: ShareConfig): LandSharePayload {
  const token = generateShareToken(land.id);
  const expiresAt = Date.now() + (config.ttlMs ?? DEFAULT_TTL_MS);
  const base = config.baseUrl.replace(/\/$/, "");
  const url = `${base}/land/${land.id}?share=${token}`;
  const lat = land.location.point.lat.toFixed(6);
  const lon = land.location.point.lon.toFixed(6);
  const qrPayload = JSON.stringify({
    t: "land",
    id: land.id,
    lat: Number(lat),
    lon: Number(lon),
    exp: expiresAt,
  });
  return { landId: land.id, shareToken: token, url, qrPayload, expiresAt };
}

export function buildMapViewUrl(point: Point, zoom = 16): string {
  return `https://www.openstreetmap.org/?mlat=${point.lat.toFixed(6)}&mlon=${point.lon.toFixed(6)}#map=${zoom}/${point.lat.toFixed(6)}/${point.lon.toFixed(6)}`;
}

export function buildDirections(from: Point, to: Point, provider: "google" | "osm" = "osm"): LandDirections {
  const toStr = `${to.lat.toFixed(6)},${to.lon.toFixed(6)}`;
  const fromStr = `${from.lat.toFixed(6)},${from.lon.toFixed(6)}`;
  if (provider === "google") {
    return {
      from,
      to,
      url: `https://www.google.com/maps/dir/?api=1&origin=${fromStr}&destination=${toStr}&travelmode=driving`,
      provider: "google",
    };
  }
  return {
    from,
    to,
    url: `https://www.openstreetmap.org/directions?from=${fromStr}&to=${toStr}`,
    provider: "osm",
  };
}

export function buildListingDraft(land: SavedLand): LandListingDraft {
  const tags: string[] = [];
  if (land.areaSqm) tags.push(`${land.areaSqm}m2`);
  if (land.reference?.parcelId) tags.push(`قطعة ${land.reference.parcelId}`);
  if (land.reference?.planId) tags.push(`مخطط ${land.reference.planId}`);
  if (land.location.city) tags.push(land.location.city);
  if (land.location.district) tags.push(land.location.district);
  if (land.location.countryCode) tags.push(land.location.countryCode);

  const titleParts = [land.title];
  if (land.location.district) titleParts.push(land.location.district);
  if (land.location.city) titleParts.push(land.location.city);
  const title = titleParts.join(" - ");

  const lines: string[] = [];
  lines.push(`خط العرض: ${land.location.point.lat.toFixed(6)}`);
  lines.push(`خط الطول: ${land.location.point.lon.toFixed(6)}`);
  if (land.areaSqm) lines.push(`المساحة: ${land.areaSqm} متر مربع`);
  if (land.reference?.parcelId) lines.push(`رقم القطعة: ${land.reference.parcelId}`);
  if (land.reference?.planId) lines.push(`رقم المخطط: ${land.reference.planId}`);
  if (land.notes) lines.push(land.notes);

  return {
    title,
    description: lines.join("\n"),
    landId: land.id,
    location: land.location,
    areaSqm: land.areaSqm,
    reference: land.reference,
    ownerId: land.ownerId,
    tags,
  };
}

export function validateShareToken(token: string | null | undefined): boolean {
  return typeof token === "string" && /^share_[A-Za-z0-9_]{10,}$/.test(token);
}
