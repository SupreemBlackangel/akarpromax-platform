-- AKARPROMAX FORWARD MIGRATION 0006
-- PASS C.S.1B — Direct Booking as an independent creation path which shares
-- the existing service_orders lifecycle only after the booking is created.

ALTER TABLE service_orders ALTER COLUMN request_id DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE service_orders ALTER COLUMN offer_id DROP NOT NULL;
--> statement-breakpoint

ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS source_type VARCHAR(24) NOT NULL DEFAULT 'rfq';
--> statement-breakpoint
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS provider_profile_id VARCHAR(36);
--> statement-breakpoint
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS category_id VARCHAR(36);
--> statement-breakpoint
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS service_title_snapshot TEXT;
--> statement-breakpoint
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS price_snapshot INTEGER;
--> statement-breakpoint
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS currency_snapshot VARCHAR(8);
--> statement-breakpoint
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS pricing_unit_snapshot VARCHAR(32);
--> statement-breakpoint
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS country_code VARCHAR(8);
--> statement-breakpoint
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS city_id VARCHAR(100);
--> statement-breakpoint
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS district_id VARCHAR(100);
--> statement-breakpoint
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
--> statement-breakpoint
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
--> statement-breakpoint
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS short_address TEXT;
--> statement-breakpoint
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;
--> statement-breakpoint
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS contact_preference VARCHAR(16);
--> statement-breakpoint
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(32);
--> statement-breakpoint
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
--> statement-breakpoint
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS contact_revealed_at TIMESTAMP;
--> statement-breakpoint
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS declined_at TIMESTAMP;
--> statement-breakpoint
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS provider_response_note TEXT;
--> statement-breakpoint

ALTER TABLE service_provider_categories ADD COLUMN IF NOT EXISTS instant_price INTEGER;
--> statement-breakpoint
ALTER TABLE service_provider_categories ADD COLUMN IF NOT EXISTS currency VARCHAR(8);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS service_orders_source_status_idx
  ON service_orders (source_type, status, updated_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS service_orders_provider_schedule_idx
  ON service_orders (provider_user_id, scheduled_at);
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_orders_source_type_ck'
  ) THEN
    ALTER TABLE service_orders
      ADD CONSTRAINT service_orders_source_type_ck
      CHECK (source_type IN ('rfq', 'direct_booking'));
  END IF;
END
$$;
--> statement-breakpoint

UPDATE service_orders
SET source_type = 'rfq'
WHERE source_type IS NULL OR source_type = '';
