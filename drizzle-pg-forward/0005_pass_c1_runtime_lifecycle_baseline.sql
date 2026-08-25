-- PASS C.1 canonical runtime lifecycle baseline.
-- Additive/idempotent reconciliation of property and auction tables previously stranded in the legacy stream.

-- Source reconciliation: drizzle-pg/0006_rich_joystick.sql
CREATE TABLE IF NOT EXISTS "property_offer_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"name_tr" text,
	"description_ar" text,
	"description_en" text,
	"description_tr" text,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"allow_direct" boolean DEFAULT true,
	"allow_auction" boolean DEFAULT true,
	"allow_fixed_auction" boolean DEFAULT true,
	"allow_open_auction" boolean DEFAULT true,
	"allowed_countries" jsonb DEFAULT '[]'::jsonb,
	"allowed_property_categories" jsonb DEFAULT '[]'::jsonb,
	"requires_verification" boolean DEFAULT false,
	"requires_documents" boolean DEFAULT false,
	"requires_terms" boolean DEFAULT true,
	"contract_template_type" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "property_offer_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "property_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"offer_type_id" uuid,
	"marketing_method" text NOT NULL,
	"auction_type" text,
	"status" text DEFAULT 'draft',
	"price" text,
	"currency" text DEFAULT 'SAR',
	"negotiable" boolean DEFAULT false,
	"details" jsonb DEFAULT '{}'::jsonb,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_offers_offer_type_id_property_offer_types_id_fk') THEN ALTER TABLE "property_offers" ADD CONSTRAINT "property_offers_offer_type_id_property_offer_types_id_fk" FOREIGN KEY ("offer_type_id") REFERENCES "public"."property_offer_types"("id") ON DELETE no action ON UPDATE no action; END IF; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_offer_types_code_idx" ON "property_offer_types" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_offer_types_is_active_idx" ON "property_offer_types" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_offers_property_id_idx" ON "property_offers" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_offers_offer_type_id_idx" ON "property_offers" USING btree ("offer_type_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_offers_status_idx" ON "property_offers" USING btree ("status");

-- Source reconciliation: drizzle-pg/0007_add_properties_tables.sql
CREATE TABLE IF NOT EXISTS "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"office_id" uuid,
	"title_ar" text NOT NULL,
	"title_en" text,
	"description_ar" text NOT NULL,
	"description_en" text,
	"deal_type" text NOT NULL,
	"category" text NOT NULL,
	"property_type" text NOT NULL,
	"country" text NOT NULL,
	"governorate" text NOT NULL,
	"city" text NOT NULL,
	"district" text,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"address" text,
	"price" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'SAR',
	"area" numeric(10, 2) NOT NULL,
	"bedrooms" integer,
	"bathrooms" integer,
	"floor" integer,
	"total_floors" integer,
	"year_built" integer,
	"facade" text,
	"direction" text,
	"reference_number" text,
	"advertising_license" text,
	"status" text DEFAULT 'draft',
	"is_featured" boolean DEFAULT false,
	"is_verified" boolean DEFAULT false,
	"rejected_reason" text,
	"approved_at" timestamp,
	"approved_by" uuid,
	"views" integer DEFAULT 0,
	"inquiries" integer DEFAULT 0,
	"favorites_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "property_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"property_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "property_inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid,
	"user_id" uuid,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"message" text NOT NULL,
	"type" text DEFAULT 'general',
	"status" text DEFAULT 'new',
	"replied_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "property_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid,
	"url" text NOT NULL,
	"type" text NOT NULL,
	"order" integer DEFAULT 0,
	"is_featured" boolean DEFAULT false,
	"alt_text" text,
	"size" integer,
	"mime_type" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "property_request_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid,
	"office_id" uuid,
	"property_id" uuid,
	"price" numeric(15, 2),
	"message" text,
	"status" text DEFAULT 'pending',
	"viewed_at" timestamp,
	"responded_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "property_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"deal_type" text NOT NULL,
	"property_type" text NOT NULL,
	"country" text NOT NULL,
	"governorate" text NOT NULL,
	"city" text NOT NULL,
	"district" text,
	"budget" numeric(15, 2),
	"area" numeric(10, 2),
	"bedrooms" integer,
	"bathrooms" integer,
	"description" text,
	"status" text DEFAULT 'active',
	"matched_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "property_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid,
	"user_id" uuid,
	"ip" text,
	"user_agent" text,
	"referer" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"filters" jsonb NOT NULL,
	"notify" boolean DEFAULT true,
	"last_notification" timestamp,
	"match_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'properties_user_id_users_id_fk') THEN ALTER TABLE "properties" ADD CONSTRAINT "properties_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'properties_office_id_organizations_id_fk') THEN ALTER TABLE "properties" ADD CONSTRAINT "properties_office_id_organizations_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_favorites_user_id_users_id_fk') THEN ALTER TABLE "property_favorites" ADD CONSTRAINT "property_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_favorites_property_id_properties_id_fk') THEN ALTER TABLE "property_favorites" ADD CONSTRAINT "property_favorites_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_inquiries_property_id_properties_id_fk') THEN ALTER TABLE "property_inquiries" ADD CONSTRAINT "property_inquiries_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_inquiries_user_id_users_id_fk') THEN ALTER TABLE "property_inquiries" ADD CONSTRAINT "property_inquiries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_media_property_id_properties_id_fk') THEN ALTER TABLE "property_media" ADD CONSTRAINT "property_media_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_request_offers_request_id_property_requests_id_fk') THEN ALTER TABLE "property_request_offers" ADD CONSTRAINT "property_request_offers_request_id_property_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."property_requests"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_request_offers_office_id_organizations_id_fk') THEN ALTER TABLE "property_request_offers" ADD CONSTRAINT "property_request_offers_office_id_organizations_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_request_offers_property_id_properties_id_fk') THEN ALTER TABLE "property_request_offers" ADD CONSTRAINT "property_request_offers_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_requests_user_id_users_id_fk') THEN ALTER TABLE "property_requests" ADD CONSTRAINT "property_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_views_property_id_properties_id_fk') THEN ALTER TABLE "property_views" ADD CONSTRAINT "property_views_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_views_user_id_users_id_fk') THEN ALTER TABLE "property_views" ADD CONSTRAINT "property_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'saved_searches_user_id_users_id_fk') THEN ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "properties_user_id_idx" ON "properties" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "properties_office_id_idx" ON "properties" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "properties_status_idx" ON "properties" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "properties_deal_type_idx" ON "properties" USING btree ("deal_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "properties_city_idx" ON "properties" USING btree ("city");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "properties_created_at_idx" ON "properties" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_favorites_user_property_idx" ON "property_favorites" USING btree ("user_id","property_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_inquiries_property_id_idx" ON "property_inquiries" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_media_property_id_idx" ON "property_media" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_offer_request_id_idx" ON "property_request_offers" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_offer_office_id_idx" ON "property_request_offers" USING btree ("office_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_requests_user_id_idx" ON "property_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_requests_status_idx" ON "property_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_views_property_id_idx" ON "property_views" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saved_searches_user_id_idx" ON "saved_searches" USING btree ("user_id");

