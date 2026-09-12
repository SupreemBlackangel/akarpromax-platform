import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getListing, updateListingStatus } from "@services/core";
import { isListingReviewerMove, LISTING_STATUS, SERVICE_ERROR_CODES } from "@services/constants";
import { toPublicServiceListing } from "@services/public-dto";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing || listing.status !== "active") {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
  }
  return NextResponse.json(
    { listing: toPublicServiceListing(listing) },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=90" } },
  );
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const listing = await getListing(id);
  if (!listing) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
  }
  const isOwner = String(listing.provider_user_id ?? "") === identity.email;
  // SERVICES_UPDATE is "edit your own work" — every `service_provider` carries
  // it. Reading it as a supervisory permission is what let any approved
  // provider publish, pause or bury another provider's listing. Reviewing is
  // SERVICES_APPROVE and nothing else.
  const isReviewer = hasSponsorPermission(identity, PERMISSIONS.SERVICES_APPROVE);
  if (!isOwner && !isReviewer) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const status = typeof body.status === "string" ? body.status.trim() : "";
  if (!status) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  // A refusal without a reason is a refusal the provider cannot act on.
  if (isListingReviewerMove(status) && status !== LISTING_STATUS.APPROVED && !note) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.LISTING_REVIEW_REASON_REQUIRED }, { status: 400 });
  }
  try {
    await updateListingStatus(id, status, {
      userId: identity.email,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      isOwner,
      isReviewer,
      note: note || null,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "LISTING_STATUS_UNKNOWN") {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.LISTING_STATUS_UNKNOWN }, { status: 400 });
    }
    if (code === "LISTING_STATUS_INVALID") {
      // The move is not available from where the listing stands — a different
      // answer from "you may not", and the client shows a different message.
      return NextResponse.json({ error: SERVICE_ERROR_CODES.LISTING_STATUS_INVALID, from: listing.status }, { status: 409 });
    }
    if (code === "LISTING_REVIEW_FORBIDDEN" || code === "LISTING_FORBIDDEN") {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.LISTING_REVIEW_FORBIDDEN }, { status: 403 });
    }
    if (code === "LISTING_NOT_FOUND") {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true });
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, PATCH, OPTIONS" } });
}
