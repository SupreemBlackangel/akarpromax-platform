import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getJobDetail } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";
import { getDirectBooking, getDirectBookingRow } from "@services/booking";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const { id } = await params;
  const direct = await getDirectBookingRow(id);
  if (direct) {
    try {
      const job = await getDirectBooking(id, {
        userId: identity.email,
        canManageAll: hasSponsorPermission(identity, PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL),
      });
      return NextResponse.json({ job }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (error instanceof Error && error.message === "BOOKING_FORBIDDEN") {
        return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_PARTICIPANT }, { status: 403 });
      }
      throw error;
    }
  }
  const job = await getJobDetail(id, identity.email);
  if (!job) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.ORDER_NOT_FOUND }, { status: 404 });
  }
  return NextResponse.json({ job }, { headers: { "Cache-Control": "no-store" } });
}
