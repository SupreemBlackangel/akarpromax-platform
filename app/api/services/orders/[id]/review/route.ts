import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { forwardToCanonical } from "@services/forward";
// Same correction as the sibling route: the canonical path is service-jobs, and
// /api/service-orders/[id]/review answered 500 in production because it was
// proxying to something that does not exist.
import { POST as canonicalPOST } from "@/app/api/service-jobs/[id]/review/route";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Params) {
  return forwardToCanonical(request, canonicalPOST, context);
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "POST, OPTIONS" } });
}
