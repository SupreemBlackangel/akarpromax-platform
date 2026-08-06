import { NextRequest, NextResponse } from "next/server";

import { listReviews } from "@/lib/services/marketplace";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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
  return NextResponse.json({ reviews });
}
