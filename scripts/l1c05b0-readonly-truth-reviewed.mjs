#!/usr/bin/env node
/**
 * AkarProMax L1C-0.5B0 — ARCHITECT-REVIEWED READ-ONLY database truth probe.
 *
 * Run from the canonical Web repository root:
 *
 *   node --env-file=.env scripts/l1c05b0-readonly-truth-reviewed.mjs
 *
 * DB SAFETY:
 *   - imports only Node fs/path + postgres.js; no application/schema bootstrap imports
 *   - all database inspection runs inside BEGIN READ ONLY
 *   - transaction_read_only is verified before any application-table inspection
 *   - no INSERT / UPDATE / DELETE / CREATE / ALTER / DROP / TRUNCATE / seed / migration
 *   - the transaction is deliberately rolled back at the end
 *   - optional probe failures are isolated by SAVEPOINT so one schema mismatch cannot
 *     poison the rest of the read-only transaction
 *
 * PRIVACY:
 *   - no email address or outbox payload body is emitted
 *   - identity results are aggregate counts only
 *
 * Local evidence output:
 *   docs/refactor/L1C05B_READONLY_TRUTH_RAW.json
 */

import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL is not set. Run with: node --env-file=.env scripts/l1c05b0-readonly-truth-reviewed.mjs",
  );
  process.exit(1);
}

const APP_SCHEMA = "public";

const BASE = [
  "service_categories",
  "service_listings",
  "service_requests",
  "service_offers",
  "service_orders",
  "service_messages",
  "service_reviews",
  "service_disputes",
  "service_bookmarks",
];

const MARKET = [
  "service_provider_profiles",
  "service_provider_categories",
  "service_provider_documents",
  "service_provider_portfolio",
  "service_request_answers",
  "service_request_attachments",
  "service_request_matches",
  "service_request_status_history",
  "service_offer_revisions",
  "service_job_timeline",
  "service_reports",
  "service_notifications",
  "service_message_threads",
  "service_message_participants",
  "service_outbox_events",
  "service_marketplace_settings",
];

const EXPECTED_TABLES = [...BASE, ...MARKET];

/**
 * Exact 42 application indexes declared by the canonical Services runtime schemas:
 * lib/services-schema.ts + lib/services-marketplace-schema.ts.
 *
 * PostgreSQL also creates constraint-backed indexes (e.g. PRIMARY KEY). Those are
 * reported separately and are NOT counted as missing/extra application indexes.
 */
const EXPECTED_INDEXES = [
  "service_categories_country_code_unique",
  "service_categories_parent_idx",
  "service_listings_cat_geo_status_idx",
  "service_listings_provider_idx",
  "service_requests_cat_geo_status_idx",
  "service_requests_customer_idx",
  "service_offers_request_idx",
  "service_offers_provider_idx",
  "service_offers_request_provider_unique",
  "service_orders_request_idx",
  "service_orders_request_unique",
  "service_orders_participants_idx",
  "service_messages_thread_idx",
  "service_messages_sender_idx",
  "service_reviews_order_reviewer_unique",
  "service_reviews_reviewee_idx",
  "service_disputes_order_idx",
  "service_disputes_status_idx",
  "service_bookmarks_user_listing_unique",
  "service_provider_profiles_user_unique",
  "service_provider_profiles_status_country_idx",
  "service_provider_categories_provider_category_unique",
  "service_provider_categories_category_idx",
  "service_provider_documents_provider_idx",
  "service_provider_portfolio_provider_idx",
  "service_request_answers_request_idx",
  "service_request_attachments_request_idx",
  "service_request_matches_request_provider_unique",
  "service_request_matches_request_score_idx",
  "service_request_history_request_idx",
  "service_offer_revisions_offer_idx",
  "service_job_timeline_order_idx",
  "service_reports_target_idx",
  "service_reports_status_idx",
  "service_notifications_user_idx",
  "service_message_participants_thread_user_unique",
  "service_message_participants_user_idx",
  "service_message_threads_updated_idx",
  "service_outbox_status_idx",
  "service_marketplace_settings_country_unique",
  "service_categories_public_order_idx",
  "service_provider_profiles_public_order_idx",
];

