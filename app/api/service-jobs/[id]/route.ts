import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { getJobDetail } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const { id } = await params;
  const job = await getJobDetail(id, identity.email);
  if (!job) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.ORDER_NOT_FOUND }, { status: 404 });
  }
  return NextResponse.json({ job }, { headers: { "Cache-Control": "no-store" } });
}
