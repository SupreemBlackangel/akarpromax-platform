import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getProviderProfileByUserId, submitProviderApplication, getProviderProfileById } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  if (!hasSponsorPermission(identity, PERMISSIONS.SERVICE_PROVIDERS_APPLY)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const { id } = await params;
  const ownProfile = await getProviderProfileByUserId(identity.email);
  if (!ownProfile || String(ownProfile.id) !== id) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  try {
    await submitProviderApplication(id, { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null });
    const profile = await getProviderProfileById(id);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    if (error instanceof Error && (error.message === "PROVIDER_STATUS_INVALID" || error.message === "PROVIDER_NO_CATEGORIES")) {
      return NextResponse.json({ error: "provider_application_invalid" }, { status: 400 });
    }
    throw error;
  }
}
