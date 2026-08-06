import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { getProviderProfileByUserId, addProviderCategory, listProviderCategories, removeProviderCategory } from "@/lib/services/marketplace";
import { SERVICE_ERROR_CODES } from "@/lib/services/constants";

export const dynamic = "force-dynamic";

function cleanNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const categories = await listProviderCategories(id);
  return NextResponse.json({ categories }, { headers: { "Cache-Control": "public, max-age=60" } });
}

export async function POST(request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const { id } = await params;
  const ownProfile = await getProviderProfileByUserId(identity.email);
  if (!ownProfile || String(ownProfile.id) !== id) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const categoryId = typeof body?.categoryId === "string" ? body.categoryId.trim() : "";
  if (!categoryId) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  await addProviderCategory(
    id,
    categoryId,
    {
      priceFrom: cleanNumber(body?.priceFrom),
      priceTo: cleanNumber(body?.priceTo),
      pricingUnit: typeof body?.pricingUnit === "string" ? body.pricingUnit.trim().slice(0, 24) || null : null,
      minDurationMin: cleanNumber(body?.minDurationMin),
      notes: typeof body?.notes === "string" ? body.notes.trim().slice(0, 500) || null : null,
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
  const { id } = await params;
  const ownProfile = await getProviderProfileByUserId(identity.email);
  if (!ownProfile || String(ownProfile.id) !== id) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const categoryId = request.nextUrl.searchParams.get("categoryId") ?? "";
  if (!categoryId) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  await removeProviderCategory(id, categoryId, { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null });
  return NextResponse.json({ ok: true });
}
