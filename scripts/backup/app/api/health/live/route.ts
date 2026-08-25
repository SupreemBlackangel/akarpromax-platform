import { NextResponse } from "next/server";

import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { applySecurityHeaders } from "@/lib/security/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  getRuntimeEnv();
  return NextResponse.json(
    { status: "alive", timestamp: new Date().toISOString() },
    applySecurityHeaders({ status: 200 }),
  );
}
