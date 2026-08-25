import { NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getDirectBooking } from "@services/booking";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  const { id } = await params;
  try {
    const booking = await getDirectBooking(id, {
      userId: identity.email,
      canManageAll: hasSponsorPermission(identity, PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL),
    });
    return NextResponse.json({ booking }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "BOOKING_NOT_FOUND") return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
    if (code === "BOOKING_FORBIDDEN") return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
    throw error;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, OPTIONS" } });
}
