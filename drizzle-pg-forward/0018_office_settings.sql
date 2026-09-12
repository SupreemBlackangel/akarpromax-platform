-- AKARPROMAX FORWARD MIGRATION 0018
-- OFFICE SETTINGS — an office's configuration, shared across its machines,
-- and the office's own filing status for a listing it published.
--
-- Why a migration and not `ensureIntegrationSchema`: that function exists and
-- creates exactly these objects, but it is only reachable through
-- `ensureContentSchema`, which returns early on any database already stamped
-- with the current content-schema version — which production is. So it runs on
-- a fresh database and never again, and a table added to it after the stamp
-- was written never appears in production at all. The runtime ensure stays
-- (it is what makes a fresh dev database work); this is what makes the
-- deployed one work.
--
-- Idempotent throughout, so re-running it after a partial apply is safe.

CREATE TABLE IF NOT EXISTS office_settings (
  sponsor_id VARCHAR(80) PRIMARY KEY NOT NULL,
  branding TEXT NULL,
  system TEXT NULL,
  lists TEXT NULL,
  save_paths TEXT NULL,
  backup TEXT NULL,
  license TEXT NULL,
  currencies TEXT NULL,
  site_integration TEXT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  updated_by_device_id VARCHAR(36) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint

-- Support reads this ordered by most recently saved.
CREATE INDEX IF NOT EXISTS office_settings_updated_at_idx ON office_settings (updated_at DESC);
--> statement-breakpoint

-- How the office files this listing in its OWN workflow: active_market,
-- under_management or completed. Deliberately on the link row rather than on
-- `properties`, whose `status` is the website's moderation state and stays the
-- website's to set — an office filing a listing "under management" must not
-- thereby approve it.
ALTER TABLE office_property_links ADD COLUMN IF NOT EXISTS listing_status VARCHAR(24) NULL;