-- Source reconciliation: drizzle-pg/0008_add_auction_fields.sql
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "is_auction" boolean DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_type" text;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_status" text;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_start_price" numeric(15, 2);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_current_price" numeric(15, 2);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_bid_increment" numeric(15, 2);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_min_bid" numeric(15, 2);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_max_bid" numeric(15, 2);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_end_date" timestamp;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_winner_id" uuid;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_winning_price" numeric(15, 2);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_bid_count" integer DEFAULT 0;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_terms_accepted" boolean DEFAULT false;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "auction_contract_url" text;
CREATE INDEX IF NOT EXISTS "properties_auction_idx" ON "properties" ("is_auction", "auction_status");
CREATE INDEX IF NOT EXISTS "properties_auction_end_idx" ON "properties" ("auction_end_date");
CREATE TABLE IF NOT EXISTS "auction_bids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid,
	"bidder_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"is_auto_bid" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "auction_bids_property_id_idx" ON "auction_bids" ("property_id");
CREATE INDEX IF NOT EXISTS "auction_bids_bidder_id_idx" ON "auction_bids" ("bidder_id");


-- Source reconciliation: drizzle-pg/0011_auction_hardening_f1.sql
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


-- Source reconciliation: drizzle-pg/0012_auction_contract_closure_f3.sql
-- AkarProMax Auctions F3 - immutable contract document + party acceptance trail

ALTER TABLE "auction_contracts" ADD COLUMN IF NOT EXISTS "document_html" text;
ALTER TABLE "auction_contracts" ADD COLUMN IF NOT EXISTS "document_hash" text;
ALTER TABLE "auction_contracts" ADD COLUMN IF NOT EXISTS "document_mime" text NOT NULL DEFAULT 'text/html; charset=utf-8';
ALTER TABLE "auction_contracts" ADD COLUMN IF NOT EXISTS "document_filename" text;
ALTER TABLE "auction_contracts" ADD COLUMN IF NOT EXISTS "seller_signed_at" timestamp;
ALTER TABLE "auction_contracts" ADD COLUMN IF NOT EXISTS "buyer_signed_at" timestamp;

CREATE TABLE IF NOT EXISTS "auction_contract_signatures" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "contract_id" uuid NOT NULL,
  "property_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "party_role" text NOT NULL,
  "contract_hash" text NOT NULL,
  "signature_hash" text NOT NULL,
  "signed_at" timestamp NOT NULL DEFAULT now(),
  "created_at" timestamp NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_contract_signatures_contract_fk') THEN
    ALTER TABLE "auction_contract_signatures" ADD CONSTRAINT "auction_contract_signatures_contract_fk"
      FOREIGN KEY ("contract_id") REFERENCES "auction_contracts"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_contract_signatures_property_fk') THEN
    ALTER TABLE "auction_contract_signatures" ADD CONSTRAINT "auction_contract_signatures_property_fk"
      FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_contract_signatures_user_fk') THEN
    ALTER TABLE "auction_contract_signatures" ADD CONSTRAINT "auction_contract_signatures_user_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auction_contract_signatures_role_ck') THEN
    ALTER TABLE "auction_contract_signatures" ADD CONSTRAINT "auction_contract_signatures_role_ck"
      CHECK ("party_role" IN ('seller','buyer'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "auction_contract_signatures_party_uidx"
  ON "auction_contract_signatures" ("contract_id", "user_id", "party_role");
CREATE INDEX IF NOT EXISTS "auction_contract_signatures_contract_idx"
  ON "auction_contract_signatures" ("contract_id", "signed_at");
CREATE INDEX IF NOT EXISTS "auction_contract_signatures_user_idx"
  ON "auction_contract_signatures" ("user_id");

