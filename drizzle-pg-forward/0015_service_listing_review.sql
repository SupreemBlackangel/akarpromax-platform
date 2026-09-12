-- AKARPROMAX FORWARD MIGRATION 0015
-- SERVICE LISTING REVIEW — a listing was born public, and there was nowhere to
-- record that anybody had looked at it.
--
-- `service_listings.status` held draft/active/paused/removed, `createListing`
-- forced 'active' whatever the caller sent, and the public query serves
-- 'active'. So a provider's service went straight into the marketplace with no
-- state meaning "waiting to be read", no reviewer, and no reason attached to a
-- refusal. The table already carried `approved_at` and `published_at` — added
-- at some point in expectation of exactly this lifecycle — which no status
-- vocabulary ever set.
--
-- This adds the four columns a review decision needs. The status vocabulary
-- itself lives in lib/services/constants.ts (LISTING_STATUS / LISTING_FLOW);
-- `status` stays a free text column here, as every other status column in this
-- schema does, so a value added in code does not need a migration to be
-- storable.
--
-- Non-destructive and idempotent. No row is touched: listings already 'active'
-- stay 'active' and stay public, because 'active' means the same thing after
-- this migration as before it. Only listings created from now on begin at
-- 'pending_approval'.

ALTER TABLE service_listings ADD COLUMN IF NOT EXISTS reviewed_by text;
ALTER TABLE service_listings ADD COLUMN IF NOT EXISTS reviewed_at timestamp;
-- The reason for the CURRENT verdict: why it was refused, or what must change.
-- Cleared when the listing next enters review, so it never describes a decision
-- that has been superseded. The full history is in audit_logs.
ALTER TABLE service_listings ADD COLUMN IF NOT EXISTS review_note text;
ALTER TABLE service_listings ADD COLUMN IF NOT EXISTS archived_at timestamp;

-- The review queue is read by status and ordered by age.
CREATE INDEX IF NOT EXISTS service_listings_status_created_idx
  ON service_listings (status, created_at DESC);
