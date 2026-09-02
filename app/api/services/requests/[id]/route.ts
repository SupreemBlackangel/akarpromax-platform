import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { forwardToCanonical } from "@services/forward";
import { GET as canonicalGET, PATCH as canonicalPATCH } from "@/app/api/service-requests/[id]/route";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Params) {
  return forwardToCanonical(request, canonicalGET, context);
}

export async function PATCH(request: NextRequest, context: Params) {
  return forwardToCanonical(request, canonicalPATCH, context);
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, PATCH, OPTIONS" } });
}
