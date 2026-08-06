import { NextResponse } from "next/server";

import { getSessionIdentity, hasSponsorPermission } from "@/lib/sponsor-auth";
import { getAdminOverview } from "@/lib/services/marketplace";
import { PERMISSIONS } from "@/src/constants/permissions";
import { SERVICE_ERROR_CODES } from "@/lib/services/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  if (!hasSponsorPermission(identity, PERMISSIONS.SERVICE_CATEGORIES_MANAGE) && !hasSponsorPermission(identity, PERMISSIONS.SERVICE_REPORTS_MANAGE) && !hasSponsorPermission(identity, PERMISSIONS.SERVICE_PROVIDERS_REVIEW)) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.FORBIDDEN }, { status: 403 });
  }
  const overview = await getAdminOverview();
  return NextResponse.json(
    { overview },
    { headers: { "Cache-Control": "no-store" } },
  );
}
