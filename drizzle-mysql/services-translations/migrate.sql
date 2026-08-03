-- AkarPromax: services marketplace + dynamic i18n (migration)
-- Applies via: mysql -u root -proot akarpromax < drizzle-mysql/services-translations/migrate.sql

CREATE TABLE IF NOT EXISTS i18n_namespaces (
  id VARCHAR(36) PRIMARY KEY NOT NULL,
  code VARCHAR(128) NOT NULL,
  description TEXT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS i18n_keys (
  id VARCHAR(36) PRIMARY KEY NOT NULL,
  namespace_id VARCHAR(36) NOT NULL,
  `key` VARCHAR(255) NOT NULL,
  description TEXT NULL,
  default_value TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS i18n_translations (
  id VARCHAR(36) PRIMARY KEY NOT NULL,
  key_id VARCHAR(36) NOT NULL,
  locale VARCHAR(8) NOT NULL,
  value TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'published',
  is_machine INTEGER NOT NULL DEFAULT 0,
  updated_by VARCHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS i18n_versions (
  id VARCHAR(36) PRIMARY KEY NOT NULL,
  version INTEGER NOT NULL,
  label VARCHAR(190) NULL,
  snapshot TEXT NOT NULL,
  created_by VARCHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS i18n_change_log (
  id VARCHAR(36) PRIMARY KEY NOT NULL,
  key_id VARCHAR(36) NULL,
  locale VARCHAR(8) NULL,
  action VARCHAR(32) NOT NULL,
  old_value TEXT NULL,
  new_value TEXT NULL,
  actor_user_id VARCHAR(36) NULL,
  ip_address VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_categories (
  id VARCHAR(36) PRIMARY KEY NOT NULL,
  parent_id VARCHAR(36) NULL,
  country_code VARCHAR(8) NOT NULL DEFAULT 'OM',
  code VARCHAR(128) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
  preferred_date DATETIME NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_orders (
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
);

CREATE TABLE IF NOT EXISTS service_messages (
  id VARCHAR(36) PRIMARY KEY NOT NULL,
  thread_type VARCHAR(16) NOT NULL,
  thread_id VARCHAR(36) NOT NULL,
  sender_user_id VARCHAR(36) NOT NULL,
  body TEXT NOT NULL,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_reviews (
  id VARCHAR(36) PRIMARY KEY NOT NULL,
  order_id VARCHAR(36) NOT NULL,
  reviewer_user_id VARCHAR(36) NOT NULL,
  reviewee_user_id VARCHAR(36) NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_disputes (
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
);

CREATE TABLE IF NOT EXISTS service_bookmarks (
  id VARCHAR(36) PRIMARY KEY NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  listing_id VARCHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX i18n_namespaces_code_unique ON i18n_namespaces (code);
CREATE UNIQUE INDEX i18n_keys_namespace_key_unique ON i18n_keys (namespace_id, `key`);
CREATE UNIQUE INDEX i18n_translations_key_locale_unique ON i18n_translations (key_id, locale);
CREATE INDEX i18n_translations_locale_status_idx ON i18n_translations (locale, status);
CREATE UNIQUE INDEX i18n_versions_version_unique ON i18n_versions (version);
CREATE INDEX i18n_change_log_key_idx ON i18n_change_log (key_id, created_at);
CREATE INDEX i18n_change_log_actor_idx ON i18n_change_log (actor_user_id, created_at);

CREATE UNIQUE INDEX service_categories_country_code_unique ON service_categories (country_code, code);
CREATE INDEX service_categories_parent_idx ON service_categories (parent_id);
CREATE INDEX service_listings_cat_geo_status_idx ON service_listings (category_id, country_code, city_id, status);
CREATE INDEX service_listings_provider_idx ON service_listings (provider_user_id);
CREATE INDEX service_requests_cat_geo_status_idx ON service_requests (category_id, country_code, city_id, status);
CREATE INDEX service_requests_customer_idx ON service_requests (customer_user_id);
CREATE INDEX service_offers_request_idx ON service_offers (request_id);
CREATE INDEX service_offers_provider_idx ON service_offers (provider_user_id);
CREATE UNIQUE INDEX service_offers_request_provider_unique ON service_offers (request_id, provider_user_id);
CREATE INDEX service_orders_request_idx ON service_orders (request_id);
CREATE INDEX service_orders_participants_idx ON service_orders (customer_user_id, provider_user_id);
CREATE INDEX service_messages_thread_idx ON service_messages (thread_type, thread_id, created_at);
CREATE INDEX service_messages_sender_idx ON service_messages (sender_user_id);
CREATE UNIQUE INDEX service_reviews_order_reviewer_unique ON service_reviews (order_id, reviewer_user_id);
CREATE INDEX service_reviews_reviewee_idx ON service_reviews (reviewee_user_id);
CREATE INDEX service_disputes_order_idx ON service_disputes (order_id);
CREATE INDEX service_disputes_status_idx ON service_disputes (status);
CREATE UNIQUE INDEX service_bookmarks_user_listing_unique ON service_bookmarks (user_id, listing_id);
