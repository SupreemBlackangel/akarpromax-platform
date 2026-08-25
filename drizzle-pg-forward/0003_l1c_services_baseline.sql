-- AKARPROMAX FORWARD MIGRATION 0003 — L1C SERVICES FORWARD BASELINE
--
-- STATUS: PREPARED, NOT APPLIED, NOT ARMED.
--   There is deliberately NO entry for this file in drizzle-pg-forward/meta/_journal.json.
--   The drizzle migrator only executes journalled files, so this migration is
--   inert until the architect adds its journal entry. Adding that entry is the
--   act of ARMING it; see docs/refactor/L1C05B_SERVICES_MIGRATION_PLAN.md.
--
-- WHAT THIS IS
--   Services enters the same canonical forward authority as 0000/0001/0002
--   (schema akarpromax, table forward_migrations). Until now the 25 service_*
--   tables were created at runtime by ensureServicesSchema() +
--   ensureServicesMarketplaceSchema(); no migration owned them.
--
-- HOW IT WAS AUTHORED
--   Hand-reviewed. NOT produced by drizzle-kit generate (which is guarded by
--   scripts/guard-db-generate.mjs and would author the deprecated duplicate
--   Services model). Every statement is a faithful transcription of the two
--   canonical runtime modules --
--       lib/services-schema.ts               (9 tables, 19 indexes)
--       lib/services-marketplace-schema.ts   (16 tables, 23 indexes, 69 ALTER columns)
--   -- through the exact same translation the Postgres adapter applies at
--   runtime (lib/pg-runtime.ts translateSql: DATETIME -> TIMESTAMP). The base
--   CREATEs and the marketplace ALTER columns are folded into one shape, and
--   the ALTERs are ALSO emitted guarded so a database created before them is
--   brought up to the same shape.
--
-- DATABASE TRUTH IT ENCODES (certified by L1C-0.5B0, read-only)
--   25/25 expected Services tables      0 missing, 0 extra
--   42/42 expected application indexes  0 missing, 0 extra non-constraint indexes
--
-- SAFETY
--   * idempotent: CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS /
--     CREATE INDEX IF NOT EXISTS -- a no-op against the live Neon database,
--     a full creator against a fresh one
--   * preserves every existing row and every existing id
--   * NO DROP, NO DELETE, NO TRUNCATE, NO ALTER TYPE, NO data insertion
--   * NO demo/seed data of any kind
--   * NO taxonomy_v2, NO parallel Services schema
--   * NO service dispute workflow expansion
--   * users / sponsor_access are not referenced
--
-- SCOPE BOUNDARY
--   This baseline is BEFORE ownership evolution (M1: VARCHAR(36) email ->
--   PostgreSQL uuid + FKs to users(id)) and BEFORE currency evolution (M3:
--   DROP DEFAULT 'OMR'). Section 4 asserts the pre-evolution shapes so that
--   drift is detected instead of silently absorbed.

