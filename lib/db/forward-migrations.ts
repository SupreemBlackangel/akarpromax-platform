/**
 * AkarProMax canonical FORWARD migration mechanism (L1A).
 *
 * WHY THIS EXISTS
 * ---------------
 * The legacy chain `drizzle-pg/0000..0016` is unreliable history: SQL files
 * exist through 0016, `meta/_journal.json` stops at idx 6, and
 * `drizzle.__drizzle_migrations` only records 0000 and 0001. Some later files
 * partially reached the live database, some did not. That ledger cannot be
 * trusted and must not be backfilled with guesses.
 *
 * So L1A freezes the legacy chain as read-only history and opens ONE canonical
 * forward stream with its own ledger:
 *
 *   folder : drizzle-pg-forward/
 *   schema : akarpromax
 *   table  : forward_migrations
 *
 * EXECUTION uses the supported drizzle-orm migrator API (`migrationsFolder`,
 * `migrationsSchema`, `migrationsTable` — all part of `MigrationConfig` in the
 * installed drizzle-orm 0.45.x). Nothing here is a home-grown migration runner.
 *
 * AUTHORING is hand-reviewed forward SQL for now. Automatic
 * `drizzle-kit generate` is DISABLED for this stream — see the header of
 * drizzle.forward.config.ts for the verified reason.
 *
 * GUARANTEES INHERITED FROM THE SUPPORTED MIGRATOR
 *  - the migration's statements and its ledger row are committed in ONE
 *    transaction, so a migration can never be recorded as applied unless it
 *    actually succeeded, and can never succeed unrecorded;
 *  - re-running is a no-op once recorded (repeatable / failure-safe);
 *  - there is exactly one execution mechanism for all future migrations.
 *
 * The legacy `drizzle` schema and `drizzle.__drizzle_migrations` table are
 * never read, written, or deleted by this module.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres, { type Sql } from "postgres";

import { COUNTRY_CODES } from "@/lib/market/country-registry";
import { ACTIVE_CURRENCY_CODES } from "@/lib/market/currency-registry";

export const FORWARD_MIGRATIONS_FOLDER = "drizzle-pg-forward";
export const FORWARD_MIGRATIONS_SCHEMA = "akarpromax";
export const FORWARD_MIGRATIONS_TABLE = "forward_migrations";

/** Columns the current Drizzle `countries` definition requires to exist. */
export const REQUIRED_COUNTRY_COLUMNS = Object.freeze([
  "id",
  "code",
  "name_ar",
  "name_en",
  "name_tr",
  "phone_code",
  "currency_code",
  "flag_emoji",
  "map_center_lat",
  "map_center_lng",
  "default_zoom",
  "publications_enabled",
  "measurement_system",
  "is_active",
  "display_order",
  "created_at",
  "updated_at",
] as const);

export const REQUIRED_MARKET_TABLES = Object.freeze([
  "countries",
  "currencies",
  "governorates",
  "cities",
  "districts",
  "streets",
] as const);

export type ForwardLedgerEntry = { id: number; hash: string; created_at: string };

export type MarketSchemaTruth = {
  ready: boolean;
  /** Tables from REQUIRED_MARKET_TABLES that do not exist in `public`. */
  missingTables: string[];
  missingCountryColumns: string[];
  /** true when `countries.currency_code` still carries a column DEFAULT. */
  currencyCodeHasDefault: boolean;
  /** Country codes from the registry that are absent from the database. */
  missingCountryCodes: string[];
  /** Currency codes from the registry that are absent from the database. */
  missingCurrencyCodes: string[];
  /** Rows whose `code` is not ISO alpha-2 — e.g. a fake 'GLOBAL' country. */
  nonIsoCountryCodes: string[];
  /** Rows still holding a legacy lowercase code that could not be normalised. */
  unnormalizedCountryCodes: string[];
  /** Currencies still flagged as a single platform-wide default. */
  defaultFlaggedCurrencies: string[];
  /** false when the akarpromax.forward_migrations ledger does not exist yet. */
  forwardLedgerPresent: boolean;
  appliedForwardMigrations: number;
  problems: string[];
};

