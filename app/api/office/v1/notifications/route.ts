import { NextRequest, NextResponse } from "next/server";
import { authenticateOfficeRequest, requireScope } from "@/lib/integration/office-auth";
import {
  listNotificationRules,
  listOfficeDeviceNotifications,
  markOfficeNotificationRead,
} from "@/lib/integration/notifications";

export const dynamic = "force-dynamic";

type DeliveryRow = Record<string, unknown>;

function toDelivery(row: DeliveryRow) {
  // Only what the desktop bell renders. No sponsor id, no recipient key, no
  // dedup key, no device id — none of that belongs in a client payload.
  return {
    id: String(row.id ?? ""),
    eventType: String(row.event_type ?? ""),
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    link: row.link == null ? null : String(row.link),
    status: String(row.status ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

export async function GET(req: NextRequest) {
  const auth = await authenticateOfficeRequest(req);
  if ("error" in auth) return auth.error;
  const blocked = requireScope(auth.device, "office.notifications.read");
  if (blocked) return blocked;

  const url = new URL(req.url);
  const view = url.searchParams.get("view") ?? "deliveries";
  const status = url.searchParams.get("status") ?? undefined;

  if (view === "rules") {
    const rules = await listNotificationRules(auth.device.sponsorId);
    return NextResponse.json({ rules });
  }

  const rows = await listOfficeDeviceNotifications(
    auth.device.sponsorId,
    auth.device.deviceId,
    status,
    50,
  );
  const deliveries = rows.map(toDelivery);
  const unreadCount = deliveries.filter((item) => item.status !== "delivered").length;
  return NextResponse.json({ deliveries, unreadCount });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateOfficeRequest(req);
  if ("error" in auth) return auth.error;
  const blocked = requireScope(auth.device, "office.notifications.read");
  if (blocked) return blocked;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? "markRead");
  if (action !== "markRead") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const deliveryId = String(body.deliveryId ?? "").slice(0, 80);
  if (!deliveryId) {
    return NextResponse.json({ error: "deliveryId required" }, { status: 400 });
  }

  // Sponsor-scoped: a delivery belonging to another sponsor is simply not found.
  const marked = await markOfficeNotificationRead(deliveryId, auth.device.sponsorId);
  if (!marked) {
    return NextResponse.json({ error: "Notification not found", marked: false }, { status: 404 });
  }
  return NextResponse.json({ ok: true, marked: true });
}
