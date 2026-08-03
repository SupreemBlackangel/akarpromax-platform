import { getRuntimeDb } from "@/lib/runtime-db";
import { nowMySqlDateTime } from "@/lib/auth/mysql-time";

export { nowMySqlDateTime };

export async function insertRow(db: D1Database, sql: string, values: unknown[]): Promise<string> {
  const id = crypto.randomUUID();
  await db.prepare(sql).bind(...values).run();
  return id;
}

export function nowIso(): string {
  return new Date().toISOString();
}
