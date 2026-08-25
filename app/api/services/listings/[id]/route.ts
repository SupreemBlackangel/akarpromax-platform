import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getListing, updateListingStatus } from "@services/core";
import { SERVICE_ERROR_CODES } from "@services/constants";
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
  const isAdmin = hasSponsorPermission(identity, PERMISSIONS.SERVICES_APPROVE) || hasSponsorPermission(identity, PERMISSIONS.SERVICES_UPDATE);
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const status = typeof body.status === "string" ? body.status.trim() : "";
  if (!status) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  try {
    await updateListingStatus(id, status, { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_STATUS_INVALID") {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
    }
    if (error instanceof Error && error.message === "LISTING_NOT_FOUND") {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true });
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, PATCH, OPTIONS" } });
}
