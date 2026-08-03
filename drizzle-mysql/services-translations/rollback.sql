-- AkarPromax: services marketplace + dynamic i18n (rollback)
-- Drops ONLY the new tables/indexes added by migrate.sql. Existing tables are untouched.
-- Applies via: mysql -u root -proot akarpromax < drizzle-mysql/services-translations/rollback.sql

DROP TABLE IF EXISTS service_bookmarks;
DROP TABLE IF EXISTS service_disputes;
DROP TABLE IF EXISTS service_reviews;
DROP TABLE IF EXISTS service_messages;
DROP TABLE IF EXISTS service_orders;
DROP TABLE IF EXISTS service_offers;
DROP TABLE IF EXISTS service_requests;
DROP TABLE IF EXISTS service_listings;
DROP TABLE IF EXISTS service_categories;
DROP TABLE IF EXISTS i18n_change_log;
DROP TABLE IF EXISTS i18n_versions;
DROP TABLE IF EXISTS i18n_translations;
DROP TABLE IF EXISTS i18n_keys;
DROP TABLE IF EXISTS i18n_namespaces;
