import postgres from "postgres";

import { ensureContentSchema } from "@/lib/content-schema";
import { getRuntimeEnv } from "@/lib/config/runtime-env";

let adapter: PgRuntimeDb | null = null;
let schemaReady: Promise<void> | null = null;

function createClient(): postgres.Sql<Record<string, unknown>> {
  return postgres(getRuntimeEnv().databaseUrl, {
    ssl: "require",
    prepare: false,
    max: 1,
  });
}

/**
 * Translate D1-flavored SQL to Postgres:
 * - `` `key` `` identifiers -> "key"
 * - `INSERT OR IGNORE INTO` -> `INSERT INTO` + `ON CONFLICT DO NOTHING`
 * - `DATETIME` column type -> `TIMESTAMP`
 * - `datetime('now')` -> `now()`
 * - `ON CONFLICT (...) DO UPDATE SET` is already native Postgres (kept as-is)
 */
function translateSql(input: string): string {
  const isOrIgnore = /\bINSERT OR IGNORE INTO\b/i.test(input);
  const sql = input
    .replace(/`([^`]+)`/g, '"$1"')
    .replace(/\bINSERT OR IGNORE INTO\b/gi, "INSERT INTO")
    .replace(/\bDATETIME\b/gi, "TIMESTAMP")
    .replace(/datetime\(\s*'now'\s*\)/gi, "now()")
    .trim();
  if (isOrIgnore) {
    return sql.replace(/;?\s*$/, "") + " ON CONFLICT DO NOTHING";
  }
  return sql;
}

/**
 * Expand D1 placeholders to Postgres `$N`:
 * - numbered `?1..?N` -> `$1..$N`
 * - bare `?` -> sequential `$1, $2, ...`
 */
function expandPlaceholders(sql: string, values: unknown[]): { sql: string; values: unknown[] } {
  if (/\?\d+/.test(sql)) {
    return { sql: sql.replace(/\?\d+/g, (match) => `$${match.slice(1)}`), values };
  }
  if (sql.includes("?")) {
    let counter = 0;
    return { sql: sql.replace(/\?/g, () => `$${++counter}`), values };
  }
  return { sql, values };
}

function resultCount(result: unknown): number {
  if (Array.isArray(result)) return result.length;
  const record = result as { count?: string | number } | null;
  if (record && typeof record.count !== "undefined") return Number(record.count);
  return 0;
}

class PgStatement implements D1PreparedStatement {
  private values: unknown[] = [];

  constructor(private readonly sql: string) {}

  bind(...values: unknown[]): D1PreparedStatement {
    this.values = values;
    return this;
  }

  private async runQuery<T>(client?: postgres.Sql<Record<string, unknown>>): Promise<T[]> {
    const { sql, values } = expandPlaceholders(translateSql(this.sql), this.values);
    const ownsClient = !client;
    const active = client ?? createClient();
    try {
      const rows = (await active.unsafe(sql, values as never[])) as T[];
      return Array.isArray(rows) ? rows : [];
    } finally {
      if (ownsClient) await active.end({ timeout: 3 });
    }
  }

  async first<T = Record<string, unknown>>(columnName?: string): Promise<T | null> {
    const rows = await this.runQuery<Record<string, unknown>>();
    const row = rows[0];
    if (!row) return null;
    if (columnName !== undefined) return (row[columnName] as T) ?? null;
    return row as T;
  }

  async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const rows = await this.runQuery<T>();
    return { success: true, results: rows, meta: {} };
  }

  /** Run against a caller-provided (batch-shared) client. */
  async allWith<T = Record<string, unknown>>(client: postgres.Sql<Record<string, unknown>>): Promise<D1Result<T>> {
    const rows = await this.runQuery<T>(client);
    return { success: true, results: rows, meta: {} };
  }

  async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const { sql, values } = expandPlaceholders(translateSql(this.sql), this.values);
    const client = createClient();
    try {
      const result = await client.unsafe(sql, values as never[]);
      return {
        success: true,
        results: [],
        meta: { changes: resultCount(result), last_row_id: 0 },
      };
    } finally {
      await client.end({ timeout: 3 });
    }
  }
}

export class PgRuntimeDb implements D1Database {
  prepare(query: string): D1PreparedStatement {
    return new PgStatement(query);
  }

  async batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    const results: D1Result<T>[] = [];
    const client = createClient();
    try {
      for (const statement of statements) {
        if (statement instanceof PgStatement) {
          results.push(await statement.allWith<T>(client));
        } else {
          results.push(await statement.all<T>());
        }
      }
      return results;
    } finally {
      await client.end({ timeout: 3 });
    }
  }
}

export async function getPgRuntimeDb(): Promise<D1Database> {
  if (!adapter) adapter = new PgRuntimeDb();
  if (!schemaReady) {
    schemaReady = ensureContentSchema(adapter).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
  return adapter;
}
