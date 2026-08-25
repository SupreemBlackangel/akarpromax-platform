import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { updateJobStatus } from "@services/marketplace";
import { SERVICE_ERROR_CODES, type OrderStatus } from "@services/constants";
import { DIRECT_BOOKING_STATUS, getDirectBookingRow, transitionDirectBooking, type DirectBookingStatus } from "@services/booking";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES: OrderStatus[] = ["scheduled", "in_progress", "waiting_customer_confirmation", "delivered", "completed", "cancelled", "disputed"];

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { status?: string; note?: string } | null;
  const status = typeof body?.status === "string" ? body.status : "";
  const direct = await getDirectBookingRow(id);
  if (direct) {
    if (!Object.values(DIRECT_BOOKING_STATUS).includes(status as DirectBookingStatus)) {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.ORDER_STATUS_INVALID }, { status: 400 });
    }
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
      if (code === "BOOKING_FORBIDDEN") return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_PARTICIPANT }, { status: 403 });
      if (code === "BOOKING_STATUS_INVALID") return NextResponse.json({ error: SERVICE_ERROR_CODES.ORDER_STATUS_INVALID }, { status: 400 });
      throw error;
    }
  }
  if (!ALLOWED_STATUSES.includes(status as OrderStatus)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.ORDER_STATUS_INVALID }, { status: 400 });
  }
  try {
    await updateJobStatus(
      id,
      status as OrderStatus,
      identity.email,
      typeof body?.note === "string" ? body.note.trim().slice(0, 500) || null : null,
      { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null },
    );
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message;
      if (message === "ORDER_NOT_FOUND") return NextResponse.json({ error: SERVICE_ERROR_CODES.ORDER_NOT_FOUND }, { status: 404 });
      if (message === "NOT_PARTICIPANT") return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_PARTICIPANT }, { status: 403 });
      if (message === "ORDER_STATUS_INVALID") return NextResponse.json({ error: SERVICE_ERROR_CODES.ORDER_STATUS_INVALID }, { status: 400 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true });
}
