import { NextRequest, NextResponse } from "next/server";

import { getSponsorIdentity, requireAuthenticatedEmail } from "@/lib/sponsor-auth";
import { updateOrderStatus } from "@services/core";
import { SERVICE_ERROR_CODES, type OrderStatus } from "@services/constants";

export const dynamic = "force-dynamic";

type StatusBody = {
  status?: OrderStatus;
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getSponsorIdentity();
  if (!identity.authenticated) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const { id } = await params;
  const userId = requireAuthenticatedEmail(identity);

  let body: StatusBody;
  try {
    body = (await request.json()) as StatusBody;
  } catch {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  if (!body.status) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }

  try {
    await updateOrderStatus(id, body.status, userId, {
      userId,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const mapping: Record<string, { code: string; status: number }> = {
      ORDER_NOT_FOUND: { code: SERVICE_ERROR_CODES.ORDER_NOT_FOUND, status: 404 },
      NOT_PARTICIPANT: { code: SERVICE_ERROR_CODES.NOT_PARTICIPANT, status: 403 },
      ORDER_STATUS_INVALID: { code: SERVICE_ERROR_CODES.ORDER_STATUS_INVALID, status: 409 },
    };
    const mapped = mapping[message];
    if (mapped) return NextResponse.json({ error: mapped.code }, { status: mapped.status });
    throw error;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "PATCH, OPTIONS" } });
}