/**
 * 22 ACTIVE identity ownership/actor columns.
 * service_disputes.opened_by_user_id is preserved legacy data and excluded from M1.
 */
const OWNERSHIP = [
  ["service_provider_profiles", "user_id"],
  ["service_requests", "customer_user_id"],
  ["service_listings", "provider_user_id"],
  ["service_offers", "provider_user_id"],
  ["service_offer_revisions", "provider_user_id"],
  ["service_offer_revisions", "created_by"],
  ["service_orders", "customer_user_id"],
  ["service_orders", "provider_user_id"],
  ["service_job_timeline", "actor_user_id"],
  ["service_messages", "sender_user_id"],
  ["service_message_participants", "user_id"],
  ["service_reviews", "reviewer_user_id"],
  ["service_reviews", "reviewee_user_id"],
  ["service_notifications", "user_id"],
  ["service_reports", "reporter_user_id"],
  ["service_reports", "resolved_by"],
  ["service_request_attachments", "uploaded_by"],
  ["service_request_status_history", "changed_by"],
  ["service_provider_documents", "uploaded_by"],
  ["service_provider_documents", "verified_by"],
  ["service_bookmarks", "user_id"],
  ["service_marketplace_settings", "updated_by"],
];

const CURRENCY_TABLES = [
  "service_requests",
  "service_listings",
  "service_offers",
  "service_orders",
  "service_offer_revisions",
];

const UUID_RE =
  "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$";

const out = {
  probe: {
    phase: "L1C-0.5B0",
    script_revision: "architect-reviewed-r1",
    mode: "BEGIN READ ONLY -> deliberate ROLLBACK",
    application_schema: APP_SCHEMA,
    generated_at_utc: null,
    read_only_enforced: null,
    transaction_closed_with: null,
    notes: [
      "Aggregates only. No email address, outbox payload body, or credential is emitted.",
      "service_disputes.opened_by_user_id is excluded from the active 22 and reported separately.",
      "Expected Services application indexes are the exact 42 names from the two canonical runtime schema files; constraint-backed indexes are reported separately.",
    ],
  },
  errors: [],
};

const sql = postgres(url, {
  ssl: "require",
  prepare: false,
  max: 1,
  connect_timeout: 20,
  onnotice: () => {},
  connection: { application_name: "akarpromax-l1c05b0-readonly-truth" },
});

/**
 * Throwing from postgres.js sql.begin causes postgres.js to ROLLBACK automatically.
 * Use an Error object (not a Symbol) so propagation is conventional and explicit.
 */
const ROLLBACK_SIGNAL = new Error("AKARPROMAX_L1C05B0_DELiberate_ROLLBACK");

/**
 * A failed PostgreSQL statement normally marks the whole transaction aborted.
 * Isolate optional truth probes in a SAVEPOINT so a missing/changed column is
 * recorded without destroying the rest of the transaction.
 */
const safe = async (tx, label, fn) => {
  try {
    return await tx.savepoint(async (sp) => fn(sp));
  } catch (e) {
    out.errors.push({
      label,
      error: String(e?.message ?? e).slice(0, 500),
    });
    return null;
  }
};

const qSchema = (name) => `"${APP_SCHEMA}"."${name}"`;

