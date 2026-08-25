import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { createListing, listListings } from "@services/core";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const limitRaw = q.get("limit");
  const offsetRaw = q.get("offset");
  const latRaw = q.get("lat");
  const lonRaw = q.get("lon");
  const radiusRaw = q.get("radiusKm");

  const limit = limitRaw == null ? 20 : Number(limitRaw);
  const offset = offsetRaw == null ? 0 : Number(offsetRaw);
  const latitude = latRaw == null ? undefined : Number(latRaw);
  const longitude = lonRaw == null ? undefined : Number(lonRaw);
  const radiusKm = radiusRaw == null ? undefined : Number(radiusRaw);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_QUERY }, { status: 400 });
  }
  if (!Number.isInteger(offset) || offset < 0) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_QUERY }, { status: 400 });
  }
  if ((latRaw != null && !Number.isFinite(latitude)) || (lonRaw != null && !Number.isFinite(longitude)) || (radiusRaw != null && !Number.isFinite(radiusKm))) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_QUERY }, { status: 400 });
  }
  if ((latRaw != null) !== (lonRaw != null)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_QUERY }, { status: 400 });
  }

  const listings = await listListings({
    categoryId: q.get("categoryId") ?? undefined,
    countryCode: q.get("country") ?? undefined,
    cityId: q.get("cityId") ?? undefined,
    status: q.get("status") ?? undefined,
    latitude,
    longitude,
    radiusKm,
    limit,
    offset,
  });
  return NextResponse.json({ listings }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=90" } });
}

export async function POST(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  if (!hasSponsorPermission(identity, PERMISSIONS.SERVICES_CREATE)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const categoryId = clean(body.categoryId, 80);
  const countryCode = clean(body.countryCode, 8);
  const cityId = clean(body.cityId, 100);
  if (!categoryId || !countryCode || !cityId) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const id = await createListing(
    {
      providerUserId: identity.email,
      categoryId,
      countryCode,
      cityId,
      districtId: clean(body.districtId, 100) || null,
      titleKey: clean(body.titleKey, 300) || null,
      descriptionKey: clean(body.descriptionKey, 4000) || null,
      price: cleanNumber(body.price) ?? 0,
      currency: clean(body.currency, 8) || "OMR",
      unit: clean(body.unit, 24) || "project",
      status: clean(body.status, 24) || "active",
      tags: Array.isArray(body.tags) ? body.tags.map(String).slice(0, 20) : [],
      latitude: cleanNumber(body.latitude),
      longitude: cleanNumber(body.longitude),
    },
    { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null },
  );
  return NextResponse.json({ ok: true, id }, { status: 201 });
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, POST, OPTIONS" } });
}
