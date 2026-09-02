import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { forwardToCanonical } from "@services/forward";
import { GET as canonicalGET } from "@/app/api/service-reviews/route";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return forwardToCanonical(request, canonicalGET, undefined);
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "GET, OPTIONS" } });
}
