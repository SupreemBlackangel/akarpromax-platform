import { NextRequest, NextResponse } from "next/server";

import { getSponsorIdentity, hasSponsorPermission, requireAuthenticatedEmail } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { createListing, listListings, updateListingStatus } from "@/lib/services/core";
import { SERVICE_ERROR_CODES } from "@/lib/services/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const listings = await listListings({
    categoryId: q.get("categoryId") ?? undefined,
    countryCode: q.get("country") ?? undefined,
    cityId: q.get("city") ?? undefined,
    status: q.get("status") ?? undefined,
    latitude: q.get("lat") ? Number(q.get("lat")) : null,
    longitude: q.get("lng") ? Number(q.get("lng")) : null,
    radiusKm: q.get("radiusKm") ? Number(q.get("radiusKm")) : undefined,
    limit: q.get("limit") ? Number(q.get("limit")) : undefined,
  });
  return NextResponse.json({ listings });
}

type Body = {
  categoryId?: string;
  countryCode?: string;
  cityId?: string;
  districtId?: string | null;
  titleKey?: string | null;
  descriptionKey?: string | null;
  price?: number;
  currency?: string;
  unit?: string;
  tags?: string[];
  latitude?: number | null;
  longitude?: number | null;
};

export async function POST(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.SERVICES_CREATE)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  if (!identity.authenticated) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const userId = requireAuthenticatedEmail(identity);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }

  if (!body.categoryId || !body.countryCode || !body.cityId) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }

  const id = await createListing(
    {
      providerUserId: userId,
      categoryId: body.categoryId,
      countryCode: body.countryCode,
      cityId: body.cityId,
      districtId: body.districtId ?? null,
      titleKey: body.titleKey ?? null,
      descriptionKey: body.descriptionKey ?? null,
      price: body.price ?? 0,
      currency: body.currency ?? "OMR",
      unit: body.unit ?? "project",
      tags: body.tags ?? [],
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
    },
    { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null },
  );
  return NextResponse.json({ ok: true, id }, { status: 201 });
}

type StatusBody = {
  id?: string;
  status?: string;
};

export async function PATCH(request: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.SERVICES_UPDATE)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  let body: StatusBody;
  try {
    body = (await request.json()) as StatusBody;
  } catch {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  if (!body.id || !body.status) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  try {
    await updateListingStatus(body.id, body.status, {
      userId: identity.email,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "LISTING_NOT_FOUND") return NextResponse.json({ error: SERVICE_ERROR_CODES.LISTING_NOT_FOUND }, { status: 404 });
    if (message === "ORDER_STATUS_INVALID") return NextResponse.json({ error: SERVICE_ERROR_CODES.ORDER_STATUS_INVALID }, { status: 400 });
    throw error;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, POST, PATCH, OPTIONS" } });
}
