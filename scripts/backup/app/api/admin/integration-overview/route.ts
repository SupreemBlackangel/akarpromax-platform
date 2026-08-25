import { NextRequest, NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { listDevices } from "@/lib/integration/device";
import { listSyncOperations } from "@/lib/integration/sync";
import { listRadarQueries } from "@/lib/integration/radar";
import { listNotificationDeliveries, listNotificationRules } from "@/lib/integration/notifications";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const identity = await getSponsorIdentity();
  if (!hasSponsorPermission(identity, PERMISSIONS.OFFICE_ADMIN_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const [devices, syncs, radars, deliveries, rules] = await Promise.all([
    listDevices(),
    listSyncOperations(undefined, undefined, 50),
    listRadarQueries(),
    listNotificationDeliveries(),
    listNotificationRules(),
  ]);
  return NextResponse.json({ devices, syncs, radars, deliveries, rules });
}
