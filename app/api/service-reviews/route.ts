import { NextRequest, NextResponse } from "next/server";

import { listReviews } from "@services/marketplace";
import { toPublicServiceReview } from "@services/public-dto";
import { limitOr429 } from "@services/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = await limitOr429(request, "services_public_read");
  if (limited) return limited;
  const searchParams = request.nextUrl.searchParams;
  const revieweeUserId = searchParams.get("revieweeUserId");
  const reviewerUserId = searchParams.get("reviewerUserId");
  const orderId = searchParams.get("orderId");
  if (!revieweeUserId && !reviewerUserId && !orderId) {
    return NextResponse.json({ error: "MISSING_QUERY" }, { status: 400 });
  }
  const reviews = await listReviews({
    revieweeUserId: revieweeUserId ?? undefined,
    reviewerUserId: reviewerUserId ?? undefined,
    orderId: orderId ?? undefined,
    limit: 100,
  });
  return NextResponse.json({ reviews: reviews.map(toPublicServiceReview) });
}
