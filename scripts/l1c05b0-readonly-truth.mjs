#!/usr/bin/env node
/**
 * AkarProMax L1C-0.5B0 — READ-ONLY database truth probe.
 *
 *   node --env-file=.env scripts/l1c05b0-readonly-truth.mjs
 *
 * SAFETY, BY CONSTRUCTION:
 *   - every statement runs inside  BEGIN TRANSACTION READ ONLY
 *   - the session always ends with ROLLBACK
 *   - the probe deliberately attempts one write and RECORDS PostgreSQL's refusal,
 *     so the output proves the transaction really was read-only
 *   - no INSERT / UPDATE / DELETE / DDL is issued against any application table
 *   - no migration, no seed, no Neon mutation
 *
 * PRIVACY, BY CONSTRUCTION:
 *   - no email address, payload body or credential is ever read into the output
 *   - every identity figure is an aggregate count
 *
 * Output: docs/refactor/L1C05B_READONLY_TRUTH_RAW.json
 */
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run with:  node --env-file=.env scripts/l1c05b0-readonly-truth.mjs");
  process.exit(1);
}

const BASE = [
  "service_categories", "service_listings", "service_requests", "service_offers", "service_orders",
  "service_messages", "service_reviews", "service_disputes", "service_bookmarks",
];
const MARKET = [
  "service_provider_profiles", "service_provider_categories", "service_provider_documents",
  "service_provider_portfolio", "service_request_answers", "service_request_attachments",
  "service_request_matches", "service_request_status_history", "service_offer_revisions",
  "service_job_timeline", "service_reports", "service_notifications", "service_message_threads",
  "service_message_participants", "service_outbox_events", "service_marketplace_settings",
];
const EXPECTED_TABLES = [...BASE, ...MARKET];

/**
 * The 22 ACTIVE ownership/actor columns.
 * service_disputes.opened_by_user_id is EXCLUDED from M1 by architect decision
 * (see L1C05B_SERVICES_MIGRATION_PLAN.md §2.6) and is reported separately.
 */
const OWNERSHIP = [
  ["service_provider_profiles", "user_id"], ["service_requests", "customer_user_id"],
  ["service_listings", "provider_user_id"], ["service_offers", "provider_user_id"],
  ["service_offer_revisions", "provider_user_id"], ["service_offer_revisions", "created_by"],
  ["service_orders", "customer_user_id"], ["service_orders", "provider_user_id"],
  ["service_job_timeline", "actor_user_id"], ["service_messages", "sender_user_id"],
  ["service_message_participants", "user_id"], ["service_reviews", "reviewer_user_id"],
  ["service_reviews", "reviewee_user_id"], ["service_notifications", "user_id"],
  ["service_reports", "reporter_user_id"], ["service_reports", "resolved_by"],
  ["service_request_attachments", "uploaded_by"], ["service_request_status_history", "changed_by"],
  ["service_provider_documents", "uploaded_by"], ["service_provider_documents", "verified_by"],
  ["service_bookmarks", "user_id"], ["service_marketplace_settings", "updated_by"],
];
const CURRENCY_TABLES = ["service_requests", "service_listings", "service_offers", "service_orders", "service_offer_revisions"];

const UUID_RE = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$";

const out = {
  probe: {
    phase: "L1C-0.5B0",
    mode: "BEGIN read only … ROLLBACK",
    generated_at_utc: null,
    read_only_enforced: null,
    transaction_closed_with: null,
    notes: [
      "Aggregates only. No email address, payload body or credential appears in this file.",
      "service_disputes.opened_by_user_id is excluded from the active 22 (plan §2.6).",
    ],
  },
  errors: [],
};

const sql = postgres(url, { ssl: "require", prepare: false, max: 1, onnotice: () => {} });
/** Sentinel: thrown to force ROLLBACK, because a successful block would COMMIT. */
const ROLLBACK_SIGNAL = Symbol("l1c05b0.rollback");
const run = async (label, fn) => {
  try { return await fn(); } catch (e) { out.errors.push({ label, error: String(e.message).slice(0, 300) }); return null; }
};

