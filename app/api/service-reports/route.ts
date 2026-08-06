import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { createReport, listReports } from "@/lib/services/marketplace";
import { PERMISSIONS } from "@/src/constants/permissions";
import { REPORT_TARGETS } from "@/lib/services/marketplace";
import { SERVICE_ERROR_CODES } from "@/lib/services/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  if (!hasSponsorPermission(identity, PERMISSIONS.SERVICE_REPORTS_MANAGE)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const q = request.nextUrl.searchParams;
  const reports = await listReports({
    status: q.get("status") ?? undefined,
    targetType: q.get("targetType") ?? undefined,
    limit: q.get("limit") ? Math.max(1, Math.min(100, Number(q.get("limit")) || 50)) : 50,
  });
  return NextResponse.json({ reports }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const targetType = typeof body.targetType === "string" ? body.targetType : "";
  if (!REPORT_TARGETS.includes(targetType as (typeof REPORT_TARGETS)[number])) {
    return NextResponse.json({ error: "report_target_invalid" }, { status: 400 });
  }
  const targetId = typeof body.targetId === "string" ? body.targetId.trim().slice(0, 80) : "";
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 200) : "";
  if (!targetId || !reason) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 2000) || null : null;
  try {
    const id = await createReport(
      { targetType, targetId, reporterUserId: identity.email, reason, description },
      { userId: identity.email, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null },
    );
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message;
      if (message === "REPORT_ALREADY_EXISTS") return NextResponse.json({ error: "report_already_exists" }, { status: 409 });
      if (message === "REPORT_TARGET_INVALID") return NextResponse.json({ error: "report_target_invalid" }, { status: 400 });
    }
    throw error;
  }
}
