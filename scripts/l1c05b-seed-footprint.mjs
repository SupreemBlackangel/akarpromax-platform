#!/usr/bin/env node
/**
 * AkarProMax L1C-0.5B — architect-reviewed READ-ONLY known Services seed footprint probe.
 *
 * Purpose:
 *   Confirm the exact remaining footprint of the hard-coded demo identities from
 *   lib/services/seed-marketplace.ts before any destructive cleanup.
 *
 * Privacy:
 *   No raw email, name, phone, request text, review text, or payload is emitted.
 *   Known seed identities are represented only by stable labels and MD5 fingerprints.
 *
 * Run:
 *   node --env-file=.env scripts/l1c05b-seed-footprint.mjs
 *
 * Output:
 *   docs/refactor/L1C05B_SEED_FOOTPRINT_RAW.json
 */

import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

/*
 * Fingerprints are md5(lower(trim(seed-email))) computed from the hard-coded
 * identities in lib/services/seed-marketplace.ts. Raw email values are never
 * included in this script's output.
 */
const SEEDS = [
  { label: "seed_customer", fp: "d55c8863abb98177063772f2b5382944" },
  { label: "seed_provider_1", fp: "53e26e636e1af754f54b2d31d556c32c" },
  { label: "seed_provider_2", fp: "f1fe021db3c43663208e657524114a7a" },
  { label: "seed_provider_3", fp: "9312923a4d2d6294eabd2fa129217a6d" },
  { label: "seed_provider_4", fp: "cecc7480c6eb71f0f414479c933ceaca" },
];

const KNOWN_REQUEST_REFS = [
  "SR-2026-1001",
  "SR-2026-1002",
  "SR-2026-1003",
  "SR-2026-1004",
];

const sql = postgres(url, {
  ssl: "require",
  prepare: false,
  max: 1,
  connect_timeout: 20,
  onnotice: () => {},
  connection: { application_name: "akarpromax-l1c05b-seed-footprint" },
});

const out = {
  probe: {
    mode: "BEGIN READ ONLY -> deliberate ROLLBACK",
    read_only_enforced: null,
    transaction_closed_with: null,
    generated_at_utc: null,
    privacy:
      "No raw identities or user content emitted. Known hard-coded seed identities are represented by labels + fingerprints only.",
  },
  errors: [],
  identities: {},
};

const ROLLBACK_SIGNAL = new Error("AKARPROMAX_SEED_FOOTPRINT_ROLLBACK");

const tableExists = async (tx, qualified) => {
  const r = await tx.unsafe("SELECT to_regclass($1) IS NOT NULL AS present", [
    qualified,
  ]);
  return Boolean(r[0]?.present);
};

const countByFp = async (tx, table, column, fp) => {
  const r = await tx.unsafe(
    `SELECT count(*)::bigint AS c
       FROM public.${table}
      WHERE ${column} IS NOT NULL
        AND md5(lower(trim(${column}::text))) = $1`,
    [fp],
  );
  return r[0]?.c ?? "0";
};

