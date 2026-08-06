import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { createOfferFull, listOffersForParticipant } from "@/lib/services/marketplace";
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

export async function GET(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const q = request.nextUrl.searchParams;
  const limit = q.get("limit") ? Math.max(1, Math.min(100, Number(q.get("limit")) || 100)) : 100;
  const offers = await listOffersForParticipant(identity.email, { mine: q.get("mine") === "1", limit });
  return NextResponse.json({ offers }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  if (!hasSponsorPermission(identity, PERMISSIONS.SERVICE_OFFERS_MANAGE_OWN) && !hasSponsorPermission(identity, PERMISSIONS.SERVICE_OFFERS_MANAGE_ALL)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const requestId = clean(body.requestId, 80);
  if (!requestId) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  try {
    const id = await createOfferFull(
      {
        requestId,
        providerUserId: identity.email,
        price: cleanNumber(body.price),
        currency: clean(body.currency, 8) || "OMR",
        durationDays: cleanNumber(body.durationDays),
        materialsIncluded: body.materialsIncluded === true,
        materialCost: cleanNumber(body.materialCost),
        laborCost: cleanNumber(body.laborCost),
        visitFee: cleanNumber(body.visitFee),
        taxAmount: cleanNumber(body.taxAmount),
        totalPrice: cleanNumber(body.totalPrice),
        durationText: clean(body.durationText, 200) || null,
        nearestDate: clean(body.nearestDate, 40) || null,
        offerNotes: clean(body.offerNotes, 2000) || null,
        terms: clean(body.terms, 2000) || null,
        validUntil: clean(body.validUntil, 40) || null,
        needsVisit: body.needsVisit === true,
        messageKey: clean(body.messageKey, 120) || null,
      },
      { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null },
    );
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message;
      if (message === "REQUEST_NOT_FOUND") return NextResponse.json({ error: SERVICE_ERROR_CODES.REQUEST_NOT_FOUND }, { status: 404 });
      if (message === "REQUEST_NOT_OPEN") return NextResponse.json({ error: SERVICE_ERROR_CODES.REQUEST_NOT_OPEN }, { status: 400 });
      if (message === "PROVIDER_PROFILE_REQUIRED" || message === "PROVIDER_NOT_APPROVED") return NextResponse.json({ error: "provider_profile_required" }, { status: 403 });
      if (message === "OFFER_ALREADY_EXISTS") return NextResponse.json({ error: SERVICE_ERROR_CODES.OFFER_ALREADY_EXISTS }, { status: 409 });
    }
    throw error;
  }
}