try {
  await sql
    .begin("read only", async (tx) => {
      const ro = (
        await tx.unsafe(
          "SELECT current_setting('transaction_read_only') AS value",
        )
      )[0]?.value;

      out.probe.read_only_enforced = String(ro).toLowerCase() === "on";

      if (!out.probe.read_only_enforced) {
        throw new Error(
          `READ_ONLY_GUARD_FAILED: transaction_read_only=${String(ro)}`,
        );
      }

      out.probe.generated_at_utc = (
        await tx.unsafe("SELECT now() AT TIME ZONE 'utc' AS t")
      )[0]?.t ?? null;

      /* 1. DATABASE IDENTITY */
      const ident = (
        await tx.unsafe(`
          SELECT
            current_database() AS current_database,
            current_schema() AS current_schema,
            version() AS version,
            current_setting('transaction_read_only') AS transaction_read_only
        `)
      )[0];

      const ledgerPresent = (
        await tx.unsafe(
          "SELECT to_regclass('akarpromax.forward_migrations') IS NOT NULL AS present",
        )
      )[0]?.present;

      const ledger = { present: Boolean(ledgerPresent), count: 0, entries: [] };

      if (ledgerPresent) {
        const rows =
          (await safe(tx, "ledger", (sp) =>
            sp.unsafe(
              "SELECT id, hash FROM akarpromax.forward_migrations ORDER BY id ASC",
            ),
          )) ?? [];

        ledger.count = rows.length;
        ledger.entries = rows.map((r) => ({
          id: r.id == null ? null : String(r.id),
          hash: r.hash == null ? null : String(r.hash),
        }));
      }

      out.database_identity = {
        ...ident,
        forward_migrations: ledger,
      };

      /* USERS */
      const usersPresent = Boolean(
        (
          await tx.unsafe(
            "SELECT to_regclass('public.users') IS NOT NULL AS present",
          )
        )[0]?.present,
      );

      if (usersPresent) {
        out.users = (
          await tx.unsafe(`
            SELECT
              count(*)::bigint AS total_users,
              count(*) FILTER (WHERE email IS NULL)::bigint AS users_with_null_email,
              COALESCE(max(length(email)), 0)::int AS max_email_length,
              count(*) FILTER (WHERE length(email) > 36)::bigint AS email_length_gt_36,
              count(*) FILTER (WHERE length(email) > 255)::bigint AS email_length_gt_255
            FROM public.users
          `)
        )[0];

        Object.assign(
          out.users,
          (
            await tx.unsafe(`
              SELECT
                count(*)::bigint AS normalized_duplicate_email_groups,
                COALESCE(sum(c), 0)::bigint AS rows_in_duplicate_groups
              FROM (
                SELECT lower(trim(email)) AS e, count(*)::bigint AS c
                FROM public.users
                WHERE email IS NOT NULL
                GROUP BY 1
                HAVING count(*) > 1
              ) d
            `)
          )[0],
        );
      } else {
        out.users = { exists: false };
        out.errors.push({
          label: "users",
          error: "public.users does not exist",
        });
      }

      /* 3. SERVICES SCHEMA */
      const presentNames = (
        await tx.unsafe(
          `
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = $1
              AND table_name LIKE 'service\\_%' ESCAPE '\\'
            ORDER BY 1
          `,
          [APP_SCHEMA],
        )
      ).map((r) => r.table_name);

      const existing = EXPECTED_TABLES.filter((t) =>
        presentNames.includes(t),
      );

      const counts = {};
      for (const table of existing) {
        const row = await safe(tx, `count:${table}`, async (sp) => {
          return (
            await sp.unsafe(
              `SELECT count(*)::bigint AS c FROM ${qSchema(table)}`,
            )
          )[0];
        });
        counts[table] = row?.c ?? null;
      }

      const cols = await tx.unsafe(
        `
          SELECT
            table_name,
            column_name,
            data_type,
            udt_name,
            is_nullable,
            column_default,
            character_maximum_length
          FROM information_schema.columns
          WHERE table_schema = $1
            AND table_name = ANY($2)
          ORDER BY table_name, ordinal_position
        `,
        [APP_SCHEMA, EXPECTED_TABLES],
      );

      const byTable = {};
      const columnSet = new Set();
      for (const c of cols) {
        columnSet.add(`${c.table_name}.${c.column_name}`);
        (byTable[c.table_name] ??= []).push({
          column: c.column_name,
          type: c.data_type,
          udt_name: c.udt_name,
          nullable: c.is_nullable === "YES",
          default: c.column_default,
          max_length: c.character_maximum_length,
        });
      }

      const physicalIndexes = await tx.unsafe(
        `
          SELECT
            tbl.relname AS tablename,
            idx.relname AS indexname,
            EXISTS (
              SELECT 1
              FROM pg_constraint c
              WHERE c.conindid = idx.oid
            ) AS constraint_backed
          FROM pg_class tbl
          JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
          JOIN pg_index pi ON pi.indrelid = tbl.oid
          JOIN pg_class idx ON idx.oid = pi.indexrelid
          WHERE ns.nspname = $1
            AND tbl.relname = ANY($2)
          ORDER BY tbl.relname, idx.relname
        `,
        [APP_SCHEMA, EXPECTED_TABLES],
      );

      const foundIndexNames = new Set(
        physicalIndexes.map((r) => r.indexname),
      );

      const expectedFound = EXPECTED_INDEXES.filter((name) =>
        foundIndexNames.has(name),
      );

      const missingExpected = EXPECTED_INDEXES.filter(
        (name) => !foundIndexNames.has(name),
      );

      const extraNonConstraint = physicalIndexes
        .filter(
          (r) =>
            !EXPECTED_INDEXES.includes(r.indexname) &&
            !r.constraint_backed,
        )
        .map((r) => ({
          table: r.tablename,
          index: r.indexname,
        }));

      const constraintBacked = physicalIndexes
        .filter((r) => r.constraint_backed)
        .map((r) => ({
          table: r.tablename,
          index: r.indexname,
        }));

      out.services_schema = {
        expected_tables: EXPECTED_TABLES.length,
        found_expected_tables: existing.length,
        missing_tables: EXPECTED_TABLES.filter(
          (t) => !presentNames.includes(t),
        ),
        extra_service_tables: presentNames.filter(
          (t) => !EXPECTED_TABLES.includes(t),
        ),

        expected_application_indexes: EXPECTED_INDEXES.length,
        found_expected_application_indexes: expectedFound.length,
        missing_expected_indexes: missingExpected,
        extra_nonconstraint_indexes: extraNonConstraint,
        constraint_backed_indexes: constraintBacked,
        physical_index_count_total: physicalIndexes.length,

        tables: Object.fromEntries(
          EXPECTED_TABLES.map((t) => [
            t,
            {
              exists: presentNames.includes(t),
              row_count: counts[t] ?? null,
              columns: byTable[t] ?? [],
            },
          ]),
        ),
      };

      /* 4. ACTIVE OWNERSHIP — 22 columns */
      out.ownership_active_22 = [];

      for (const [table, column] of OWNERSHIP) {
        const tableExists = presentNames.includes(table);
        const columnExists = columnSet.has(`${table}.${column}`);

        if (!tableExists || !columnExists) {
          out.ownership_active_22.push({
            table,
            column,
            exists: false,
            table_exists: tableExists,
            column_exists: columnExists,
          });
          continue;
        }

        const agg = await safe(
          tx,
          `ownership:${table}.${column}:aggregate`,
          async (sp) =>
            (
              await sp.unsafe(`
                SELECT
                  count(*)::bigint AS total_rows,
                  count(${column})::bigint AS non_null_rows,
                  count(DISTINCT ${column}::text)::bigint AS distinct_values,
                  COALESCE(max(length(${column}::text)), 0)::int AS max_value_length,
                  count(*) FILTER (
                    WHERE ${column} IS NOT NULL
                      AND ${column}::text LIKE '%@%.%'
                  )::bigint AS email_like_count,
                  count(*) FILTER (
                    WHERE ${column} IS NOT NULL
                      AND ${column}::text ~* '${UUID_RE}'
                  )::bigint AS uuid_like_count
                FROM ${qSchema(table)}
              `)
            )[0],
        );

        let resolver = null;
        let rows = null;

        if (usersPresent) {
          resolver = await safe(
            tx,
            `ownership:${table}.${column}:resolver`,
            async (sp) =>
              (
                await sp.unsafe(`
                  WITH v AS (
                    SELECT DISTINCT trim(${column}::text) AS val
                    FROM ${qSchema(table)}
                    WHERE ${column} IS NOT NULL
                  ),
                  m AS (
                    SELECT
                      v.val,
                      (
                        SELECT count(*)
                        FROM public.users u
                        WHERE u.email IS NOT NULL
                          AND lower(trim(u.email)) = lower(v.val)
                      ) AS email_matches,
                      (
                        SELECT count(*)
                        FROM public.users u
                        WHERE u.id::text = v.val
                      ) AS uuid_matches
                    FROM v
                  )
                  SELECT
                    count(*) FILTER (
                      WHERE email_matches = 1 AND uuid_matches = 0
                    )::bigint AS resolvable_by_email,
                    count(*) FILTER (
                      WHERE uuid_matches = 1 AND email_matches = 0
                    )::bigint AS resolvable_by_uuid,
                    count(*) FILTER (
                      WHERE email_matches + uuid_matches = 1
                    )::bigint AS resolvable_to_exactly_one_user,
                    count(*) FILTER (
                      WHERE email_matches + uuid_matches = 0
                    )::bigint AS unresolved_count,
                    count(*) FILTER (
                      WHERE email_matches + uuid_matches > 1
                    )::bigint AS ambiguous_identity_count,
                    count(*) FILTER (
                      WHERE email_matches > 1
                    )::bigint AS ambiguous_normalized_email_count
                  FROM m
                `)
              )[0],
          );

          rows = await safe(
            tx,
            `ownership:${table}.${column}:unresolved-rows`,
            async (sp) =>
              (
                await sp.unsafe(`
                  SELECT count(*)::bigint AS unresolved_rows
                  FROM ${qSchema(table)} t
                  WHERE t.${column} IS NOT NULL
                    AND NOT EXISTS (
                      SELECT 1
                      FROM public.users u
                      WHERE u.email IS NOT NULL
                        AND lower(trim(u.email)) = lower(trim(t.${column}::text))
                    )
                    AND NOT EXISTS (
                      SELECT 1
                      FROM public.users u
                      WHERE u.id::text = trim(t.${column}::text)
                    )
                `)
              )[0],
          );
        }

        out.ownership_active_22.push({
          table,
          column,
          exists: true,
          ...(agg ?? {}),
          ...(resolver ?? {}),
          ...(rows ?? {}),
          note:
            "Resolver accepts either normalized legacy email or an already-UUID users.id value; no raw identity values are emitted.",
        });
      }

      /* 5. SERVICE_DISPUTES — preserved legacy, excluded from M1 */
      if (
        presentNames.includes("service_disputes") &&
        columnSet.has("service_disputes.opened_by_user_id")
      ) {
        const d = (
          await tx.unsafe(`
            SELECT
              count(*)::bigint AS row_count,
              COALESCE(max(length(opened_by_user_id::text)), 0)::int AS opened_by_user_id_max_length
            FROM public.service_disputes
          `)
        )[0];

        let statusDistribution = {};
        if (columnSet.has("service_disputes.status")) {
          const dist = await tx.unsafe(`
            SELECT status::text AS status, count(*)::bigint AS c
            FROM public.service_disputes
            GROUP BY 1
            ORDER BY 1
          `);
          statusDistribution = Object.fromEntries(
            dist.map((r) => [r.status ?? "(null)", r.c]),
          );
        }

        let unresolved = {};
        if (usersPresent) {
          unresolved = (
            await tx.unsafe(`
              SELECT count(*)::bigint AS unresolved_count
              FROM public.service_disputes d
              WHERE d.opened_by_user_id IS NOT NULL
                AND NOT EXISTS (
                  SELECT 1
                  FROM public.users u
                  WHERE u.email IS NOT NULL
                    AND lower(trim(u.email)) =
                        lower(trim(d.opened_by_user_id::text))
                )
            `)
          )[0];
        }

        out.service_disputes_legacy = {
          excluded_from_m1: true,
          ...d,
          ...unresolved,
          status_distribution: statusDistribution,
        };
      } else {
        out.service_disputes_legacy = {
          exists: false,
          excluded_from_m1: true,
        };
      }

      /* 6. CURRENCY TRUTH */
      const currenciesPresent = Boolean(
        (
          await tx.unsafe(
            "SELECT to_regclass('public.currencies') IS NOT NULL AS present",
          )
        )[0]?.present,
      );

      out.currency = {
        canonical_currencies_table_present: currenciesPresent,
        tables: {},
      };

      if (currenciesPresent) {
        const curMeta = (
          await tx.unsafe(`
            SELECT
              count(*)::bigint AS total_currency_rows,
              count(*) FILTER (WHERE is_active IS TRUE)::bigint AS active_currency_rows,
              count(*) FILTER (WHERE is_active IS NOT TRUE)::bigint AS inactive_currency_rows
            FROM public.currencies
          `)
        )[0];

        Object.assign(out.currency, curMeta);
      }

      for (const table of CURRENCY_TABLES) {
        const tableExists = presentNames.includes(table);
        const currencyColumnExists = columnSet.has(`${table}.currency`);

        if (!tableExists || !currencyColumnExists) {
          out.currency.tables[table] = {
            exists: false,
            table_exists: tableExists,
            currency_column_exists: currencyColumnExists,
          };
          continue;
        }

        const meta = (
          await tx.unsafe(
            `
              SELECT
                is_nullable = 'YES' AS nullable,
                column_default AS "default",
                data_type,
                udt_name,
                character_maximum_length
              FROM information_schema.columns
              WHERE table_schema = $1
                AND table_name = $2
                AND column_name = 'currency'
            `,
            [APP_SCHEMA, table],
          )
        )[0];

        const base = (
          await tx.unsafe(`
            SELECT
              count(*)::bigint AS row_count,
              count(*) FILTER (WHERE currency IS NULL)::bigint AS null_currency_count
            FROM ${qSchema(table)}
          `)
        )[0];

        let unsupported = {};
        if (currenciesPresent) {
          unsupported = (
            await tx.unsafe(`
              SELECT count(*)::bigint AS unsupported_currency_count
              FROM ${qSchema(table)} t
              WHERE t.currency IS NOT NULL
                AND NOT EXISTS (
                  SELECT 1
                  FROM public.currencies c
                  WHERE c.is_active IS TRUE
                    AND upper(c.code) = upper(trim(t.currency::text))
                )
            `)
          )[0];
        }

        const dist = await tx.unsafe(`
          SELECT currency::text AS currency, count(*)::bigint AS c
          FROM ${qSchema(table)}
          GROUP BY 1
          ORDER BY 2 DESC, 1
        `);

        out.currency.tables[table] = {
          exists: true,
          ...meta,
          ...base,
          ...unsupported,
          distribution: Object.fromEntries(
            dist.map((r) => [r.currency ?? "(null)", r.c]),
          ),
        };
      }

      if (
        presentNames.includes("service_requests") &&
        columnSet.has("service_requests.budget_min") &&
        columnSet.has("service_requests.budget_max") &&
        columnSet.has("service_requests.currency")
      ) {
        out.currency.service_requests_budget_matrix = (
          await tx.unsafe(`
            SELECT
              count(*) FILTER (
                WHERE budget_min IS NULL
                  AND budget_max IS NULL
                  AND currency IS NOT NULL
              )::bigint AS no_budget_with_currency_count,
              count(*) FILTER (
                WHERE budget_min IS NULL
                  AND budget_max IS NULL
                  AND currency IS NULL
              )::bigint AS no_budget_without_currency_count,
              count(*) FILTER (
                WHERE (budget_min IS NOT NULL OR budget_max IS NOT NULL)
                  AND currency IS NOT NULL
              )::bigint AS budget_with_currency_count,
              count(*) FILTER (
                WHERE (budget_min IS NOT NULL OR budget_max IS NOT NULL)
                  AND currency IS NULL
              )::bigint AS budget_without_currency_count
            FROM public.service_requests
          `)
        )[0];
      }

      /* 7. OUTBOX — actual statuses: pending | processed | failed */
      if (presentNames.includes("service_outbox_events")) {
        const status = columnSet.has("service_outbox_events.status")
          ? await tx.unsafe(`
              SELECT status::text AS status, count(*)::bigint AS c
              FROM public.service_outbox_events
              GROUP BY 1
              ORDER BY 1
            `)
          : [];

        let agg = {};

        if (
          columnSet.has("service_outbox_events.payload") &&
          columnSet.has("service_outbox_events.attempts")
        ) {
          agg = (
            await tx.unsafe(`
              SELECT
                count(*)::bigint AS total,
                COALESCE(max(attempts), 0)::int AS max_attempts,
                count(*) FILTER (
                  WHERE payload::text ~ '"providerUserId"[[:space:]]*:'
                )::bigint AS events_with_provider_user_id,
                count(*) FILTER (
                  WHERE substring(
                    payload::text
                    from '"providerUserId"[[:space:]]*:[[:space:]]*"([^"]*)"'
                  ) LIKE '%@%.%'
                )::bigint AS provider_user_id_email_like,
                count(*) FILTER (
                  WHERE substring(
                    payload::text
                    from '"providerUserId"[[:space:]]*:[[:space:]]*"([^"]*)"'
                  ) ~* '${UUID_RE}'
                )::bigint AS provider_user_id_uuid_like
              FROM public.service_outbox_events
            `)
          )[0];
        }

        const byStatus = Object.fromEntries(
          status.map((r) => [r.status ?? "(null)", r.c]),
        );

        out.outbox = {
          exists: true,
          ...agg,
          count_by_status: byStatus,
          pending_count: byStatus.pending ?? 0,
          processed_count: byStatus.processed ?? 0,
          failed_count: byStatus.failed ?? 0,
          note:
            "Payload contents are not emitted; providerUserId is inspected only inside aggregate SQL expressions.",
        };
      } else {
        out.outbox = { exists: false };
      }

      /* 8. IDENTITY REKEY RISK — aggregate roll-up only */
      const own = out.ownership_active_22.filter((o) => o.exists);

      out.identity_rekey_risk = {
        in_scope_columns: own.length,
        total_ownership_rows: own.reduce(
          (a, o) => a + Number(o.non_null_rows ?? 0),
          0,
        ),
        total_distinct_values: own.reduce(
          (a, o) => a + Number(o.distinct_values ?? 0),
          0,
        ),
        total_unresolved_rows: own.reduce(
          (a, o) => a + Number(o.unresolved_rows ?? 0),
          0,
        ),
        columns_with_unresolved_values: own
          .filter((o) => Number(o.unresolved_count ?? 0) > 0)
          .map((o) => `${o.table}.${o.column}`),
        columns_with_ambiguous_values: own
          .filter((o) => Number(o.ambiguous_identity_count ?? 0) > 0)
          .map((o) => `${o.table}.${o.column}`),
        columns_with_existing_uuid_values: own
          .filter((o) => Number(o.uuid_like_count ?? 0) > 0)
          .map((o) => `${o.table}.${o.column}`),
        max_value_length_across_columns: own.reduce(
          (a, o) => Math.max(a, Number(o.max_value_length ?? 0)),
          0,
        ),
        any_value_longer_than_36: own.some(
          (o) => Number(o.max_value_length ?? 0) > 36,
        ),
      };

      /*
       * A normal callback return would COMMIT, even though all DB work is read-only.
       * Throw deliberately so postgres.js performs ROLLBACK.
       */
      throw ROLLBACK_SIGNAL;
    })
    .catch((e) => {
      if (e === ROLLBACK_SIGNAL) {
        out.probe.transaction_closed_with = "ROLLBACK (deliberate)";
        return;
      }
      throw e;
    });
} catch (e) {
  out.errors.push({
    label: "FATAL",
    error: String(e?.message ?? e).slice(0, 1000),
  });
  out.probe.transaction_closed_with =
    out.probe.transaction_closed_with ?? "ROLLBACK (after error)";
} finally {
  await sql.end({ timeout: 5 });
}

const target = path.join(
  process.cwd(),
  "docs",
  "refactor",
  "L1C05B_READONLY_TRUTH_RAW.json",
);

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(out, null, 2));
console.log(`wrote ${target}`);
console.log(
  `read_only_enforced=${out.probe.read_only_enforced} closed_with=${out.probe.transaction_closed_with} errors=${out.errors.length}`,
);
