import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { forwardToCanonical } from "@services/forward";
import { POST as canonicalPOST } from "@/app/api/service-messages/route";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return forwardToCanonical(request, canonicalPOST, undefined);
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: { Allow: "POST, OPTIONS" } });
}
