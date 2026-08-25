import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getCategoryById, updateServiceCategory, deleteServiceCategory } from "@services/marketplace";
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

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const category = await getCategoryById(id);
  if (!category) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.CATEGORY_NOT_FOUND }, { status: 404 });
  }
  return NextResponse.json({ category }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" } });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  if (!hasSponsorPermission(identity, PERMISSIONS.SERVICE_CATEGORIES_MANAGE)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const category = await getCategoryById(id);
  if (!category) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.CATEGORY_NOT_FOUND }, { status: 404 });
  }
  await updateServiceCategory(
    id,
    {
      parentId: body.parentId === undefined ? undefined : clean(body.parentId, 80) || null,
      nameAr: body.nameAr === undefined ? undefined : clean(body.nameAr, 200) || null,
      nameEn: body.nameEn === undefined ? undefined : clean(body.nameEn, 200) || null,
      nameTr: body.nameTr === undefined ? undefined : clean(body.nameTr, 200) || null,
      descriptionAr: body.descriptionAr === undefined ? undefined : clean(body.descriptionAr, 800) || null,
      descriptionEn: body.descriptionEn === undefined ? undefined : clean(body.descriptionEn, 800) || null,
      descriptionTr: body.descriptionTr === undefined ? undefined : clean(body.descriptionTr, 800) || null,
      icon: body.icon === undefined ? undefined : clean(body.icon, 200) || null,
      imageUrl: body.imageUrl === undefined ? undefined : clean(body.imageUrl, 800) || null,
      requiresLicense: body.requiresLicense === undefined ? undefined : body.requiresLicense === true,
      requiresVisit: body.requiresVisit === undefined ? undefined : body.requiresVisit === true,
      priceMin: body.priceMin === undefined ? undefined : cleanNumber(body.priceMin),
      priceMax: body.priceMax === undefined ? undefined : cleanNumber(body.priceMax),
      dynamicFields: body.dynamicFields === undefined ? undefined : Array.isArray(body.dynamicFields) ? (body.dynamicFields as Array<Record<string, unknown>>) : null,
      sortOrder: body.sortOrder === undefined ? undefined : Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : null,
      isActive: body.isActive === undefined ? undefined : body.isActive === true,
      isFeatured: body.isFeatured === undefined ? undefined : body.isFeatured === true,
      bookingMode: body.bookingMode === undefined ? undefined : ["instant", "quotes", "both"].includes(String(body.bookingMode)) ? body.bookingMode as "instant" | "quotes" | "both" : "quotes",
      badgeAr: body.badgeAr === undefined ? undefined : clean(body.badgeAr, 80) || null,
      badgeEn: body.badgeEn === undefined ? undefined : clean(body.badgeEn, 80) || null,
    },
    { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null },
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  if (!hasSponsorPermission(identity, PERMISSIONS.SERVICE_CATEGORIES_MANAGE)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const { id } = await params;
  try {
    await deleteServiceCategory(id, { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null });
  } catch (error) {
    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.CATEGORY_NOT_FOUND }, { status: 404 });
    }
    if (error instanceof Error && error.message === "CATEGORY_HAS_CHILDREN") {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.CATEGORY_HAS_CHILDREN }, { status: 409 });
    }
    if (error instanceof Error && error.message === "CATEGORY_IN_USE") {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.CATEGORY_IN_USE }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true });
}
