import { NextResponse } from "next/server";
import { canAccessAmrsAdmin } from "@/lib/amrs/access";
import { getSessionIdentity } from "@/lib/sponsor-auth";
import { ensurePgIdentitySchema } from "@/lib/db/pg-identity-schema";
import { getRetentionStatus } from "@/lib/amrs/retention";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensurePgIdentitySchema();
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!canAccessAmrsAdmin(identity)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const status = await getRetentionStatus();
  return NextResponse.json({ policies: status }, { headers: { "Cache-Control": "no-store" } });
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, OPTIONS" } });
}
