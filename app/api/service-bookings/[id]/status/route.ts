import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { DIRECT_BOOKING_STATUS, transitionDirectBooking, type DirectBookingStatus } from "@services/booking";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const status = typeof body?.status === "string" ? body.status : "";
  if (!Object.values(DIRECT_BOOKING_STATUS).includes(status as DirectBookingStatus)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.ORDER_STATUS_INVALID }, { status: 400 });
  }
  const { id } = await params;
  try {
    await transitionDirectBooking(id, status as DirectBookingStatus, {
      userId: identity.email,
      canManageAll: hasSponsorPermission(identity, PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL),
    }, typeof body?.note === "string" ? body.note.trim().slice(0, 500) || null : null, {
      userId: identity.email,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "BOOKING_NOT_FOUND") return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
    if (code === "BOOKING_FORBIDDEN") return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
    if (code === "BOOKING_STATUS_INVALID") return NextResponse.json({ error: SERVICE_ERROR_CODES.ORDER_STATUS_INVALID }, { status: 400 });
    throw error;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "PATCH, OPTIONS" } });
}
