import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { listProviderProfiles, upsertProviderProfile } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";

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
  const q = request.nextUrl.searchParams;
  const status = q.get("status") ?? undefined;
  if (status && !["approved", "active"].includes(status)) {
    const identity = await getSessionIdentity();
    if (!hasSponsorPermission(identity, PERMISSIONS.SERVICE_PROVIDERS_REVIEW)) {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
    }
  }
  const profiles = await listProviderProfiles({
    countryCode: q.get("country") ?? undefined,
    status,
    cityId: q.get("cityId") ?? undefined,
    categoryId: q.get("categoryId") ?? undefined,
    search: q.get("search") ?? undefined,
    limit: q.get("limit") ? Math.max(1, Math.min(100, Number(q.get("limit")) || 50)) : 50,
  });
  return NextResponse.json({ profiles }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" } });
}

export async function POST(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
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
      countryCode: clean(body.countryCode, 8) || "OM",
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
