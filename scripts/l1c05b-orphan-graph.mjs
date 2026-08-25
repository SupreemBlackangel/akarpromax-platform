#!/usr/bin/env node
/**
 * AkarProMax L1C-0.5B — architect-reviewed READ-ONLY orphan graph classifier.
 *
 * PURPOSE
 * -------
 * We already know there are exactly two unresolved identity fingerprints.
 * This probe does NOT reveal either identity. It classifies the data graph
 * around those fingerprints so the architect can decide whether the rows are
 * synthetic/test fixtures or real user data that requires identity recovery.
 *
 * RUN
 *   node --env-file=.env scripts/l1c05b-orphan-graph.mjs
 *
 * OUTPUT
 *   docs/refactor/L1C05B_ORPHAN_GRAPH_RAW.json
 *
 * DB SAFETY
 *   - imports only fs/path/postgres
 *   - BEGIN READ ONLY
 *   - verifies transaction_read_only=on
 *   - SELECT only
 *   - deliberate ROLLBACK
 *
 * PRIVACY
 *   - no raw email, title, description, display name, phone, payload, or credential
 *   - unresolved identities are referenced only by the MD5 fingerprints already
 *     present in L1C05B_ORPHAN_FINGERPRINT_RAW.json
 */

import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const FP_CUSTOMER = "d55c8863abb98177063772f2b5382944";
const FP_PROVIDER = "9312923a4d2d6294eabd2fa129217a6d";

const TEST_RE = "(test|demo|seed|sample|smoke|fixture|l1c|customer|provider)";

const sql = postgres(url, {
  ssl: "require",
  prepare: false,
  max: 1,
  connect_timeout: 20,
  onnotice: () => {},
  connection: { application_name: "akarpromax-l1c05b-orphan-graph" },
});

const out = {
  probe: {
    mode: "BEGIN READ ONLY -> deliberate ROLLBACK",
    read_only_enforced: null,
    transaction_closed_with: null,
    generated_at_utc: null,
    privacy:
      "No raw identity or user content emitted. Only fingerprints, counts, timestamps, statuses, structural relations, and boolean test-like flags.",
  },
  errors: [],
};

