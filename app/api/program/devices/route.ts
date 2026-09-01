import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users as pgUsers } from "@/lib/db/schema";
import { verifySessionPayload } from "@/lib/auth/session";
import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { registerOrTouchDevice } from "@/lib/integration/device";

export const dynamic = "force-dynamic";

/**
 * Desktop self-registration bridge. On install / office-profile setup the
 * desktop app POSTs its machine + system info here, authenticated with the
 * same bearer token /api/program/login issues. The device is upserted by
 * installation_id and marked online (last_seen_at), then appears in the
 * office owner's devices dashboard (/dashboard/office/devices). Re-posting is
 * the heartbeat that keeps "linked / online" fresh. No manual pairing code.
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Source",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } });
}

/** Resolve the office account's canonical email (the sponsor_id the devices
 *  dashboard filters on) from the desktop session token. */
async function resolveSponsorEmail(request: Request): Promise<string | null> {
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const token = bearer || request.headers.get("x-api-key") || "";
  if (!token) return null;
  const payload = await verifySessionPayload(token, getRuntimeEnv().sessionSecret);
  if (!payload?.userId) return null;
  const { db, end } = getDb();
  try {
    const rows = await db.select({ email: pgUsers.email }).from(pgUsers).where(eq(pgUsers.id, payload.userId)).limit(1);
    const email = rows[0]?.email;
    return email ? email.trim().toLowerCase() : null;
  } finally {
    await end();
  }
}

function clientIp(request: Request): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  const sponsorId = await resolveSponsorEmail(request);
  if (!sponsorId) return json({ success: false, message: "غير مصرح" }, 401);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ success: false, message: "طلب غير صالح" }, 400);

  const installationId = typeof body.installationId === "string" ? body.installationId.trim() : "";
  if (!installationId) return json({ success: false, message: "معرّف التثبيت مطلوب" }, 400);

  try {
    const result = await registerOrTouchDevice({
      sponsorId,
      officeId: typeof body.officeId === "string" ? body.officeId : null,
      installationId,
      deviceName: typeof body.deviceName === "string" ? body.deviceName : null,
      model: typeof body.model === "string" ? body.model : null,
      os: typeof body.os === "string" ? body.os : null,
      osVersion: typeof body.osVersion === "string" ? body.osVersion : null,
      appVersion: typeof body.appVersion === "string" ? body.appVersion : null,
      protocolVersion: body.protocolVersion == null ? undefined : Number(body.protocolVersion),
      lastIp: clientIp(request),
      createdBy: sponsorId,
    });
    return json(
      { success: true, device: { id: result.deviceId, status: result.status, online: true, lastSeenAt: result.lastSeenAt, created: result.created } },
      result.created ? 201 : 200,
    );
  } catch {
    return json({ success: false, message: "تعذّر تسجيل الجهاز" }, 500);
  }
}
