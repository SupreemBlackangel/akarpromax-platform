-- AkarProMax Auctions Hardening F1
-- Canonical runtime remains property-backed; legacy `auctions` table is not used.

ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_start_date" timestamp;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_organizer_organization_id" uuid;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_created_by_user_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'properties_auction_organizer_org_fk') THEN
    ALTER TABLE "properties"
      ADD CONSTRAINT "properties_auction_organizer_org_fk"
      FOREIGN KEY ("auction_organizer_organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'properties_auction_created_by_user_fk') THEN
    ALTER TABLE "properties"
      ADD CONSTRAINT "properties_auction_created_by_user_fk"
      FOREIGN KEY ("auction_created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "properties_auction_organizer_idx"
  ON "properties" ("auction_organizer_organization_id");
CREATE INDEX IF NOT EXISTS "properties_auction_created_by_idx"
  ON "properties" ("auction_created_by_user_id");
CREATE INDEX IF NOT EXISTS "properties_auction_active_end_idx"
  ON "properties" ("auction_status", "auction_end_date") WHERE "is_auction" = true;

-- Normalize the live bid table even if an older migration created it with auction_id.
CREATE TABLE IF NOT EXISTS "auction_bids" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid,
  "bidder_id" uuid,
  "amount" numeric(15,2) NOT NULL,
  "is_auto_bid" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);
ALTER TABLE "auction_bids" ADD COLUMN IF NOT EXISTS "property_id" uuid;
ALTER TABLE "auction_bids" ADD COLUMN IF NOT EXISTS "bidder_id" uuid;
ALTER TABLE "auction_bids" ADD COLUMN IF NOT EXISTS "idempotency_key" text;
ALTER TABLE "auction_bids" ADD COLUMN IF NOT EXISTS "invalidated_at" timestamp;
ALTER TABLE "auction_bids" ADD COLUMN IF NOT EXISTS "invalidated_by" uuid;
ALTER TABLE "auction_bids" ADD COLUMN IF NOT EXISTS "invalidation_reason" text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_bids_property_fk') THEN
    ALTER TABLE "auction_bids"
      ADD CONSTRAINT "auction_bids_property_fk"
      FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_bids_bidder_fk') THEN
    ALTER TABLE "auction_bids"
      ADD CONSTRAINT "auction_bids_bidder_fk"
      FOREIGN KEY ("bidder_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_bids_invalidated_by_fk') THEN
    ALTER TABLE "auction_bids"
      ADD CONSTRAINT "auction_bids_invalidated_by_fk"
      FOREIGN KEY ("invalidated_by") REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "auction_bids_property_id_idx" ON "auction_bids" ("property_id");
CREATE INDEX IF NOT EXISTS "auction_bids_bidder_id_idx" ON "auction_bids" ("bidder_id");
CREATE INDEX IF NOT EXISTS "auction_bids_property_amount_idx"
  ON "auction_bids" ("property_id", "amount" DESC, "created_at" ASC)
  WHERE "invalidated_at" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "auction_bids_idempotency_uidx"
  ON "auction_bids" ("property_id", "bidder_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "auction_terms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "role" text,
  "version" text,
  "content_ar" text,
  "content_en" text,
  "content_hash" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);
ALTER TABLE "auction_terms" ADD COLUMN IF NOT EXISTS "role" text;
ALTER TABLE "auction_terms" ADD COLUMN IF NOT EXISTS "version" text;
ALTER TABLE "auction_terms" ADD COLUMN IF NOT EXISTS "content_ar" text;
ALTER TABLE "auction_terms" ADD COLUMN IF NOT EXISTS "content_en" text;
ALTER TABLE "auction_terms" ADD COLUMN IF NOT EXISTS "content_hash" text;
ALTER TABLE "auction_terms" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
ALTER TABLE "auction_terms" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='auction_terms' AND column_name='type'
  ) THEN
    EXECUTE 'UPDATE auction_terms SET role = COALESCE(role, type) WHERE role IS NULL';
  END IF;
END $$;
UPDATE "auction_terms" SET "role" = COALESCE("role", 'legacy') WHERE "role" IS NULL;
UPDATE "auction_terms" SET "version" = COALESCE("version", 'legacy') WHERE "version" IS NULL;
UPDATE "auction_terms" SET "content_ar" = COALESCE("content_ar", '') WHERE "content_ar" IS NULL;
UPDATE "auction_terms" SET "content_hash" = COALESCE("content_hash", 'legacy-' || "id"::text) WHERE "content_hash" IS NULL;
UPDATE "auction_terms" SET "is_active" = false WHERE "version" = 'legacy';
CREATE UNIQUE INDEX IF NOT EXISTS "auction_terms_role_version_uidx" ON "auction_terms" ("role", "version");
CREATE INDEX IF NOT EXISTS "auction_terms_active_idx" ON "auction_terms" ("role", "is_active");

INSERT INTO "auction_terms" ("role", "version", "content_ar", "content_en", "content_hash", "is_active")
VALUES
  (
    'seller',
    '2026-08-f1',
    'أوافق على طرح العقار في المزاد وفق بياناته المعتمدة، وعلى اعتماد نتيجة المزاد وفق نوعه وسياسة المنصة، وأقر بصحة صفتي في التصرف أو التنظيم.',
    'I approve offering the property through the auction according to its approved data and the platform auction policy.',
    'd1e97cd6b4bf167f5ee1b6a31c7f3aa8f8c17545800ffc427359d15a8a47ace8',
    true
  ),
  (
    'bidder',
    '2026-08-f1',
    'أوافق على شروط المزايدة، وأن المزايدة المقدمة مني ملزمة وفق نوع المزاد وسياسة المنصة، وأن السعر والوقت المعتمدين هما المسجلان من خادم المنصة.',
    'I accept the bidding terms and acknowledge that server-recorded price and time are authoritative.',
    '26022f0971dc27b998eb969a26a0c4aff7461f50c565044dd68f89d9a84bee30',
    true
  )
ON CONFLICT ("role", "version") DO NOTHING;

CREATE TABLE IF NOT EXISTS "auction_terms_acceptance" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid,
  "user_id" uuid,
  "terms_id" uuid,
  "acceptance_hash" text,
  "accepted_at" timestamp DEFAULT now()
);
ALTER TABLE "auction_terms_acceptance" ADD COLUMN IF NOT EXISTS "property_id" uuid;
ALTER TABLE "auction_terms_acceptance" ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE "auction_terms_acceptance" ADD COLUMN IF NOT EXISTS "terms_id" uuid;
ALTER TABLE "auction_terms_acceptance" ADD COLUMN IF NOT EXISTS "acceptance_hash" text;
ALTER TABLE "auction_terms_acceptance" ADD COLUMN IF NOT EXISTS "accepted_at" timestamp DEFAULT now();
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_terms_acceptance_property_fk') THEN
    ALTER TABLE "auction_terms_acceptance" ADD CONSTRAINT "auction_terms_acceptance_property_fk"
      FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_terms_acceptance_user_fk') THEN
    ALTER TABLE "auction_terms_acceptance" ADD CONSTRAINT "auction_terms_acceptance_user_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_terms_acceptance_terms_fk') THEN
    ALTER TABLE "auction_terms_acceptance" ADD CONSTRAINT "auction_terms_acceptance_terms_fk"
      FOREIGN KEY ("terms_id") REFERENCES "auction_terms"("id") ON DELETE RESTRICT;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "auction_terms_acceptance_uidx"
  ON "auction_terms_acceptance" ("property_id", "user_id", "terms_id");