const ROLLBACK_SIGNAL = new Error("AKARPROMAX_ORPHAN_GRAPH_ROLLBACK");

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

    /*
     * CUSTOMER-LIKE ORPHAN
     * Appears in request ownership, request history actor, order customer,
     * and review reviewer/reviewee.
     */
    const requestSummary = (
      await tx.unsafe(
        `
        WITH q AS (
          SELECT *
          FROM public.service_requests
          WHERE md5(lower(trim(customer_user_id::text))) = $1
        )
        SELECT
          count(*)::bigint AS request_count,
          min(created_at) AS first_request_at,
          max(created_at) AS last_request_at,
          count(*) FILTER (
            WHERE lower(
              coalesce(title,'') || ' ' ||
              coalesce(description,'') || ' ' ||
              coalesce(reference_number,'')
            ) ~ $2
          )::bigint AS requests_with_test_like_content,
          count(*) FILTER (
            WHERE contact_email IS NOT NULL
              AND EXISTS (
                SELECT 1
                FROM public.users u
                WHERE u.email IS NOT NULL
                  AND lower(trim(u.email)) = lower(trim(q.contact_email))
              )
          )::bigint AS request_contact_email_matches_existing_user
        FROM q
        `,
        [FP_CUSTOMER, TEST_RE],
      )
    )[0];

    const requestStatuses = await tx.unsafe(
      `
      SELECT status::text AS status, count(*)::bigint AS c
      FROM public.service_requests
      WHERE md5(lower(trim(customer_user_id::text))) = $1
      GROUP BY 1
      ORDER BY 1
      `,
      [FP_CUSTOMER],
    );

    const requestCountries = await tx.unsafe(
      `
      SELECT country_code::text AS country_code, count(*)::bigint AS c
      FROM public.service_requests
      WHERE md5(lower(trim(customer_user_id::text))) = $1
      GROUP BY 1
      ORDER BY 1
      `,
      [FP_CUSTOMER],
    );

    const requestGraph = (
      await tx.unsafe(
        `
        WITH orphan_requests AS (
          SELECT id
          FROM public.service_requests
          WHERE md5(lower(trim(customer_user_id::text))) = $1
        )
        SELECT
          (SELECT count(*) FROM public.service_request_status_history h
           WHERE h.request_id IN (SELECT id FROM orphan_requests))::bigint
            AS status_history_rows,
          (SELECT count(*) FROM public.service_request_answers a
           WHERE a.request_id IN (SELECT id FROM orphan_requests))::bigint
            AS answer_rows,
          (SELECT count(*) FROM public.service_request_attachments a
           WHERE a.request_id IN (SELECT id FROM orphan_requests))::bigint
            AS attachment_rows,
          (SELECT count(*) FROM public.service_request_matches m
           WHERE m.request_id IN (SELECT id FROM orphan_requests))::bigint
            AS match_rows,
          (SELECT count(*) FROM public.service_offers o
           WHERE o.request_id IN (SELECT id FROM orphan_requests))::bigint
            AS offer_rows,
          (SELECT count(*) FROM public.service_orders o
           WHERE o.request_id IN (SELECT id FROM orphan_requests))::bigint
            AS order_rows
        `,
        [FP_CUSTOMER],
      )
    )[0];

    const orderCustomer = (
      await tx.unsafe(
        `
        SELECT
          count(*)::bigint AS order_customer_rows,
          min(created_at) AS first_order_at,
          max(created_at) AS last_order_at
        FROM public.service_orders
        WHERE md5(lower(trim(customer_user_id::text))) = $1
        `,
        [FP_CUSTOMER],
      )
    )[0];

    const reviewSummary = (
      await tx.unsafe(
        `
        SELECT
          count(*) FILTER (
            WHERE md5(lower(trim(reviewer_user_id::text))) = $1
          )::bigint AS reviewer_rows,
          count(*) FILTER (
            WHERE md5(lower(trim(reviewee_user_id::text))) = $1
          )::bigint AS reviewee_rows,
          min(created_at) FILTER (
            WHERE md5(lower(trim(reviewer_user_id::text))) = $1
               OR md5(lower(trim(reviewee_user_id::text))) = $1
          ) AS first_review_at,
          max(created_at) FILTER (
            WHERE md5(lower(trim(reviewer_user_id::text))) = $1
               OR md5(lower(trim(reviewee_user_id::text))) = $1
          ) AS last_review_at,
          count(*) FILTER (
            WHERE (
              md5(lower(trim(reviewer_user_id::text))) = $1
              OR md5(lower(trim(reviewee_user_id::text))) = $1
            )
            AND lower(coalesce(comment,'')) ~ $2
          )::bigint AS reviews_with_test_like_comment
        FROM public.service_reviews
        `,
        [FP_CUSTOMER, TEST_RE],
      )
    )[0];

    const customerCrossGraph = (
      await tx.unsafe(
        `
        SELECT
          count(*) FILTER (
            WHERE md5(lower(trim(customer_user_id::text))) = $1
              AND EXISTS (
                SELECT 1 FROM public.service_requests r
                WHERE r.id = service_orders.request_id
                  AND md5(lower(trim(r.customer_user_id::text))) = $1
              )
          )::bigint AS orders_consistent_with_same_orphan_request_owner,
          count(*) FILTER (
            WHERE md5(lower(trim(customer_user_id::text))) = $1
              AND EXISTS (
                SELECT 1 FROM public.service_offers o
                WHERE o.id = service_orders.offer_id
              )
          )::bigint AS orphan_customer_orders_with_offer
        FROM public.service_orders
        `,
        [FP_CUSTOMER],
      )
    )[0];

    out.customer_like_orphan = {
      fingerprint_md5: FP_CUSTOMER,
      ...requestSummary,
      request_status_distribution: Object.fromEntries(
        requestStatuses.map((r) => [r.status ?? "(null)", r.c]),
      ),
      request_country_distribution: Object.fromEntries(
        requestCountries.map((r) => [r.country_code ?? "(null)", r.c]),
      ),
      ...requestGraph,
      ...orderCustomer,
      ...reviewSummary,
      ...customerCrossGraph,
    };

    /*
     * PROVIDER-LIKE ORPHAN
     * Appears only in service_provider_profiles.user_id in the prior probe.
     * We inspect the profile graph without returning the profile name/email.
     */
    const providerProfile = (
      await tx.unsafe(
        `
        WITH p AS (
          SELECT *
          FROM public.service_provider_profiles
          WHERE md5(lower(trim(user_id::text))) = $1
        )
        SELECT
          count(*)::bigint AS profile_count,
          min(created_at) AS first_profile_at,
          max(created_at) AS last_profile_at,
          count(*) FILTER (WHERE status = 'approved')::bigint AS approved_profiles,
          count(*) FILTER (WHERE status = 'draft')::bigint AS draft_profiles,
          count(*) FILTER (WHERE is_business <> 0)::bigint AS business_profiles,
          count(*) FILTER (
            WHERE lower(
              coalesce(display_name_ar,'') || ' ' ||
              coalesce(display_name_en,'') || ' ' ||
              coalesce(business_name,'')
            ) ~ $2
          )::bigint AS profiles_with_test_like_name,
          count(*) FILTER (
            WHERE email IS NOT NULL
              AND EXISTS (
                SELECT 1
                FROM public.users u
                WHERE u.email IS NOT NULL
                  AND lower(trim(u.email)) = lower(trim(p.email))
              )
          )::bigint AS contact_email_matches_existing_user
        FROM p
        `,
        [FP_PROVIDER, TEST_RE],
      )
    )[0];

    const providerCountries = await tx.unsafe(
      `
      SELECT country_code::text AS country_code, count(*)::bigint AS c
      FROM public.service_provider_profiles
      WHERE md5(lower(trim(user_id::text))) = $1
      GROUP BY 1
      ORDER BY 1
      `,
      [FP_PROVIDER],
    );

    const providerGraph = (
      await tx.unsafe(
        `
        WITH p AS (
          SELECT id
          FROM public.service_provider_profiles
          WHERE md5(lower(trim(user_id::text))) = $1
        )
        SELECT
          (SELECT count(*) FROM public.service_provider_categories c
           WHERE c.provider_id IN (SELECT id FROM p))::bigint
            AS provider_category_rows,
          (SELECT count(*) FROM public.service_provider_documents d
           WHERE d.provider_id IN (SELECT id FROM p))::bigint
            AS provider_document_rows,
          (SELECT count(*) FROM public.service_provider_portfolio x
           WHERE x.provider_id IN (SELECT id FROM p))::bigint
            AS provider_portfolio_rows,
          (SELECT count(*) FROM public.service_request_matches m
           WHERE m.provider_id IN (SELECT id FROM p))::bigint
            AS request_match_rows
        `,
        [FP_PROVIDER],
      )
    )[0];

    const providerIdentityElsewhere = (
      await tx.unsafe(
        `
        SELECT
          (SELECT count(*) FROM public.service_offers
           WHERE md5(lower(trim(provider_user_id::text))) = $1)::bigint
             AS offer_rows_with_same_identity,
          (SELECT count(*) FROM public.service_orders
           WHERE md5(lower(trim(provider_user_id::text))) = $1)::bigint
             AS order_rows_with_same_identity,
          (SELECT count(*) FROM public.service_offer_revisions
           WHERE md5(lower(trim(provider_user_id::text))) = $1)::bigint
             AS revision_rows_with_same_identity
        `,
        [FP_PROVIDER],
      )
    )[0];

    out.provider_like_orphan = {
      fingerprint_md5: FP_PROVIDER,
      ...providerProfile,
      profile_country_distribution: Object.fromEntries(
        providerCountries.map((r) => [r.country_code ?? "(null)", r.c]),
      ),
      ...providerGraph,
      ...providerIdentityElsewhere,
    };

    out.classification_inputs = {
      customer_like: {
        test_like_identity_from_previous_probe: true,
        data_graph_is_multi_table:
          Number(requestSummary.request_count ?? 0) > 0 &&
          Number(requestGraph.status_history_rows ?? 0) > 0,
      },
      provider_like: {
        test_like_identity_from_previous_probe: true,
        isolated_to_profile_identity:
          Number(providerIdentityElsewhere.offer_rows_with_same_identity ?? 0) === 0 &&
          Number(providerIdentityElsewhere.order_rows_with_same_identity ?? 0) === 0 &&
          Number(providerIdentityElsewhere.revision_rows_with_same_identity ?? 0) === 0,
      },
      note:
        "These are evidence inputs only. The script does not decide whether deletion, mapping, or preservation is correct.",
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
  "L1C05B_ORPHAN_GRAPH_RAW.json",
);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(out, null, 2));
console.log(`wrote ${target}`);
console.log(
  `read_only_enforced=${out.probe.read_only_enforced} closed_with=${out.probe.transaction_closed_with} errors=${out.errors.length}`,
);
