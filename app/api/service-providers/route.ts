import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { listProviderProfiles, upsertProviderProfile } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";
import { toPublicProviderProfile } from "@services/public-dto";
import { GeoService } from "@/lib/services/geo/geo.service";
import { resolveGeoSelection } from "@/lib/services/geo/selection";
import { limitOr429 } from "@services/rate-limit";

export const dynamic = "force-dynamic";

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: NextRequest) {
  const limited = await limitOr429(request, "services_public_read");
  if (limited) return limited;
  const q = request.nextUrl.searchParams;
  const admin = q.get("admin") === "1";
  const status = admin ? q.get("status") ?? undefined : "approved";
  if (admin) {
    const identity = await getSessionIdentity();
    if (!identity.authenticated || !hasSponsorPermission(identity, PERMISSIONS.SERVICE_PROVIDERS_REVIEW)) {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
    }
  }
  const rawScope = q.get("scope");
  if (rawScope && rawScope !== "local" && rawScope !== "global") {
    return NextResponse.json({ error: "GEO_INVALID_SELECTION" }, { status: 400 });
  }
  const geoResolution = await resolveGeoSelection({
    scope: rawScope as "local" | "global" | undefined,
    country: q.get("country"),
    governorate: q.get("governorate"),
    city: q.get("cityId"),
    district: q.get("districtId"),
  }, new GeoService());
  if (!geoResolution.ok) {
    return NextResponse.json({ error: geoResolution.error }, { status: 400 });
  }

  const rawLatitude = q.get("latitude");
  const rawLongitude = q.get("longitude");
  const rawRadius = q.get("radiusKm");
  const latitude = cleanNumber(rawLatitude);
  const longitude = cleanNumber(rawLongitude);
  const radiusKm = cleanNumber(rawRadius);
  const hasAnyRadiusInput = rawLatitude != null || rawLongitude != null || rawRadius != null;
  if (hasAnyRadiusInput && (
    latitude == null || longitude == null || radiusKm == null
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
    || radiusKm <= 0 || radiusKm > 500
  )) {
    return NextResponse.json({ error: "GEO_INVALID_RADIUS" }, { status: 400 });
  }

  const geo = geoResolution.value;
  const profiles = await listProviderProfiles({
    countryCode: geo.country?.code,
    countryAliases: geo.aliases.country,
    governorate: geo.governorate?.code ?? geo.governorate?.id,
    governorateAliases: geo.aliases.governorate,
    cityId: geo.city?.code ?? geo.city?.id,
    cityAliases: geo.aliases.city,
    districtId: geo.district?.code ?? geo.district?.id,
    districtAliases: geo.aliases.district,
    latitude: latitude ?? undefined,
    longitude: longitude ?? undefined,
    radiusKm: radiusKm ?? undefined,
    status,
    categoryId: q.get("categoryId") ?? undefined,
    search: q.get("search") ?? undefined,
    limit: q.get("limit") ? Math.max(1, Math.min(100, Number(q.get("limit")) || 50)) : 50,
  });
  // The same allow-list the single-profile route uses, rather than a list of
  // fields to delete.
  //
  // A deny-list fails open: every column added to service_provider_profiles is
  // published to the public directory until somebody remembers to extend the
  // array. That had already happened -- `suspended_at` was not in the deny-list,
  // so the directory told the world that a provider had been suspended and
  // exactly when, while the profile page for the same provider correctly
  // withheld it. `created_at` and `updated_at` leaked the same way.
  //
  // An allow-list fails closed. A new column is invisible until someone decides
  // it should be public, which is the direction the mistake should point.
  const safeProfiles = admin ? profiles : profiles.map(toPublicProviderProfile);
  return NextResponse.json({ profiles: safeProfiles }, { headers: { "Cache-Control": admin ? "no-store" : "public, max-age=60, stale-while-revalidate=120" } });
}

export async function POST(request: NextRequest) {
  const limited = await limitOr429(request, "services_write");
  if (limited) return limited;
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const countryCode = clean(body.countryCode, 8);
  if (!countryCode) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const id = await upsertProviderProfile(
    {
      user_id: identity.email,
      displayNameAr: clean(body.displayNameAr, 200) || null,
      displayNameEn: clean(body.displayNameEn, 200) || null,
      bioAr: clean(body.bioAr, 2000) || null,
      bioEn: clean(body.bioEn, 2000) || null,
      logoUrl: clean(body.logoUrl, 800) || null,
      coverUrl: clean(body.coverUrl, 800) || null,
      phone: clean(body.phone, 40) || null,
      whatsapp: clean(body.whatsapp, 40) || null,
      email: clean(body.email, 200) || null,
      website: clean(body.website, 400) || null,
      countryCode,
      cityId: clean(body.cityId, 100) || null,
      districtId: clean(body.districtId, 100) || null,
      governorate: clean(body.governorate, 200) || null,
      latitude: cleanNumber(body.latitude),
      longitude: cleanNumber(body.longitude),
      serviceRadiusKm: cleanNumber(body.serviceRadiusKm) ?? 50,
      licensesText: clean(body.licensesText, 2000) || null,
      insuranceText: clean(body.insuranceText, 2000) || null,
      foundedYear: cleanNumber(body.foundedYear),
      teamSize: cleanNumber(body.teamSize),
      isBusiness: body.isBusiness === true,
      businessName: clean(body.businessName, 300) || null,
      taxNumber: clean(body.taxNumber, 100) || null,
      commercialRegistration: clean(body.commercialRegistration, 100) || null,
    },
    { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null },
  );
  return NextResponse.json({ ok: true, id }, { status: 200 });
}
