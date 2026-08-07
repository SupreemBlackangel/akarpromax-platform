import { NextResponse } from "next/server";

import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { getSchemaStatus, selectSchemaMode } from "@/lib/runtime-db";
import { applySecurityHeaders } from "@/lib/security/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  getRuntimeEnv();
  let ready = getSchemaStatus().ready;
  let mode = getSchemaStatus().mode;
  let error: string | null = null;
  if (!ready) {
    try {
      await selectSchemaMode();
      ready = getSchemaStatus().ready;
      mode = getSchemaStatus().mode;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e);
      mode = getSchemaStatus().mode;
    }
  }
  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      schema: { mode, ready },
      ...(error ? { error: "schema_initialization_failed" } : {}),
      timestamp: new Date().toISOString(),
    },
    applySecurityHeaders({ status: ready ? 200 : 503 }),
  );
}
