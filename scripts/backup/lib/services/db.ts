import { getRuntimeDb } from "@/lib/runtime-db";
import { nowMySqlDateTime } from "@/lib/auth/mysql-time";

export { nowMySqlDateTime };

let overrideDb: D1Database | null = null;

/**
 * Data-access boundary for the services module.
 *
 * Production resolves to the runtime DB (D1 under `vinext dev`, MySQL via the
 * `translateSql` shim under `vinext start`). Tests inject an explicit in-memory
 * D1-compatible adapter via `setServicesDbForTesting` so integration tests are
 * deterministic and never touch a real database. A PostgreSQL adapter can be
 * bound here behind the same D1 interface (same contract as `lib/mysql-runtime.ts`).
 */
export function setServicesDbForTesting(db: D1Database | null): D1Database | null {
  overrideDb = db;
  return db;
}

export async function getServicesDb(): Promise<D1Database> {
  return overrideDb ?? getRuntimeDb();
}

export async function insertRow(db: D1Database, sql: string, values: unknown[]): Promise<string> {
  const id = crypto.randomUUID();
  const cols = /\(([^)]+)\)\s*VALUES/i.exec(sql)?.[1];
  if (cols) {
    const index = cols.split(",").map((c) => c.trim()).indexOf("id");
    if (index >= 0) values[index] = id;
  }
  await db.prepare(sql).bind(...values).run();
  return id;
}

export function nowIso(): string {
  return new Date().toISOString();
}
