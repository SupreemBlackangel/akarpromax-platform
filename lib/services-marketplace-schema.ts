import { isDuplicateColumnError, isDuplicateKeyError } from "@/lib/schema-helpers";

export const SERVICES_MARKETPLACE_NEW_COLUMNS: string[] = [
  // service_categories
  `ALTER TABLE service_categories ADD COLUMN name_ar TEXT NULL`,
  `ALTER TABLE service_categories ADD COLUMN name_en TEXT NULL`,
  `ALTER TABLE service_categories ADD COLUMN name_tr TEXT NULL`,
  `ALTER TABLE service_categories ADD COLUMN description_ar TEXT NULL`,
  `ALTER TABLE service_categories ADD COLUMN description_en TEXT NULL`,
  `ALTER TABLE service_categories ADD COLUMN description_tr TEXT NULL`,
  `ALTER TABLE service_categories ADD COLUMN icon TEXT NULL`,
  `ALTER TABLE service_categories ADD COLUMN image_url TEXT NULL`,
  `ALTER TABLE service_categories ADD COLUMN requires_license INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE service_categories ADD COLUMN requires_visit INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE service_categories ADD COLUMN price_min INTEGER NULL`,
  `ALTER TABLE service_categories ADD COLUMN price_max INTEGER NULL`,
  `ALTER TABLE service_categories ADD COLUMN dynamic_fields TEXT NULL`,
  `ALTER TABLE service_categories ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE service_categories ADD COLUMN booking_mode VARCHAR(24) NOT NULL DEFAULT 'quotes'`,
  `ALTER TABLE service_categories ADD COLUMN badge_ar TEXT NULL`,
  `ALTER TABLE service_categories ADD COLUMN badge_en TEXT NULL`,

  // service_listings
  `ALTER TABLE service_listings ADD COLUMN title_ar TEXT NULL`,
  `ALTER TABLE service_listings ADD COLUMN title_en TEXT NULL`,
  `ALTER TABLE service_listings ADD COLUMN title_tr TEXT NULL`,
  `ALTER TABLE service_listings ADD COLUMN description_ar TEXT NULL`,
  `ALTER TABLE service_listings ADD COLUMN description_en TEXT NULL`,
  `ALTER TABLE service_listings ADD COLUMN description_tr TEXT NULL`,
  `ALTER TABLE service_listings ADD COLUMN attributes TEXT NULL`,
  `ALTER TABLE service_listings ADD COLUMN media TEXT NULL`,
  `ALTER TABLE service_listings ADD COLUMN approved_at TEXT NULL`,
  `ALTER TABLE service_listings ADD COLUMN published_at TEXT NULL`,
  `ALTER TABLE service_listings ADD COLUMN is_promoted INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE service_listings ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0`,

  // service_requests
  `ALTER TABLE service_requests ADD COLUMN title TEXT NULL`,
  `ALTER TABLE service_requests ADD COLUMN description TEXT NULL`,
  `ALTER TABLE service_requests ADD COLUMN urgency VARCHAR(16) NULL`,
  `ALTER TABLE service_requests ADD COLUMN preferred_period VARCHAR(32) NULL`,
  `ALTER TABLE service_requests ADD COLUMN needs_visit INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE service_requests ADD COLUMN access_notes TEXT NULL`,
  `ALTER TABLE service_requests ADD COLUMN short_address TEXT NULL`,
  `ALTER TABLE service_requests ADD COLUMN pricing_type VARCHAR(16) NOT NULL DEFAULT 'fixed'`,
  `ALTER TABLE service_requests ADD COLUMN reference_number VARCHAR(32) NULL`,
  `ALTER TABLE service_requests ADD COLUMN answers TEXT NULL`,
  `ALTER TABLE service_requests ADD COLUMN published_at DATETIME NULL`,
  `ALTER TABLE service_requests ADD COLUMN matched_at DATETIME NULL`,
  `ALTER TABLE service_requests ADD COLUMN contact_phone VARCHAR(32) NULL`,
  `ALTER TABLE service_requests ADD COLUMN contact_email VARCHAR(255) NULL`,
  `ALTER TABLE service_requests ADD COLUMN contact_preference VARCHAR(16) NOT NULL DEFAULT 'chat'`,

  // service_offers
  `ALTER TABLE service_offers ADD COLUMN materials_included INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE service_offers ADD COLUMN material_cost INTEGER NULL`,
  `ALTER TABLE service_offers ADD COLUMN labor_cost INTEGER NULL`,
  `ALTER TABLE service_offers ADD COLUMN visit_fee INTEGER NULL`,
  `ALTER TABLE service_offers ADD COLUMN tax_amount INTEGER NULL`,
  `ALTER TABLE service_offers ADD COLUMN total_price INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE service_offers ADD COLUMN duration_text VARCHAR(64) NULL`,
  `ALTER TABLE service_offers ADD COLUMN nearest_date TEXT NULL`,
  `ALTER TABLE service_offers ADD COLUMN offer_notes TEXT NULL`,
  `ALTER TABLE service_offers ADD COLUMN terms TEXT NULL`,
  `ALTER TABLE service_offers ADD COLUMN valid_until TEXT NULL`,
  `ALTER TABLE service_offers ADD COLUMN needs_visit INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE service_offers ADD COLUMN revision_of VARCHAR(36) NULL`,

  // service_orders — RFQ orders remain the default; direct booking writes
  // independent orders with no request/offer and an immutable price snapshot.
  `ALTER TABLE service_orders ADD COLUMN source_type VARCHAR(24) NOT NULL DEFAULT 'rfq'`,
  `ALTER TABLE service_orders ADD COLUMN provider_profile_id VARCHAR(36) NULL`,
  `ALTER TABLE service_orders ADD COLUMN category_id VARCHAR(36) NULL`,
  `ALTER TABLE service_orders ADD COLUMN service_title_snapshot TEXT NULL`,
  `ALTER TABLE service_orders ADD COLUMN price_snapshot INTEGER NULL`,
  `ALTER TABLE service_orders ADD COLUMN currency_snapshot VARCHAR(8) NULL`,
  `ALTER TABLE service_orders ADD COLUMN pricing_unit_snapshot VARCHAR(32) NULL`,
  `ALTER TABLE service_orders ADD COLUMN country_code VARCHAR(8) NULL`,
  `ALTER TABLE service_orders ADD COLUMN city_id VARCHAR(100) NULL`,
  `ALTER TABLE service_orders ADD COLUMN district_id VARCHAR(100) NULL`,
  `ALTER TABLE service_orders ADD COLUMN latitude REAL NULL`,
  `ALTER TABLE service_orders ADD COLUMN longitude REAL NULL`,
  `ALTER TABLE service_orders ADD COLUMN short_address TEXT NULL`,
  `ALTER TABLE service_orders ADD COLUMN scheduled_at DATETIME NULL`,
  `ALTER TABLE service_orders ADD COLUMN contact_preference VARCHAR(16) NULL`,
  `ALTER TABLE service_orders ADD COLUMN contact_phone VARCHAR(32) NULL`,
  `ALTER TABLE service_orders ADD COLUMN contact_email VARCHAR(255) NULL`,
  `ALTER TABLE service_orders ADD COLUMN contact_revealed_at DATETIME NULL`,
  `ALTER TABLE service_orders ADD COLUMN declined_at DATETIME NULL`,
  `ALTER TABLE service_orders ADD COLUMN provider_response_note TEXT NULL`,

  // service_reviews
  `ALTER TABLE service_reviews ADD COLUMN quality_rating INTEGER NULL`,
  `ALTER TABLE service_reviews ADD COLUMN punctuality_rating INTEGER NULL`,
  `ALTER TABLE service_reviews ADD COLUMN communication_rating INTEGER NULL`,
  `ALTER TABLE service_reviews ADD COLUMN value_rating INTEGER NULL`,
  `ALTER TABLE service_reviews ADD COLUMN recommend INTEGER NULL`,
  `ALTER TABLE service_reviews ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE service_reviews ADD COLUMN hidden_reason TEXT NULL`,

  // service_messages
  `ALTER TABLE service_messages ADD COLUMN is_read INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE service_messages ADD COLUMN read_at TEXT NULL`,

];

