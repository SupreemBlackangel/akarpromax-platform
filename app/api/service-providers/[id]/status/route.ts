import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { setProviderStatus, updateProviderAdminSettings, type ProviderStatus } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

const STATUSES: ProviderStatus[] = ["draft", "submitted", "under_review", "approved", "rejected", "suspended"];

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  if (!hasSponsorPermission(identity, PERMISSIONS.SERVICE_PROVIDERS_REVIEW)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const status = typeof body?.status === "string" ? body.status : null;
  const hasAdminSettings = typeof body?.isFeatured === "boolean" || typeof body?.isAcceptingRequests === "boolean" || Number.isFinite(Number(body?.featuredRank));
  if ((!status || !STATUSES.includes(status as ProviderStatus)) && !hasAdminSettings) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) || null : null;
  try {
    const actor = { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null };
    if (status) await setProviderStatus(id, status as ProviderStatus, note, actor);
    if (hasAdminSettings) {
      await updateProviderAdminSettings(id, {
        isFeatured: typeof body?.isFeatured === "boolean" ? body.isFeatured : undefined,
        featuredRank: Number.isFinite(Number(body?.featuredRank)) ? Number(body?.featuredRank) : undefined,
        isAcceptingRequests: typeof body?.isAcceptingRequests === "boolean" ? body.isAcceptingRequests : undefined,
      }, actor);
    }
  } catch (error) {
    if (error instanceof Error && error.message === "PROVIDER_NOT_FOUND") {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true });
}