try {
  // postgres-js emits the options verbatim: this is literally  BEGIN read only
  await sql.begin("read only", async (tx) => {

    out.probe.generated_at_utc = (await tx.unsafe("SELECT now() AT TIME ZONE 'utc' AS t"))[0]?.t ?? null;

    // prove the transaction is genuinely read-only
    try {
      await tx.unsafe("CREATE TEMP TABLE l1c05b0_write_probe (x int)");
      out.probe.read_only_enforced = false;
      out.errors.push({ label: "READ_ONLY_GUARD", error: "a write statement was ACCEPTED — the probe was NOT read-only" });
    } catch (e) {
      out.probe.read_only_enforced = /read-only|read only/i.test(String(e.message));
      out.probe.read_only_rejection = String(e.message).slice(0, 200);
    }

    /* 1. DATABASE IDENTITY */
    const ident = (await tx.unsafe("SELECT current_database() AS current_database, current_schema() AS current_schema, version() AS version"))[0];
    const ledgerPresent = (await tx.unsafe("SELECT to_regclass('akarpromax.forward_migrations') IS NOT NULL AS present"))[0]?.present;
    const ledger = { present: Boolean(ledgerPresent), count: 0, entries: [] };
    if (ledgerPresent) {
      const rows = await run("ledger", () => tx.unsafe("SELECT * FROM akarpromax.forward_migrations ORDER BY 1")) ?? [];
      ledger.count = rows.length;
      ledger.entries = rows.map((r) => {
        const e = {};
        for (const [k, v] of Object.entries(r)) if (/id|hash|checksum|name|version|tag/i.test(k)) e[k] = String(v);
        return e;
      });
    }
    out.database_identity = { ...ident, forward_migrations: ledger };

    /* 2. USERS — counts only */
    out.users = (await tx.unsafe(`
      SELECT count(*)::int AS total_users,
             count(*) FILTER (WHERE email IS NULL)::int AS users_with_null_email,
             COALESCE(max(length(email)), 0)::int AS max_email_length,
             count(*) FILTER (WHERE length(email) > 36)::int AS email_length_gt_36,
             count(*) FILTER (WHERE length(email) > 255)::int AS email_length_gt_255
      FROM users`))[0];
    Object.assign(out.users, (await tx.unsafe(`
      SELECT count(*)::int AS normalized_duplicate_email_groups, COALESCE(sum(c), 0)::int AS rows_in_duplicate_groups
      FROM (SELECT lower(trim(email)) AS e, count(*)::int AS c FROM users WHERE email IS NOT NULL GROUP BY 1 HAVING count(*) > 1) d`))[0]);

    /* 3. SERVICES SCHEMA */
    const presentNames = (await tx.unsafe(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name LIKE 'service%' ORDER BY 1`)).map((r) => r.table_name);
    const existing = EXPECTED_TABLES.filter((t) => presentNames.includes(t));
    const counts = {};
    if (existing.length) {
      const union = existing.map((t) => `SELECT '${t}' AS t, count(*)::int AS c FROM ${t}`).join(" UNION ALL ");
      for (const r of await tx.unsafe(union)) counts[r.t] = r.c;
    }
    const cols = await tx.unsafe(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = ANY($1) ORDER BY table_name, ordinal_position`, [EXPECTED_TABLES]);
    const byTable = {};
    for (const c of cols) (byTable[c.table_name] ??= []).push({ column: c.column_name, type: c.data_type, nullable: c.is_nullable === "YES", default: c.column_default });
    const idx = await tx.unsafe(`
      SELECT tablename, indexname FROM pg_indexes
      WHERE schemaname = current_schema() AND tablename = ANY($1) ORDER BY 1, 2`, [EXPECTED_TABLES]);
    out.services_schema = {
      expected_tables: EXPECTED_TABLES.length,
      found_expected_tables: existing.length,
      missing_tables: EXPECTED_TABLES.filter((t) => !presentNames.includes(t)),
      extra_service_tables: presentNames.filter((t) => !EXPECTED_TABLES.includes(t)),
      expected_indexes: 42,
      found_indexes_total: idx.length,
      indexes_by_table: idx.reduce((a, r) => { (a[r.tablename] ??= []).push(r.indexname); return a; }, {}),
      tables: Object.fromEntries(EXPECTED_TABLES.map((t) => [t, { exists: presentNames.includes(t), row_count: counts[t] ?? null, columns: byTable[t] ?? [] }])),
    };

    /* 4. ACTIVE OWNERSHIP — 22 columns */
    out.ownership_active_22 = [];
    for (const [table, column] of OWNERSHIP) {
      if (!presentNames.includes(table)) { out.ownership_active_22.push({ table, column, exists: false }); continue; }
      const agg = await run(`own:${table}.${column}`, async () => (await tx.unsafe(`
        SELECT count(*)::int AS total_rows, count(${column})::int AS non_null_rows,
               count(DISTINCT ${column})::int AS distinct_values,
               COALESCE(max(length(${column})), 0)::int AS max_value_length,
               count(*) FILTER (WHERE ${column} LIKE '%@%.%')::int AS email_like_count,
               count(*) FILTER (WHERE ${column} ~* '${UUID_RE}')::int AS uuid_like_count
        FROM ${table}`))[0]);
      const res = await run(`res:${table}.${column}`, async () => (await tx.unsafe(`
        WITH v AS (SELECT DISTINCT ${column} AS val FROM ${table} WHERE ${column} IS NOT NULL),
             m AS (SELECT v.val, (SELECT count(*) FROM users u WHERE lower(trim(u.email)) = lower(trim(v.val))) AS matches FROM v)
        SELECT count(*) FILTER (WHERE matches = 1)::int AS resolvable_to_exactly_one_user,
               count(*) FILTER (WHERE matches = 0)::int AS unresolved_count,
               count(*) FILTER (WHERE matches > 1)::int AS ambiguous_normalized_email_count
        FROM m`))[0]);
      const rows = await run(`rows:${table}.${column}`, async () => (await tx.unsafe(`
        SELECT count(*)::int AS unresolved_rows FROM ${table} t
        WHERE t.${column} IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM users u WHERE lower(trim(u.email)) = lower(trim(t.${column})))`))[0]);
      out.ownership_active_22.push({
        table, column, exists: true, ...(agg ?? {}), ...(res ?? {}), ...(rows ?? {}),
        note: "resolvable/unresolved/ambiguous count DISTINCT values; unresolved_rows counts rows",
      });
    }

    /* 5. SERVICE_DISPUTES — preserved legacy, excluded from M1 */
    if (presentNames.includes("service_disputes")) {
      const d = (await tx.unsafe(`
        SELECT count(*)::int AS row_count, COALESCE(max(length(opened_by_user_id)), 0)::int AS opened_by_user_id_max_length
        FROM service_disputes`))[0];
      const dist = await tx.unsafe("SELECT status, count(*)::int AS c FROM service_disputes GROUP BY 1 ORDER BY 1");
      const unres = (await tx.unsafe(`
        SELECT count(*)::int AS unresolved_count FROM service_disputes d
        WHERE d.opened_by_user_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM users u WHERE lower(trim(u.email)) = lower(trim(d.opened_by_user_id)))`))[0];
      out.service_disputes_legacy = { excluded_from_m1: true, ...d, ...unres, status_distribution: Object.fromEntries(dist.map((r) => [r.status ?? "(null)", r.c])) };
    } else out.service_disputes_legacy = { exists: false, excluded_from_m1: true };

    /* 6. CURRENCY TRUTH */
    const currenciesPresent = (await tx.unsafe("SELECT to_regclass('currencies') IS NOT NULL AS present"))[0]?.present;
    out.currency = { canonical_currencies_table_present: Boolean(currenciesPresent), tables: {} };
    if (currenciesPresent) out.currency.canonical_currency_count = (await tx.unsafe("SELECT count(*)::int AS c FROM currencies"))[0]?.c ?? null;
    for (const table of CURRENCY_TABLES) {
      if (!presentNames.includes(table)) { out.currency.tables[table] = { exists: false }; continue; }
      const meta = (await tx.unsafe(`
        SELECT is_nullable = 'YES' AS nullable, column_default AS "default"
        FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = $1 AND column_name = 'currency'`, [table]))[0];
      const base = (await tx.unsafe(`SELECT count(*)::int AS row_count, count(*) FILTER (WHERE currency IS NULL)::int AS null_currency_count FROM ${table}`))[0];
      const unsupported = currenciesPresent
        ? (await tx.unsafe(`
            SELECT count(*)::int AS unsupported_currency_count FROM ${table} t
            WHERE t.currency IS NOT NULL AND NOT EXISTS (SELECT 1 FROM currencies c WHERE upper(c.code) = upper(trim(t.currency)))`))[0]
        : {};
      const dist = await tx.unsafe(`SELECT currency, count(*)::int AS c FROM ${table} GROUP BY 1 ORDER BY 2 DESC`);
      out.currency.tables[table] = { exists: true, ...meta, ...base, ...unsupported, distribution: Object.fromEntries(dist.map((r) => [r.currency ?? "(null)", r.c])) };
    }
    if (presentNames.includes("service_requests")) {
      out.currency.service_requests_budget_matrix = (await tx.unsafe(`
        SELECT count(*) FILTER (WHERE budget_min IS NULL AND budget_max IS NULL AND currency IS NOT NULL)::int AS no_budget_with_currency_count,
               count(*) FILTER (WHERE budget_min IS NULL AND budget_max IS NULL AND currency IS NULL)::int AS no_budget_without_currency_count,
               count(*) FILTER (WHERE (budget_min IS NOT NULL OR budget_max IS NOT NULL) AND currency IS NOT NULL)::int AS budget_with_currency_count,
               count(*) FILTER (WHERE (budget_min IS NOT NULL OR budget_max IS NOT NULL) AND currency IS NULL)::int AS budget_without_currency_count
        FROM service_requests`))[0];
    }

    /* 7. OUTBOX — statuses are pending | processed | failed (no automatic retry) */
    if (presentNames.includes("service_outbox_events")) {
      const status = await tx.unsafe("SELECT status, count(*)::int AS c FROM service_outbox_events GROUP BY 1 ORDER BY 1");
      const agg = (await tx.unsafe(`
        SELECT count(*)::int AS total, COALESCE(max(attempts), 0)::int AS max_attempts,
               count(*) FILTER (WHERE payload LIKE '%providerUserId%')::int AS events_with_provider_user_id,
               count(*) FILTER (WHERE substring(payload from '"providerUserId":"([^"]*)"') LIKE '%@%.%')::int AS provider_user_id_email_like,
               count(*) FILTER (WHERE substring(payload from '"providerUserId":"([^"]*)"') ~* '${UUID_RE}')::int AS provider_user_id_uuid_like
        FROM service_outbox_events`))[0];
      const byStatus = Object.fromEntries(status.map((r) => [r.status ?? "(null)", r.c]));
      out.outbox = { ...agg, count_by_status: byStatus, pending_count: byStatus.pending ?? 0, processed_count: byStatus.processed ?? 0, failed_count: byStatus.failed ?? 0, note: "payload contents are never printed; only match counts" };
    } else out.outbox = { exists: false };

    /* 8. IDENTITY REKEY RISK — derived counts only */
    const own = out.ownership_active_22.filter((o) => o.exists);
    out.identity_rekey_risk = {
      in_scope_columns: own.length,
      total_ownership_rows: own.reduce((a, o) => a + (o.non_null_rows ?? 0), 0),
      total_distinct_values: own.reduce((a, o) => a + (o.distinct_values ?? 0), 0),
      total_unresolved_rows: own.reduce((a, o) => a + (o.unresolved_rows ?? 0), 0),
      columns_with_unresolved_values: own.filter((o) => (o.unresolved_count ?? 0) > 0).map((o) => `${o.table}.${o.column}`),
      columns_with_ambiguous_values: own.filter((o) => (o.ambiguous_normalized_email_count ?? 0) > 0).map((o) => `${o.table}.${o.column}`),
      max_value_length_across_columns: own.reduce((a, o) => Math.max(a, o.max_value_length ?? 0), 0),
      any_value_longer_than_36: own.some((o) => (o.max_value_length ?? 0) > 36),
    };

    // never commit: a clean return would COMMIT the transaction
    throw ROLLBACK_SIGNAL;
  }).catch((e) => {
    if (e === ROLLBACK_SIGNAL) { out.probe.transaction_closed_with = "ROLLBACK (deliberate)"; return; }
    throw e;
  });
} catch (e) {
  out.errors.push({ label: "FATAL", error: String(e.message).slice(0, 500) });
  out.probe.transaction_closed_with = out.probe.transaction_closed_with ?? "ROLLBACK (after error)";
} finally {
  await sql.end({ timeout: 5 });
}

const target = path.join(process.cwd(), "docs", "refactor", "L1C05B_READONLY_TRUTH_RAW.json");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(out, null, 2));
console.log(`wrote ${target}`);
console.log(`read_only_enforced=${out.probe.read_only_enforced}  closed_with=${out.probe.transaction_closed_with}  errors=${out.errors.length}`);
