import { NextResponse } from "next/server";
import { getSponsorIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { PERMISSIONS } from "@/src/constants/permissions";
import { getCommandCenterOverview } from "@/lib/command-center/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getSponsorIdentity();
  if (
    !hasSponsorPermission(identity, PERMISSIONS.ADMIN_DASHBOARD_VIEW) &&
    !hasSponsorPermission(identity, PERMISSIONS.REPORTS_VIEW)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const overview = await getCommandCenterOverview();

  return NextResponse.json(overview, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