function databaseUrl(explicit?: string): string {
  const url = (explicit ?? process.env.DATABASE_URL ?? "").trim();
  if (!url) throw new Error("DATABASE_URL is required for AkarProMax forward migrations");
  return url;
}

function isLocalUrl(url: string): boolean {
  return /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
}

export function openMigrationClient(url?: string): Sql {
  const resolved = databaseUrl(url);
  // Managed Postgres (Neon) requires TLS; a local disposable instance used for
  // verification does not offer it.
  return postgres(resolved, { ssl: isLocalUrl(resolved) ? false : "require", prepare: false, max: 1 });
}

/**
 * Fresh-database prerequisites for the historical 0000 reconciliation.
 * Migration 0000 was authored against the known live state and therefore
 * assumes these two base tables already exist. Creating only their original
 * base shape here lets the canonical forward stream own every later delta and
 * makes a genuinely empty PostgreSQL database bootstrappable without manual SQL.
 */
export async function ensureForwardMigrationPrerequisites(client: Sql): Promise<void> {
  await client.unsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS countries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      code text NOT NULL UNIQUE,
      name_ar text NOT NULL,
      name_en text NOT NULL,
      is_active boolean DEFAULT true,
      display_order integer DEFAULT 0,
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )
  `);
  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS currencies (
      id text PRIMARY KEY NOT NULL,
      code text NOT NULL UNIQUE,
      symbol text NOT NULL,
      name_ar text NOT NULL,
      name_en text NOT NULL,
      name_tr text,
      exchange_rate_to_usd numeric(18, 8) NOT NULL DEFAULT 1,
      is_active boolean DEFAULT true,
      is_default boolean DEFAULT false,
      display_order integer DEFAULT 0,
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )
  `);
}

/**
 * Applies every not-yet-recorded forward migration. Safe to call repeatedly.
 */
export async function runForwardMigrations(options: { url?: string; folder?: string } = {}): Promise<void> {
  const client = openMigrationClient(options.url);
  try {
    await ensureForwardMigrationPrerequisites(client);
    const db = drizzle(client);
    await migrate(db, {
      migrationsFolder: options.folder ?? FORWARD_MIGRATIONS_FOLDER,
      migrationsSchema: FORWARD_MIGRATIONS_SCHEMA,
      migrationsTable: FORWARD_MIGRATIONS_TABLE,
    });
  } finally {
    await client.end();
  }
}

