import { NextRequest, NextResponse } from "next/server";

import { getRequestFull, listRequestHistory } from "@/lib/services/marketplace";
import { SERVICE_ERROR_CODES } from "@/lib/services/constants";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await getRequestFull(id);
  if (!existing) {
    return NextResponse.json({ error: SERVICE_ERROR_CODES.NOT_FOUND }, { status: 404 });
  }
  const history = await listRequestHistory(id);
  return NextResponse.json({ history }, { headers: { "Cache-Control": "no-store" } });
}
