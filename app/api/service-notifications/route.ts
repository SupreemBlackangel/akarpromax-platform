import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { listNotifications, unreadNotificationsCount } from "@/lib/services/marketplace";
import { SERVICE_ERROR_CODES } from "@/lib/services/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const q = request.nextUrl.searchParams;
  const limit = q.get("limit") ? Math.max(1, Math.min(100, Number(q.get("limit")) || 50)) : 50;
  const [notifications, unread] = await Promise.all([listNotifications(identity.email, limit), unreadNotificationsCount(identity.email)]);
  return NextResponse.json({ notifications, unread }, { headers: { "Cache-Control": "no-store" } });
}
