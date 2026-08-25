import { getMysqlRuntimeDb } from "@/lib/mysql-runtime";
import { getPgRuntimeDb } from "@/lib/pg-runtime";
import { ensureContentSchema } from "@/lib/content-schema";
import { getRuntimeEnv, type DbProvider } from "@/lib/config/runtime-env";
import { logSecurityEvent } from "@/lib/security/audit";

export type SchemaMode = "uninitialized" | "postgres" | "mysql" | "d1" | "failed";

export class SchemaModeError extends Error {
  constructor(reason: string) {
    super(`Schema mode selection failed: ${reason}`);
    this.name = "SchemaModeError";
  }
}

export function decideSchemaMode(provider: DbProvider, d1Available: boolean): SchemaMode {
  switch (provider) {
    case "postgres":
      return "postgres";
    case "mysql":
      return "mysql";
    case "d1":
      if (!d1Available) {
        throw new SchemaModeError("DB_PROVIDER=d1 requires the D1 binding (available under vinext dev)");
      }
      return "d1";
    default:
      throw new SchemaModeError(`unknown database provider: ${provider}`);
  }
}

type SchemaSelection = { mode: SchemaMode; db: D1Database };

let schemaMode: SchemaMode = "uninitialized";
let schemaSelectionPromise: Promise<SchemaSelection> | null = null;
let schemaModeLogged = false;

function logSchemaMode(mode: SchemaMode): void {
  if (schemaModeLogged) return;
  schemaModeLogged = true;
  console.info(`[runtime-db] schema mode: ${mode}`);
}

export function getSchemaStatus(): { mode: SchemaMode; ready: boolean } {
  return { mode: schemaMode, ready: schemaMode !== "uninitialized" && schemaMode !== "failed" };
}

export function selectSchemaMode(): Promise<SchemaSelection> {
  if (!schemaSelectionPromise) {
    schemaSelectionPromise = (async () => {
      const { dbProvider } = getRuntimeEnv();
      const d1Available = await isD1Available();
      const mode = decideSchemaMode(dbProvider, d1Available);

      let db: D1Database;
      switch (mode) {
        case "postgres":
          db = await getPgRuntimeDb();
          break;
        case "mysql":
          db = await getMysqlRuntimeDb();
          break;
        case "d1":
          db = (await import("cloudflare:workers")).env.DB as D1Database;
          await ensureContentSchema(db);
          break;
        default:
          throw new SchemaModeError(`unhandled mode: ${mode}`);
      }

      schemaMode = mode;
      logSchemaMode(mode);
      return { mode, db };
    })().catch((error) => {
      schemaMode = "failed";
      logSecurityEvent("DATABASE_SCHEMA_MISMATCH", {
        reason: error instanceof Error ? error.message : String(error),
      });
      schemaSelectionPromise = null;
      throw error;
    });
  }
  return schemaSelectionPromise;
}

async function isD1Available(): Promise<boolean> {
  try {
    const runtime = await import("cloudflare:workers");
    return Boolean(runtime.env?.DB);
  } catch {
    return false;
  }
}

export async function getRuntimeDb(): Promise<D1Database> {
  const selection = await selectSchemaMode();
  return selection.db;
}
