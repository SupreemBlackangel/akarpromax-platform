import { NextResponse } from "next/server";

import { getRuntimeEnv } from "@/lib/config/runtime-env";
import { ensurePgIdentitySchema, probePublicPgIdentitySchema } from "@/lib/db/pg-identity-schema";
import { getEmailRuntimeStatus } from "@/lib/email";
import { getSchemaStatus, selectSchemaMode } from "@/lib/runtime-db";
import { applySecurityHeaders } from "@/lib/security/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const runtime = getRuntimeEnv();
  let ready = getSchemaStatus().ready;
  let mode = getSchemaStatus().mode;
  let error: string | null = null;
  let identity = await probePublicPgIdentitySchema().catch(() => ({
    version: 1,
    schema: "public",
    ready: false,
    requiredTables: [],
    missingTables: [],
    appliedVersion: null,
  }));
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
  if (!identity.ready) {
    try {
      identity = await ensurePgIdentitySchema();
    } catch (e: unknown) {
      error = error ?? (e instanceof Error ? e.message : String(e));
    }
  }
  const email = getEmailRuntimeStatus();
  ready = ready && identity.ready && (!runtime.isProduction || email.productionCapable);
  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      schema: { mode, ready },
      contentSchema: { mode, ready: getSchemaStatus().ready },
      identitySchema: identity,
      email,
      ...(error ? { error: "schema_initialization_failed" } : {}),
      timestamp: new Date().toISOString(),
    },
    applySecurityHeaders({ status: ready ? 200 : 503 }),
  );
}
