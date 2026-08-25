import { NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { markAllNotificationsRead } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

export async function POST() {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  await markAllNotificationsRead(identity.email);
  return NextResponse.json({ ok: true });
}