const SERVICES_PROVIDER_PROFILE_NEW_COLUMNS: string[] = [
  `ALTER TABLE service_provider_profiles ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE service_provider_profiles ADD COLUMN featured_rank INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE service_provider_profiles ADD COLUMN is_accepting_requests INTEGER NOT NULL DEFAULT 1`,
];

const SERVICES_PROVIDER_CATEGORY_NEW_COLUMNS: string[] = [
  `ALTER TABLE service_provider_categories ADD COLUMN instant_price INTEGER NULL`,
  `ALTER TABLE service_provider_categories ADD COLUMN currency VARCHAR(8) NULL`,
];

export const SERVICES_MARKETPLACE_TABLES_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS service_provider_profiles (
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
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_provider_categories (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    provider_id VARCHAR(36) NOT NULL,
    category_id VARCHAR(36) NOT NULL,
    price_from INTEGER NULL,
    price_to INTEGER NULL,
    instant_price INTEGER NULL,
    currency VARCHAR(8) NULL,
    pricing_unit VARCHAR(32) NULL,
    min_duration_min INTEGER NULL,
    notes TEXT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_provider_documents (
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
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_provider_portfolio (
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
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_request_answers (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    field_key VARCHAR(64) NOT NULL,
    field_label TEXT NULL,
    field_type VARCHAR(24) NULL,
    value TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_request_attachments (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT NULL,
    uploaded_by VARCHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_request_matches (
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
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_request_status_history (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    from_status VARCHAR(32) NULL,
    to_status VARCHAR(32) NOT NULL,
    note TEXT NULL,
    changed_by VARCHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_offer_revisions (
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
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_job_timeline (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    order_id VARCHAR(36) NOT NULL,
    event VARCHAR(64) NOT NULL,
    actor_user_id VARCHAR(36) NULL,
    from_status VARCHAR(32) NULL,
    to_status VARCHAR(32) NULL,
    note TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_reports (
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
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_notifications (
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
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_message_threads (
    thread_type VARCHAR(32) NOT NULL,
    thread_id VARCHAR(36) NOT NULL,
    title TEXT NULL,
    context_link TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (thread_type, thread_id)
  )`,
  `CREATE TABLE IF NOT EXISTS service_message_participants (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    thread_type VARCHAR(32) NOT NULL,
    thread_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role VARCHAR(32) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_outbox_events (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload TEXT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    error TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TEXT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS service_marketplace_settings (
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
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

export const SERVICES_MARKETPLACE_INDEXES_SQL: string[] = [
  `CREATE UNIQUE INDEX IF NOT EXISTS service_provider_profiles_user_unique ON service_provider_profiles (user_id)`,
  `CREATE INDEX IF NOT EXISTS service_provider_profiles_status_country_idx ON service_provider_profiles (status, country_code)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS service_provider_categories_provider_category_unique ON service_provider_categories (provider_id, category_id)`,
  `CREATE INDEX IF NOT EXISTS service_provider_categories_category_idx ON service_provider_categories (category_id)`,
  `CREATE INDEX IF NOT EXISTS service_provider_documents_provider_idx ON service_provider_documents (provider_id)`,
  `CREATE INDEX IF NOT EXISTS service_provider_portfolio_provider_idx ON service_provider_portfolio (provider_id)`,
  `CREATE INDEX IF NOT EXISTS service_request_answers_request_idx ON service_request_answers (request_id)`,
  `CREATE INDEX IF NOT EXISTS service_request_attachments_request_idx ON service_request_attachments (request_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS service_request_matches_request_provider_unique ON service_request_matches (request_id, provider_id)`,
  `CREATE INDEX IF NOT EXISTS service_request_matches_request_score_idx ON service_request_matches (request_id, score)`,
  `CREATE INDEX IF NOT EXISTS service_request_history_request_idx ON service_request_status_history (request_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS service_offer_revisions_offer_idx ON service_offer_revisions (offer_id)`,
  `CREATE INDEX IF NOT EXISTS service_job_timeline_order_idx ON service_job_timeline (order_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS service_reports_target_idx ON service_reports (target_type, target_id)`,
  `CREATE INDEX IF NOT EXISTS service_reports_status_idx ON service_reports (status)`,
  `CREATE INDEX IF NOT EXISTS service_notifications_user_idx ON service_notifications (user_id, is_read, created_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS service_message_participants_thread_user_unique ON service_message_participants (thread_type, thread_id, user_id)`,
  `CREATE INDEX IF NOT EXISTS service_message_participants_user_idx ON service_message_participants (user_id)`,
  `CREATE INDEX IF NOT EXISTS service_message_threads_updated_idx ON service_message_threads (thread_type, thread_id)`,
  `CREATE INDEX IF NOT EXISTS service_outbox_status_idx ON service_outbox_events (status, created_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS service_marketplace_settings_country_unique ON service_marketplace_settings (country_code)`,
  `CREATE INDEX IF NOT EXISTS service_categories_public_order_idx ON service_categories (country_code, is_active, is_featured, sort_order)`,
  `CREATE INDEX IF NOT EXISTS service_provider_profiles_public_order_idx ON service_provider_profiles (country_code, status, is_featured, featured_rank)`,
];

export async function ensureServicesMarketplaceSchema(db: D1Database): Promise<void> {
  for (const column of SERVICES_MARKETPLACE_NEW_COLUMNS) {
    try {
      await db.prepare(column).run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isDuplicateColumnError(message)) throw error;
    }
  }

  for (const sql of SERVICES_MARKETPLACE_TABLES_SQL) {
    await db.prepare(sql).run();
  }

  for (const column of SERVICES_PROVIDER_PROFILE_NEW_COLUMNS) {
    try {
      await db.prepare(column).run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isDuplicateColumnError(message)) throw error;
    }
  }

  for (const column of SERVICES_PROVIDER_CATEGORY_NEW_COLUMNS) {
    try {
      await db.prepare(column).run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isDuplicateColumnError(message)) throw error;
    }
  }

  for (const sql of SERVICES_MARKETPLACE_INDEXES_SQL) {
    try {
      await db.prepare(sql).run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isDuplicateKeyError(message)) throw error;
    }
  }
}
