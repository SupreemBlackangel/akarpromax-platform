import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { reviseOffer } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";
import { resolveCurrencyCode } from "@services/currency-policy";

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

export async function POST(request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const currency = resolveCurrencyCode(body.currency);
  if (!currency.ok) {
    return NextResponse.json({ error: currency.error }, { status: 400 });
  }
  try {
    await reviseOffer(
      id,
      {
        requestId: clean(body.requestId, 80),
        providerUserId: identity.email,
        price: cleanNumber(body.price),
        currency: currency.code,
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
        reason: clean(body.reason, 500) || null,
      },
      { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null },
    );
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message;
      if (message === "OFFER_NOT_FOUND") return NextResponse.json({ error: SERVICE_ERROR_CODES.OFFER_NOT_FOUND }, { status: 404 });
      if (message === "ONLY_PROVIDER") return NextResponse.json({ error: SERVICE_ERROR_CODES.ONLY_PROVIDER }, { status: 403 });
      if (message === "OFFER_NOT_SENT") return NextResponse.json({ error: SERVICE_ERROR_CODES.OFFER_NOT_SENT }, { status: 400 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true });
}
