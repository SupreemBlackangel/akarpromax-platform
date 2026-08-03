import { NextRequest, NextResponse } from "next/server";

import { getSponsorIdentity, requireAuthenticatedEmail } from "@/lib/sponsor-auth";
import { acceptOffer, cancelRequest, getRequest, listOffers } from "@/lib/services/core";
import { SERVICE_ERROR_CODES } from "@/lib/services/constants";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestRow = await getRequest(id);
  if (!requestRow) return NextResponse.json({ error: SERVICE_ERROR_CODES.REQUEST_NOT_FOUND }, { status: 404 });
  const offers = await listOffers(id);
  return NextResponse.json({ request: requestRow, offers });
}

type ActionBody = {
  action: "cancel" | "acceptOffer";
  offerId?: string;
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getSponsorIdentity();
  if (!identity.authenticated) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const { id } = await params;
  const userId = requireAuthenticatedEmail(identity);

  let body: ActionBody;
  try {
    body = (await request.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }

  try {
    if (body.action === "cancel") {
      await cancelRequest(id, userId, {
        userId,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "acceptOffer" && body.offerId) {
      const orderId = await acceptOffer(body.offerId, userId, {
        userId,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      });
      return NextResponse.json({ ok: true, orderId });
    }
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const mapping: Record<string, { code: string; status: number }> = {
      REQUEST_NOT_FOUND: { code: SERVICE_ERROR_CODES.REQUEST_NOT_FOUND, status: 404 },
      REQUEST_NOT_OPEN: { code: SERVICE_ERROR_CODES.REQUEST_NOT_OPEN, status: 409 },
      ONLY_CUSTOMER: { code: SERVICE_ERROR_CODES.ONLY_CUSTOMER, status: 403 },
      OFFER_NOT_FOUND: { code: SERVICE_ERROR_CODES.OFFER_NOT_FOUND, status: 404 },
      OFFER_NOT_SENT: { code: SERVICE_ERROR_CODES.OFFER_NOT_SENT, status: 409 },
    };
    const mapped = mapping[message];
    if (mapped) return NextResponse.json({ error: mapped.code }, { status: mapped.status });
    throw error;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, PATCH, OPTIONS" } });
}
