import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { resolveReport } from "@services/marketplace";
import { PERMISSIONS } from "@/src/constants/permissions";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  if (!hasSponsorPermission(identity, PERMISSIONS.SERVICE_REPORTS_MANAGE)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { resolution?: string; action?: string } | null;
  const resolution = typeof body?.resolution === "string" ? body.resolution.trim().slice(0, 2000) : "";
  if (!resolution) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  try {
    await resolveReport(
      id,
      { resolution, action: typeof body?.action === "string" ? body.action.trim().slice(0, 40) || null : null, actor: { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null } },
      identity.email,
    );
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message;
      if (message === "REPORT_NOT_FOUND") return NextResponse.json({ error: "report_not_found" }, { status: 404 });
      if (message === "TARGET_NOT_FOUND") return NextResponse.json({ error: "target_not_found" }, { status: 404 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true });
}
