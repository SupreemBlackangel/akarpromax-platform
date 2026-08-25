import { getRuntimeDb } from "@/lib/runtime-db";

let overrideDb: D1Database | null = null;

/**
 * Data-access boundary for the Connected Ecosystem (office devices, pairing,
 * sync, radar, notifications, realtime).
 *
 * Production resolves to the runtime DB (D1 under `vinext dev`, MySQL via the
 * `translateSql` shim under `vinext start`). Tests inject an explicit in-memory
 * D1-compatible adapter via `setIntegrationDbForTesting`.
 */
export function setIntegrationDbForTesting(db: D1Database | null): D1Database | null {
  overrideDb = db;
  return db;
}

export async function getIntegrationDb(): Promise<D1Database> {
  return overrideDb ?? getRuntimeDb();
}
