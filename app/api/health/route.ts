import { NextResponse } from "next/server";

import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { getSchemaStatus } from "@/lib/runtime-db";
import { applySecurityHeaders } from "@/lib/security/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  getRuntimeEnv();
  const schema = getSchemaStatus();
  const ready = schema.ready;

  return NextResponse.json(
    {
      status: ready ? "ok" : "degraded",
      schema: { mode: schema.mode, ready },
      timestamp: new Date().toISOString(),
    },
    applySecurityHeaders({ status: ready ? 200 : 503 }),
  );
}
