export const SERVICES_TABLES_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS service_categories (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    parent_id VARCHAR(36) NULL,
    country_code VARCHAR(8) NOT NULL DEFAULT 'OM',
    code VARCHAR(128) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_listings (
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
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_requests (
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
    preferred_date DATETIME NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_offers (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    provider_user_id VARCHAR(36) NOT NULL,
    listing_id VARCHAR(36) NULL,
    price INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'OMR',
    duration_days INTEGER NULL,
    message_key VARCHAR(255) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'sent',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_orders (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    request_id VARCHAR(36) NOT NULL,
    offer_id VARCHAR(36) NOT NULL,
    customer_user_id VARCHAR(36) NOT NULL,
    provider_user_id VARCHAR(36) NOT NULL,
    price INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'OMR',
    status VARCHAR(32) NOT NULL DEFAULT 'created',
    accepted_at DATETIME NULL,
    started_at DATETIME NULL,
    completed_at DATETIME NULL,
    cancelled_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_messages (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    thread_type VARCHAR(16) NOT NULL,
    thread_id VARCHAR(36) NOT NULL,
    sender_user_id VARCHAR(36) NOT NULL,
    body TEXT NOT NULL,
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_reviews (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    order_id VARCHAR(36) NOT NULL,
    reviewer_user_id VARCHAR(36) NOT NULL,
    reviewee_user_id VARCHAR(36) NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_disputes (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    order_id VARCHAR(36) NOT NULL,
    opened_by_user_id VARCHAR(36) NOT NULL,
    reason VARCHAR(64) NOT NULL,
    description TEXT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    resolution_note TEXT NULL,
    opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS service_bookmarks (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    listing_id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

export const SERVICES_INDEXES_SQL: string[] = [
  `CREATE UNIQUE INDEX IF NOT EXISTS service_categories_country_code_unique ON service_categories (country_code, code)`,
  `CREATE INDEX IF NOT EXISTS service_categories_parent_idx ON service_categories (parent_id)`,
  `CREATE INDEX IF NOT EXISTS service_listings_cat_geo_status_idx ON service_listings (category_id, country_code, city_id, status)`,
  `CREATE INDEX IF NOT EXISTS service_listings_provider_idx ON service_listings (provider_user_id)`,
  `CREATE INDEX IF NOT EXISTS service_requests_cat_geo_status_idx ON service_requests (category_id, country_code, city_id, status)`,
  `CREATE INDEX IF NOT EXISTS service_requests_customer_idx ON service_requests (customer_user_id)`,
  `CREATE INDEX IF NOT EXISTS service_offers_request_idx ON service_offers (request_id)`,
  `CREATE INDEX IF NOT EXISTS service_offers_provider_idx ON service_offers (provider_user_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS service_offers_request_provider_unique ON service_offers (request_id, provider_user_id)`,
  `CREATE INDEX IF NOT EXISTS service_orders_request_idx ON service_orders (request_id)`,
  `CREATE INDEX IF NOT EXISTS service_orders_participants_idx ON service_orders (customer_user_id, provider_user_id)`,
  `CREATE INDEX IF NOT EXISTS service_messages_thread_idx ON service_messages (thread_type, thread_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS service_messages_sender_idx ON service_messages (sender_user_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS service_reviews_order_reviewer_unique ON service_reviews (order_id, reviewer_user_id)`,
  `CREATE INDEX IF NOT EXISTS service_reviews_reviewee_idx ON service_reviews (reviewee_user_id)`,
  `CREATE INDEX IF NOT EXISTS service_disputes_order_idx ON service_disputes (order_id)`,
  `CREATE INDEX IF NOT EXISTS service_disputes_status_idx ON service_disputes (status)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS service_bookmarks_user_listing_unique ON service_bookmarks (user_id, listing_id)`,
];

export async function ensureServicesSchema(db: D1Database): Promise<void> {
  for (const sql of SERVICES_TABLES_SQL) {
    await db.prepare(sql).run();
  }
  for (const sql of SERVICES_INDEXES_SQL) {
    try {
      await db.prepare(sql).run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/duplicate (key|index|column)|already exists/i.test(message)) throw error;
    }
  }
}
