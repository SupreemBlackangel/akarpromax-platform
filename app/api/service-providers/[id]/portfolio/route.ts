import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getProviderProfileByUserId, addPortfolioItem, listPortfolioItems } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const items = await listPortfolioItems(id);
  return NextResponse.json({ items }, { headers: { "Cache-Control": "public, max-age=60" } });
}

export async function POST(request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  if (!hasSponsorPermission(identity, PERMISSIONS.SERVICE_PROVIDERS_MANAGE)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const { id } = await params;
  const ownProfile = await getProviderProfileByUserId(identity.email);
  if (!ownProfile || String(ownProfile.id) !== id) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const itemId = await addPortfolioItem(
    {
      providerId: id,
      title: clean(body.title, 300) || null,
      description: clean(body.description, 2000) || null,
      imageUrl: clean(body.imageUrl, 800) || null,
      categoryId: clean(body.categoryId, 80) || null,
      cityId: clean(body.cityId, 100) || null,
      year: body.year == null || !Number.isFinite(Number(body.year)) ? null : Math.round(Number(body.year)),
      tags: Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim().slice(0, 60)).filter(Boolean).slice(0, 20) : [],
    },
    { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null },
  );
  return NextResponse.json({ ok: true, id: itemId }, { status: 201 });
}