async function tableExists(client: Sql, schema: string, table: string): Promise<boolean> {
  const rows = await client<{ present: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = ${schema} AND table_name = ${table}
    ) AS present
  `;
  return Boolean(rows[0]?.present);
}

export async function readForwardLedger(client: Sql): Promise<ForwardLedgerEntry[]> {
  if (!(await tableExists(client, FORWARD_MIGRATIONS_SCHEMA, FORWARD_MIGRATIONS_TABLE))) return [];
  // Identifiers are module constants, not user input, and are passed through
  // postgres.js's identifier helper rather than string-interpolated.
  const rows = await client<ForwardLedgerEntry[]>`
    SELECT id, hash, created_at
    FROM ${client(FORWARD_MIGRATIONS_SCHEMA)}.${client(FORWARD_MIGRATIONS_TABLE)}
    ORDER BY id ASC
  `;
  return [...rows];
}

/**
 * Structured schema verification, intended to be part of release checks.
 *
 * CONNECTED BUT BAD/MISSING SCHEMA  -> a structured truth report. Every probe
 *   below is guarded by an existence check, so a missing `countries` table, a
 *   missing `currencies` table, or an absent forward ledger is REPORTED and
 *   never raised.
 *
 * DATABASE UNREACHABLE -> a real exception. Connection, authentication and TLS
 *   failures are deliberately not caught: a dead database must not be able to
 *   masquerade as a merely-unready one.
 *
 * It never mutates anything.
 */
export async function verifyMarketSchemaTruth(client: Sql): Promise<MarketSchemaTruth> {
  const problems: string[] = [];

  const missingTables: string[] = [];
  for (const table of REQUIRED_MARKET_TABLES) {
    if (!(await tableExists(client, "public", table))) missingTables.push(table);
  }
  for (const table of missingTables) {
    problems.push(`required table public.${table} does not exist`);
  }

  const hasCountries = !missingTables.includes("countries");
  const hasCurrencies = !missingTables.includes("currencies");

  let missingCountryColumns: string[] = [];
  let currencyCodeHasDefault = false;
  let missingCountryCodes: string[] = [];
  let nonIsoCountryCodes: string[] = [];
  let unnormalizedCountryCodes: string[] = [];

  if (hasCountries) {
    const columnRows = await client<{ column_name: string; column_default: string | null }[]>`
      SELECT column_name, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'countries'
    `;
    const present = new Set(columnRows.map((row) => row.column_name));
    missingCountryColumns = REQUIRED_COUNTRY_COLUMNS.filter((column) => !present.has(column));
    if (missingCountryColumns.length) {
      problems.push(`countries is missing columns: ${missingCountryColumns.join(", ")}`);
    }

    const currencyColumn = columnRows.find((row) => row.column_name === "currency_code");
    currencyCodeHasDefault = Boolean(currencyColumn?.column_default);
    if (currencyCodeHasDefault) {
      problems.push(`countries.currency_code still has a column DEFAULT (${currencyColumn?.column_default})`);
    }

    const countryRows = await client<{ code: string }[]>`SELECT code FROM countries`;
    const codes = new Set(countryRows.map((row) => row.code));
    missingCountryCodes = COUNTRY_CODES.filter((code) => !codes.has(code));
    if (missingCountryCodes.length) {
      problems.push(`countries missing registry codes: ${missingCountryCodes.join(", ")}`);
    }

    const badCodes = countryRows.map((row) => row.code).filter((code) => !/^[A-Z]{2}$/.test(code));
    unnormalizedCountryCodes = badCodes.filter((code) => /^[a-z]{2}$/.test(code));
    nonIsoCountryCodes = badCodes.filter((code) => !/^[a-z]{2}$/.test(code));
    if (nonIsoCountryCodes.length) {
      problems.push(
        `countries contains non-country rows (GLOBAL must not be a row): ${nonIsoCountryCodes.join(", ")}`,
      );
    }
    if (unnormalizedCountryCodes.length) {
      problems.push(`countries has un-normalised lowercase codes: ${unnormalizedCountryCodes.join(", ")}`);
    }
  }

  let missingCurrencyCodes: string[] = [];
  let defaultFlaggedCurrencies: string[] = [];

  if (hasCurrencies) {
    const currencyRows = await client<{ code: string; is_default: boolean | null }[]>`
      SELECT code, is_default FROM currencies
    `;
    const currencyCodes = new Set(currencyRows.map((row) => row.code));
    missingCurrencyCodes = ACTIVE_CURRENCY_CODES.filter((code) => !currencyCodes.has(code));
    if (missingCurrencyCodes.length) {
      problems.push(`currencies missing registry codes: ${missingCurrencyCodes.join(", ")}`);
    }

    defaultFlaggedCurrencies = currencyRows.filter((row) => row.is_default === true).map((row) => row.code);
    if (defaultFlaggedCurrencies.length) {
      problems.push(`a global default currency is still flagged: ${defaultFlaggedCurrencies.join(", ")}`);
    }
  }

  const forwardLedgerPresent = await tableExists(
    client,
    FORWARD_MIGRATIONS_SCHEMA,
    FORWARD_MIGRATIONS_TABLE,
  );
  const ledger = forwardLedgerPresent ? await readForwardLedger(client) : [];
  if (!forwardLedgerPresent) {
    problems.push(
      `forward migration ledger ${FORWARD_MIGRATIONS_SCHEMA}.${FORWARD_MIGRATIONS_TABLE} does not exist`,
    );
  } else if (ledger.length === 0) {
    problems.push("no forward migration has been recorded in the canonical ledger");
  }

  return {
    ready: problems.length === 0,
    missingTables,
    missingCountryColumns: [...missingCountryColumns],
    currencyCodeHasDefault,
    missingCountryCodes: [...missingCountryCodes],
    missingCurrencyCodes: [...missingCurrencyCodes],
    nonIsoCountryCodes,
    unnormalizedCountryCodes,
    defaultFlaggedCurrencies,
    forwardLedgerPresent,
    appliedForwardMigrations: ledger.length,
    problems,
  };
}

/* ------------------------------------------------------------------------ */
/* L1B — canonical human identity truth                                      */
/* ------------------------------------------------------------------------ */

/** Columns the canonical `users` table must expose after forward 0001. */
export const REQUIRED_USER_COLUMNS = Object.freeze([
  "id",
  "email",
  "password_hash",
  "name",
  "role",
  "status",
  "is_active",
  "email_verified_at",
  "onboarding_completed_at",
  "last_login_at",
  "preferred_language",
  "preferred_market",
  "created_at",
  "updated_at",
] as const);

export type IdentitySchemaTruth = {
  ready: boolean;
  usersTablePresent: boolean;
  missingUserColumns: string[];
  /** true when the race-safe lower(email) unique index is installed. */
  emailLowerUniqueIndexPresent: boolean;
  /** Normalized emails that currently exist under more than one casing. */
  caseInsensitiveDuplicateEmails: string[];
  /** Any user column whose DEFAULT is a market/country literal (forbidden). */
  forbiddenMarketDefaults: string[];
  problems: string[];
};

/**
 * Identity-side schema verification for release checks. Same safety contract
 * as verifyMarketSchemaTruth: a connected-but-wrong schema is REPORTED, a dead
 * connection still throws, and nothing is ever mutated.
 */
export async function verifyIdentitySchemaTruth(client: Sql): Promise<IdentitySchemaTruth> {
  const problems: string[] = [];

  const usersTablePresent = await tableExists(client, "public", "users");
  if (!usersTablePresent) {
    problems.push("required table public.users does not exist");
    return {
      ready: false,
      usersTablePresent,
      missingUserColumns: [...REQUIRED_USER_COLUMNS],
      emailLowerUniqueIndexPresent: false,
      caseInsensitiveDuplicateEmails: [],
      forbiddenMarketDefaults: [],
      problems,
    };
  }

  const columnRows = await client<{ column_name: string; column_default: string | null }[]>`
    SELECT column_name, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
  `;
  const present = new Set(columnRows.map((row) => row.column_name));
  const missingUserColumns = REQUIRED_USER_COLUMNS.filter((column) => !present.has(column));
  if (missingUserColumns.length) {
    problems.push(`users is missing columns: ${missingUserColumns.join(", ")}`);
  }

  // No market/country literal may be a column default on the human identity.
  const forbiddenMarketDefaults = columnRows
    .filter((row) => {
      if (!row.column_default) return false;
      return /'(OM|SA|OMR|SAR|GLOBAL)'/i.test(row.column_default) && /market|country|currency/.test(row.column_name);
    })
    .map((row) => `${row.column_name} DEFAULT ${row.column_default}`);
  for (const entry of forbiddenMarketDefaults) {
    problems.push(`users carries a forbidden market/country default: ${entry}`);
  }

  const indexRows = await client<{ present: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM pg_class idx
      JOIN pg_namespace nsp ON nsp.oid = idx.relnamespace
      WHERE idx.relname = 'users_email_lower_unique' AND idx.relkind = 'i' AND nsp.nspname = 'public'
    ) AS present
  `;
  const emailLowerUniqueIndexPresent = Boolean(indexRows[0]?.present);

  const duplicateRows = await client<{ normalized: string }[]>`
    SELECT lower(email) AS normalized
    FROM public.users
    WHERE email IS NOT NULL
    GROUP BY lower(email)
    HAVING count(*) > 1
  `;
  const caseInsensitiveDuplicateEmails = duplicateRows.map((row) => row.normalized);
  if (caseInsensitiveDuplicateEmails.length) {
    problems.push(
      `users contains case-insensitive duplicate emails (must be resolved by the owner, never auto-deleted): ${caseInsensitiveDuplicateEmails.join(", ")}`,
    );
  }
  if (!emailLowerUniqueIndexPresent) {
    problems.push("race-safe unique index users_email_lower_unique is not installed");
  }

  return {
    ready: problems.length === 0,
    usersTablePresent,
    missingUserColumns: [...missingUserColumns],
    emailLowerUniqueIndexPresent,
    caseInsensitiveDuplicateEmails,
    forbiddenMarketDefaults,
    problems,
  };
}
