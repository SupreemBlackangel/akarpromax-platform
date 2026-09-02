import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { createDirectBooking, listDirectBookings } from "@services/booking";
import { SERVICE_ERROR_CODES } from "@services/constants";
import { limitOr429 } from "@services/rate-limit";

export const dynamic = "force-dynamic";

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function numberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  const requestedRole = request.nextUrl.searchParams.get("role");
  const role = requestedRole === "provider" || requestedRole === "customer" ? requestedRole : undefined;
  const bookings = await listDirectBookings({
    userId: identity.email,
    canManageAll: hasSponsorPermission(identity, PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL),
  }, role);
  return NextResponse.json({ bookings }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const limited = await limitOr429(request, "services_write");
  if (limited) return limited;
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  if (!hasSponsorPermission(identity, PERMISSIONS.SERVICE_REQUESTS_MANAGE_OWN)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  const providerId = clean(body.providerId, 80);
  const categoryId = clean(body.categoryId, 80);
  const countryCode = clean(body.countryCode, 8);
  const cityId = clean(body.cityId, 100);
  const scheduledAt = clean(body.scheduledAt, 50);
  const contactPreference = clean(body.contactPreference, 16);
  const contactPhone = clean(body.contactPhone, 32) || null;
  const contactEmail = clean(body.contactEmail, 200) || null;
  if (!providerId || !categoryId || !countryCode || !cityId || !scheduledAt || !["platform", "phone", "whatsapp", "email"].includes(contactPreference)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  if ((contactPreference === "phone" || contactPreference === "whatsapp") && !contactPhone) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  if (contactPreference === "email" && !contactEmail) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  try {
    const id = await createDirectBooking({
      providerId,
      categoryId,
      countryCode,
      cityId,
      districtId: clean(body.districtId, 100) || null,
      latitude: numberOrNull(body.latitude),
      longitude: numberOrNull(body.longitude),
      shortAddress: clean(body.shortAddress, 500) || null,
      scheduledAt,
      contactPreference: contactPreference as "platform" | "phone" | "whatsapp" | "email",
      contactPhone,
      contactEmail,
    }, identity.email, { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null });
    return NextResponse.json({ ok: true, id }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (["BOOKING_DATE_INVALID", "BOOKING_LOCATION_INVALID", "BOOKING_MODE_NOT_DIRECT", "BOOKING_PRICE_UNAVAILABLE", "BOOKING_SELF_NOT_ALLOWED"].includes(code)) {
      return NextResponse.json({ error: code.toLowerCase() }, { status: 400 });
    }
    if (code === "BOOKING_CATEGORY_NOT_FOUND" || code === "BOOKING_PROVIDER_UNAVAILABLE") {
      return NextResponse.json({ error: code.toLowerCase() }, { status: 404 });
    }
    throw error;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, POST, OPTIONS" } });
}
