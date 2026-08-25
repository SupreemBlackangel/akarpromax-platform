import postgres from "postgres";

import { ensureContentSchema } from "@/lib/content-schema";
import { getRuntimeEnv } from "@/lib/config/runtime-env";

let adapter: PgRuntimeDb | null = null;
let schemaReady: Promise<void> | null = null;

/**
 * Runtime detection cache.
 *
 * - `vinext dev` runs route code inside the Vite/Workers runtime, where
 *   `import("cloudflare:workers")` resolves and `env.DB` exists. postgres-js's
 *   module-level pool cannot be reused across requests there (throws
 *   `Cannot perform I/O on behalf of a different request`), so we use a fresh
 *   client per statement and close it.
 * - `vinext start` runs plain Node.js: the module-level `cloudflare:` import
 *   throws `ERR_UNSUPPORTED_ESM_URL_SCHEME`, and a shared pool is safe (and
 *   required for sane TLS handshake amortization during schema init).
 */
let runtimeIsWorkers: boolean | null = null;

async function detectWorkersRuntime(): Promise<boolean> {
  if (runtimeIsWorkers === null) {
    try {
      await import("cloudflare:workers");
      runtimeIsWorkers = true;
    } catch {
      runtimeIsWorkers = false;
    }
  }
  return runtimeIsWorkers;
}

function clientOptions() {
  return { ssl: "require", prepare: false } as const;
}

/** Node (vinext start): shared pool reused across statements and requests. */
let sharedClient: postgres.Sql<Record<string, unknown>> | null = null;

async function sharedPool(): Promise<postgres.Sql<Record<string, unknown>>> {
  if (!sharedClient) {
    sharedClient = postgres(getRuntimeEnv().databaseUrl, {
      ...clientOptions(),
      max: 10,
      onnotice: () => {},
    });
  }
  return sharedClient;
}

/** Workers (vinext dev): fresh single-connection client per statement. */
function createClient(): postgres.Sql<Record<string, unknown>> {
  return postgres(getRuntimeEnv().databaseUrl, {
    ...clientOptions(),
    max: 1,
  });
}

async function acquireClient(): Promise<{ client: postgres.Sql<Record<string, unknown>>; release: () => Promise<void> }> {
  if (await detectWorkersRuntime()) {
    const client = createClient();
    return { client, release: () => client.end({ timeout: 3 }) };
  }
  const client = await sharedPool();
  return { client, release: async () => {} };
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

  /** Raw SQL, used by batch() to coalesce parameter-less DDL. */
  rawSql(): string {
    return this.sql;
  }

  /** True when the statement binds no values and has no placeholders. */
  hasNoParameters(): boolean {
    return this.values.length === 0 && !this.sql.includes("?");
  }

  bind(...values: unknown[]): D1PreparedStatement {
    this.values = values;
    return this;
  }

  private async runQuery<T>(client?: postgres.Sql<Record<string, unknown>>): Promise<T[]> {
    const { sql, values } = expandPlaceholders(translateSql(this.sql), this.values);
    let release: (() => Promise<void>) | null = null;
    let active = client;
    if (!active) {
      const acquired = await acquireClient();
      active = acquired.client;
      release = acquired.release;
    }
    try {
      const rows = (await active.unsafe(sql, values as never[])) as T[];
      return Array.isArray(rows) ? rows : [];
    } finally {
      if (release) await release();
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
    const { client, release } = await acquireClient();
    try {
      const result = await client.unsafe(sql, values as never[]);
      return {
        success: true,
        results: [],
        meta: { changes: resultCount(result), last_row_id: 0 },
      };
    } finally {
      await release();
    }
  }
}

export class PgRuntimeDb implements D1Database {
  prepare(query: string): D1PreparedStatement {
    return new PgStatement(query);
  }

  async batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    const results: D1Result<T>[] = [];
    const { client, release } = await acquireClient();
    try {
      let pendingDdl: string[] = [];
      const flushDdl = async () => {
        if (!pendingDdl.length) return;
        const joined = pendingDdl.join(";\n");
        pendingDdl = [];
        await client.unsafe(joined);
      };
      for (const statement of statements) {
        if (statement instanceof PgStatement) {
          if (statement.hasNoParameters()) {
            pendingDdl.push(translateSql(statement.rawSql()));
            continue;
          }
          await flushDdl();
          results.push(await statement.allWith<T>(client));
        } else {
          await flushDdl();
          results.push(await statement.all<T>());
        }
      }
      await flushDdl();
      return results;
    } finally {
      await release();
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