-- =========================================================================
-- SECTION 1 -- the 25 canonical Services tables (base CREATE + marketplace
-- ALTER columns folded into one shape).
-- =========================================================================
CREATE TABLE IF NOT EXISTS service_categories (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    parent_id VARCHAR(36) NULL,
    country_code VARCHAR(8) NOT NULL DEFAULT 'OM',
    code VARCHAR(128) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    name_ar TEXT NULL,
    name_en TEXT NULL,
    name_tr TEXT NULL,
    description_ar TEXT NULL,
    description_en TEXT NULL,
    description_tr TEXT NULL,
    icon TEXT NULL,
    image_url TEXT NULL,
    requires_license INTEGER NOT NULL DEFAULT 0,
    requires_visit INTEGER NOT NULL DEFAULT 0,
    price_min INTEGER NULL,
    price_max INTEGER NULL,
    dynamic_fields TEXT NULL,
    is_featured INTEGER NOT NULL DEFAULT 0,
    booking_mode VARCHAR(24) NOT NULL DEFAULT 'quotes',
    badge_ar TEXT NULL,
    badge_en TEXT NULL
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_listings (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    provider_user_id VARCHAR(36) NOT NULL,
    category_id VARCHAR(36) NOT NULL,
    country_code VARCHAR(8) NOT NULL,
    city_id VARCHAR(100) NOT NULL,
    district_id VARCHAR(100) NULL,
    latitude REAL NULL,
    longitude REAL NULL,
    title_key VARCHAR(255) NULL,
    description_key VARCHAR(255) NULL,
    price INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'OMR',
    unit VARCHAR(32) NOT NULL DEFAULT 'project',
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    is_featured INTEGER NOT NULL DEFAULT 0,
    tags TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    title_ar TEXT NULL,
    title_en TEXT NULL,
    title_tr TEXT NULL,
    description_ar TEXT NULL,
    description_en TEXT NULL,
    description_tr TEXT NULL,
    attributes TEXT NULL,
    media TEXT NULL,
    approved_at TEXT NULL,
    published_at TEXT NULL,
    is_promoted INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_requests (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    customer_user_id VARCHAR(36) NOT NULL,
    category_id VARCHAR(36) NOT NULL,
    country_code VARCHAR(8) NOT NULL,
    city_id VARCHAR(100) NOT NULL,
    district_id VARCHAR(100) NULL,
    latitude REAL NULL,
    longitude REAL NULL,
    title_key VARCHAR(255) NULL,
    description_key VARCHAR(255) NULL,
    budget_min INTEGER NULL,
    budget_max INTEGER NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'OMR',
    preferred_date TIMESTAMP NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    title TEXT NULL,
    description TEXT NULL,
    urgency VARCHAR(16) NULL,
    preferred_period VARCHAR(32) NULL,
    needs_visit INTEGER NOT NULL DEFAULT 0,
    access_notes TEXT NULL,
    short_address TEXT NULL,
    pricing_type VARCHAR(16) NOT NULL DEFAULT 'fixed',
    reference_number VARCHAR(32) NULL,
    answers TEXT NULL,
    published_at TIMESTAMP NULL,
    matched_at TIMESTAMP NULL,
    contact_phone VARCHAR(32) NULL,
    contact_email VARCHAR(255) NULL,
    contact_preference VARCHAR(16) NOT NULL DEFAULT 'chat'
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_offers (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    provider_user_id VARCHAR(36) NOT NULL,
    listing_id VARCHAR(36) NULL,
    price INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'OMR',
    duration_days INTEGER NULL,
    message_key VARCHAR(255) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'sent',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    materials_included INTEGER NOT NULL DEFAULT 0,
    material_cost INTEGER NULL,
    labor_cost INTEGER NULL,
    visit_fee INTEGER NULL,
    tax_amount INTEGER NULL,
    total_price INTEGER NOT NULL DEFAULT 0,
    duration_text VARCHAR(64) NULL,
    nearest_date TEXT NULL,
    offer_notes TEXT NULL,
    terms TEXT NULL,
    valid_until TEXT NULL,
    needs_visit INTEGER NOT NULL DEFAULT 0,
    revision_of VARCHAR(36) NULL
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_orders (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    offer_id VARCHAR(36) NOT NULL,
    customer_user_id VARCHAR(36) NOT NULL,
    provider_user_id VARCHAR(36) NOT NULL,
    price INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'OMR',
    status VARCHAR(32) NOT NULL DEFAULT 'created',
    accepted_at TIMESTAMP NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_messages (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    thread_type VARCHAR(16) NOT NULL,
    thread_id VARCHAR(36) NOT NULL,
    sender_user_id VARCHAR(36) NOT NULL,
    body TEXT NOT NULL,
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_read INTEGER NOT NULL DEFAULT 0,
    read_at TEXT NULL
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_reviews (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    order_id VARCHAR(36) NOT NULL,
    reviewer_user_id VARCHAR(36) NOT NULL,
    reviewee_user_id VARCHAR(36) NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    quality_rating INTEGER NULL,
    punctuality_rating INTEGER NULL,
    communication_rating INTEGER NULL,
    value_rating INTEGER NULL,
    recommend INTEGER NULL,
    is_hidden INTEGER NOT NULL DEFAULT 0,
    hidden_reason TEXT NULL
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_disputes (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    order_id VARCHAR(36) NOT NULL,
    opened_by_user_id VARCHAR(36) NOT NULL,
    reason VARCHAR(64) NOT NULL,
    description TEXT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    resolution_note TEXT NULL,
    opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_bookmarks (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    listing_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_provider_profiles (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    display_name_ar TEXT NULL,
    display_name_en TEXT NULL,
    bio_ar TEXT NULL,
    bio_en TEXT NULL,
    logo_url TEXT NULL,
    cover_url TEXT NULL,
    phone VARCHAR(32) NULL,
    whatsapp VARCHAR(32) NULL,
    email VARCHAR(255) NULL,
    website TEXT NULL,
    country_code VARCHAR(8) NOT NULL DEFAULT 'OM',
    city_id VARCHAR(100) NULL,
    district_id VARCHAR(100) NULL,
    governorate TEXT NULL,
    latitude REAL NULL,
    longitude REAL NULL,
    service_radius_km REAL NOT NULL DEFAULT 50,
    status VARCHAR(24) NOT NULL DEFAULT 'draft',
    verified_at TEXT NULL,
    approved_at TEXT NULL,
    suspended_at TEXT NULL,
    rejection_reason TEXT NULL,
    rating_avg REAL NOT NULL DEFAULT 0,
    rating_count INTEGER NOT NULL DEFAULT 0,
    jobs_completed INTEGER NOT NULL DEFAULT 0,
    completion_rate REAL NOT NULL DEFAULT 100,
    response_rate REAL NOT NULL DEFAULT 100,
    avg_response_time_min INTEGER NULL,
    licenses_text TEXT NULL,
    insurance_text TEXT NULL,
    founded_year INTEGER NULL,
    team_size INTEGER NULL,
    is_business INTEGER NOT NULL DEFAULT 0,
    business_name TEXT NULL,
    tax_number TEXT NULL,
    commercial_registration TEXT NULL,
    is_featured INTEGER NOT NULL DEFAULT 0,
    featured_rank INTEGER NOT NULL DEFAULT 0,
    is_accepting_requests INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_provider_categories (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    provider_id VARCHAR(36) NOT NULL,
    category_id VARCHAR(36) NOT NULL,
    price_from INTEGER NULL,
    price_to INTEGER NULL,
    pricing_unit VARCHAR(32) NULL,
    min_duration_min INTEGER NULL,
    notes TEXT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_provider_documents (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    provider_id VARCHAR(36) NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'other',
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT NULL,
    notes TEXT NULL,
    verified INTEGER NOT NULL DEFAULT 0,
    verified_by VARCHAR(36) NULL,
    verified_at TEXT NULL,
    uploaded_by VARCHAR(36) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_provider_portfolio (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    provider_id VARCHAR(36) NOT NULL,
    category_id VARCHAR(36) NULL,
    city_id VARCHAR(100) NULL,
    title TEXT NULL,
    description TEXT NULL,
    image_url TEXT NULL,
    before_image_url TEXT NULL,
    after_image_url TEXT NULL,
    video_url TEXT NULL,
    year INTEGER NULL,
    tags TEXT NULL,
    is_featured INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_request_answers (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    field_key VARCHAR(64) NOT NULL,
    field_label TEXT NULL,
    field_type VARCHAR(24) NULL,
    value TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_request_attachments (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT NULL,
    uploaded_by VARCHAR(36) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_request_matches (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    provider_id VARCHAR(36) NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    distance_km REAL NULL,
    category_match INTEGER NOT NULL DEFAULT 0,
    rating_bonus INTEGER NOT NULL DEFAULT 0,
    urgency_bonus INTEGER NOT NULL DEFAULT 0,
    budget_fit INTEGER NOT NULL DEFAULT 0,
    is_contacted INTEGER NOT NULL DEFAULT 0,
    contacted_at TEXT NULL,
    provider_ignored INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_request_status_history (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    from_status VARCHAR(32) NULL,
    to_status VARCHAR(32) NOT NULL,
    note TEXT NULL,
    changed_by VARCHAR(36) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_offer_revisions (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    offer_id VARCHAR(36) NOT NULL,
    revision_number INTEGER NOT NULL DEFAULT 1,
    request_id VARCHAR(36) NOT NULL,
    provider_user_id VARCHAR(36) NOT NULL,
    price INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'OMR',
    total_price INTEGER NOT NULL DEFAULT 0,
    duration_text VARCHAR(64) NULL,
    material_cost INTEGER NULL,
    labor_cost INTEGER NULL,
    visit_fee INTEGER NULL,
    tax_amount INTEGER NULL,
    materials_included INTEGER NOT NULL DEFAULT 0,
    nearest_date TEXT NULL,
    offer_notes TEXT NULL,
    terms TEXT NULL,
    needs_visit INTEGER NOT NULL DEFAULT 0,
    reason TEXT NULL,
    created_by VARCHAR(36) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_job_timeline (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    order_id VARCHAR(36) NOT NULL,
    event VARCHAR(64) NOT NULL,
    actor_user_id VARCHAR(36) NULL,
    from_status VARCHAR(32) NULL,
    to_status VARCHAR(32) NULL,
    note TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_reports (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    target_id VARCHAR(36) NOT NULL,
    reporter_user_id VARCHAR(36) NOT NULL,
    reason VARCHAR(64) NOT NULL,
    description TEXT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'open',
    resolution_note TEXT NULL,
    resolved_by VARCHAR(36) NULL,
    resolved_at TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_notifications (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    type VARCHAR(48) NOT NULL,
    title TEXT NULL,
    body TEXT NULL,
    link TEXT NULL,
    entity_type VARCHAR(32) NULL,
    entity_id VARCHAR(36) NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    read_at TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_message_threads (
    thread_type VARCHAR(32) NOT NULL,
    thread_id VARCHAR(36) NOT NULL,
    title TEXT NULL,
    context_link TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (thread_type, thread_id)
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_message_participants (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    thread_type VARCHAR(32) NOT NULL,
    thread_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role VARCHAR(32) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_outbox_events (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload TEXT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    error TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TEXT NULL
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS service_marketplace_settings (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    country_code VARCHAR(8) NOT NULL DEFAULT 'OM',
    hero_kicker_ar TEXT NULL,
    hero_kicker_en TEXT NULL,
    hero_title_ar TEXT NULL,
    hero_title_en TEXT NULL,
    hero_description_ar TEXT NULL,
    hero_description_en TEXT NULL,
    primary_cta_ar TEXT NULL,
    primary_cta_en TEXT NULL,
    primary_cta_href TEXT NOT NULL DEFAULT '/service-requests/new',
    secondary_cta_ar TEXT NULL,
    secondary_cta_en TEXT NULL,
    secondary_cta_href TEXT NOT NULL DEFAULT '/providers/apply',
    announcement_ar TEXT NULL,
    announcement_en TEXT NULL,
    show_categories INTEGER NOT NULL DEFAULT 1,
    show_featured_providers INTEGER NOT NULL DEFAULT 1,
    show_latest_requests INTEGER NOT NULL DEFAULT 1,
    show_how_it_works INTEGER NOT NULL DEFAULT 1,
    show_trust_bar INTEGER NOT NULL DEFAULT 1,
    featured_category_limit INTEGER NOT NULL DEFAULT 12,
    featured_provider_limit INTEGER NOT NULL DEFAULT 6,
    latest_request_limit INTEGER NOT NULL DEFAULT 6,
    allow_public_requests INTEGER NOT NULL DEFAULT 1,
    allow_provider_registration INTEGER NOT NULL DEFAULT 1,
    updated_by VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
--> statement-breakpoint

-- =========================================================================
-- SECTION 2 -- guarded ADD COLUMN.
-- Section 1 only creates a table that does not exist yet. A database created
-- before the marketplace ALTER columns already has the table but not these
-- columns, so every folded column is re-stated as ADD COLUMN IF NOT EXISTS.
-- On the live Neon database and on a fresh one alike these are no-ops.
-- =========================================================================
ALTER TABLE service_categories
  ADD COLUMN IF NOT EXISTS name_ar TEXT NULL,
  ADD COLUMN IF NOT EXISTS name_en TEXT NULL,
  ADD COLUMN IF NOT EXISTS name_tr TEXT NULL,
  ADD COLUMN IF NOT EXISTS description_ar TEXT NULL,
  ADD COLUMN IF NOT EXISTS description_en TEXT NULL,
  ADD COLUMN IF NOT EXISTS description_tr TEXT NULL,
  ADD COLUMN IF NOT EXISTS icon TEXT NULL,
  ADD COLUMN IF NOT EXISTS image_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS requires_license INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_visit INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_min INTEGER NULL,
  ADD COLUMN IF NOT EXISTS price_max INTEGER NULL,
  ADD COLUMN IF NOT EXISTS dynamic_fields TEXT NULL,
  ADD COLUMN IF NOT EXISTS is_featured INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS booking_mode VARCHAR(24) NOT NULL DEFAULT 'quotes',
  ADD COLUMN IF NOT EXISTS badge_ar TEXT NULL,
  ADD COLUMN IF NOT EXISTS badge_en TEXT NULL;
--> statement-breakpoint
ALTER TABLE service_listings
  ADD COLUMN IF NOT EXISTS title_ar TEXT NULL,
  ADD COLUMN IF NOT EXISTS title_en TEXT NULL,
  ADD COLUMN IF NOT EXISTS title_tr TEXT NULL,
  ADD COLUMN IF NOT EXISTS description_ar TEXT NULL,
  ADD COLUMN IF NOT EXISTS description_en TEXT NULL,
  ADD COLUMN IF NOT EXISTS description_tr TEXT NULL,
  ADD COLUMN IF NOT EXISTS attributes TEXT NULL,
  ADD COLUMN IF NOT EXISTS media TEXT NULL,
  ADD COLUMN IF NOT EXISTS approved_at TEXT NULL,
  ADD COLUMN IF NOT EXISTS published_at TEXT NULL,
  ADD COLUMN IF NOT EXISTS is_promoted INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS title TEXT NULL,
  ADD COLUMN IF NOT EXISTS description TEXT NULL,
  ADD COLUMN IF NOT EXISTS urgency VARCHAR(16) NULL,
  ADD COLUMN IF NOT EXISTS preferred_period VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS needs_visit INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS access_notes TEXT NULL,
  ADD COLUMN IF NOT EXISTS short_address TEXT NULL,
  ADD COLUMN IF NOT EXISTS pricing_type VARCHAR(16) NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS reference_number VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS answers TEXT NULL,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS matched_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS contact_preference VARCHAR(16) NOT NULL DEFAULT 'chat';
--> statement-breakpoint
ALTER TABLE service_offers
  ADD COLUMN IF NOT EXISTS materials_included INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS material_cost INTEGER NULL,
  ADD COLUMN IF NOT EXISTS labor_cost INTEGER NULL,
  ADD COLUMN IF NOT EXISTS visit_fee INTEGER NULL,
  ADD COLUMN IF NOT EXISTS tax_amount INTEGER NULL,
  ADD COLUMN IF NOT EXISTS total_price INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_text VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS nearest_date TEXT NULL,
  ADD COLUMN IF NOT EXISTS offer_notes TEXT NULL,
  ADD COLUMN IF NOT EXISTS terms TEXT NULL,
  ADD COLUMN IF NOT EXISTS valid_until TEXT NULL,
  ADD COLUMN IF NOT EXISTS needs_visit INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revision_of VARCHAR(36) NULL;
--> statement-breakpoint
ALTER TABLE service_reviews
  ADD COLUMN IF NOT EXISTS quality_rating INTEGER NULL,
  ADD COLUMN IF NOT EXISTS punctuality_rating INTEGER NULL,
  ADD COLUMN IF NOT EXISTS communication_rating INTEGER NULL,
  ADD COLUMN IF NOT EXISTS value_rating INTEGER NULL,
  ADD COLUMN IF NOT EXISTS recommend INTEGER NULL,
  ADD COLUMN IF NOT EXISTS is_hidden INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hidden_reason TEXT NULL;
--> statement-breakpoint
ALTER TABLE service_messages
  ADD COLUMN IF NOT EXISTS is_read INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS read_at TEXT NULL;
--> statement-breakpoint
ALTER TABLE service_provider_profiles
  ADD COLUMN IF NOT EXISTS is_featured INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS featured_rank INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_accepting_requests INTEGER NOT NULL DEFAULT 1;
--> statement-breakpoint

-- =========================================================================
-- SECTION 3 -- the 42 canonical Services application indexes.
-- Constraint-backed indexes (PRIMARY KEY) are created by SECTION 1 and are
-- deliberately not part of this count.
-- =========================================================================
CREATE UNIQUE INDEX IF NOT EXISTS service_categories_country_code_unique ON service_categories (country_code, code);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_categories_parent_idx ON service_categories (parent_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_listings_cat_geo_status_idx ON service_listings (category_id, country_code, city_id, status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_listings_provider_idx ON service_listings (provider_user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_requests_cat_geo_status_idx ON service_requests (category_id, country_code, city_id, status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_requests_customer_idx ON service_requests (customer_user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_offers_request_idx ON service_offers (request_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_offers_provider_idx ON service_offers (provider_user_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS service_offers_request_provider_unique ON service_offers (request_id, provider_user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_orders_request_idx ON service_orders (request_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS service_orders_request_unique ON service_orders (request_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_orders_participants_idx ON service_orders (customer_user_id, provider_user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_messages_thread_idx ON service_messages (thread_type, thread_id, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_messages_sender_idx ON service_messages (sender_user_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS service_reviews_order_reviewer_unique ON service_reviews (order_id, reviewer_user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_reviews_reviewee_idx ON service_reviews (reviewee_user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_disputes_order_idx ON service_disputes (order_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_disputes_status_idx ON service_disputes (status);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS service_bookmarks_user_listing_unique ON service_bookmarks (user_id, listing_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS service_provider_profiles_user_unique ON service_provider_profiles (user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_provider_profiles_status_country_idx ON service_provider_profiles (status, country_code);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS service_provider_categories_provider_category_unique ON service_provider_categories (provider_id, category_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_provider_categories_category_idx ON service_provider_categories (category_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_provider_documents_provider_idx ON service_provider_documents (provider_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_provider_portfolio_provider_idx ON service_provider_portfolio (provider_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_request_answers_request_idx ON service_request_answers (request_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_request_attachments_request_idx ON service_request_attachments (request_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS service_request_matches_request_provider_unique ON service_request_matches (request_id, provider_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_request_matches_request_score_idx ON service_request_matches (request_id, score);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_request_history_request_idx ON service_request_status_history (request_id, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_offer_revisions_offer_idx ON service_offer_revisions (offer_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_job_timeline_order_idx ON service_job_timeline (order_id, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_reports_target_idx ON service_reports (target_type, target_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_reports_status_idx ON service_reports (status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_notifications_user_idx ON service_notifications (user_id, is_read, created_at);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS service_message_participants_thread_user_unique ON service_message_participants (thread_type, thread_id, user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_message_participants_user_idx ON service_message_participants (user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_message_threads_updated_idx ON service_message_threads (thread_type, thread_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_outbox_status_idx ON service_outbox_events (status, created_at);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS service_marketplace_settings_country_unique ON service_marketplace_settings (country_code);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_categories_public_order_idx ON service_categories (country_code, is_active, is_featured, sort_order);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_provider_profiles_public_order_idx ON service_provider_profiles (country_code, status, is_featured, featured_rank);
--> statement-breakpoint

-- =========================================================================
-- SECTION 4 -- DRIFT ASSERTIONS.
-- These do not change anything. They fail the migration (and therefore roll
-- back the whole transaction, ledger row included) if the canonical Services
-- shape is not what this baseline claims.
-- =========================================================================

-- 4.1 exactly the 25 expected Services tables -- none missing, none extra.
DO $$
DECLARE
  expected text[] := ARRAY[
    'service_categories',
    'service_listings',
    'service_requests',
    'service_offers',
    'service_orders',
    'service_messages',
    'service_reviews',
    'service_disputes',
    'service_bookmarks',
    'service_provider_profiles',
    'service_provider_categories',
    'service_provider_documents',
    'service_provider_portfolio',
    'service_request_answers',
    'service_request_attachments',
    'service_request_matches',
    'service_request_status_history',
    'service_offer_revisions',
    'service_job_timeline',
    'service_reports',
    'service_notifications',
    'service_message_threads',
    'service_message_participants',
    'service_outbox_events',
    'service_marketplace_settings'
  ];
  missing text;
  extra text;
BEGIN
  SELECT string_agg(t, ', ' ORDER BY t) INTO missing
  FROM unnest(expected) AS t
  WHERE to_regclass('public.' || t) IS NULL;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION '0003 baseline: missing Services table(s): %', missing;
  END IF;

  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO extra
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname LIKE 'service\_%'
    AND NOT (c.relname = ANY (expected));
  IF extra IS NOT NULL THEN
    RAISE EXCEPTION '0003 baseline: unexpected extra service_* table(s): % -- the Services schema drifted, resolve before baselining', extra;
  END IF;
END
$$;
--> statement-breakpoint

-- 4.2 all 42 expected application indexes exist BY NAME.
DO $$
DECLARE
  expected text[] := ARRAY[
    'service_categories_country_code_unique',
    'service_categories_parent_idx',
    'service_listings_cat_geo_status_idx',
    'service_listings_provider_idx',
    'service_requests_cat_geo_status_idx',
    'service_requests_customer_idx',
    'service_offers_request_idx',
    'service_offers_provider_idx',
    'service_offers_request_provider_unique',
    'service_orders_request_idx',
    'service_orders_request_unique',
    'service_orders_participants_idx',
    'service_messages_thread_idx',
    'service_messages_sender_idx',
    'service_reviews_order_reviewer_unique',
    'service_reviews_reviewee_idx',
    'service_disputes_order_idx',
    'service_disputes_status_idx',
    'service_bookmarks_user_listing_unique',
    'service_provider_profiles_user_unique',
    'service_provider_profiles_status_country_idx',
    'service_provider_categories_provider_category_unique',
    'service_provider_categories_category_idx',
    'service_provider_documents_provider_idx',
    'service_provider_portfolio_provider_idx',
    'service_request_answers_request_idx',
    'service_request_attachments_request_idx',
    'service_request_matches_request_provider_unique',
    'service_request_matches_request_score_idx',
    'service_request_history_request_idx',
    'service_offer_revisions_offer_idx',
    'service_job_timeline_order_idx',
    'service_reports_target_idx',
    'service_reports_status_idx',
    'service_notifications_user_idx',
    'service_message_participants_thread_user_unique',
    'service_message_participants_user_idx',
    'service_message_threads_updated_idx',
    'service_outbox_status_idx',
    'service_marketplace_settings_country_unique',
    'service_categories_public_order_idx',
    'service_provider_profiles_public_order_idx'
  ];
  missing text;
BEGIN
  SELECT string_agg(i, ', ' ORDER BY i) INTO missing
  FROM unnest(expected) AS i
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'i' AND c.relname = i
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION '0003 baseline: missing Services index(es): %', missing;
  END IF;
END
$$;
--> statement-breakpoint

-- 4.2b R1 — every one of the 42 indexes has the expected SHAPE, not merely the
--      expected name. A pre-existing index that carries a canonical name but
--      indexes the wrong table, the wrong columns, the columns in the wrong
--      ORDER, or the wrong uniqueness is drift and must fail closed. Name-only
--      verification would silently accept it, because CREATE INDEX IF NOT EXISTS
--      is a no-op against an existing name.
--
--      Shape is read from PostgreSQL catalog truth: pg_index.indisunique for
--      uniqueness, and pg_index.indkey expanded through pg_attribute in key
--      order for the ordered column list. This index set contains no expression
--      and no INCLUDE index, so indkey is the complete key definition.
DO $$
DECLARE
  wrong text;
BEGIN
  SELECT string_agg(
           format('%s [expected %s(%s) unique=%s | actual %s]',
                  e.idx, e.tbl, e.cols, e.uniq,
                  coalesce(format('%s(%s) unique=%s', a.tbl, a.cols, a.uniq), 'MISSING')),
           '; ' ORDER BY e.idx)
    INTO wrong
  FROM (VALUES
    ('service_categories_country_code_unique', true, 'service_categories', 'country_code,code'),
    ('service_categories_parent_idx', false, 'service_categories', 'parent_id'),
    ('service_listings_cat_geo_status_idx', false, 'service_listings', 'category_id,country_code,city_id,status'),
    ('service_listings_provider_idx', false, 'service_listings', 'provider_user_id'),
    ('service_requests_cat_geo_status_idx', false, 'service_requests', 'category_id,country_code,city_id,status'),
    ('service_requests_customer_idx', false, 'service_requests', 'customer_user_id'),
    ('service_offers_request_idx', false, 'service_offers', 'request_id'),
    ('service_offers_provider_idx', false, 'service_offers', 'provider_user_id'),
    ('service_offers_request_provider_unique', true, 'service_offers', 'request_id,provider_user_id'),
    ('service_orders_request_idx', false, 'service_orders', 'request_id'),
    ('service_orders_request_unique', true, 'service_orders', 'request_id'),
    ('service_orders_participants_idx', false, 'service_orders', 'customer_user_id,provider_user_id'),
    ('service_messages_thread_idx', false, 'service_messages', 'thread_type,thread_id,created_at'),
    ('service_messages_sender_idx', false, 'service_messages', 'sender_user_id'),
    ('service_reviews_order_reviewer_unique', true, 'service_reviews', 'order_id,reviewer_user_id'),
    ('service_reviews_reviewee_idx', false, 'service_reviews', 'reviewee_user_id'),
    ('service_disputes_order_idx', false, 'service_disputes', 'order_id'),
    ('service_disputes_status_idx', false, 'service_disputes', 'status'),
    ('service_bookmarks_user_listing_unique', true, 'service_bookmarks', 'user_id,listing_id'),
    ('service_provider_profiles_user_unique', true, 'service_provider_profiles', 'user_id'),
    ('service_provider_profiles_status_country_idx', false, 'service_provider_profiles', 'status,country_code'),
    ('service_provider_categories_provider_category_unique', true, 'service_provider_categories', 'provider_id,category_id'),
    ('service_provider_categories_category_idx', false, 'service_provider_categories', 'category_id'),
    ('service_provider_documents_provider_idx', false, 'service_provider_documents', 'provider_id'),
    ('service_provider_portfolio_provider_idx', false, 'service_provider_portfolio', 'provider_id'),
    ('service_request_answers_request_idx', false, 'service_request_answers', 'request_id'),
    ('service_request_attachments_request_idx', false, 'service_request_attachments', 'request_id'),
    ('service_request_matches_request_provider_unique', true, 'service_request_matches', 'request_id,provider_id'),
    ('service_request_matches_request_score_idx', false, 'service_request_matches', 'request_id,score'),
    ('service_request_history_request_idx', false, 'service_request_status_history', 'request_id,created_at'),
    ('service_offer_revisions_offer_idx', false, 'service_offer_revisions', 'offer_id'),
    ('service_job_timeline_order_idx', false, 'service_job_timeline', 'order_id,created_at'),
    ('service_reports_target_idx', false, 'service_reports', 'target_type,target_id'),
    ('service_reports_status_idx', false, 'service_reports', 'status'),
    ('service_notifications_user_idx', false, 'service_notifications', 'user_id,is_read,created_at'),
    ('service_message_participants_thread_user_unique', true, 'service_message_participants', 'thread_type,thread_id,user_id'),
    ('service_message_participants_user_idx', false, 'service_message_participants', 'user_id'),
    ('service_message_threads_updated_idx', false, 'service_message_threads', 'thread_type,thread_id'),
    ('service_outbox_status_idx', false, 'service_outbox_events', 'status,created_at'),
    ('service_marketplace_settings_country_unique', true, 'service_marketplace_settings', 'country_code'),
    ('service_categories_public_order_idx', false, 'service_categories', 'country_code,is_active,is_featured,sort_order'),
    ('service_provider_profiles_public_order_idx', false, 'service_provider_profiles', 'country_code,status,is_featured,featured_rank')
  ) AS e(idx, uniq, tbl, cols)
  LEFT JOIN LATERAL (
    SELECT i.indisunique AS uniq,
           rel.relname::text AS tbl,
           (
             SELECT string_agg(att.attname::text, ',' ORDER BY k.ord)
             FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
             JOIN pg_attribute att
               ON att.attrelid = i.indrelid AND att.attnum = k.attnum
           ) AS cols
    FROM pg_class c
    JOIN pg_namespace n   ON n.oid = c.relnamespace
    JOIN pg_index i       ON i.indexrelid = c.oid
    JOIN pg_class rel     ON rel.oid = i.indrelid
    WHERE n.nspname = 'public' AND c.relkind = 'i' AND c.relname = e.idx
  ) AS a ON true
  WHERE a.tbl  IS DISTINCT FROM e.tbl
     OR a.cols IS DISTINCT FROM e.cols
     OR a.uniq IS DISTINCT FROM e.uniq;
  IF wrong IS NOT NULL THEN
    RAISE EXCEPTION '0003 baseline: index shape drift — %', wrong;
  END IF;
END
$$;
--> statement-breakpoint

-- 4.3 the 22 ownership/actor columns are still VARCHAR(36) -- the pre-M1 shape.
--     M1 turns these same columns into PostgreSQL uuid. If any of them already
--     moved, this baseline is not describing the database it is baselining.
--     service_disputes.opened_by_user_id is listed for SHAPE only; it stays
--     excluded from the M1 ownership cutover.
DO $$
DECLARE
  wrong text;
BEGIN
  SELECT string_agg(format('%s.%s', e.tbl, e.col), ', ' ORDER BY e.tbl, e.col) INTO wrong
  FROM (VALUES
    ('service_provider_profiles', 'user_id'),
    ('service_requests', 'customer_user_id'),
    ('service_listings', 'provider_user_id'),
    ('service_offers', 'provider_user_id'),
    ('service_offer_revisions', 'provider_user_id'),
    ('service_offer_revisions', 'created_by'),
    ('service_orders', 'customer_user_id'),
    ('service_orders', 'provider_user_id'),
    ('service_job_timeline', 'actor_user_id'),
    ('service_messages', 'sender_user_id'),
    ('service_message_participants', 'user_id'),
    ('service_reviews', 'reviewer_user_id'),
    ('service_reviews', 'reviewee_user_id'),
    ('service_notifications', 'user_id'),
    ('service_reports', 'reporter_user_id'),
    ('service_reports', 'resolved_by'),
    ('service_request_attachments', 'uploaded_by'),
    ('service_request_status_history', 'changed_by'),
    ('service_provider_documents', 'uploaded_by'),
    ('service_provider_documents', 'verified_by'),
    ('service_bookmarks', 'user_id'),
    ('service_disputes', 'opened_by_user_id')
  ) AS e(tbl, col)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = e.tbl
      AND c.column_name = e.col
      AND c.data_type = 'character varying'
      AND c.character_maximum_length = 36
  );
  IF wrong IS NOT NULL THEN
    RAISE EXCEPTION '0003 baseline: ownership column(s) missing or not VARCHAR(36): %', wrong;
  END IF;
END
$$;
--> statement-breakpoint

-- 4.4 the one wider actor column, and the composite Services thread key.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'service_marketplace_settings'
      AND column_name = 'updated_by' AND data_type = 'character varying'
      AND character_maximum_length = 255
  ) THEN
    RAISE EXCEPTION '0003 baseline: service_marketplace_settings.updated_by is not VARCHAR(255)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public' AND rel.relname = 'service_message_threads' AND con.contype = 'p'
      AND (
        SELECT array_agg(att.attname::text ORDER BY att.attname::text)
        FROM unnest(con.conkey) AS k(attnum)
        JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k.attnum
      ) = ARRAY['thread_id', 'thread_type']
  ) THEN
    RAISE EXCEPTION '0003 baseline: service_message_threads must keep the composite (thread_type, thread_id) primary key';
  END IF;
END
$$;
--> statement-breakpoint

-- 4.5 the five monetary currency columns still carry the pre-M3 shape:
--     VARCHAR(8) NOT NULL DEFAULT 'OMR'. M3 is the migration that drops those
--     defaults; asserting the shape here records exactly what M3 will change
--     and refuses to baseline a database where it already moved.
DO $$
DECLARE
  expected text[] := ARRAY[
    'service_requests',
    'service_listings',
    'service_offers',
    'service_orders',
    'service_offer_revisions'
  ];
  wrong text;
BEGIN
  SELECT string_agg(t, ', ' ORDER BY t) INTO wrong
  FROM unnest(expected) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = t AND c.column_name = 'currency'
      AND c.data_type = 'character varying' AND c.character_maximum_length = 8
      AND c.is_nullable = 'NO' AND c.column_default LIKE '''OMR''%'
  );
  IF wrong IS NOT NULL THEN
    RAISE EXCEPTION '0003 baseline: currency column drifted from the pre-M3 shape on: %', wrong;
  END IF;
END
$$;
