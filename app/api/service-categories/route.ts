import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { listCategoriesFull, createServiceCategory } from "@services/marketplace";
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
  const country = request.nextUrl.searchParams.get("country") ?? undefined;
  const includeInactive = request.nextUrl.searchParams.get("admin") === "1";
  if (includeInactive) {
    const identity = await getSessionIdentity();
    if (!identity.authenticated || !hasSponsorPermission(identity, PERMISSIONS.SERVICE_CATEGORIES_MANAGE)) {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
    }
  }
  const categories = await listCategoriesFull(country, { includeInactive });
  return NextResponse.json({ categories }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" } });
}

export async function POST(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  if (!hasSponsorPermission(identity, PERMISSIONS.SERVICE_CATEGORIES_MANAGE)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const countryCode = clean(body.countryCode, 8) || "OM";
  const code = clean(body.code, 80);
  if (!code) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  try {
    const id = await createServiceCategory(
      {
        countryCode,
        code,
        parentId: clean(body.parentId, 80) || null,
        nameAr: clean(body.nameAr, 200) || null,
        nameEn: clean(body.nameEn, 200) || null,
        nameTr: clean(body.nameTr, 200) || null,
        descriptionAr: clean(body.descriptionAr, 800) || null,
        descriptionEn: clean(body.descriptionEn, 800) || null,
        descriptionTr: clean(body.descriptionTr, 800) || null,
        icon: clean(body.icon, 200) || null,
        imageUrl: clean(body.imageUrl, 800) || null,
        requiresLicense: body.requiresLicense === true,
        requiresVisit: body.requiresVisit === true,
        priceMin: cleanNumber(body.priceMin),
        priceMax: cleanNumber(body.priceMax),
        dynamicFields: Array.isArray(body.dynamicFields) ? (body.dynamicFields as Array<Record<string, unknown>>) : undefined,
        sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
        isFeatured: body.isFeatured === true,
        bookingMode: ["instant", "quotes", "both"].includes(String(body.bookingMode)) ? body.bookingMode as "instant" | "quotes" | "both" : "quotes",
        badgeAr: clean(body.badgeAr, 80) || null,
        badgeEn: clean(body.badgeEn, 80) || null,
      },
      { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null },
    );
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "CATEGORY_CONFLICT") {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.CATEGORY_CONFLICT }, { status: 409 });
    }
    throw error;
  }
}
