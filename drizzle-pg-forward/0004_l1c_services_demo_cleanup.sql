-- AKARPROMAX FORWARD MIGRATION 0004 — L1C SERVICES DEMO GRAPH CLEANUP
--
-- STATUS: PREPARED, NOT APPLIED, NOT ARMED.
--   There is deliberately NO entry for this file in drizzle-pg-forward/meta/_journal.json.
--   The drizzle migrator only executes journalled files, so this migration is
--   inert until the architect adds its journal entry. Adding that entry is the
--   act of ARMING it. It must be armed and run only inside the agreed
--   maintenance window, with the application stopped.
--
-- WHAT THIS IS
--   The architect verified against Neon and the current source that ALL
--   current operational Services data is demo/seed data produced by
--   lib/services/seed-marketplace.ts. This migration deletes exactly that
--   graph and nothing else.
--
-- IT FAILS CLOSED
--   Every precondition is asserted BEFORE the first DELETE. If ANY count,
--   identity or reference does not match the certified footprint, the
--   migration RAISEs and DELETES NOTHING. The forward migrator wraps the
--   migration and its ledger row in one transaction, so a raise rolls back
--   everything and the migration is not recorded as applied.
--
-- CERTIFIED FOOTPRINT REQUIRED BEFORE ANY DELETE
--   service_provider_profiles       = 4
--   service_provider_categories     = 16
--   service_provider_documents      = 4
--   service_provider_portfolio      = 4
--   service_requests                = 5
--   service_request_answers         = 18
--   service_request_matches         = 4
--   service_request_status_history  = 5
--   service_offers                  = 1
--   service_orders                  = 1
--   service_reviews                 = 2
--   service_job_timeline            = 4
--
--   Seed identities (hard-coded in lib/services/seed-marketplace.ts):
--     providers  provider1..provider4@localhost.akarpromax  (one profile each)
--     customer   customer@localhost.akarpromax              (owns all 5 requests)
--     references SR-2026-1001 x2, SR-2026-1002 x1, SR-2026-1003 x1, SR-2026-1004 x1
--
--   R1 EXACT SEED-GRAPH IDENTITY (all proved by seed-marketplace.ts):
--     service_request_status_history.changed_by = the seed customer, all 5 rows
--     the single offer            provider_user_id = provider1
--     the single order            customer = seed customer, provider = provider1,
--                                 request = an SR-2026-1001 row,
--                                 offer_id = the single seed offer,
--                                 offer.request_id = order.request_id
--     all 4 job-timeline rows     actor_user_id = provider1
--     the 2 reviews               reciprocal pair customer <-> provider1 on that order
--     the 4 provider documents    uploaded_by IS NULL and verified_by IS NULL
--
--   Operational Services tables outside the known seed graph MUST be empty
--   (checked UNCONDITIONALLY, before the already-clean short-circuit):
--     service_listings, service_messages, service_disputes, service_bookmarks,
--     service_request_attachments, service_offer_revisions, service_reports,
--     service_notifications, service_message_threads,
--     service_message_participants, service_outbox_events
--
-- NEVER TOUCHED
--   service_categories            (48 rows — reference taxonomy, PRESERVED)
--   service_marketplace_settings  (1 row  — configuration,       PRESERVED)
--   users                         (cross-domain identity, reviewed separately)
--   sponsor_access                (cross-domain identity, reviewed separately)
--   Their row counts are snapshotted before and re-asserted after.
--
-- FRESH-DATABASE BEHAVIOUR
--   If the entire operational Services graph is already empty (a fresh
--   bootstrap that never ran the demo seed) this migration is a deliberate
--   no-op. That is not a relaxation: it deletes nothing, and any state that is
--   neither "already empty" nor "exactly the certified footprint" still raises.
--
-- NOT IN SCOPE
--   No schema change. No column type change. No FK. No currency change.
--   No taxonomy change. No dispute workflow change. No demo data insertion.

