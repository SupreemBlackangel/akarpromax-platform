import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getCategoryById, updateServiceCategory, deleteServiceCategory } from "@/lib/services/marketplace";
import { SERVICE_ERROR_CODES } from "@/lib/services/constants";

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
      nameAr: body.nameAr == null ? null : clean(body.nameAr, 200),
      nameEn: body.nameEn == null ? null : clean(body.nameEn, 200),
      nameTr: body.nameTr == null ? null : clean(body.nameTr, 200),
      descriptionAr: body.descriptionAr == null ? null : clean(body.descriptionAr, 800),
      descriptionEn: body.descriptionEn == null ? null : clean(body.descriptionEn, 800),
      descriptionTr: body.descriptionTr == null ? null : clean(body.descriptionTr, 800),
      icon: body.icon == null ? null : clean(body.icon, 200),
      imageUrl: body.imageUrl == null ? null : clean(body.imageUrl, 800),
      requiresLicense: body.requiresLicense == null ? null : body.requiresLicense === true,
      requiresVisit: body.requiresVisit == null ? null : body.requiresVisit === true,
      priceMin: body.priceMin === undefined ? null : cleanNumber(body.priceMin),
      priceMax: body.priceMax === undefined ? null : cleanNumber(body.priceMax),
      dynamicFields: body.dynamicFields === undefined ? null : Array.isArray(body.dynamicFields) ? (body.dynamicFields as Array<Record<string, unknown>>) : null,
      sortOrder: body.sortOrder === undefined ? null : Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : null,
      isActive: body.isActive == null ? null : body.isActive === true,
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
