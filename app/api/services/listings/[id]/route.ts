import { NextRequest, NextResponse } from "next/server";

import { getSponsorIdentity, hasSponsorPermission, requireAuthenticatedEmail } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getRuntimeDb } from "@/lib/runtime-db";
import { providerAverageRating, updateListingStatus } from "@/lib/services/core";
import { SERVICE_ERROR_CODES, isListingStatus } from "@/lib/services/constants";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getRuntimeDb();
  const listing = await db.prepare("SELECT * FROM service_listings WHERE id = ?1").bind(id).first<Record<string, unknown>>();
  if (!listing) return NextResponse.json({ error: SERVICE_ERROR_CODES.LISTING_NOT_FOUND }, { status: 404 });

  const providerUserId = String(listing.provider_user_id ?? "");
  const [rating, reviews] = await Promise.all([
    providerAverageRating(providerUserId),
    db
      .prepare("SELECT * FROM service_reviews WHERE reviewee_user_id = ?1 ORDER BY created_at DESC LIMIT 50")
      .bind(providerUserId)
      .all<Record<string, unknown>>(),
  ]);

  return NextResponse.json({ listing: { ...listing, providerAverageRating: rating.avg, providerRatingCount: rating.count }, reviews: reviews.results ?? [] });
}

type PatchBody = {
  status?: string;
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.SERVICES_APPROVE)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const userId = requireAuthenticatedEmail(identity);
  const { id } = await params;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  if (!body.status || !isListingStatus(body.status)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }

  try {
    await updateListingStatus(id, body.status, {
      userId,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "LISTING_NOT_FOUND") return NextResponse.json({ error: SERVICE_ERROR_CODES.LISTING_NOT_FOUND }, { status: 404 });
    throw error;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, PATCH, OPTIONS" } });
}
