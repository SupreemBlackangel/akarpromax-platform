import { NextRequest, NextResponse } from "next/server";

import { getSponsorIdentity, requireAuthenticatedEmail } from "@/lib/sponsor-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { addReview } from "@services/core";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

type ReviewBody = {
  rating?: number;
  comment?: string | null;
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getSponsorIdentity();
  if (!identity.authenticated) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const { id } = await params;
  const userId = requireAuthenticatedEmail(identity);

  let body: ReviewBody;
  try {
    body = (await request.json()) as ReviewBody;
  } catch {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }

  const db = await getRuntimeDb();
  const order = await db.prepare("SELECT * FROM service_orders WHERE id = ?1").bind(id).first<Record<string, unknown>>();
  if (!order) return NextResponse.json({ error: SERVICE_ERROR_CODES.ORDER_NOT_FOUND }, { status: 404 });

  if (order.customer_user_id !== userId && order.provider_user_id !== userId) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_PARTICIPANT }, { status: 403 });
  }
  const reviewee = order.customer_user_id === userId ? String(order.provider_user_id) : String(order.customer_user_id);

  try {
    const reviewId = await addReview(
      {
        orderId: id,
        reviewerUserId: userId,
        revieweeUserId: reviewee,
        rating: Number(body.rating ?? 0),
        comment: body.comment ?? null,
      },
      {
        userId,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      },
    );
    return NextResponse.json({ ok: true, id: reviewId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "REVIEW_ALREADY_EXISTS") {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.REVIEW_ALREADY_EXISTS }, { status: 409 });
    }
    if (message === "RATING_INVALID") {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.RATING_INVALID }, { status: 400 });
    }
    throw error;
  }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getRuntimeDb();
  const reviews = await db.prepare("SELECT * FROM service_reviews WHERE order_id = ?1 ORDER BY created_at DESC").bind(id).all<Record<string, unknown>>();
  return NextResponse.json({ reviews: reviews.results ?? [] });
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, POST, OPTIONS" } });
}
