import { NextRequest, NextResponse } from "next/server";

import { getSessionIdentity } from "@/lib/sponsor-auth";
import { removeProviderBookmark } from "@services/marketplace";
import { SERVICE_ERROR_CODES } from "@services/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Remove a provider bookmark. `id` is the provider profile id (or bookmark id). */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.UNAUTHORIZED }, { status: 401 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.INVALID_BODY }, { status: 400 });
  }
  await removeProviderBookmark(identity.email, id);
  return NextResponse.json({ ok: true });
}