CREATE INDEX IF NOT EXISTS "auction_terms_acceptance_property_idx" ON "auction_terms_acceptance" ("property_id");
CREATE INDEX IF NOT EXISTS "auction_terms_acceptance_user_idx" ON "auction_terms_acceptance" ("user_id");

CREATE TABLE IF NOT EXISTS "auction_awards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "seller_id" uuid NOT NULL,
  "buyer_id" uuid NOT NULL,
  "organizer_organization_id" uuid,
  "final_price" numeric(15,2) NOT NULL,
  "currency" text NOT NULL DEFAULT 'SAR',
  "auction_type" text NOT NULL,
  "property_snapshot" jsonb NOT NULL,
  "seller_snapshot" jsonb NOT NULL,
  "buyer_snapshot" jsonb NOT NULL,
  "terms_snapshot" jsonb NOT NULL,
  "status" text NOT NULL DEFAULT 'awarded',
  "awarded_by" uuid,
  "awarded_at" timestamp NOT NULL DEFAULT now(),
  "created_at" timestamp NOT NULL DEFAULT now()
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_awards_property_fk') THEN
    ALTER TABLE "auction_awards" ADD CONSTRAINT "auction_awards_property_fk"
      FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_awards_seller_fk') THEN
    ALTER TABLE "auction_awards" ADD CONSTRAINT "auction_awards_seller_fk"
      FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_awards_buyer_fk') THEN
    ALTER TABLE "auction_awards" ADD CONSTRAINT "auction_awards_buyer_fk"
      FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_awards_organizer_fk') THEN
    ALTER TABLE "auction_awards" ADD CONSTRAINT "auction_awards_organizer_fk"
      FOREIGN KEY ("organizer_organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_awards_awarded_by_fk') THEN
    ALTER TABLE "auction_awards" ADD CONSTRAINT "auction_awards_awarded_by_fk"
      FOREIGN KEY ("awarded_by") REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "auction_awards_property_uidx" ON "auction_awards" ("property_id");
CREATE INDEX IF NOT EXISTS "auction_awards_buyer_idx" ON "auction_awards" ("buyer_id");
CREATE INDEX IF NOT EXISTS "auction_awards_seller_idx" ON "auction_awards" ("seller_id");

CREATE TABLE IF NOT EXISTS "auction_contracts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "award_id" uuid NOT NULL,
  "property_id" uuid NOT NULL,
  "seller_id" uuid NOT NULL,
  "buyer_id" uuid NOT NULL,
  "organizer_organization_id" uuid,
  "contract_number" text NOT NULL,
  "template_version" text NOT NULL,
  "content" text NOT NULL,
  "content_hash" text NOT NULL,
  "status" text NOT NULL DEFAULT 'generated',
  "generated_at" timestamp NOT NULL DEFAULT now(),
  "signed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_contracts_award_fk') THEN
    ALTER TABLE "auction_contracts" ADD CONSTRAINT "auction_contracts_award_fk"
      FOREIGN KEY ("award_id") REFERENCES "auction_awards"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_contracts_property_fk') THEN
    ALTER TABLE "auction_contracts" ADD CONSTRAINT "auction_contracts_property_fk"
      FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_contracts_seller_fk') THEN
    ALTER TABLE "auction_contracts" ADD CONSTRAINT "auction_contracts_seller_fk"
      FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_contracts_buyer_fk') THEN
    ALTER TABLE "auction_contracts" ADD CONSTRAINT "auction_contracts_buyer_fk"
      FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_contracts_organizer_fk') THEN
    ALTER TABLE "auction_contracts" ADD CONSTRAINT "auction_contracts_organizer_fk"
      FOREIGN KEY ("organizer_organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "auction_contracts_award_uidx" ON "auction_contracts" ("award_id");
CREATE UNIQUE INDEX IF NOT EXISTS "auction_contracts_property_uidx" ON "auction_contracts" ("property_id");
CREATE UNIQUE INDEX IF NOT EXISTS "auction_contracts_number_uidx" ON "auction_contracts" ("contract_number");

CREATE TABLE IF NOT EXISTS "auction_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "actor_user_id" uuid,
  "event_type" text NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_events_property_fk') THEN
    ALTER TABLE "auction_events" ADD CONSTRAINT "auction_events_property_fk"
      FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_events_actor_fk') THEN
    ALTER TABLE "auction_events" ADD CONSTRAINT "auction_events_actor_fk"
      FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "auction_events_property_created_idx" ON "auction_events" ("property_id", "created_at");
CREATE INDEX IF NOT EXISTS "auction_events_type_idx" ON "auction_events" ("event_type");
