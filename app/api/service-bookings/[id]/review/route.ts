import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { reviewDirectBooking } from "@services/booking";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const rating = Number(body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: SERVICE_ERROR_CODES.RATING_INVALID }, { status: 400 });
  const { id } = await params;
  try {
    const reviewId = await reviewDirectBooking(id, { userId: identity.email }, {
      rating,
      comment: typeof body?.comment === "string" ? body.comment.trim().slice(0, 2000) || null : null,
      recommend: body?.recommend == null ? null : body.recommend === true,
    }, { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null });
    return NextResponse.json({ ok: true, id: reviewId }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "BOOKING_NOT_FOUND") return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
    if (code === "BOOKING_FORBIDDEN" || code === "NOT_PARTICIPANT") return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
    if (code === "ORDER_NOT_COMPLETED") return NextResponse.json({ error: "order_not_completed" }, { status: 400 });
    if (code === "REVIEW_ALREADY_EXISTS") return NextResponse.json({ error: SERVICE_ERROR_CODES.REVIEW_ALREADY_EXISTS }, { status: 409 });
    throw error;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "POST, OPTIONS" } });
}