DO $$
DECLARE
  -- ---------------------------------------------------------------- identities
  demo_provider_emails text[] := ARRAY[
    'provider1@localhost.akarpromax',
    'provider2@localhost.akarpromax',
    'provider3@localhost.akarpromax',
    'provider4@localhost.akarpromax'
  ];
  demo_customer_email  text   := 'customer@localhost.akarpromax';
  -- lib/services/seed-marketplace.ts seedDemoJob() builds the single offer/order/
  -- review/timeline graph exclusively for provider1.
  demo_job_provider    text   := 'provider1@localhost.akarpromax';
  demo_job_request_ref text   := 'SR-2026-1001';
  demo_request_refs    text[] := ARRAY[
    'SR-2026-1001', 'SR-2026-1002', 'SR-2026-1003', 'SR-2026-1004'
  ];

  profile_ids text[];
  request_ids text[];
  order_ids   text[];

  -- --------------------------------------------------------- observed counts
  n_profiles   bigint; n_prov_cats bigint; n_prov_docs bigint; n_portfolio bigint;
  n_requests   bigint; n_answers   bigint; n_matches   bigint; n_history   bigint;
  n_offers     bigint; n_orders    bigint; n_reviews   bigint; n_timeline  bigint;

  -- ------------------------------------------ preserved-table snapshot (before)
  categories_before bigint;
  settings_before   bigint;
  users_before      bigint := NULL;
  sponsor_before    bigint := NULL;

  offender text;
  deleted  bigint;
  empty_table text;
  seed_offer_id     text;
  seed_order_request text;
