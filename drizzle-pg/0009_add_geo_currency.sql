CREATE TABLE IF NOT EXISTS "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"name_tr" text,
	"phone_code" text,
	"currency_code" text DEFAULT 'OMR',
	"is_active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "countries_is_active_idx" ON "countries" ("is_active");
CREATE INDEX IF NOT EXISTS "countries_display_order_idx" ON "countries" ("display_order");
CREATE UNIQUE INDEX IF NOT EXISTS "countries_code_unique" ON "countries" ("code");

CREATE TABLE IF NOT EXISTS "governorates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_id" uuid NOT NULL,
	"code" text,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"name_tr" text,
	"is_active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "governorates_country_id_idx" ON "governorates" ("country_id");
CREATE INDEX IF NOT EXISTS "governorates_is_active_idx" ON "governorates" ("is_active");

CREATE TABLE IF NOT EXISTS "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"governorate_id" uuid NOT NULL,
	"code" text,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"name_tr" text,
	"latitude" text,
	"longitude" text,
	"is_active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "cities_governorate_id_idx" ON "cities" ("governorate_id");
CREATE INDEX IF NOT EXISTS "cities_is_active_idx" ON "cities" ("is_active");

CREATE TABLE IF NOT EXISTS "districts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_id" uuid NOT NULL,
	"code" text,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"name_tr" text,
	"is_active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "districts_city_id_idx" ON "districts" ("city_id");
CREATE INDEX IF NOT EXISTS "districts_is_active_idx" ON "districts" ("is_active");

CREATE TABLE IF NOT EXISTS "streets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"district_id" uuid NOT NULL,
	"code" text,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"name_tr" text,
	"is_active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "streets_district_id_idx" ON "streets" ("district_id");
CREATE INDEX IF NOT EXISTS "streets_is_active_idx" ON "streets" ("is_active");

CREATE TABLE IF NOT EXISTS "currencies" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"symbol" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"name_tr" text,
	"exchange_rate_to_usd" numeric(18, 8) DEFAULT '1' NOT NULL,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "currencies_is_active_idx" ON "currencies" ("is_active");
CREATE INDEX IF NOT EXISTS "currencies_is_default_idx" ON "currencies" ("is_default");
CREATE UNIQUE INDEX IF NOT EXISTS "currencies_code_unique" ON "currencies" ("code");
