import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { addReviewFull, getJobDetail } from "@/lib/services/marketplace";
import { SERVICE_ERROR_CODES } from "@/lib/services/constants";

export const dynamic = "force-dynamic";

function cleanNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const { id } = await params;
  const job = await getJobDetail(id, identity.email);
  if (!job) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.ORDER_NOT_FOUND }, { status: 404 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const rating = cleanNumber(body.rating);
  if (rating == null || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.RATING_INVALID }, { status: 400 });
  }
  const isCustomer = String(job.customer_user_id) === identity.email;
  const revieweeUserId = isCustomer ? String(job.provider_user_id) : String(job.customer_user_id);
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 2000) || null : null;
  try {
    const reviewId = await addReviewFull(
      {
        orderId: id,
        reviewerUserId: identity.email,
        revieweeUserId,
        rating,
        comment,
        qualityRating: cleanNumber(body.qualityRating),
        punctualityRating: cleanNumber(body.punctualityRating),
        communicationRating: cleanNumber(body.communicationRating),
        valueRating: cleanNumber(body.valueRating),
        recommend: body.recommend == null ? null : body.recommend === true,
      },
      { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null },
    );
    return NextResponse.json({ ok: true, id: reviewId }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message;
      if (message === "ORDER_NOT_COMPLETED") return NextResponse.json({ error: "order_not_completed" }, { status: 400 });
      if (message === "REVIEW_ALREADY_EXISTS") return NextResponse.json({ error: SERVICE_ERROR_CODES.REVIEW_ALREADY_EXISTS }, { status: 409 });
    }
    throw error;
  }
}
