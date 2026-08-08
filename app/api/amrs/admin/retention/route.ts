import { NextResponse } from "next/server";
import { getSessionIdentity } from "@/lib/sponsor-auth";
import { getRetentionStatus } from "@/lib/amrs/retention";

export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const status = await getRetentionStatus();
  return NextResponse.json({ policies: status }, { headers: { "Cache-Control": "no-store" } });
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, OPTIONS" } });
}
