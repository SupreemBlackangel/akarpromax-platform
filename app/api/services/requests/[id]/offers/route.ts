import { NextRequest, NextResponse } from "next/server";

import { getSponsorIdentity, requireAuthenticatedEmail } from "@/lib/sponsor-auth";
import { createOffer, getRequest, listOffers } from "@services/core";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestRow = await getRequest(id);
  if (!requestRow) return NextResponse.json({ error: SERVICE_ERROR_CODES.REQUEST_NOT_FOUND }, { status: 404 });
  const offers = await listOffers(id);
  return NextResponse.json({ offers });
}

type OfferBody = {
  listingId?: string | null;
  price?: number;
  currency?: string;
  durationDays?: number | null;
  messageKey?: string | null;
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getSponsorIdentity();
  if (!identity.authenticated) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const { id } = await params;
  const userId = requireAuthenticatedEmail(identity);

  let body: OfferBody;
  try {
    body = (await request.json()) as OfferBody;
  } catch {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  if (typeof body.price !== "number" || body.price < 0) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }

  try {
    const offerId = await createOffer(
      {
        requestId: id,
        providerUserId: userId,
        listingId: body.listingId ?? null,
        price: body.price,
        currency: body.currency ?? "OMR",
        durationDays: body.durationDays ?? null,
        messageKey: body.messageKey ?? null,
      },
      {
        userId,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      },
    );
    return NextResponse.json({ ok: true, id: offerId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "REQUEST_NOT_FOUND") return NextResponse.json({ error: SERVICE_ERROR_CODES.REQUEST_NOT_FOUND }, { status: 404 });
    if (message === "REQUEST_NOT_OPEN") return NextResponse.json({ error: SERVICE_ERROR_CODES.REQUEST_NOT_OPEN }, { status: 409 });
    if (message === "OFFER_ALREADY_EXISTS") return NextResponse.json({ error: SERVICE_ERROR_CODES.OFFER_ALREADY_EXISTS }, { status: 409 });
    throw error;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, POST, OPTIONS" } });
}
