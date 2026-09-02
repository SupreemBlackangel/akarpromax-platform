import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { forwardToCanonical } from "@services/forward";
// An "order" here is what the canonical API calls a job, and updating one means
// moving its status. The previous target, /api/service-orders/[id], has never
// existed: the proxy fetched it, got a 404 and answered 500 -- verified in
// production. Importing the handler makes a wrong target a build error.
import { PATCH as canonicalStatusPATCH } from "@/app/api/service-jobs/[id]/status/route";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Params) {
  return forwardToCanonical(request, canonicalStatusPATCH, context);
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "PATCH, OPTIONS" } });
}