try {
  await sql.begin("read only", async (tx) => {
    const ro = (
      await tx.unsafe(
        "SELECT current_setting('transaction_read_only') AS value",
      )
    )[0]?.value;

    out.probe.read_only_enforced = String(ro).toLowerCase() === "on";
    if (!out.probe.read_only_enforced) {
      throw new Error(`READ_ONLY_GUARD_FAILED transaction_read_only=${ro}`);
    }

    out.probe.generated_at_utc =
      (await tx.unsafe("SELECT now() AT TIME ZONE 'utc' AS t"))[0]?.t ?? null;

    const usersPresent = await tableExists(tx, "public.users");
    const sponsorAccessPresent = await tableExists(tx, "public.sponsor_access");

    out.identity_tables = {
      users_present: usersPresent,
      sponsor_access_present: sponsorAccessPresent,
    };

    for (const seed of SEEDS) {
      const item = {
        fingerprint_md5: seed.fp,
        users_rows: usersPresent
          ? await countByFp(tx, "users", "email", seed.fp)
          : null,
        sponsor_access_rows: sponsorAccessPresent
          ? await countByFp(tx, "sponsor_access", "email", seed.fp)
          : null,
        service_provider_profiles_user_rows:
          await countByFp(tx, "service_provider_profiles", "user_id", seed.fp),
        service_requests_customer_rows:
          await countByFp(tx, "service_requests", "customer_user_id", seed.fp),
        service_offers_provider_rows:
          await countByFp(tx, "service_offers", "provider_user_id", seed.fp),
        service_orders_customer_rows:
          await countByFp(tx, "service_orders", "customer_user_id", seed.fp),
        service_orders_provider_rows:
          await countByFp(tx, "service_orders", "provider_user_id", seed.fp),
        service_reviews_reviewer_rows:
          await countByFp(tx, "service_reviews", "reviewer_user_id", seed.fp),
        service_reviews_reviewee_rows:
          await countByFp(tx, "service_reviews", "reviewee_user_id", seed.fp),
        service_request_history_actor_rows:
          await countByFp(tx, "service_request_status_history", "changed_by", seed.fp),
        service_job_timeline_actor_rows:
          await countByFp(tx, "service_job_timeline", "actor_user_id", seed.fp),
      };

      if (Number(item.service_provider_profiles_user_rows) > 0) {
        const graph = (
          await tx.unsafe(
            `
            WITH p AS (
              SELECT id
              FROM public.service_provider_profiles
              WHERE md5(lower(trim(user_id::text))) = $1
            )
            SELECT
              (SELECT count(*) FROM public.service_provider_categories c
                WHERE c.provider_id IN (SELECT id FROM p))::bigint AS category_rows,
              (SELECT count(*) FROM public.service_provider_documents d
                WHERE d.provider_id IN (SELECT id FROM p))::bigint AS document_rows,
              (SELECT count(*) FROM public.service_provider_portfolio x
                WHERE x.provider_id IN (SELECT id FROM p))::bigint AS portfolio_rows,
              (SELECT count(*) FROM public.service_request_matches m
                WHERE m.provider_id IN (SELECT id FROM p))::bigint AS match_rows
            `,
            [seed.fp],
          )
        )[0];
        item.provider_graph = graph;
      } else {
        item.provider_graph = {
          category_rows: "0",
          document_rows: "0",
          portfolio_rows: "0",
          match_rows: "0",
        };
      }

      out.identities[seed.label] = item;
    }

    const customerFp = SEEDS.find((s) => s.label === "seed_customer").fp;

    out.seed_request_shape = (
      await tx.unsafe(
        `
        SELECT
          count(*)::bigint AS all_seed_customer_requests,
          count(*) FILTER (
            WHERE reference_number = ANY($2)
          )::bigint AS known_reference_requests,
          count(*) FILTER (
            WHERE reference_number IS NULL
               OR NOT (reference_number = ANY($2))
          )::bigint AS extra_seed_customer_requests,
          min(created_at) AS first_created_at,
          max(created_at) AS last_created_at
        FROM public.service_requests
        WHERE md5(lower(trim(customer_user_id::text))) = $1
        `,
        [customerFp, KNOWN_REQUEST_REFS],
      )
    )[0];

    out.known_reference_presence = Object.fromEntries(
      (
        await tx.unsafe(
          `
          SELECT reference_number::text AS reference_number, count(*)::bigint AS c
          FROM public.service_requests
          WHERE reference_number = ANY($1)
          GROUP BY 1
          ORDER BY 1
          `,
          [KNOWN_REQUEST_REFS],
        )
      ).map((r) => [r.reference_number, r.c]),
    );

    out.services_totals = {
      provider_profiles:
        (await tx.unsafe("SELECT count(*)::bigint AS c FROM public.service_provider_profiles"))[0]?.c ?? "0",
      requests:
        (await tx.unsafe("SELECT count(*)::bigint AS c FROM public.service_requests"))[0]?.c ?? "0",
      offers:
        (await tx.unsafe("SELECT count(*)::bigint AS c FROM public.service_offers"))[0]?.c ?? "0",
      orders:
        (await tx.unsafe("SELECT count(*)::bigint AS c FROM public.service_orders"))[0]?.c ?? "0",
      reviews:
        (await tx.unsafe("SELECT count(*)::bigint AS c FROM public.service_reviews"))[0]?.c ?? "0",
      provider_categories:
        (await tx.unsafe("SELECT count(*)::bigint AS c FROM public.service_provider_categories"))[0]?.c ?? "0",
      provider_documents:
        (await tx.unsafe("SELECT count(*)::bigint AS c FROM public.service_provider_documents"))[0]?.c ?? "0",
      provider_portfolio:
        (await tx.unsafe("SELECT count(*)::bigint AS c FROM public.service_provider_portfolio"))[0]?.c ?? "0",
      request_answers:
        (await tx.unsafe("SELECT count(*)::bigint AS c FROM public.service_request_answers"))[0]?.c ?? "0",
      request_matches:
        (await tx.unsafe("SELECT count(*)::bigint AS c FROM public.service_request_matches"))[0]?.c ?? "0",
      request_status_history:
        (await tx.unsafe("SELECT count(*)::bigint AS c FROM public.service_request_status_history"))[0]?.c ?? "0",
      job_timeline:
        (await tx.unsafe("SELECT count(*)::bigint AS c FROM public.service_job_timeline"))[0]?.c ?? "0",
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
  out.errors.push({
    label: "FATAL",
    error: String(e?.message ?? e).slice(0, 1000),
  });
  out.probe.transaction_closed_with ??= "ROLLBACK (after error)";
} finally {
  await sql.end({ timeout: 5 });
}

const target = path.join(
  process.cwd(),
  "docs",
  "refactor",
  "L1C05B_SEED_FOOTPRINT_RAW.json",
);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(out, null, 2));
console.log(`wrote ${target}`);
console.log(
  `read_only_enforced=${out.probe.read_only_enforced} closed_with=${out.probe.transaction_closed_with} errors=${out.errors.length}`,
);