BEGIN
  -- =======================================================================
  -- 0. SNAPSHOT THE TABLES THAT MUST SURVIVE UNCHANGED
  -- =======================================================================
  SELECT count(*) INTO categories_before FROM service_categories;
  SELECT count(*) INTO settings_before   FROM service_marketplace_settings;
  IF to_regclass('public.users') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.users' INTO users_before;
  END IF;
  IF to_regclass('public.sponsor_access') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.sponsor_access' INTO sponsor_before;
  END IF;

  -- =======================================================================
  -- 1. OBSERVE THE OPERATIONAL SERVICES FOOTPRINT
  -- =======================================================================
  SELECT count(*) INTO n_profiles   FROM service_provider_profiles;
  SELECT count(*) INTO n_prov_cats  FROM service_provider_categories;
  SELECT count(*) INTO n_prov_docs  FROM service_provider_documents;
  SELECT count(*) INTO n_portfolio  FROM service_provider_portfolio;
  SELECT count(*) INTO n_requests   FROM service_requests;
  SELECT count(*) INTO n_answers    FROM service_request_answers;
  SELECT count(*) INTO n_matches    FROM service_request_matches;
  SELECT count(*) INTO n_history    FROM service_request_status_history;
  SELECT count(*) INTO n_offers     FROM service_offers;
  SELECT count(*) INTO n_orders     FROM service_orders;
  SELECT count(*) INTO n_reviews    FROM service_reviews;
  SELECT count(*) INTO n_timeline   FROM service_job_timeline;

  -- =======================================================================
  -- 2. PRECONDITION (UNCONDITIONAL) — OPERATIONAL SERVICES TABLES OUTSIDE THE
  --    KNOWN SEED GRAPH MUST BE EMPTY.
  --
  --    R1 FIX. This check used to sit AFTER the already-clean short-circuit
  --    below, which left a fail-open hole: a database whose core demo graph was
  --    empty but which held, say, one service_outbox_events row succeeded as a
  --    no-op instead of raising. The check is now unconditional and runs BEFORE
  --    any early return, so unexpected operational Services data can never be
  --    silently accepted.
  -- =======================================================================
  FOREACH empty_table IN ARRAY ARRAY[
    'service_listings',
    'service_messages',
    'service_disputes',
    'service_bookmarks',
    'service_request_attachments',
    'service_offer_revisions',
    'service_reports',
    'service_notifications',
    'service_message_threads',
    'service_message_participants',
    'service_outbox_events'
  ] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', empty_table) INTO deleted;
    IF deleted <> 0 THEN
      RAISE EXCEPTION '0004 demo cleanup: % holds % row(s) but must be empty — that is operational data outside the certified demo graph. Nothing deleted.', empty_table, deleted;
    END IF;
  END LOOP;

  -- =======================================================================
  -- 3. ALREADY CLEAN — the ENTIRE operational Services footprint is empty.
  --    Reachable only after section 2 proved every outside-graph table empty,
  --    so this return means "nothing anywhere", not "nothing in the core graph".
  -- =======================================================================
  IF n_profiles = 0 AND n_prov_cats = 0 AND n_prov_docs = 0 AND n_portfolio = 0
     AND n_requests = 0 AND n_answers = 0 AND n_matches = 0 AND n_history = 0
     AND n_offers = 0 AND n_orders = 0 AND n_reviews = 0 AND n_timeline = 0 THEN
    RAISE NOTICE '0004 demo cleanup: the entire operational Services graph is already empty — nothing deleted.';
    RETURN;
  END IF;

  -- =======================================================================
  -- 4. PRECONDITION — EXACT CERTIFIED COUNTS (a partial demo graph raises)
  -- =======================================================================
  IF n_profiles  <> 4  THEN RAISE EXCEPTION '0004 demo cleanup: service_provider_profiles = % (expected 4). Nothing deleted.', n_profiles; END IF;
  IF n_prov_cats <> 16 THEN RAISE EXCEPTION '0004 demo cleanup: service_provider_categories = % (expected 16). Nothing deleted.', n_prov_cats; END IF;
  IF n_prov_docs <> 4  THEN RAISE EXCEPTION '0004 demo cleanup: service_provider_documents = % (expected 4). Nothing deleted.', n_prov_docs; END IF;
  IF n_portfolio <> 4  THEN RAISE EXCEPTION '0004 demo cleanup: service_provider_portfolio = % (expected 4). Nothing deleted.', n_portfolio; END IF;
  IF n_requests  <> 5  THEN RAISE EXCEPTION '0004 demo cleanup: service_requests = % (expected 5). Nothing deleted.', n_requests; END IF;
  IF n_answers   <> 18 THEN RAISE EXCEPTION '0004 demo cleanup: service_request_answers = % (expected 18). Nothing deleted.', n_answers; END IF;
  IF n_matches   <> 4  THEN RAISE EXCEPTION '0004 demo cleanup: service_request_matches = % (expected 4). Nothing deleted.', n_matches; END IF;
  IF n_history   <> 5  THEN RAISE EXCEPTION '0004 demo cleanup: service_request_status_history = % (expected 5). Nothing deleted.', n_history; END IF;
  IF n_offers    <> 1  THEN RAISE EXCEPTION '0004 demo cleanup: service_offers = % (expected 1). Nothing deleted.', n_offers; END IF;
  IF n_orders    <> 1  THEN RAISE EXCEPTION '0004 demo cleanup: service_orders = % (expected 1). Nothing deleted.', n_orders; END IF;
  IF n_reviews   <> 2  THEN RAISE EXCEPTION '0004 demo cleanup: service_reviews = % (expected 2). Nothing deleted.', n_reviews; END IF;
  IF n_timeline  <> 4  THEN RAISE EXCEPTION '0004 demo cleanup: service_job_timeline = % (expected 4). Nothing deleted.', n_timeline; END IF;

  -- =======================================================================
  -- 5. PRECONDITION — EVERY ROW BELONGS TO THE KNOWN SEED IDENTITIES
  -- =======================================================================

  -- 5.1 provider profiles: exactly the four hard-coded provider accounts.
  SELECT string_agg(DISTINCT p.user_id, ', ') INTO offender
  FROM service_provider_profiles p
  WHERE NOT (p.user_id = ANY (demo_provider_emails));
  IF offender IS NOT NULL THEN
    RAISE EXCEPTION '0004 demo cleanup: unexpected provider profile owner(s): %. Nothing deleted.', offender;
  END IF;
  IF (SELECT count(DISTINCT user_id) FROM service_provider_profiles) <> 4 THEN
    RAISE EXCEPTION '0004 demo cleanup: the 4 provider profiles are not the 4 distinct seed providers. Nothing deleted.';
  END IF;

  SELECT array_agg(id) INTO profile_ids
  FROM service_provider_profiles WHERE user_id = ANY (demo_provider_emails);

  -- 5.2 requests: only the seed customer, only the four known references,
  --     in the certified 2/1/1/1 distribution.
  SELECT string_agg(DISTINCT r.customer_user_id, ', ') INTO offender
  FROM service_requests r WHERE r.customer_user_id IS DISTINCT FROM demo_customer_email;
  IF offender IS NOT NULL THEN
    RAISE EXCEPTION '0004 demo cleanup: unexpected request owner(s): %. Nothing deleted.', offender;
  END IF;

  SELECT string_agg(DISTINCT coalesce(r.reference_number, '<NULL>'), ', ') INTO offender
  FROM service_requests r
  WHERE r.reference_number IS NULL OR NOT (r.reference_number = ANY (demo_request_refs));
  IF offender IS NOT NULL THEN
    RAISE EXCEPTION '0004 demo cleanup: unexpected request reference(s): %. Nothing deleted.', offender;
  END IF;

  SELECT string_agg(format('%s=%s', x.reference_number, x.n), ', ' ORDER BY x.reference_number) INTO offender
  FROM (
    SELECT reference_number, count(*) AS n FROM service_requests GROUP BY reference_number
  ) AS x
  JOIN (VALUES
    ('SR-2026-1001', 2::bigint),
    ('SR-2026-1002', 1::bigint),
    ('SR-2026-1003', 1::bigint),
    ('SR-2026-1004', 1::bigint)
  ) AS e(ref, n) ON e.ref = x.reference_number
  WHERE x.n <> e.n;
  IF offender IS NOT NULL THEN
    RAISE EXCEPTION '0004 demo cleanup: seed request reference distribution is not 1001x2/1002x1/1003x1/1004x1 — observed %. Nothing deleted.', offender;
  END IF;

  SELECT array_agg(id) INTO request_ids
  FROM service_requests
  WHERE customer_user_id = demo_customer_email AND reference_number = ANY (demo_request_refs);

  IF coalesce(array_length(profile_ids, 1), 0) <> 4 THEN
    RAISE EXCEPTION '0004 demo cleanup: resolved % demo provider profile id(s), expected 4. Nothing deleted.', coalesce(array_length(profile_ids, 1), 0);
  END IF;
  IF coalesce(array_length(request_ids, 1), 0) <> 5 THEN
    RAISE EXCEPTION '0004 demo cleanup: resolved % demo request id(s), expected 5. Nothing deleted.', coalesce(array_length(request_ids, 1), 0);
  END IF;

  -- 5.3 provider children must all hang off the four demo profiles.
  IF EXISTS (SELECT 1 FROM service_provider_categories WHERE NOT (provider_id = ANY (profile_ids))) THEN
    RAISE EXCEPTION '0004 demo cleanup: service_provider_categories holds row(s) outside the demo provider graph. Nothing deleted.';
  END IF;
  IF EXISTS (SELECT 1 FROM service_provider_documents WHERE NOT (provider_id = ANY (profile_ids))) THEN
    RAISE EXCEPTION '0004 demo cleanup: service_provider_documents holds row(s) outside the demo provider graph. Nothing deleted.';
  END IF;
  IF EXISTS (SELECT 1 FROM service_provider_portfolio WHERE NOT (provider_id = ANY (profile_ids))) THEN
    RAISE EXCEPTION '0004 demo cleanup: service_provider_portfolio holds row(s) outside the demo provider graph. Nothing deleted.';
  END IF;

  -- 5.4 request children must all hang off the five demo requests.
  IF EXISTS (SELECT 1 FROM service_request_answers WHERE NOT (request_id = ANY (request_ids))) THEN
    RAISE EXCEPTION '0004 demo cleanup: service_request_answers holds row(s) outside the demo request graph. Nothing deleted.';
  END IF;
  IF EXISTS (SELECT 1 FROM service_request_status_history WHERE NOT (request_id = ANY (request_ids))) THEN
    RAISE EXCEPTION '0004 demo cleanup: service_request_status_history holds row(s) outside the demo request graph. Nothing deleted.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM service_request_matches
    WHERE NOT (request_id = ANY (request_ids)) OR NOT (provider_id = ANY (profile_ids))
  ) THEN
    RAISE EXCEPTION '0004 demo cleanup: service_request_matches holds row(s) outside the demo request/provider graph. Nothing deleted.';
  END IF;

  -- 5.5 the single demo offer, the single demo order and their children.
  IF EXISTS (
    SELECT 1 FROM service_offers
    WHERE NOT (request_id = ANY (request_ids)) OR NOT (provider_user_id = ANY (demo_provider_emails))
  ) THEN
    RAISE EXCEPTION '0004 demo cleanup: service_offers holds row(s) outside the demo graph. Nothing deleted.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM service_orders
    WHERE NOT (request_id = ANY (request_ids))
       OR customer_user_id IS DISTINCT FROM demo_customer_email
       OR NOT (provider_user_id = ANY (demo_provider_emails))
  ) THEN
    RAISE EXCEPTION '0004 demo cleanup: service_orders holds row(s) outside the demo graph. Nothing deleted.';
  END IF;

  SELECT array_agg(id) INTO order_ids FROM service_orders WHERE request_id = ANY (request_ids);
  IF coalesce(array_length(order_ids, 1), 0) <> 1 THEN
    RAISE EXCEPTION '0004 demo cleanup: resolved % demo order id(s), expected 1. Nothing deleted.', coalesce(array_length(order_ids, 1), 0);
  END IF;

  IF EXISTS (SELECT 1 FROM service_reviews WHERE NOT (order_id = ANY (order_ids))) THEN
    RAISE EXCEPTION '0004 demo cleanup: service_reviews holds row(s) outside the demo order graph. Nothing deleted.';
  END IF;
  IF EXISTS (SELECT 1 FROM service_job_timeline WHERE NOT (order_id = ANY (order_ids))) THEN
    RAISE EXCEPTION '0004 demo cleanup: service_job_timeline holds row(s) outside the demo order graph. Nothing deleted.';
  END IF;

  -- 5.6 R1 — EXACT SEED-GRAPH IDENTITY, not merely matching row counts.
  --      Every claim below is proved by lib/services/seed-marketplace.ts; nothing
  --      is assumed beyond what that source writes.

  -- 5.6.1 seedRequests() binds request.customerEmail into changed_by for all 5
  --       history rows, so the actor is the seed customer on every row.
  SELECT string_agg(DISTINCT coalesce(h.changed_by, '<NULL>'), ', ') INTO offender
  FROM service_request_status_history h
  WHERE h.changed_by IS DISTINCT FROM demo_customer_email;
  IF offender IS NOT NULL THEN
    RAISE EXCEPTION '0004 demo cleanup: service_request_status_history.changed_by must be the seed customer on every row, found: %. Nothing deleted.', offender;
  END IF;

  -- 5.6.2 seedDemoJob() resolves the provider by user_id = provider1, so the
  --       single offer belongs to provider1.
  SELECT id INTO seed_offer_id FROM service_offers;
  IF NOT EXISTS (
    SELECT 1 FROM service_offers
    WHERE id = seed_offer_id AND provider_user_id = demo_job_provider
  ) THEN
    RAISE EXCEPTION '0004 demo cleanup: the single service_offers row is not owned by the seed job provider (%). Nothing deleted.', demo_job_provider;
  END IF;

  -- 5.6.3 / 5.6.4 / 5.6.5 the single order is the certified seed job: seed
  --       customer, provider1, one of the SR-2026-1001 request rows, wired to the
  --       single seed offer, and offer.request_id = order.request_id.
  SELECT o.request_id INTO seed_order_request
  FROM service_orders o
  WHERE o.customer_user_id = demo_customer_email
    AND o.provider_user_id = demo_job_provider
    AND o.offer_id = seed_offer_id
    AND o.request_id IN (SELECT r.id FROM service_requests r WHERE r.reference_number = demo_job_request_ref)
    AND o.request_id = (SELECT f.request_id FROM service_offers f WHERE f.id = seed_offer_id);
  IF seed_order_request IS NULL THEN
    RAISE EXCEPTION '0004 demo cleanup: the single service_orders row is not the certified seed job — it must be customer=%, provider=%, request=one of the % rows, offer_id=the single seed offer, and offer.request_id must equal order.request_id. Nothing deleted.',
      demo_customer_email, demo_job_provider, demo_job_request_ref;
  END IF;

  -- 5.6.6 all four timeline rows are bound with providerUserId as the actor.
  SELECT string_agg(DISTINCT coalesce(t.actor_user_id, '<NULL>'), ', ') INTO offender
  FROM service_job_timeline t
  WHERE t.actor_user_id IS DISTINCT FROM demo_job_provider;
  IF offender IS NOT NULL THEN
    RAISE EXCEPTION '0004 demo cleanup: service_job_timeline.actor_user_id must be % on every row, found: %. Nothing deleted.', demo_job_provider, offender;
  END IF;

  -- 5.6.7 the two reviews are exactly the reciprocal seed pair on the seed order:
  --       customer -> provider1 and provider1 -> customer.
  IF (SELECT count(*) FROM service_reviews
      WHERE order_id = ANY (order_ids)
        AND reviewer_user_id = demo_customer_email
        AND reviewee_user_id = demo_job_provider) <> 1
     OR (SELECT count(*) FROM service_reviews
      WHERE order_id = ANY (order_ids)
        AND reviewer_user_id = demo_job_provider
        AND reviewee_user_id = demo_customer_email) <> 1 THEN
    RAISE EXCEPTION '0004 demo cleanup: the 2 service_reviews rows are not the reciprocal seed pair (% -> % and % -> %) on the single seed order. Nothing deleted.',
      demo_customer_email, demo_job_provider, demo_job_provider, demo_customer_email;
  END IF;

  -- 5.6.8 the provider-document seed INSERT names neither uploaded_by nor
  --       verified_by, so both actor columns are NULL on all 4 rows. A non-NULL
  --       value means a human or another writer touched these rows.
  IF EXISTS (
    SELECT 1 FROM service_provider_documents
    WHERE uploaded_by IS NOT NULL OR verified_by IS NOT NULL
  ) THEN
    RAISE EXCEPTION '0004 demo cleanup: service_provider_documents must carry uploaded_by IS NULL and verified_by IS NULL on every seed row — a non-NULL actor means the row is not untouched seed data. Nothing deleted.';
  END IF;

  -- =======================================================================
  -- 6. DELETE — CHILD ROWS FIRST, ALWAYS SCOPED BY RESOLVED DEMO IDENTITY.
  --    No broad DELETE FROM service_* exists in this migration.
  -- =======================================================================
  DELETE FROM service_reviews WHERE order_id = ANY (order_ids);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  IF deleted <> 2 THEN RAISE EXCEPTION '0004 demo cleanup: deleted % service_reviews row(s), expected 2.', deleted; END IF;

  DELETE FROM service_job_timeline WHERE order_id = ANY (order_ids);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  IF deleted <> 4 THEN RAISE EXCEPTION '0004 demo cleanup: deleted % service_job_timeline row(s), expected 4.', deleted; END IF;

  DELETE FROM service_orders WHERE id = ANY (order_ids);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  IF deleted <> 1 THEN RAISE EXCEPTION '0004 demo cleanup: deleted % service_orders row(s), expected 1.', deleted; END IF;

  DELETE FROM service_offers WHERE request_id = ANY (request_ids);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  IF deleted <> 1 THEN RAISE EXCEPTION '0004 demo cleanup: deleted % service_offers row(s), expected 1.', deleted; END IF;

  DELETE FROM service_request_matches WHERE request_id = ANY (request_ids);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  IF deleted <> 4 THEN RAISE EXCEPTION '0004 demo cleanup: deleted % service_request_matches row(s), expected 4.', deleted; END IF;

  DELETE FROM service_request_answers WHERE request_id = ANY (request_ids);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  IF deleted <> 18 THEN RAISE EXCEPTION '0004 demo cleanup: deleted % service_request_answers row(s), expected 18.', deleted; END IF;

  DELETE FROM service_request_status_history WHERE request_id = ANY (request_ids);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  IF deleted <> 5 THEN RAISE EXCEPTION '0004 demo cleanup: deleted % service_request_status_history row(s), expected 5.', deleted; END IF;

  DELETE FROM service_requests WHERE id = ANY (request_ids);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  IF deleted <> 5 THEN RAISE EXCEPTION '0004 demo cleanup: deleted % service_requests row(s), expected 5.', deleted; END IF;

  DELETE FROM service_provider_portfolio WHERE provider_id = ANY (profile_ids);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  IF deleted <> 4 THEN RAISE EXCEPTION '0004 demo cleanup: deleted % service_provider_portfolio row(s), expected 4.', deleted; END IF;

  DELETE FROM service_provider_documents WHERE provider_id = ANY (profile_ids);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  IF deleted <> 4 THEN RAISE EXCEPTION '0004 demo cleanup: deleted % service_provider_documents row(s), expected 4.', deleted; END IF;

  DELETE FROM service_provider_categories WHERE provider_id = ANY (profile_ids);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  IF deleted <> 16 THEN RAISE EXCEPTION '0004 demo cleanup: deleted % service_provider_categories row(s), expected 16.', deleted; END IF;

  DELETE FROM service_provider_profiles WHERE id = ANY (profile_ids);
  GET DIAGNOSTICS deleted = ROW_COUNT;
  IF deleted <> 4 THEN RAISE EXCEPTION '0004 demo cleanup: deleted % service_provider_profiles row(s), expected 4.', deleted; END IF;

  -- =======================================================================
  -- 7. POST-ASSERTION — THE OWNERSHIP-BEARING OPERATIONAL TABLES ARE EMPTY
  -- =======================================================================
  FOREACH empty_table IN ARRAY ARRAY[
    'service_provider_profiles',
    'service_provider_categories',
    'service_provider_documents',
    'service_provider_portfolio',
    'service_requests',
    'service_request_answers',
    'service_request_matches',
    'service_request_status_history',
    'service_offers',
    'service_orders',
    'service_reviews',
    'service_job_timeline'
  ] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', empty_table) INTO deleted;
    IF deleted <> 0 THEN
      RAISE EXCEPTION '0004 demo cleanup: % still holds % row(s) after cleanup.', empty_table, deleted;
    END IF;
  END LOOP;

  -- =======================================================================
  -- 8. POST-ASSERTION — THE PRESERVED TABLES ARE UNCHANGED
  -- =======================================================================
  IF (SELECT count(*) FROM service_categories) <> categories_before THEN
    RAISE EXCEPTION '0004 demo cleanup: service_categories changed (% -> %). It must be preserved.',
      categories_before, (SELECT count(*) FROM service_categories);
  END IF;
  IF (SELECT count(*) FROM service_marketplace_settings) <> settings_before THEN
    RAISE EXCEPTION '0004 demo cleanup: service_marketplace_settings changed (% -> %). It must be preserved.',
      settings_before, (SELECT count(*) FROM service_marketplace_settings);
  END IF;
  IF users_before IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.users' INTO deleted;
    IF deleted <> users_before THEN
      RAISE EXCEPTION '0004 demo cleanup: users changed (% -> %). users is never touched in this phase.', users_before, deleted;
    END IF;
  END IF;
  IF sponsor_before IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.sponsor_access' INTO deleted;
    IF deleted <> sponsor_before THEN
      RAISE EXCEPTION '0004 demo cleanup: sponsor_access changed (% -> %). sponsor_access is never touched in this phase.', sponsor_before, deleted;
    END IF;
  END IF;

  RAISE NOTICE '0004 demo cleanup: Services demo graph removed. service_categories=% preserved, service_marketplace_settings=% preserved.',
    categories_before, settings_before;
END
$$;
