import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { acceptOfferFlow } from "@/lib/services/marketplace";
import { SERVICE_ERROR_CODES } from "@/lib/services/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const { id } = await params;
  try {
    const orderId = await acceptOfferFlow(id, identity.email, { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null });
    return NextResponse.json({ ok: true, orderId }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message;
      if (message === "OFFER_NOT_FOUND") return NextResponse.json({ error: SERVICE_ERROR_CODES.OFFER_NOT_FOUND }, { status: 404 });
      if (message === "REQUEST_NOT_FOUND") return NextResponse.json({ error: SERVICE_ERROR_CODES.REQUEST_NOT_FOUND }, { status: 404 });
      if (message === "ONLY_CUSTOMER") return NextResponse.json({ error: SERVICE_ERROR_CODES.ONLY_CUSTOMER }, { status: 403 });
      if (message === "REQUEST_NOT_OPEN" || message === "OFFER_NOT_SENT") return NextResponse.json({ error: SERVICE_ERROR_CODES.OFFER_NOT_SENT }, { status: 400 });
      if (message === "OFFER_EXPIRED") return NextResponse.json({ error: "offer_expired" }, { status: 400 });
    }
    throw error;
  }
}
