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
  // A refusal or a suspension the provider cannot act on is not a decision.
  // Approving needs no words; the other two do, and the note is what the
  // provider is shown and what the audit row carries.
  if ((status === "rejected" || status === "suspended") && !note) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.PROVIDER_REVIEW_REASON_REQUIRED }, { status: 400 });
  }
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
    const code = error instanceof Error ? error.message : "";
    if (code === "PROVIDER_NOT_FOUND") {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
    }
    // PROVIDER_FLOW refused the move. This reached the browser as an unhandled
    // 500 — the screen offered every status as a button regardless of where the
    // provider stood, so an illegal move looked like the server falling over
    // rather than like a rule.
    if (code === "PROVIDER_STATUS_INVALID") {
      return NextResponse.json({ error: SERVICE_ERROR_CODES.PROVIDER_STATUS_INVALID }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true });
}
