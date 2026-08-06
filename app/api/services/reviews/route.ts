import { NextRequest, NextResponse } from "next/server";

import { getRuntimeDb } from "@/lib/runtime-db";
import { reviewsForReviewee } from "@services/core";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const providerUserId = request.nextUrl.searchParams.get("providerUserId");
  if (!providerUserId) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_QUERY }, { status: 400 });
  }
  const db = await getRuntimeDb();
  const [reviews, aggregate] = await Promise.all([
    reviewsForReviewee(providerUserId),
    db
      .prepare("SELECT COUNT(*) AS count, AVG(rating) AS avg FROM service_reviews WHERE reviewee_user_id = ?1")
      .bind(providerUserId)
      .first<Record<string, unknown>>(),
  ]);
  return NextResponse.json({
    reviews,
    aggregate: {
      count: Number(aggregate?.count ?? 0),
      avg: Number(aggregate?.avg ?? 0),
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, OPTIONS" } });
}
