import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users as pgUsers } from "@/lib/db/schema";
import { verifySessionPayload } from "@/lib/auth/session";
import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { listOfficeDeviceNotifications, markAllOfficeNotificationsRead, markOfficeNotificationRead } from "@/lib/integration/notifications";

export const dynamic = "force-dynamic";

/**
 * The desktop application's bell.
 *
 * Authenticated with the bearer token /api/program/login issues, like every
 * other /api/program route; the office is the account's canonical email, the
 * same sponsor id its devices and its subscription are filed under. Only
 * deliveries on the office_desktop channel are the application's business.
 *
 * GET  ?view=unread (default) | all      -> { notifications, unreadCount }
 * POST { action: "markRead", id } | { action: "markAllRead" }
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Source",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

async function sponsorFrom(request: Request): Promise<string | null> {
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

type Row = Record<string, unknown>;

function toClient(row: Row) {
  return {
    id: String(row.id ?? ""),
    eventType: String(row.event_type ?? ""),
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    link: row.link == null ? null : String(row.link),
    read: String(row.status ?? "") === "delivered",
    createdAt: String(row.created_at ?? ""),
  };
}

const DESKTOP_ONLY = (row: Row) => String(row.channel ?? "") === "office_desktop";

export async function GET(request: Request) {
  const sponsorId = await sponsorFrom(request);
  if (!sponsorId) return json({ success: false, message: "غير مصرح" }, 401);

  const view = new URL(request.url).searchParams.get("view") ?? "unread";
  const unread = (await listOfficeDeviceNotifications(sponsorId, undefined, undefined, 50)).filter(DESKTOP_ONLY);
  const read = view === "all" ? (await listOfficeDeviceNotifications(sponsorId, undefined, "delivered", 50)).filter(DESKTOP_ONLY) : [];
  const notifications = [...unread, ...read]
    .map(toClient)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 60);
  return json({ success: true, notifications, unreadCount: unread.length }, 200);
}

export async function POST(request: Request) {
  const sponsorId = await sponsorFrom(request);
  if (!sponsorId) return json({ success: false, message: "غير مصرح" }, 401);

  const body = (await request.json().catch(() => null)) as { action?: string; id?: string } | null;
  const action = body?.action ?? "markRead";
  if (action === "markAllRead") {
    const count = await markAllOfficeNotificationsRead(sponsorId);
    return json({ success: true, marked: count }, 200);
  }
  if (action === "markRead") {
    const id = String(body?.id ?? "").slice(0, 80);
    if (!id) return json({ success: false, message: "المعرّف مطلوب" }, 400);
    const marked = await markOfficeNotificationRead(id, sponsorId);
    return json({ success: marked, marked }, marked ? 200 : 404);
  }
  return json({ success: false, message: "إجراء غير مدعوم" }, 400);
}
