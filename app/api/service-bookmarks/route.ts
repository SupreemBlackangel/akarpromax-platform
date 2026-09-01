import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { listBookmarkedProviders, addProviderBookmark, getProviderProfileById } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

/**
 * Provider favorites (bookmarks). Backs `/dashboard/services/favorites`.
 * A bookmark links the signed-in user to a service provider profile.
 */

export async function GET() {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const bookmarks = await listBookmarkedProviders(identity.email);
  return NextResponse.json({ bookmarks }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { providerId?: string } | null;
  const providerId = typeof body?.providerId === "string" ? body.providerId.trim() : "";
  if (!providerId) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const provider = await getProviderProfileById(providerId);
  if (!provider) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
  }
  await addProviderBookmark(identity.email, providerId);
  return NextResponse.json({ ok: true }, { status: 201 });
}
