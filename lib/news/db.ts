/**
 * News & Ticker Engine — data-access seam.
 *
 * Same pattern as lib/integration/db.ts: production resolves to the runtime
 * DB; tests inject an explicit in-memory D1-compatible adapter.
 */

import { getRuntimeDb } from "@/lib/runtime-db";

let overrideDb: D1Database | null = null;

export function setNewsDbForTesting(db: D1Database | null): D1Database | null {
  overrideDb = db;
  return db;
}

export async function getNewsDb(): Promise<D1Database> {
  return overrideDb ?? getRuntimeDb();
}
