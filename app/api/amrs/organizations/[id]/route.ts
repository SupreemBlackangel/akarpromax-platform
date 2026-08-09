import { NextRequest, NextResponse } from "next/server";

import { canAccessAmrsAdmin } from "@/lib/amrs/access";
import { ensurePgIdentitySchema } from "@/lib/db/pg-identity-schema";
import { getOrganizationById } from "@/lib/amrs/organization";
import { getSessionIdentity } from "@/lib/sponsor-auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  await ensurePgIdentitySchema();
  const identity = await getSessionIdentity();
  const org = await getOrganizationById(params.id);
  if (!org) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (!canAccessAmrsAdmin(identity) && org.status !== "active") {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ organization: org }, { headers: { "Cache-Control": "no-store" } });
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, OPTIONS" } });
}
