#!/usr/bin/env node
/**
 * AkarProMax L1C-0.5B — architect-reviewed READ-ONLY orphan correlation probe.
 *
 * Run from repo root:
 *   node --env-file=.env scripts/l1c05b-orphan-fingerprint.mjs
 *
 * It emits NO raw identity value. PostgreSQL hashes normalized values before
 * returning them. The output is only fingerprints, counts, source surfaces,
 * lengths, and test/synthetic heuristics.
 */
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const OWNERSHIP = [
  ["service_provider_profiles","user_id",false],
  ["service_requests","customer_user_id",false],
  ["service_listings","provider_user_id",false],
  ["service_offers","provider_user_id",false],
  ["service_offer_revisions","provider_user_id",false],
  ["service_offer_revisions","created_by",true],
  ["service_orders","customer_user_id",false],
  ["service_orders","provider_user_id",false],
  ["service_job_timeline","actor_user_id",true],
  ["service_messages","sender_user_id",false],
  ["service_message_participants","user_id",false],
  ["service_reviews","reviewer_user_id",false],
  ["service_reviews","reviewee_user_id",false],
  ["service_notifications","user_id",false],
  ["service_reports","reporter_user_id",false],
  ["service_reports","resolved_by",true],
  ["service_request_attachments","uploaded_by",true],
  ["service_request_status_history","changed_by",true],
  ["service_provider_documents","uploaded_by",true],
  ["service_provider_documents","verified_by",true],
  ["service_bookmarks","user_id",false],
  ["service_marketplace_settings","updated_by",true],
];

const sql = postgres(url, {
  ssl: "require",
  prepare: false,
  max: 1,
  connect_timeout: 20,
  onnotice: () => {},
  connection: { application_name: "akarpromax-l1c05b-orphan-fingerprint" },
});

const out = {
  probe: {
    mode: "BEGIN READ ONLY -> deliberate ROLLBACK",
    read_only_enforced: null,
    transaction_closed_with: null,
    generated_at_utc: null,
    privacy: "No raw identity values emitted; md5(normalized identity) is computed inside PostgreSQL.",
  },
  errors: [],
  unresolved_identities: [],
};

const ROLLBACK_SIGNAL = new Error("AKARPROMAX_ORPHAN_FINGERPRINT_ROLLBACK");

try {
  await sql.begin("read only", async (tx) => {
    const ro = (await tx.unsafe(
      "SELECT current_setting('transaction_read_only') AS value"
    ))[0]?.value;

    out.probe.read_only_enforced = String(ro).toLowerCase() === "on";
    if (!out.probe.read_only_enforced) {
      throw new Error(`READ_ONLY_GUARD_FAILED transaction_read_only=${ro}`);
    }

    out.probe.generated_at_utc =
      (await tx.unsafe("SELECT now() AT TIME ZONE 'utc' AS t"))[0]?.t ?? null;

    const parts = OWNERSHIP.map(([table, column, nullable]) => `
      SELECT
        '${table}.${column}'::text AS source,
        ${nullable ? "true" : "false"}::boolean AS nullable_actor,
        lower(trim(${column}::text)) AS normalized_value
      FROM public.${table}
      WHERE ${column} IS NOT NULL
    `);

    const q = `
      WITH all_values AS (
        ${parts.join("\nUNION ALL\n")}
      ),
      unresolved AS (
        SELECT a.*
        FROM all_values a
        WHERE NOT EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.email IS NOT NULL
            AND lower(trim(u.email)) = a.normalized_value
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id::text = a.normalized_value
        )
      )
      SELECT
        md5(normalized_value) AS fingerprint_md5,
        count(*)::bigint AS row_occurrences,
        count(*) FILTER (WHERE nullable_actor IS FALSE)::bigint AS required_owner_rows,
        count(*) FILTER (WHERE nullable_actor IS TRUE)::bigint AS nullable_actor_rows,
        count(DISTINCT source)::int AS source_count,
        array_agg(DISTINCT source ORDER BY source) AS sources,
        max(length(normalized_value))::int AS value_length,
        bool_or(normalized_value LIKE '%@%.%') AS email_like,
        bool_or(normalized_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') AS uuid_like,
        bool_or(
          normalized_value ~* '@(example\\.com|example\\.org|example\\.net)$'
          OR normalized_value ~* '@[^@]+\\.(invalid|test)$'
          OR normalized_value ~* '@localhost$'
        ) AS reserved_test_domain,
        bool_or(
          split_part(normalized_value, '@', 1)
          ~* '(test|demo|seed|customer|provider|sample|smoke|fixture|l1c)'
        ) AS test_like_localpart
      FROM unresolved
      GROUP BY normalized_value
      ORDER BY required_owner_rows DESC, row_occurrences DESC, fingerprint_md5
    `;

    out.unresolved_identities = await tx.unsafe(q);

    out.summary = {
      unique_unresolved_identities: out.unresolved_identities.length,
      total_required_owner_rows: out.unresolved_identities.reduce(
        (n, r) => n + Number(r.required_owner_rows ?? 0), 0
      ),
      total_nullable_actor_rows: out.unresolved_identities.reduce(
        (n, r) => n + Number(r.nullable_actor_rows ?? 0), 0
      ),
      clearly_test_like_identities: out.unresolved_identities.filter(
        (r) => r.reserved_test_domain || r.test_like_localpart
      ).length,
    };

    throw ROLLBACK_SIGNAL;
  }).catch((e) => {
    if (e === ROLLBACK_SIGNAL) {
      out.probe.transaction_closed_with = "ROLLBACK (deliberate)";
      return;
    }
    throw e;
  });
} catch (e) {
  out.errors.push({ label: "FATAL", error: String(e?.message ?? e).slice(0, 1000) });
  out.probe.transaction_closed_with ??= "ROLLBACK (after error)";
} finally {
  await sql.end({ timeout: 5 });
}

const target = path.join(
  process.cwd(),
  "docs",
  "refactor",
  "L1C05B_ORPHAN_FINGERPRINT_RAW.json"
);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(out, null, 2));
console.log(`wrote ${target}`);
console.log(
  `read_only_enforced=${out.probe.read_only_enforced} closed_with=${out.probe.transaction_closed_with} errors=${out.errors.length}`
);
