import { NextResponse } from "next/server";
import { getSessionIdentity, hasPermission } from "@/lib/identity-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getCommandCenterOverview } from "@/lib/command-center/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getSessionIdentity();
  if (
    !hasPermission(identity, PERMISSIONS.ADMIN_DASHBOARD_VIEW) &&
    !hasPermission(identity, PERMISSIONS.REPORTS_VIEW)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const overview = await getCommandCenterOverview();

  return NextResponse.json(overview, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
