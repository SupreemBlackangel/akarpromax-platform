import { NextRequest, NextResponse } from "next/server";
import { authenticateOfficeRequest, requireScope } from "@/lib/integration/office-auth";
import { listNotificationDeliveries, listNotificationRules } from "@/lib/integration/notifications";

export const dynamic = "force-dynamic";

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

  const deliveries = await listNotificationDeliveries(auth.device.sponsorId, auth.device.deviceId, status, 50);
  return NextResponse.json({ deliveries });
}
